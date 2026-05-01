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

  it('exports valid config with defaults when optional vars are omitted', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.PLAKY_DEFAULT_SPACE_ID
    delete process.env.PLAKY_DEFAULT_BOARD_ID

    const { config } = await import('../src/config.js')

    expect(config.PLAKY_DEFAULT_SPACE_ID).toBeUndefined()
    expect(config.PLAKY_DEFAULT_BOARD_ID).toBeUndefined()
    expect(config.PORT).toBe(3000)
    expect(config.PLAKY_BASE_URL).toBe('https://api.plaky.com/v1/public')
  })

  it('calls process.exit(1) when env vars have invalid values', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as () => never)

    process.env.NODE_ENV = 'invalid-env'

    await import('../src/config.js')

    expect(exitSpy).toHaveBeenCalledWith(1)
    exitSpy.mockRestore()
  })
})
