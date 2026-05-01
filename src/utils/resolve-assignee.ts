import type { PlakyClient } from '../plaky/client.js'
import type { ICache } from '../cache/interface.js'
import type { PlakyUser } from '../plaky/types.js'

export type ResolveResult =
  | { type: 'found'; userId: string }
  | { type: 'not_found'; email: string }

export async function resolveAssigneeByEmail(
  email: string,
  client: Pick<PlakyClient, 'apiKeyHash' | 'listUsers'>,
  cache: ICache
): Promise<ResolveResult> {
  const cacheKey = `users:${client.apiKeyHash}`
  let users = await cache.get<PlakyUser[]>(cacheKey)

  if (!users) {
    const response = await client.listUsers()
    users = response.data
    await cache.set(cacheKey, users, 900) // 15 min
  }

  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!user) return { type: 'not_found', email }
  return { type: 'found', userId: user.id }
}
