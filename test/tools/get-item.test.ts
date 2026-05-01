import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getItem } from '../../src/tools/get-item.js'
import type { PlakyItem } from '../../src/plaky/types.js'

const item: PlakyItem = {
  id: 'i1',
  title: 'Fix login bug',
  createdAt: '2026-01-01T00:00:00Z',
  group: { id: 'g1', title: 'Backlog' },
  board: { id: 'b1', title: 'Dev Board' },
  space: { id: 's1', title: 'Space 1' },
  fields: [{ key: 'status-1', title: 'Status', type: 'status', value: 'In Progress' }],
}

const mockClient = {
  getItem: vi.fn(),
}

describe('getItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mockClient.getItem).mockResolvedValue(item)
  })

  it('calls client.getItem with correct params', async () => {
    await getItem('s1', 'b1', 'i1', mockClient as any)
    expect(mockClient.getItem).toHaveBeenCalledWith('s1', 'b1', 'i1')
  })

  it('returns item with url field added', async () => {
    const result = await getItem('s1', 'b1', 'i1', mockClient as any)
    expect(result.id).toBe('i1')
    expect(result.title).toBe('Fix login bug')
    expect(result.url).toBeDefined()
  })

  it('url contains the itemId', async () => {
    const result = await getItem('s1', 'b1', 'i1', mockClient as any)
    expect(result.url).toContain('i1')
  })

  it('url contains the boardId', async () => {
    const result = await getItem('s1', 'b1', 'i1', mockClient as any)
    expect(result.url).toContain('b1')
  })
})
