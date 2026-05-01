import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RateLimiter } from '../src/rate-limiter.js'

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter

  beforeEach(() => {
    rateLimiter = new RateLimiter()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests below the limit (first 60 requests)', () => {
    for (let i = 0; i < 60; i++) {
      const result = rateLimiter.check('token-abc')
      expect(result.allowed).toBe(true)
      expect(result.retryAfterMs).toBeUndefined()
    }
  })

  it('blocks the 61st request', () => {
    for (let i = 0; i < 60; i++) {
      rateLimiter.check('token-abc')
    }
    const result = rateLimiter.check('token-abc')
    expect(result.allowed).toBe(false)
  })

  it('returns allowed: true after the window expires', () => {
    for (let i = 0; i < 60; i++) {
      rateLimiter.check('token-abc')
    }
    expect(rateLimiter.check('token-abc').allowed).toBe(false)

    vi.advanceTimersByTime(60001)

    const result = rateLimiter.check('token-abc')
    expect(result.allowed).toBe(true)
  })

  it('tracks different keys independently', () => {
    for (let i = 0; i < 60; i++) {
      rateLimiter.check('token-aaa')
    }
    const blockedResult = rateLimiter.check('token-aaa')
    expect(blockedResult.allowed).toBe(false)

    const otherResult = rateLimiter.check('token-bbb')
    expect(otherResult.allowed).toBe(true)
  })

  it('sets retryAfterMs to a positive value when blocked', () => {
    for (let i = 0; i < 60; i++) {
      rateLimiter.check('token-abc')
    }
    const result = rateLimiter.check('token-abc')
    expect(result.allowed).toBe(false)
    expect(result.retryAfterMs).toBeDefined()
    expect(result.retryAfterMs).toBeGreaterThan(0)
  })
})
