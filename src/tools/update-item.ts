import type { PlakyClient } from '../plaky/client.js'
import type { ICache } from '../cache/interface.js'
import { getBoard } from './get-board.js'
import { buildFields } from '../plaky/field-mapper.js'
import { resolveAssigneeByEmail } from '../utils/resolve-assignee.js'

export interface UpdateItemInput {
  description?: string
  status?: string
  assignee_email?: string
  assignee_emails?: string[]
  due_date?: string
}

interface UpdateItemResult {
  id: string
  url: string
  title: string
}

export async function updateItem(
  input: UpdateItemInput,
  spaceId: string,
  boardId: string,
  itemId: string,
  client: PlakyClient,
  cache: ICache
): Promise<UpdateItemResult> {
  const board = await getBoard(spaceId, boardId, client, cache)

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

  const item = await client.updateItemFields(spaceId, boardId, itemId, fields)

  return {
    id: item.id,
    url: `https://app.plaky.com/d/board/${boardId}?itemId=${itemId}`,
    title: item.title,
  }
}
