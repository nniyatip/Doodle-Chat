import { ApiError, ERROR_MESSAGES, isRecord, request } from './http.ts'

/** A chat message exactly as returned by the API. */
export interface Message {
  _id: string
  message: string
  author: string
  /** ISO 8601 timestamp. */
  createdAt: string
}

export interface NewMessage {
  message: string
  author: string
}

export const MESSAGES_PAGE_SIZE = 50

/** The API rejects longer (trimmed) messages. */
export const MESSAGE_MAX_LENGTH = 500

/**
 * `before` returns the newest messages older than a timestamp, `after` the messages newer
 * than it; both come back in chronological order. The API rejects combining them, so the
 * type does too.
 */
export type GetMessagesParams = { limit?: number; signal?: AbortSignal } & (
  { before?: string; after?: never } | { after?: string; before?: never }
)

const isMessage = (value: unknown): value is Message =>
  isRecord(value) &&
  typeof value._id === 'string' &&
  typeof value.message === 'string' &&
  typeof value.author === 'string' &&
  typeof value.createdAt === 'string'

export async function getMessages({
  before,
  after,
  limit,
  signal,
}: GetMessagesParams = {}): Promise<Message[]> {
  const data = await request<unknown>('/messages', {
    query: { before, after, limit },
    signal,
  })

  if (!Array.isArray(data) || !data.every(isMessage)) {
    throw new ApiError(200, ERROR_MESSAGES.invalidResponse)
  }
  return data
}

export async function createMessage(
  { message, author }: NewMessage,
  signal?: AbortSignal,
): Promise<Message> {
  const data = await request<unknown>('/messages', {
    method: 'POST',
    body: { message, author },
    signal,
  })

  if (!isMessage(data)) {
    throw new ApiError(201, ERROR_MESSAGES.invalidResponse)
  }
  return data
}
