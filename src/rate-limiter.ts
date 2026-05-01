const WINDOW_MS = 60_000
const MAX_REQUESTS = 60

export interface RateLimitResult {
  allowed: boolean
  retryAfterMs?: number
}

interface WindowEntry {
  count: number
  windowStart: number
}

export class RateLimiter {
  private readonly windows = new Map<string, WindowEntry>()

  check(key: string): RateLimitResult {
    const now = Date.now()
    const entry = this.windows.get(key)

    if (!entry || now - entry.windowStart >= WINDOW_MS) {
      this.windows.set(key, { count: 1, windowStart: now })
      return { allowed: true }
    }

    if (entry.count < MAX_REQUESTS) {
      this.windows.set(key, { count: entry.count + 1, windowStart: entry.windowStart })
      return { allowed: true }
    }

    const retryAfterMs = entry.windowStart + WINDOW_MS - now
    return { allowed: false, retryAfterMs }
  }
}
