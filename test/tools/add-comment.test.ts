import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addComment } from '../../src/tools/add-comment.js'
import type { PlakyComment } from '../../src/plaky/types.js'

const comment: PlakyComment = {
  id: 'c1',
  text: 'This is a comment',
  createdAt: '2026-01-01T00:00:00Z',
  createdBy: { id: 'u1', name: 'Alice Smith', email: 'alice@example.com' },
}

const mockCache = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
}

const mockClient = {
  addComment: vi.fn(),
  apiKeyHash: 'testhash',
  listUsers: vi.fn().mockResolvedValue({
    data: [
      { id: '42', name: 'Bob Jones', email: 'bob@example.com', type: 'MEMBER', status: 'ACTIVE' },
    ],
  }),
}

describe('addComment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mockClient.addComment).mockResolvedValue(comment)
    vi.mocked(mockCache.get).mockResolvedValue(null)
  })

  it('wraps plain text in <p> tags', async () => {
    await addComment('s1', 'b1', 'i1', 'This is a comment', mockClient as any, mockCache as any)
    expect(mockClient.addComment).toHaveBeenCalledWith('s1', 'b1', 'i1', '<p>This is a comment</p>')
  })

  it('converts @Name to Quill mention span with resolved user ID', async () => {
    await addComment('s1', 'b1', 'i1', '@Bob check this', mockClient as any, mockCache as any)
    const sent = vi.mocked(mockClient.addComment).mock.calls[0][3] as string
    expect(sent).toContain('data-id="42"')
    expect(sent).toContain('data-value="Bob Jones"')
    expect(sent).toContain('class="mention"')
    expect(sent).toContain('check this')
  })

  it('keeps unresolved @Name as plain text', async () => {
    await addComment('s1', 'b1', 'i1', '@Unknown hello', mockClient as any, mockCache as any)
    const sent = vi.mocked(mockClient.addComment).mock.calls[0][3] as string
    expect(sent).not.toContain('class="mention"')
    expect(sent).toContain('@Unknown hello')
  })

  it('returns the comment from client', async () => {
    const result = await addComment('s1', 'b1', 'i1', 'This is a comment', mockClient as any, mockCache as any)
    expect(result).toEqual(comment)
    expect(result.id).toBe('c1')
    expect(result.createdBy.email).toBe('alice@example.com')
  })
})
