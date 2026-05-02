import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { PlakyClient } from '../plaky/client.js'
import type { ICache } from '../cache/interface.js'
import { listBoards } from './list-boards.js'
import { getBoard } from './get-board.js'
import { listUsers } from './list-users.js'
import { createItem } from './create-item.js'
import { listItems } from './list-items.js'
import { getItem } from './get-item.js'
import { updateItem } from './update-item.js'
import { addComment } from './add-comment.js'
import { toMcpErrorMessage } from '../plaky/errors.js'
import { config } from '../config.js'

function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

function err(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true }
}

function resolveBoard(space_id?: string, board_id?: string): { sid: string; bid: string } | null {
  const sid = space_id ?? config.PLAKY_DEFAULT_SPACE_ID
  const bid = board_id ?? config.PLAKY_DEFAULT_BOARD_ID
  if (!sid || !bid) return null
  return { sid, bid }
}

export function registerTools(server: McpServer, client: PlakyClient, cache: ICache) {
  server.tool('plaky_list_boards', 'Lista todos os boards visíveis', {}, async () => {
    try {
      return ok(await listBoards(client, cache))
    } catch (e) {
      return err(toMcpErrorMessage(e))
    }
  })

  server.tool(
    'plaky_get_board',
    'Retorna estrutura completa de um board',
    {
      space_id: z.string().optional(),
      board_id: z.string().optional(),
    },
    async ({ space_id, board_id }) => {
      const board = resolveBoard(space_id, board_id)
      if (!board) return err('Informe space_id e board_id (use plaky_list_boards para descobrir os IDs disponíveis).')
      try {
        return ok(await getBoard(board.sid, board.bid, client, cache))
      } catch (e) {
        return err(toMcpErrorMessage(e))
      }
    }
  )

  server.tool(
    'plaky_list_users',
    'Lista usuários do workspace com busca opcional',
    { query: z.string().optional() },
    async ({ query }) => {
      try {
        return ok(await listUsers(query, client, cache))
      } catch (e) {
        return err(toMcpErrorMessage(e))
      }
    }
  )

  server.tool(
    'plaky_create_item',
    [
      'Cria um ticket num board Plaky.',
      'SEMPRE perguntar ao usuário antes de chamar esta tool:',
      '1. Cliente (group) — obrigatório. Use plaky_get_board para listar os grupos disponíveis.',
      '2. Projeto — obrigatório.',
      '3. Responsável (assignee_email) — obrigatório.',
      'Não chamar esta tool sem ter os três itens acima confirmados pelo usuário.',
    ].join(' '),
    {
      title: z.string().min(1),
      group: z.string().min(1).describe('Nome do grupo/cliente no board (ex: "Acme Corp"). Use plaky_get_board para listar os grupos disponíveis.'),
      project: z.string().min(1).describe('Nome do projeto dentro do cliente.'),
      board_id: z.string().optional(),
      space_id: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      assignee_email: z.string().email().optional().describe('Email do responsável pelo ticket.'),
      assignee_emails: z.array(z.string().email()).optional(),
      due_date: z.string().optional(),
    },
    async (input) => {
      const board = resolveBoard(input.space_id, input.board_id)
      if (!board) return err('Informe space_id e board_id (use plaky_list_boards para descobrir os IDs disponíveis).')
      try {
        return ok(await createItem(input, board.sid, board.bid, client, cache))
      } catch (e) {
        return err(e instanceof Error ? e.message : toMcpErrorMessage(e))
      }
    }
  )

  server.tool(
    'plaky_list_items',
    [
      'Lista tickets de um board com filtros opcionais.',
      'Se o usuário disser "minhas tarefas" ou similar, use o e-mail do próprio usuário da conversa.',
      'Se o usuário quiser filtrar por outra pessoa e o e-mail não for conhecido, perguntar antes de chamar esta tool.',
    ].join(' '),
    {
      space_id: z.string().optional(),
      board_id: z.string().optional(),
      query: z.string().optional(),
      status: z.string().optional(),
      assignee_email: z.string().email().optional().describe('E-mail do responsável. Use o e-mail do usuário atual se ele disser "meu/minhas". Para outros, perguntar se não souber.'),
      limit: z.number().int().min(1).max(100).optional(),
    },
    async ({ space_id, board_id, query, status, assignee_email, limit }) => {
      const board = resolveBoard(space_id, board_id)
      if (!board) return err('Informe space_id e board_id (use plaky_list_boards para descobrir os IDs disponíveis).')
      try {
        return ok(await listItems({ spaceId: board.sid, boardId: board.bid, query, status, assigneeEmail: assignee_email, limit }, client, cache))
      } catch (e) {
        return err(toMcpErrorMessage(e))
      }
    }
  )

  server.tool(
    'plaky_get_item',
    'Retorna detalhes completos de um ticket',
    {
      space_id: z.string().optional(),
      board_id: z.string().optional(),
      item_id: z.string().min(1),
    },
    async ({ space_id, board_id, item_id }) => {
      const board = resolveBoard(space_id, board_id)
      if (!board) return err('Informe space_id e board_id (use plaky_list_boards para descobrir os IDs disponíveis).')
      try {
        return ok(await getItem(board.sid, board.bid, item_id, client))
      } catch (e) {
        return err(toMcpErrorMessage(e))
      }
    }
  )

  server.tool(
    'plaky_update_item',
    'Atualiza campos de um ticket (status, responsável, data de entrega, descrição)',
    {
      space_id: z.string().optional(),
      board_id: z.string().optional(),
      item_id: z.string().min(1),
      description: z.string().optional(),
      status: z.string().optional(),
      assignee_email: z.string().email().optional(),
      assignee_emails: z.array(z.string().email()).optional(),
      due_date: z.string().optional(),
    },
    async (input) => {
      const board = resolveBoard(input.space_id, input.board_id)
      if (!board) return err('Informe space_id e board_id (use plaky_list_boards para descobrir os IDs disponíveis).')
      try {
        return ok(await updateItem(input, board.sid, board.bid, input.item_id, client, cache))
      } catch (e) {
        return err(e instanceof Error ? e.message : toMcpErrorMessage(e))
      }
    }
  )

  server.tool(
    'plaky_add_comment',
    'Adiciona um comentário a um ticket',
    {
      space_id: z.string().optional(),
      board_id: z.string().optional(),
      item_id: z.string().min(1),
      text: z.string().min(1),
    },
    async ({ space_id, board_id, item_id, text }) => {
      const board = resolveBoard(space_id, board_id)
      if (!board) return err('Informe space_id e board_id (use plaky_list_boards para descobrir os IDs disponíveis).')
      try {
        return ok(await addComment(board.sid, board.bid, item_id, text, client))
      } catch (e) {
        return err(toMcpErrorMessage(e))
      }
    }
  )
}
