import type { PlakyClient } from '../plaky/client.js'
import type { ICache } from '../cache/interface.js'
import type { PlakyComment, PlakyUser } from '../plaky/types.js'

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function mentionSpan(userId: string, displayName: string, index: number): string {
  const escaped = escapeHtml(displayName)
  return (
    `<span class="mention" contenteditable="false" data-id="${userId}" data-value="${escaped}"` +
    ` data-type="user" data-denotation-char="@" data-index="${index}">` +
    `<span contenteditable="false"><span class="ql-mention-denotation-char">@</span>${escaped}</span></span>`
  )
}

async function getUsers(
  client: Pick<PlakyClient, 'apiKeyHash' | 'listUsers'>,
  cache: ICache
): Promise<PlakyUser[]> {
  const key = `users:${client.apiKeyHash}`
  let users = await cache.get<PlakyUser[]>(key)
  if (!users) {
    const res = await client.listUsers()
    users = res.data
    await cache.set(key, users, 900)
  }
  return users
}

function findUser(users: PlakyUser[], name: string): PlakyUser | undefined {
  const q = name.toLowerCase()
  return (
    users.find((u) => u.name.toLowerCase() === q) ??
    users.find((u) => u.name.toLowerCase().startsWith(q)) ??
    users.find((u) => u.name.toLowerCase().includes(q))
  )
}

async function toQuillHtml(
  text: string,
  client: Pick<PlakyClient, 'apiKeyHash' | 'listUsers'>,
  cache: ICache
): Promise<string> {
  const hasMentions = /@[\wÀ-ɏ]/.test(text)

  if (!hasMentions) {
    return text
      .split('\n')
      .map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`)
      .join('')
  }

  const users = await getUsers(client, cache)
  const mentionRe = /@([\wÀ-ɏ]+)/g

  const buildParagraph = (line: string): string => {
    let html = ''
    let cursor = 0
    let idx = 0
    let m: RegExpExecArray | null
    mentionRe.lastIndex = 0

    while ((m = mentionRe.exec(line)) !== null) {
      html += escapeHtml(line.slice(cursor, m.index))
      const user = findUser(users, m[1])
      html += user ? mentionSpan(user.id, user.name, idx++) : escapeHtml(m[0])
      cursor = m.index + m[0].length
    }

    html += escapeHtml(line.slice(cursor))
    return `<p>${html || '<br>'}</p>`
  }

  return text.split('\n').map(buildParagraph).join('')
}

export async function addComment(
  spaceId: string,
  boardId: string,
  itemId: string,
  text: string,
  client: Pick<PlakyClient, 'addComment' | 'apiKeyHash' | 'listUsers'>,
  cache: ICache
): Promise<PlakyComment> {
  const html = await toQuillHtml(text, client, cache)
  return client.addComment(spaceId, boardId, itemId, html)
}
