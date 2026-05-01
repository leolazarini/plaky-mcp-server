import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('exports valid config when all required vars are set', async () => {
    process.env.NODE_ENV = 'development'
    process.env.PLAKY_DEFAULT_SPACE_ID = 'space-1'
    process.env.PLAKY_DEFAULT_BOARD_ID = 'board-1'

    const { config } = await import('../src/config.js')

    expect(config.PLAKY_DEFAULT_SPACE_ID).toBe('space-1')
    expect(config.PLAKY_DEFAULT_BOARD_ID).toBe('board-1')
    expect(config.PORT).toBe(3000)
    expect(config.PLAKY_BASE_URL).toBe('https://api.plaky.com/v1/public')
  })
})
