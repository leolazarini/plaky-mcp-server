import type { PlakyClient } from '../plaky/client.js'
import type { ICache } from '../cache/interface.js'

export interface BoardSummary {
  space_id: string
  space_name: string
  board_id: string
  board_name: string
}

export async function listBoards(
  client: Pick<PlakyClient, 'apiKeyHash' | 'listSpaces'>,
  cache: ICache
): Promise<BoardSummary[]> {
  const cacheKey = `boards:${client.apiKeyHash}`
  const cached = await cache.get<BoardSummary[]>(cacheKey)
  if (cached) return cached

  const spaces = await client.listSpaces()
  const result: BoardSummary[] = spaces.data.flatMap((space) =>
    (space.boards ?? []).map((board) => ({
      space_id: space.id,
      space_name: space.title,
      board_id: board.id,
      board_name: board.title,
    }))
  )

  await cache.set(cacheKey, result, 300)
  return result
}
