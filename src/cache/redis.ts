import { Redis } from 'ioredis'
import type { ICache } from './interface.js'

export class RedisCache implements ICache {
  private readonly client: Redis

  constructor(url: string) {
    this.client = new Redis(url, { lazyConnect: true, enableReadyCheck: false })
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }
}
