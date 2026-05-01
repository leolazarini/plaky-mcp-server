import type { PlakyClient } from '../plaky/client.js'
import type { ICache } from '../cache/interface.js'
import type { PlakyBoard } from '../plaky/types.js'

export async function getBoard(
  spaceId: string,
  boardId: string,
  client: Pick<PlakyClient, 'getBoard'>,
  cache: ICache
): Promise<PlakyBoard> {
  const cacheKey = `board:${boardId}`
  const cached = await cache.get<PlakyBoard>(cacheKey)
  if (cached) return cached

  const board = await client.getBoard(spaceId, boardId)
  await cache.set(cacheKey, board, 300)
  return board
}
