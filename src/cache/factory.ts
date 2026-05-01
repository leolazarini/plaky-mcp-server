import type { ICache } from './interface.js'
import { MemoryCache } from './memory.js'
import { RedisCache } from './redis.js'

export function createCache(redisUrl?: string): ICache {
  if (redisUrl) return new RedisCache(redisUrl)
  return new MemoryCache()
}
