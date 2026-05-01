import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { Hono } from 'hono'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { randomUUID } from 'node:crypto'
import { config } from './config.js'
import { PlakyClient } from './plaky/client.js'
import { createCache } from './cache/factory.js'
import { registerTools } from './tools/index.js'
import { logger } from './observability/logger.js'
import { RateLimiter } from './rate-limiter.js'

const cache = createCache(config.REDIS_URL)
const rateLimiter = new RateLimiter()

interface Session {
  transport: StreamableHTTPServerTransport
}

const sessions = new Map<string, Session>()

const app = new Hono()
app.get('/health', (c) => c.json({ status: 'ok', version: '0.1.0' }))

// MCP routes are handled directly with raw Node.js to avoid @hono/node-server
// attempting to write headers after the transport already wrote them.
async function handleMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const authHeader = req.headers['authorization'] as string | undefined
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Autorização necessária. Forneça um Bearer token.' }))
    return
  }

  const sessionId = req.headers['mcp-session-id'] as string | undefined

  // GET (SSE) and DELETE operate on an existing session only
  if (req.method !== 'POST') {
    if (sessionId && sessions.has(sessionId)) {
      await sessions.get(sessionId)!.transport.handleRequest(req, res, undefined)
      return
    }
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Session ID required' }))
    return
  }

  const { allowed, retryAfterMs } = rateLimiter.check(token)
  if (!allowed) {
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Retry-After': String(Math.ceil(retryAfterMs! / 1000)),
    })
    res.end(JSON.stringify({ error: 'Muitas requisições. Tente novamente em alguns segundos.' }))
    return
  }

  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const body = JSON.parse(Buffer.concat(chunks).toString())

  if (sessionId && sessions.has(sessionId)) {
    await sessions.get(sessionId)!.transport.handleRequest(req, res, body)
    return
  }

  if (!isInitializeRequest(body)) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Session ID required' }))
    return
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sid) => {
      sessions.set(sid, { transport })
      logger.info({ sessionId: sid }, 'MCP session created')
    },
  })

  transport.onclose = () => {
    if (transport.sessionId) {
      sessions.delete(transport.sessionId)
      logger.info({ sessionId: transport.sessionId }, 'MCP session closed')
    }
  }

  const client = new PlakyClient(token, config.PLAKY_BASE_URL)
  const mcpServer = new McpServer({ name: 'plaky-mcp', version: '0.1.0' })
  registerTools(mcpServer, client, cache)

  await mcpServer.connect(transport)
  await transport.handleRequest(req, res, body)
}

async function handleHono(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = `http://localhost${req.url}`
  const headers = new Headers()
  for (const [key, val] of Object.entries(req.headers)) {
    if (val) headers.set(key, Array.isArray(val) ? val.join(', ') : val)
  }

  let bodyInit: ArrayBuffer | undefined
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    if (chunks.length > 0) {
      const buf = Buffer.concat(chunks)
      bodyInit = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
    }
  }

  const request = new Request(url, {
    method: req.method,
    headers,
    ...(bodyInit ? { body: bodyInit } : {}),
  })

  const response = await app.fetch(request)
  const responseBody = await response.arrayBuffer()
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
  res.end(Buffer.from(responseBody))
}

const server = createServer(async (req, res) => {
  try {
    if (req.url === '/mcp') {
      await handleMcp(req, res)
    } else {
      await handleHono(req, res)
    }
  } catch (err) {
    logger.error({ err }, 'Unhandled request error')
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Internal server error' }))
    }
  }
})

server.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'Plaky MCP server listening')
})

process.on('SIGINT', async () => {
  logger.info('Shutting down…')
  for (const { transport } of sessions.values()) await transport.close()
  server.close()
  process.exit(0)
})
