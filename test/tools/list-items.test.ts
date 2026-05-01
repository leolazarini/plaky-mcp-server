import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listItems } from '../../src/tools/list-items.js'
import type { ICache } from '../../src/cache/interface.js'
import type { PlakyItem } from '../../src/plaky/types.js'

const mockClient = {
  apiKeyHash: 'hash1',
  listItems: vi.fn(),
  listUsers: vi.fn(),
}

const mockCache: ICache = { get: vi.fn(), set: vi.fn(), del: vi.fn() }

function makeItem(overrides: Partial<PlakyItem> & { id: string; title: string }): PlakyItem {
  return {
    id: overrides.id,
    title: overrides.title,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00Z',
    group: overrides.group ?? { id: 'g1', title: 'Backlog' },
    board: overrides.board ?? { id: 'b1', title: 'Dev Board' },
    space: overrides.space ?? { id: 's1', title: 'Space 1' },
    fields: overrides.fields ?? [],
  }
}

const item1 = makeItem({
  id: 'i1',
  title: 'Fix login bug',
  fields: [
    { key: 'status-1', title: 'Status', type: 'status', value: 'In Progress' },
    { key: 'person-1', title: 'Assignee', type: 'person', value: { users: [{ id: 'u1' }] } },
  ],
})

const item2 = makeItem({
  id: 'i2',
  title: 'Add dark mode',
  fields: [
    { key: 'status-1', title: 'Status', type: 'status', value: 'To Do' },
    { key: 'person-1', title: 'Assignee', type: 'person', value: { users: [] } },
  ],
})

const item3 = makeItem({
  id: 'i3',
  title: 'Login page redesign',
  fields: [
    { key: 'status-1', title: 'Status', type: 'status', value: 'in progress' },
    { key: 'person-1', title: 'Assignee', type: 'person', value: { users: [{ id: 'u2' }] } },
  ],
})

describe('listItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mockCache.get).mockResolvedValue(null)
    vi.mocked(mockClient.listItems).mockResolvedValue({ data: [item1, item2, item3], hasMore: false })
  })

  it('returns all items without filters', async () => {
    const result = await listItems({ spaceId: 's1', boardId: 'b1' }, mockClient as any, mockCache)
    expect(result).toHaveLength(3)
    expect(mockClient.listItems).toHaveBeenCalledWith('s1', 'b1', 1, 20)
  })

  it('result shape includes url, group, status, assignees', async () => {
    vi.mocked(mockClient.listItems).mockResolvedValue({ data: [item1], hasMore: false })
    const result = await listItems({ spaceId: 's1', boardId: 'b1' }, mockClient as any, mockCache)
    const summary = result[0]
    expect(summary.id).toBe('i1')
    expect(summary.title).toBe('Fix login bug')
    expect(summary.url).toBe('https://app.plaky.com/d/board/b1?itemId=i1')
    expect(summary.group).toBe('Backlog')
    expect(summary.status).toBe('In Progress')
    expect(summary.assignees).toEqual(['u1'])
    expect(summary.created_at).toBe('2026-01-01T00:00:00Z')
  })

  it('filters by query (case-insensitive title substring)', async () => {
    const result = await listItems({ spaceId: 's1', boardId: 'b1', query: 'login' }, mockClient as any, mockCache)
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.id)).toEqual(['i1', 'i3'])
  })

  it('filters by status (case-insensitive exact match)', async () => {
    const result = await listItems({ spaceId: 's1', boardId: 'b1', status: 'IN PROGRESS' }, mockClient as any, mockCache)
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.id)).toEqual(['i1', 'i3'])
  })

  it('filters by assigneeEmail (resolves to userId, filters person field)', async () => {
    vi.mocked(mockCache.get).mockImplementation(async (key) => {
      if (key === 'users:hash1') return [{ id: 'u1', name: 'Alice', email: 'alice@example.com', type: 'MEMBER', status: 'ACTIVE' }]
      return null
    })

    const result = await listItems(
      { spaceId: 's1', boardId: 'b1', assigneeEmail: 'alice@example.com' },
      mockClient as any,
      mockCache
    )
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('i1')
  })

  it('returns [] when assigneeEmail not found', async () => {
    vi.mocked(mockCache.get).mockImplementation(async (key) => {
      if (key === 'users:hash1') return [{ id: 'u1', name: 'Alice', email: 'alice@example.com', type: 'MEMBER', status: 'ACTIVE' }]
      return null
    })

    const result = await listItems(
      { spaceId: 's1', boardId: 'b1', assigneeEmail: 'ghost@example.com' },
      mockClient as any,
      mockCache
    )
    expect(result).toHaveLength(0)
  })

  it('caps fetchSize at 100 (passes 100 as pageSize to client)', async () => {
    await listItems({ spaceId: 's1', boardId: 'b1', limit: 500 }, mockClient as any, mockCache)
    expect(mockClient.listItems).toHaveBeenCalledWith('s1', 'b1', 1, 100)
  })

  it('slices result to limit after filtering', async () => {
    const result = await listItems({ spaceId: 's1', boardId: 'b1', limit: 2 }, mockClient as any, mockCache)
    expect(result).toHaveLength(2)
  })

  it('returns empty assignees array when no person field present', async () => {
    const itemNoPersonField = makeItem({ id: 'i4', title: 'No assignee', fields: [] })
    vi.mocked(mockClient.listItems).mockResolvedValue({ data: [itemNoPersonField], hasMore: false })
    const result = await listItems({ spaceId: 's1', boardId: 'b1' }, mockClient as any, mockCache)
    expect(result[0].assignees).toEqual([])
  })
})
