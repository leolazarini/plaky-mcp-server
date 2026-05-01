import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveAssigneeByEmail } from '../../src/utils/resolve-assignee.js'
import type { ICache } from '../../src/cache/interface.js'

const users = [
  { id: 'u1', name: 'Pedro Costa', email: 'pedro@hangar.com', type: 'MEMBER', status: 'ACTIVE' },
  { id: 'u2', name: 'Ana Lima', email: 'ana@hangar.com', type: 'MEMBER', status: 'ACTIVE' },
]

const mockClient = {
  apiKeyHash: 'abc123',
  listUsers: vi.fn(),
}

const mockCache: ICache = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}

describe('resolveAssigneeByEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns userId when email matches', async () => {
    vi.mocked(mockCache.get).mockResolvedValue(users)
    const result = await resolveAssigneeByEmail('pedro@hangar.com', mockClient as any, mockCache)
    expect(result).toEqual({ type: 'found', userId: 'u1' })
  })

  it('is case-insensitive', async () => {
    vi.mocked(mockCache.get).mockResolvedValue(users)
    const result = await resolveAssigneeByEmail('PEDRO@HANGAR.COM', mockClient as any, mockCache)
    expect(result).toEqual({ type: 'found', userId: 'u1' })
  })

  it('returns not_found when email has no match', async () => {
    vi.mocked(mockCache.get).mockResolvedValue(users)
    const result = await resolveAssigneeByEmail('unknown@hangar.com', mockClient as any, mockCache)
    expect(result).toEqual({ type: 'not_found', email: 'unknown@hangar.com' })
  })

  it('fetches from client and caches when cache is empty', async () => {
    vi.mocked(mockCache.get).mockResolvedValue(null)
    vi.mocked(mockClient.listUsers).mockResolvedValue({ data: users, hasMore: false })
    await resolveAssigneeByEmail('pedro@hangar.com', mockClient as any, mockCache)
    expect(mockClient.listUsers).toHaveBeenCalledOnce()
    expect(mockCache.set).toHaveBeenCalledWith(
      `users:abc123`,
      users,
      900
    )
  })

  it('uses cache and does not call client when cache is warm', async () => {
    vi.mocked(mockCache.get).mockResolvedValue(users)
    await resolveAssigneeByEmail('pedro@hangar.com', mockClient as any, mockCache)
    expect(mockClient.listUsers).not.toHaveBeenCalled()
  })
})
