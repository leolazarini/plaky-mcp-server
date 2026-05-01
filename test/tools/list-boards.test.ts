import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listBoards } from '../../src/tools/list-boards.js'
import type { ICache } from '../../src/cache/interface.js'

const mockClient = {
  apiKeyHash: 'hash1',
  listSpaces: vi.fn(),
}

const mockCache: ICache = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}

describe('listBoards', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns flat list of boards from all spaces', async () => {
    vi.mocked(mockCache.get).mockResolvedValue(null)
    vi.mocked(mockClient.listSpaces).mockResolvedValue({
      data: [
        { id: 's1', title: 'Space 1', boards: [{ id: 'b1', title: 'Board 1', fields: [], groups: [] }] },
        { id: 's2', title: 'Space 2', boards: [{ id: 'b2', title: 'Board 2', fields: [], groups: [] }] },
      ],
      hasMore: false,
    })

    const result = await listBoards(mockClient as any, mockCache)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ space_id: 's1', space_name: 'Space 1', board_id: 'b1', board_name: 'Board 1' })
  })

  it('returns cached result without calling API', async () => {
    const cached = [{ space_id: 's1', space_name: 'S1', board_id: 'b1', board_name: 'B1' }]
    vi.mocked(mockCache.get).mockResolvedValue(cached)
    const result = await listBoards(mockClient as any, mockCache)
    expect(result).toEqual(cached)
    expect(mockClient.listSpaces).not.toHaveBeenCalled()
  })

  it('caches result for 300 seconds', async () => {
    vi.mocked(mockCache.get).mockResolvedValue(null)
    vi.mocked(mockClient.listSpaces).mockResolvedValue({ data: [], hasMore: false })
    await listBoards(mockClient as any, mockCache)
    expect(mockCache.set).toHaveBeenCalledWith('boards:hash1', [], 300)
  })

  it('handles spaces with no boards', async () => {
    vi.mocked(mockCache.get).mockResolvedValue(null)
    vi.mocked(mockClient.listSpaces).mockResolvedValue({
      data: [{ id: 's1', title: 'Space 1' }],
      hasMore: false,
    })
    const result = await listBoards(mockClient as any, mockCache)
    expect(result).toHaveLength(0)
  })
})
