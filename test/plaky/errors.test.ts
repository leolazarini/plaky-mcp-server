import { describe, it, expect } from 'vitest'
import { toMcpErrorMessage } from '../../src/plaky/errors.js'
import { PlakyApiError } from '../../src/plaky/client.js'

describe('toMcpErrorMessage', () => {
  it('returns Portuguese message for 401', () => {
    const msg = toMcpErrorMessage(new PlakyApiError(401, 'Unauthorized'))
    expect(msg).toContain('Credencial')
  })

  it('returns Portuguese message for 404', () => {
    const msg = toMcpErrorMessage(new PlakyApiError(404, 'Not found'))
    expect(msg).toContain('encontrado')
  })

  it('returns Portuguese message for 429', () => {
    const msg = toMcpErrorMessage(new PlakyApiError(429, 'Rate limit'))
    expect(msg).toContain('Limite')
  })

  it('returns generic message for unknown PlakyApiError', () => {
    const msg = toMcpErrorMessage(new PlakyApiError(500, 'Server error'))
    expect(msg).toContain('Erro na API do Plaky')
  })

  it('returns generic message for non-Plaky errors', () => {
    const msg = toMcpErrorMessage(new Error('network timeout'))
    expect(msg).toContain('Erro inesperado')
  })
})
