import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateItem } from '../../src/tools/update-item.js'
import type { ICache } from '../../src/cache/interface.js'
import type { PlakyBoard, PlakyItem } from '../../src/plaky/types.js'

const board: PlakyBoard = {
  id: 'b1',
  title: 'Dev Board',
  groups: [{ id: 'g1', title: 'Backlog' }],
  fields: [
    {
      id: 'f1',
      key: 'status-1',
      title: 'Status',
      type: 'status',
      options: [
        { id: 'o1', label: 'To Do', color: 'blue' },
        { id: 'o2', label: 'In Progress', color: 'yellow' },
      ],
    },
    { id: 'f2', key: 'person-1', title: 'Assignee', type: 'person' },
  ],
}

const updatedItem: PlakyItem = {
  id: 'i1',
  title: 'Fix login bug',
  createdAt: '2026-01-01T00:00:00Z',
  group: { id: 'g1', title: 'Backlog' },
  board: { id: 'b1', title: 'Dev Board' },
  space: { id: 's1', title: 'Space 1' },
  fields: [{ key: 'status-1', title: 'Status', type: 'status', value: 'In Progress' }],
}

const mockClient = {
  apiKeyHash: 'hash1',
  getBoard: vi.fn(),
  listUsers: vi.fn(),
  updateItemFields: vi.fn(),
}

const mockCache: ICache = { get: vi.fn(), set: vi.fn(), del: vi.fn() }

describe('updateItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mockCache.get).mockImplementation(async (key) => {
      if (key === 'board:b1') return board
      if (key === 'users:hash1') return [
        { id: 'u1', name: 'Pedro Costa', email: 'pedro@hangar.com', type: 'MEMBER', status: 'ACTIVE' },
      ]
      return null
    })
    mockClient.updateItemFields.mockResolvedValue(updatedItem)
  })

  it('calls updateItemFields with status field', async () => {
    await updateItem({ status: 'In Progress' }, 's1', 'b1', 'i1', mockClient as any, mockCache)
    expect(mockClient.updateItemFields).toHaveBeenCalledWith(
      's1', 'b1', 'i1',
      expect.objectContaining({ Status: 'In Progress' })
    )
  })

  it('returns { id, url, title }', async () => {
    const result = await updateItem({ status: 'To Do' }, 's1', 'b1', 'i1', mockClient as any, mockCache)
    expect(result.id).toBe('i1')
    expect(result.title).toBe('Fix login bug')
    expect(result.url).toBeDefined()
  })

  it('url contains the itemId', async () => {
    const result = await updateItem({ status: 'To Do' }, 's1', 'b1', 'i1', mockClient as any, mockCache)
    expect(result.url).toContain('i1')
  })

  it('resolves assignee_email to user id', async () => {
    await updateItem({ assignee_email: 'pedro@hangar.com' }, 's1', 'b1', 'i1', mockClient as any, mockCache)
    const callArg = mockClient.updateItemFields.mock.calls[0][3] as any
    expect(callArg['Assignee']).toEqual({ users: [{ id: 'u1' }] })
  })

  it('throws Portuguese error when assignee_email not found', async () => {
    await expect(
      updateItem({ assignee_email: 'ghost@hangar.com' }, 's1', 'b1', 'i1', mockClient as any, mockCache)
    ).rejects.toThrow(/ghost@hangar.com/)
  })
})
