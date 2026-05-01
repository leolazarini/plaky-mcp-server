import type { PlakyClient } from '../plaky/client.js'
import type { PlakyComment } from '../plaky/types.js'

export async function addComment(
  spaceId: string,
  boardId: string,
  itemId: string,
  text: string,
  client: Pick<PlakyClient, 'addComment'>
): Promise<PlakyComment> {
  return client.addComment(spaceId, boardId, itemId, text)
}
