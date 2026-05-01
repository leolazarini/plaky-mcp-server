import { describe, it, expect } from 'vitest'
import { buildFields } from '../../src/plaky/field-mapper.js'
import type { PlakyBoard } from '../../src/plaky/types.js'

const board: PlakyBoard = {
  id: 'b1',
  title: 'Dev Board',
  groups: [{ id: 'g1', title: 'Backlog' }],
  fields: [
    { id: 'f1', key: 'status-1', title: 'Status', type: 'status', options: [
      { id: 'o1', label: 'To Do', color: 'blue' },
      { id: 'o2', label: 'In Progress', color: 'yellow' },
      { id: 'o3', label: 'Bug', color: 'red' },
    ]},
    { id: 'f2', key: 'person-1', title: 'Assignee', type: 'person' },
    { id: 'f3', key: 'rich_text-1', title: 'Description', type: 'rich_text' },
    { id: 'f4', key: 'date_time-1', title: 'Due Date', type: 'date_time' },
  ],
}

describe('buildFields', () => {
  it('returns empty object when no optional fields provided', () => {
    const result = buildFields({}, board, [])
    expect(result).toEqual({})
  })

  it('maps status string to Plaky field by label', () => {
    const result = buildFields({ status: 'Bug' }, board, [])
    expect(result['Status']).toBe('Bug')
  })

  it('throws for unrecognised status with list of valid options', () => {
    expect(() => buildFields({ status: 'Nonexistent' }, board, [])).toThrow(
      /Opções válidas: To Do, In Progress, Bug/
    )
  })

  it('maps assignee user IDs to person field', () => {
    const result = buildFields({}, board, ['user-1', 'user-2'])
    expect(result['Assignee']).toEqual({ users: [{ id: 'user-1' }, { id: 'user-2' }] })
  })

  it('maps description to rich_text field', () => {
    const result = buildFields({ description: 'A bug was found' }, board, [])
    expect(result['Description']).toBe('A bug was found')
  })

  it('maps due_date to date_time field', () => {
    const result = buildFields({ dueDate: '2026-06-01T00:00:00Z' }, board, [])
    expect(result['Due Date']).toBe('2026-06-01T00:00:00Z')
  })

  it('combines all fields when all inputs provided', () => {
    const result = buildFields(
      { status: 'To Do', description: 'desc', dueDate: '2026-06-01T00:00:00Z' },
      board,
      ['user-1']
    )
    expect(Object.keys(result)).toHaveLength(4)
  })
})
