import type { PlakyClient } from '../plaky/client.js'
import type { ICache } from '../cache/interface.js'
import type { PlakyItem } from '../plaky/types.js'
import { resolveAssigneeByEmail } from '../utils/resolve-assignee.js'

interface ListItemsInput {
  spaceId: string
  boardId: string
  query?: string
  status?: string
  assigneeEmail?: string
  limit?: number
}

export interface ItemSummary {
  id: string
  title: string
  url: string
  group: string
  status?: string
  assignees: string[]
  created_at: string
}

function buildItemUrl(boardId: string, itemId: string): string {
  return `https://app.plaky.com/d/board/${boardId}?itemId=${itemId}`
}

function toItemSummary(item: PlakyItem, boardId: string): ItemSummary {
  const statusField = item.fields?.find((f) => f.type === 'status')
  const personField = item.fields?.find((f) => f.type === 'person')

  const personValue = personField?.value as { users?: { id: string }[] } | undefined
  const assignees = personValue?.users?.map((u) => u.id) ?? []

  return {
    id: item.id,
    title: item.title,
    url: buildItemUrl(boardId, item.id),
    group: item.group.title,
    status: typeof statusField?.value === 'string' ? statusField.value : undefined,
    assignees,
    created_at: item.createdAt,
  }
}

export async function listItems(
  input: ListItemsInput,
  client: Pick<PlakyClient, 'apiKeyHash' | 'listItems' | 'listUsers'>,
  cache: ICache
): Promise<ItemSummary[]> {
  const { spaceId, boardId, query, status, assigneeEmail, limit } = input
  const fetchSize = Math.min(limit ?? 20, 100)

  const response = await client.listItems(spaceId, boardId, 1, fetchSize)
  let items = response.data

  if (query) {
    const lower = query.toLowerCase()
    items = items.filter((item) => item.title.toLowerCase().includes(lower))
  }

  if (status) {
    const lower = status.toLowerCase()
    items = items.filter((item) => {
      const statusField = item.fields?.find((f) => f.type === 'status')
      return typeof statusField?.value === 'string' && statusField.value.toLowerCase() === lower
    })
  }

  if (assigneeEmail) {
    const resolved = await resolveAssigneeByEmail(assigneeEmail, client, cache)
    if (resolved.type === 'not_found') return []

    const { userId } = resolved
    items = items.filter((item) => {
      const personField = item.fields?.find((f) => f.type === 'person')
      const personValue = personField?.value as { users?: { id: string }[] } | undefined
      return personValue?.users?.some((u) => u.id === userId) ?? false
    })
  }

  const summaries = items.map((item) => toItemSummary(item, boardId))
  return limit !== undefined ? summaries.slice(0, limit) : summaries
}
