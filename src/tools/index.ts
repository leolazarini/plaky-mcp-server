import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { PlakyClient } from '../plaky/client.js'
import type { ICache } from '../cache/interface.js'
import { listBoards } from './list-boards.js'
import { getBoard } from './get-board.js'
import { listUsers } from './list-users.js'
import { createItem } from './create-item.js'
import { toMcpErrorMessage } from '../plaky/errors.js'
import { config } from '../config.js'

function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

function err(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true }
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
      try {
        const sid = space_id ?? config.PLAKY_DEFAULT_SPACE_ID
        const bid = board_id ?? config.PLAKY_DEFAULT_BOARD_ID
        return ok(await getBoard(sid, bid, client, cache))
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
    'Cria um ticket num board com resolução semântica de campos',
    {
      title: z.string().min(1),
      board_id: z.string().optional(),
      space_id: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      assignee_email: z.string().email().optional(),
      assignee_emails: z.array(z.string().email()).optional(),
      due_date: z.string().optional(),
    },
    async (input) => {
      try {
        const sid = input.space_id ?? config.PLAKY_DEFAULT_SPACE_ID
        const bid = input.board_id ?? config.PLAKY_DEFAULT_BOARD_ID
        return ok(await createItem(input, sid, bid, client, cache))
      } catch (e) {
        return err(e instanceof Error ? e.message : toMcpErrorMessage(e))
      }
    }
  )
}
