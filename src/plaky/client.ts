import { createHash } from 'node:crypto'
import { logger } from '../observability/logger.js'
import type {
  PlakyPaginated,
  PlakySpace,
  PlakyBoard,
  PlakyUser,
  PlakyItem,
  PlakyComment,
} from './types.js'

// Raw shapes returned by the Plaky REST API — differ from the domain types
interface RawFieldOption {
  key: string
  title: string
  color?: string
}

interface RawField {
  id: number
  key: string
  name: string        // domain uses "title"
  type: string        // uppercase, e.g. "STATUS" — domain uses lowercase
  configuration?: { values?: RawFieldOption[] }
}

interface RawGroup {
  id: number
  title: string
}

interface RawBoard {
  id: number
  title: string
  fields?: RawField[]
  groups?: RawGroup[]
}

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
    const method = init?.method ?? 'GET'
    logger.debug({ method, path, body: init?.body }, 'plaky request')

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...(init?.headers as Record<string, string> | undefined),
      },
    })

    const rawBody = await response.text()
    logger.debug({ method, path, status: response.status, body: rawBody }, 'plaky response')

    if (!response.ok) {
      throw new PlakyApiError(response.status, `Plaky ${response.status}: ${rawBody}`)
    }

    return JSON.parse(rawBody) as T
  }

  private mapBoard(raw: RawBoard): PlakyBoard {
    return {
      id: String(raw.id),
      title: raw.title,
      groups: (raw.groups ?? []).map(g => ({ id: String(g.id), title: g.title })),
      fields: (raw.fields ?? []).map(f => ({
        id: String(f.id),
        key: f.key,
        title: f.name,
        type: f.type.toLowerCase(),
        options: f.configuration?.values?.map(v => ({
          id: v.key,
          label: v.title,
          color: v.color,
        })),
      })),
    }
  }

  listSpaces(): Promise<PlakyPaginated<PlakySpace>> {
    return this.request('/spaces?expand=board&pageSize=100')
  }

  async getBoard(spaceId: string, boardId: string): Promise<PlakyBoard> {
    const raw = await this.request<RawBoard>(`/spaces/${spaceId}/boards/${boardId}`)
    return this.mapBoard(raw)
  }

  listUsers(page = 1): Promise<PlakyPaginated<PlakyUser>> {
    return this.request(`/users?page=${page}&pageSize=100&status=ACTIVE`)
  }

  listItems(spaceId: string, boardId: string, page = 1, pageSize = 50, userId?: string): Promise<PlakyPaginated<PlakyItem>> {
    const params = new URLSearchParams({
      expand: 'fields',
      page: String(page),
      pageSize: String(pageSize),
    })
    if (userId) params.set('userId', userId)
    return this.request(`/spaces/${spaceId}/boards/${boardId}/items?${params}`)
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
