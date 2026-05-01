import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import type { HttpBindings } from '@hono/node-server'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { randomUUID } from 'node:crypto'
import { config } from './config.js'
import { authMiddleware } from './auth/middleware.js'
import { PlakyClient } from './plaky/client.js'
import { createCache } from './cache/factory.js'
import { registerTools } from './tools/index.js'
import { logger } from './observability/logger.js'

const cache = createCache(config.REDIS_URL)

interface Session {
  transport: StreamableHTTPServerTransport
}

const sessions = new Map<string, Session>()

type Env = {
  Bindings: HttpBindings
  Variables: { plaky_api_key: string }
}

const app = new Hono<Env>()

app.get('/health', (c) => c.json({ status: 'ok', version: '0.1.0' }))

app.use('/mcp', authMiddleware)

app.post('/mcp', async (c) => {
  const apiKey = c.get('plaky_api_key')
  const sessionId = c.req.header('mcp-session-id')
  const body = await c.req.json()
  const { incoming, outgoing } = c.env

  // Reuse existing session
  if (sessionId && sessions.has(sessionId)) {
    const { transport } = sessions.get(sessionId)!
    await transport.handleRequest(incoming, outgoing, body)
    return new Response(null)
  }

  // Reject non-initialize requests without a session
  if (!isInitializeRequest(body)) {
    return c.json({ error: 'Session ID required' }, 400)
  }

  // Create new session
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

  const client = new PlakyClient(apiKey, config.PLAKY_BASE_URL)
  const mcpServer = new McpServer({ name: 'plaky-mcp', version: '0.1.0' })
  registerTools(mcpServer, client, cache)

  await mcpServer.connect(transport)
  await transport.handleRequest(incoming, outgoing, body)

  return new Response(null)
})

const server = serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  logger.info({ port: info.port }, 'Plaky MCP server listening')
})

process.on('SIGINT', async () => {
  logger.info('Shutting down…')
  for (const { transport } of sessions.values()) await transport.close()
  server.close()
  process.exit(0)
})
