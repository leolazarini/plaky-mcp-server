import type { PlakyClient } from '../plaky/client.js'
import type { ICache } from '../cache/interface.js'
import { getBoard } from './get-board.js'
import { buildFields } from '../plaky/field-mapper.js'
import { resolveAssigneeByEmail } from '../utils/resolve-assignee.js'

interface CreateItemInput {
  title: string
  description?: string
  status?: string
  assignee_email?: string
  assignee_emails?: string[]
  due_date?: string
}

interface CreateItemResult {
  id: string
  url: string
  title: string
  board_id: string
  created_at: string
}

function buildItemUrl(boardId: string, itemId: string): string {
  return `https://app.plaky.com/d/board/${boardId}?itemId=${itemId}`
}

export async function createItem(
  input: CreateItemInput,
  spaceId: string,
  boardId: string,
  client: PlakyClient,
  cache: ICache
): Promise<CreateItemResult> {
  const board = await getBoard(spaceId, boardId, client, cache)

  // Resolve all assignee emails
  const emails = [
    ...(input.assignee_email ? [input.assignee_email] : []),
    ...(input.assignee_emails ?? []),
  ]

  const userIds: string[] = []
  for (const email of emails) {
    const resolved = await resolveAssigneeByEmail(email, client, cache)
    if (resolved.type === 'not_found') {
      throw new Error(
        `Usuário não encontrado: "${email}". Verifique o email e tente novamente.`
      )
    }
    userIds.push(resolved.userId)
  }

  const fields = buildFields(
    { description: input.description, status: input.status, dueDate: input.due_date },
    board,
    userIds
  )

  const item = await client.createItem(spaceId, boardId, { title: input.title, fields })

  return {
    id: item.id,
    url: buildItemUrl(boardId, item.id),
    title: item.title,
    board_id: boardId,
    created_at: item.createdAt,
  }
}
