import type { PlakyBoard } from './types.js'

export interface FieldInput {
  description?: string
  status?: string
  dueDate?: string
}

export function buildFields(
  input: FieldInput,
  board: PlakyBoard,
  assigneeUserIds: string[]
): Record<string, unknown> {
  const fields: Record<string, unknown> = {}

  if (input.description) {
    const f = board.fields.find((f) => f.type === 'rich_text')
    if (f) fields[f.title] = input.description
  }

  if (input.status) {
    const f = board.fields.find((f) => f.type === 'status')
    if (f) {
      const option = f.options?.find(
        (o) => o.label.toLowerCase() === input.status!.toLowerCase()
      )
      if (!option) {
        const valid = f.options?.map((o) => o.label).join(', ') ?? 'nenhuma'
        throw new Error(`Status inválido: "${input.status}". Opções válidas: ${valid}`)
      }
      fields[f.title] = option.label
    }
  }

  if (assigneeUserIds.length > 0) {
    const f = board.fields.find((f) => f.type === 'person')
    if (f) {
      fields[f.title] = { users: assigneeUserIds.map((id) => ({ id })) }
    }
  }

  if (input.dueDate) {
    const f = board.fields.find((f) => f.type === 'date_time' || f.type === 'date')
    if (f) fields[f.title] = input.dueDate
  }

  return fields
}
