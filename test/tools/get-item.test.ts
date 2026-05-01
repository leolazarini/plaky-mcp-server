import { describe, it, expect, vi } from 'vitest'
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
  it('calls client.getItem with correct params', async () => {
    mockClient.getItem.mockResolvedValue(item)
    await getItem('s1', 'b1', 'i1', mockClient as any)
    expect(mockClient.getItem).toHaveBeenCalledWith('s1', 'b1', 'i1')
  })

  it('returns item with url field added', async () => {
    mockClient.getItem.mockResolvedValue(item)
    const result = await getItem('s1', 'b1', 'i1', mockClient as any)
    expect(result.id).toBe('i1')
    expect(result.title).toBe('Fix login bug')
    expect((result as any).url).toBeDefined()
  })

  it('url contains the itemId', async () => {
    mockClient.getItem.mockResolvedValue(item)
    const result = await getItem('s1', 'b1', 'i1', mockClient as any)
    expect((result as any).url).toContain('i1')
  })

  it('url contains the boardId', async () => {
    mockClient.getItem.mockResolvedValue(item)
    const result = await getItem('s1', 'b1', 'i1', mockClient as any)
    expect((result as any).url).toContain('b1')
  })
})
