import type { PlakyClient } from '../plaky/client.js'
import type { ICache } from '../cache/interface.js'
import type { PlakyItem, PlakyUser } from '../plaky/types.js'

export interface ListItemsInput {
  spaceId: string
  boardId: string
  query?: string
  status?: string
  assigneeEmail?: string
  limit?: number
}

export interface AssigneeSummary {
  id: string
  name: string
  email: string
}

export interface ItemSummary {
  id: string
  title: string
  url: string
  group: string
  status?: string
  assignees: AssigneeSummary[]
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

function toItemSummary(item: PlakyItem, boardId: string, userMap: Map<string, PlakyUser>): ItemSummary {
  const statusField = item.fields?.find((f) => f.type === 'status')
  const assigneeIds = extractPersonUserIds(item)

  return {
    id: item.id,
    title: item.title,
    url: buildItemUrl(boardId, item.id),
    group: item.group.title,
    status: typeof statusField?.value === 'string' ? statusField.value : undefined,
    assignees: assigneeIds.map((id) => {
      const user = userMap.get(id)
      return user ? { id, name: user.name, email: user.email } : { id, name: id, email: '' }
    }),
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

  const [itemsResponse, usersResponse] = await Promise.all([
    client.listItems(spaceId, boardId, 1, 100),
    client.listUsers(),
  ])

  const userMap = new Map<string, PlakyUser>(usersResponse.data.map((u) => [u.id, u]))
  let items = itemsResponse.data

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

  const summaries = items.map((item) => toItemSummary(item, boardId, userMap))

  if (assigneeEmail) {
    const lower = assigneeEmail.toLowerCase()
    return summaries
      .filter((s) => s.assignees.some((a) => a.email.toLowerCase() === lower))
      .slice(0, resultLimit)
  }

  return summaries.slice(0, resultLimit)
}
