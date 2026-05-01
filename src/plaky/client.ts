import { createHash } from 'node:crypto'
import type {
  PlakyPaginated,
  PlakySpace,
  PlakyBoard,
  PlakyUser,
  PlakyItem,
  PlakyComment,
} from './types.js'

export class PlakyApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'PlakyApiError'
  }
}

export class PlakyClient {
  readonly apiKeyHash: string

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string
  ) {
    this.apiKeyHash = createHash('sha256').update(apiKey).digest('hex').slice(0, 16)
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...(init?.headers as Record<string, string> | undefined),
      },
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new PlakyApiError(response.status, `Plaky ${response.status}: ${body}`)
    }

    return response.json() as Promise<T>
  }

  listSpaces(): Promise<PlakyPaginated<PlakySpace>> {
    return this.request('/spaces?expand=board&pageSize=100')
  }

  getBoard(spaceId: string, boardId: string): Promise<PlakyBoard> {
    return this.request(`/spaces/${spaceId}/boards/${boardId}`)
  }

  listUsers(page = 1): Promise<PlakyPaginated<PlakyUser>> {
    return this.request(`/users?page=${page}&pageSize=100&status=ACTIVE`)
  }

  listItems(spaceId: string, boardId: string, page = 1, pageSize = 50): Promise<PlakyPaginated<PlakyItem>> {
    return this.request(
      `/spaces/${spaceId}/boards/${boardId}/items?expand=fields&page=${page}&pageSize=${pageSize}`
    )
  }

  getItem(spaceId: string, boardId: string, itemId: string): Promise<PlakyItem> {
    return this.request(`/spaces/${spaceId}/boards/${boardId}/items/${itemId}?expand=fields`)
  }

  createItem(spaceId: string, boardId: string, body: Record<string, unknown>): Promise<PlakyItem> {
    return this.request(`/spaces/${spaceId}/boards/${boardId}/items`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  updateItemFields(
    spaceId: string,
    boardId: string,
    itemId: string,
    fields: Record<string, unknown>
  ): Promise<PlakyItem> {
    return this.request(`/spaces/${spaceId}/boards/${boardId}/items/${itemId}/fields`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    })
  }

  addComment(spaceId: string, boardId: string, itemId: string, text: string): Promise<PlakyComment> {
    return this.request(`/spaces/${spaceId}/boards/${boardId}/items/${itemId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
  }
}
