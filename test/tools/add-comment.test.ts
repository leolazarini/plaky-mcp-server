import { describe, it, expect, vi } from 'vitest'
import { addComment } from '../../src/tools/add-comment.js'
import type { PlakyComment } from '../../src/plaky/types.js'

const comment: PlakyComment = {
  id: 'c1',
  text: 'This is a comment',
  createdAt: '2026-01-01T00:00:00Z',
  createdBy: { id: 'u1', name: 'Pedro Costa', email: 'pedro@hangar.com' },
}

const mockClient = {
  addComment: vi.fn(),
}

describe('addComment', () => {
  it('calls client.addComment with correct params', async () => {
    mockClient.addComment.mockResolvedValue(comment)
    await addComment('s1', 'b1', 'i1', 'This is a comment', mockClient as any)
    expect(mockClient.addComment).toHaveBeenCalledWith('s1', 'b1', 'i1', 'This is a comment')
  })

  it('returns the comment from client', async () => {
    mockClient.addComment.mockResolvedValue(comment)
    const result = await addComment('s1', 'b1', 'i1', 'This is a comment', mockClient as any)
    expect(result).toEqual(comment)
    expect(result.id).toBe('c1')
    expect(result.text).toBe('This is a comment')
    expect(result.createdBy.email).toBe('pedro@hangar.com')
  })
})
