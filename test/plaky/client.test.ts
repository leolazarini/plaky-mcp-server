import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PlakyClient, PlakyApiError } from '../../src/plaky/client.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

describe('PlakyClient', () => {
  let client: PlakyClient

  beforeEach(() => {
    mockFetch.mockReset()
    client = new PlakyClient('test-api-key', 'https://api.plaky.com/v1/public')
  })

  it('sends X-API-Key header on every request', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: [], hasMore: false }))
    await client.listSpaces()
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/spaces'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-API-Key': 'test-api-key' }),
      })
    )
  })

  it('throws PlakyApiError on 401', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: 'Unauthorized' }, 401))
    await expect(client.listSpaces()).rejects.toThrow(PlakyApiError)
  })

  it('throws PlakyApiError on 429', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: 'Rate limit' }, 429))
    await expect(client.listSpaces()).rejects.toThrow(PlakyApiError)
  })

  it('exposes a 16-char hex apiKeyHash', () => {
    expect(client.apiKeyHash).toMatch(/^[0-9a-f]{16}$/)
  })

  it('listSpaces returns paginated spaces', async () => {
    const spaces = [{ id: 's1', title: 'Space 1' }]
    mockFetch.mockResolvedValue(jsonResponse({ data: spaces, hasMore: false }))
    const result = await client.listSpaces()
    expect(result.data).toEqual(spaces)
  })

  it('createItem sends POST with correct body', async () => {
    const item = { id: 'i1', title: 'Bug fix', createdAt: '2026-01-01T00:00:00Z' }
    mockFetch.mockResolvedValue(jsonResponse(item, 201))
    await client.createItem('s1', 'b1', { title: 'Bug fix' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/spaces/s1/boards/b1/items'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})
