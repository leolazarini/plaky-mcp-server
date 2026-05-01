import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryCache } from '../../src/cache/memory.js'

describe('MemoryCache', () => {
  let cache: MemoryCache

  beforeEach(() => {
    cache = new MemoryCache()
  })

  it('returns null for missing key', async () => {
    expect(await cache.get('missing')).toBeNull()
  })

  it('stores and retrieves a value', async () => {
    await cache.set('k', { x: 1 }, 60)
    expect(await cache.get('k')).toEqual({ x: 1 })
  })

  it('returns null after TTL expires', async () => {
    vi.useFakeTimers()
    await cache.set('k', 'value', 1) // 1 second TTL
    vi.advanceTimersByTime(1001)
    expect(await cache.get('k')).toBeNull()
    vi.useRealTimers()
  })

  it('del removes a key', async () => {
    await cache.set('k', 'value', 60)
    await cache.del('k')
    expect(await cache.get('k')).toBeNull()
  })

  it('del on missing key does not throw', async () => {
    await expect(cache.del('nonexistent')).resolves.toBeUndefined()
  })
})
