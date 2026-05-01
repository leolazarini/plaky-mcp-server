import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getBoard } from '../../src/tools/get-board.js'
import type { ICache } from '../../src/cache/interface.js'
import type { PlakyBoard } from '../../src/plaky/types.js'

const board: PlakyBoard = {
  id: 'b1',
  title: 'Dev Board',
  fields: [{ id: 'f1', key: 'status-1', title: 'Status', type: 'status' }],
  groups: [{ id: 'g1', title: 'Backlog' }],
}

const mockClient = { getBoard: vi.fn() }
const mockCache: ICache = { get: vi.fn(), set: vi.fn(), del: vi.fn() }

describe('getBoard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns board from Plaky and caches it', async () => {
    vi.mocked(mockCache.get).mockResolvedValue(null)
    vi.mocked(mockClient.getBoard).mockResolvedValue(board)
    const result = await getBoard('s1', 'b1', mockClient as any, mockCache)
    expect(result).toEqual(board)
    expect(mockCache.set).toHaveBeenCalledWith('board:b1', board, 300)
  })

  it('returns cached board without calling API', async () => {
    vi.mocked(mockCache.get).mockResolvedValue(board)
    const result = await getBoard('s1', 'b1', mockClient as any, mockCache)
    expect(result).toEqual(board)
    expect(mockClient.getBoard).not.toHaveBeenCalled()
  })

  it('uses boardId for cache key', async () => {
    vi.mocked(mockCache.get).mockResolvedValue(null)
    vi.mocked(mockClient.getBoard).mockResolvedValue(board)
    await getBoard('s1', 'b1', mockClient as any, mockCache)
    expect(mockCache.get).toHaveBeenCalledWith('board:b1')
  })

  it('passes spaceId and boardId to API client', async () => {
    vi.mocked(mockCache.get).mockResolvedValue(null)
    vi.mocked(mockClient.getBoard).mockResolvedValue(board)
    await getBoard('space-123', 'board-456', mockClient as any, mockCache)
    expect(mockClient.getBoard).toHaveBeenCalledWith('space-123', 'board-456')
  })
})
