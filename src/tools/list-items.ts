import type { PlakyClient } from '../plaky/client.js'
import type { ICache } from '../cache/interface.js'
import type { PlakyItem } from '../plaky/types.js'
import { resolveAssigneeByEmail } from '../utils/resolve-assignee.js'

export interface ListItemsInput {
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
  createdAt: string
}

function buildItemUrl(boardId: string, itemId: string): string {
  return `https://app.plaky.com/d/board/${boardId}?itemId=${itemId}`
}

function extractPersonUserIds(item: PlakyItem): string[] {
  const personField = item.fields?.find((f) => f.type === 'person')
  const personValue = personField?.value as { users?: { id: string }[] } | undefined
  return personValue?.users?.map((u) => u.id) ?? []
}

function toItemSummary(item: PlakyItem, boardId: string): ItemSummary {
  const statusField = item.fields?.find((f) => f.type === 'status')

  return {
    id: item.id,
    title: item.title,
    url: buildItemUrl(boardId, item.id),
    group: item.group.title,
    status: typeof statusField?.value === 'string' ? statusField.value : undefined,
    assignees: extractPersonUserIds(item),
    createdAt: item.createdAt,
  }
}

export async function listItems(
  input: ListItemsInput,
  client: Pick<PlakyClient, 'apiKeyHash' | 'listItems' | 'listUsers'>,
  cache: ICache
): Promise<ItemSummary[]> {
  const { spaceId, boardId, query, status, assigneeEmail, limit } = input
  const resultLimit = Math.min(limit ?? 20, 100)

  const response = await client.listItems(spaceId, boardId, 1, 100)
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
    items = items.filter((item) => extractPersonUserIds(item).includes(userId))
  }

  const summaries = items.map((item) => toItemSummary(item, boardId))
  return summaries.slice(0, resultLimit)
}
