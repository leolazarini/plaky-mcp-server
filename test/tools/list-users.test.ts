import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listUsers } from '../../src/tools/list-users.js'
import type { ICache } from '../../src/cache/interface.js'

const users = [
  { id: 'u1', name: 'Pedro Costa', email: 'pedro@hangar.com', type: 'MEMBER', status: 'ACTIVE' },
  { id: 'u2', name: 'Ana Lima', email: 'ana@hangar.com', type: 'ADMIN', status: 'ACTIVE' },
]

const mockClient = { apiKeyHash: 'hash1', listUsers: vi.fn() }
const mockCache: ICache = { get: vi.fn(), set: vi.fn(), del: vi.fn() }

describe('listUsers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns all users when no query provided', async () => {
    vi.mocked(mockCache.get).mockResolvedValue(users)
    const result = await listUsers(undefined, mockClient as any, mockCache)
    expect(result).toHaveLength(2)
  })

  it('filters by name substring (case-insensitive)', async () => {
    vi.mocked(mockCache.get).mockResolvedValue(users)
    const result = await listUsers('pedro', mockClient as any, mockCache)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Pedro Costa')
  })

  it('filters by email substring', async () => {
    vi.mocked(mockCache.get).mockResolvedValue(users)
    const result = await listUsers('ana@', mockClient as any, mockCache)
    expect(result).toHaveLength(1)
    expect(result[0].email).toBe('ana@hangar.com')
  })

  it('fetches and caches when cache is empty', async () => {
    vi.mocked(mockCache.get).mockResolvedValue(null)
    vi.mocked(mockClient.listUsers).mockResolvedValue({ data: users, hasMore: false })
    await listUsers(undefined, mockClient as any, mockCache)
    expect(mockCache.set).toHaveBeenCalledWith('users:hash1', users, 900)
  })
})
