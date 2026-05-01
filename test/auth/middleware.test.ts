import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { authMiddleware } from '../../src/auth/middleware.js'

function makeApp() {
  const app = new Hono<{ Variables: { plaky_api_key: string } }>()
  app.use('*', authMiddleware)
  app.get('/test', (c) => c.json({ key: c.get('plaky_api_key') }))
  return app
}

describe('authMiddleware', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await makeApp().request('/test')
    expect(res.status).toBe(401)
  })

  it('returns 401 when Authorization header is not Bearer', async () => {
    const res = await makeApp().request('/test', {
      headers: { Authorization: 'Basic abc' },
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 when Bearer token is empty', async () => {
    const res = await makeApp().request('/test', {
      headers: { Authorization: 'Bearer ' },
    })
    expect(res.status).toBe(401)
  })

  it('sets plaky_api_key and calls next when Bearer token is present', async () => {
    const res = await makeApp().request('/test', {
      headers: { Authorization: 'Bearer my-plaky-key' },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.key).toBe('my-plaky-key')
  })

  it('passes through /health without a token', async () => {
    const app = new Hono()
    app.get('/health', (c) => c.json({ status: 'ok' }))
    app.use('/mcp', authMiddleware)
    const res = await app.request('/health')
    expect(res.status).toBe(200)
  })
})
