import type { PlakyClient } from '../plaky/client.js'
import type { ICache } from '../cache/interface.js'
import type { PlakyUser } from '../plaky/types.js'

export async function listUsers(
  query: string | undefined,
  client: Pick<PlakyClient, 'apiKeyHash' | 'listUsers'>,
  cache: ICache
): Promise<PlakyUser[]> {
  const cacheKey = `users:${client.apiKeyHash}`
  let users = await cache.get<PlakyUser[]>(cacheKey)

  if (!users) {
    const response = await client.listUsers()
    users = response.data
    await cache.set(cacheKey, users, 900)
  }

  if (!query) return users

  const q = query.toLowerCase()
  return users.filter(
    (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  )
}
