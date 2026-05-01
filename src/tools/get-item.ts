import type { PlakyClient } from '../plaky/client.js'
import type { PlakyItem } from '../plaky/types.js'

export async function getItem(
  spaceId: string,
  boardId: string,
  itemId: string,
  client: Pick<PlakyClient, 'getItem'>
): Promise<PlakyItem & { url: string }> {
  const item = await client.getItem(spaceId, boardId, itemId)
  return {
    ...item,
    url: `https://app.plaky.com/d/board/${boardId}?itemId=${itemId}`,
  }
}
