import type { MiddlewareHandler } from 'hono'

export const authMiddleware: MiddlewareHandler<{
  Variables: { plaky_api_key: string }
}> = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

  if (!token) {
    return c.json({ error: 'Autorização necessária. Forneça um Bearer token.' }, 401)
  }

  c.set('plaky_api_key', token)
  await next()
}
