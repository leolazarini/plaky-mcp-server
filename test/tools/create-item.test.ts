import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createItem } from '../../src/tools/create-item.js'
import type { ICache } from '../../src/cache/interface.js'
import type { PlakyBoard } from '../../src/plaky/types.js'

const board: PlakyBoard = {
  id: 'b1', title: 'Dev Board',
  groups: [{ id: 'g1', title: 'Backlog' }],
  fields: [
    { id: 'f1', key: 'status-1', title: 'Status', type: 'status', options: [
      { id: 'o1', label: 'To Do', color: 'blue' },
      { id: 'o2', label: 'Bug', color: 'red' },
    ]},
    { id: 'f2', key: 'person-1', title: 'Assignee', type: 'person' },
  ],
}

const mockClient = {
  apiKeyHash: 'hash1',
  getBoard: vi.fn(),
  listUsers: vi.fn(),
  createItem: vi.fn(),
}

const mockCache: ICache = { get: vi.fn(), set: vi.fn(), del: vi.fn() }

describe('createItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mockCache.get).mockImplementation(async (key) => {
      if (key === 'board:b1') return board
      if (key === 'users:hash1') return [
        { id: 'u1', name: 'Pedro Costa', email: 'pedro@hangar.com', type: 'MEMBER', status: 'ACTIVE' }
      ]
      return null
    })
  })

  it('creates item with title only', async () => {
    vi.mocked(mockClient.createItem).mockResolvedValue({
      id: 'i1', title: 'Fix login', createdAt: '2026-01-01T00:00:00Z',
      board: { id: 'b1', title: 'Dev Board' },
      space: { id: 's1', title: 'Space 1' },
      group: { id: 'g1', title: 'Backlog' },
    })

    const result = await createItem(
      { title: 'Fix login' },
      's1', 'b1',
      mockClient as any, mockCache
    )

    expect(result.id).toBe('i1')
    expect(result.url).toContain('i1')
    expect(mockClient.createItem).toHaveBeenCalledWith('s1', 'b1', { title: 'Fix login', fields: {} })
  })

  it('resolves assignee email to user id', async () => {
    vi.mocked(mockClient.createItem).mockResolvedValue({
      id: 'i2', title: 'Bug', createdAt: '2026-01-01T00:00:00Z',
      board: { id: 'b1', title: 'Dev Board' },
      space: { id: 's1', title: 'Space 1' },
      group: { id: 'g1', title: 'Backlog' },
    })

    await createItem(
      { title: 'Bug', assignee_email: 'pedro@hangar.com' },
      's1', 'b1',
      mockClient as any, mockCache
    )

    const callArg = vi.mocked(mockClient.createItem).mock.calls[0][2] as any
    expect(callArg.fields['Assignee']).toEqual({ users: [{ id: 'u1' }] })
  })

  it('throws MCP error when assignee email not found', async () => {
    await expect(
      createItem({ title: 'Bug', assignee_email: 'ghost@hangar.com' }, 's1', 'b1', mockClient as any, mockCache)
    ).rejects.toThrow(/ghost@hangar.com/)
  })
})
