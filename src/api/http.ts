import { getEnv } from '../config/env.ts'

export const REQUEST_TIMEOUT_MS = 10_000

export interface FieldError {
  field: string
  message: string
}

/** The single error type the UI receives for any failed API call. */
export class ApiError extends Error {
  /** HTTP status, or 0 when the server could not be reached. */
  readonly status: number
  readonly fieldErrors: FieldError[]

  constructor(status: number, message: string, fieldErrors: FieldError[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST'
  query?: Record<string, string | number | undefined>
  body?: unknown
  signal?: AbortSignal
}

const MESSAGES = {
  unauthorized: 'Not authorised. Check VITE_API_TOKEN in your .env file.',
  timeout: 'The server took too long to respond. Please try again.',
  server: 'Something went wrong on the server. Please try again.',
  unreachable: "Can't reach the chat server. Is the API running?",
  invalidResponse: 'The server sent an unexpected response.',
} as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isFieldError = (value: unknown): value is FieldError =>
  isRecord(value) && typeof value.field === 'string' && typeof value.message === 'string'

const buildUrl = (apiUrl: string, path: string, query: RequestOptions['query'] = {}) => {
  const url = new URL(`${apiUrl}${path}`)
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }
  return url.toString()
}

const readErrorPayload = async (response: Response): Promise<unknown> => {
  try {
    return JSON.parse(await response.text())
  } catch {
    return undefined
  }
}

/**
 * Normalises the API's error shapes:
 * 401 -> { message, statusCode, error }; others -> { error: { message } }, where the
 * message is a string or, for validation errors, a list of { field, message }.
 */
const toApiError = async (response: Response): Promise<ApiError> => {
  const { status } = response
  if (status === 401) return new ApiError(status, MESSAGES.unauthorized)
  if (status === 408) return new ApiError(status, MESSAGES.timeout)

  const payload = await readErrorPayload(response)
  const message =
    isRecord(payload) && isRecord(payload.error) ? payload.error.message : undefined
  const fieldErrors = Array.isArray(message) ? message.filter(isFieldError) : []

  const [firstFieldError] = fieldErrors
  if (firstFieldError) return new ApiError(status, firstFieldError.message, fieldErrors)
  if (status >= 500) return new ApiError(status, MESSAGES.server)
  if (typeof message === 'string' && message) return new ApiError(status, message)
  return new ApiError(status, `Request failed with status ${status}.`)
}

/** Authenticated JSON request against the chat API with a timeout and normalised errors. */
export async function request<T>(
  path: string,
  { method = 'GET', query, body, signal }: RequestOptions = {},
): Promise<T> {
  const { apiUrl, apiToken } = getEnv()

  // AbortSignal.any() would be simpler but is unavailable in Safari < 17.4 (Vite targets 16.4).
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort(signal?.reason)
  const timeoutId = setTimeout(
    () => controller.abort(new DOMException('Request timed out', 'TimeoutError')),
    REQUEST_TIMEOUT_MS,
  )
  if (signal?.aborted) abortFromCaller()
  signal?.addEventListener('abort', abortFromCaller, { once: true })

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${apiToken}`,
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  try {
    const response = await fetch(buildUrl(apiUrl, path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) throw await toApiError(response)

    const text = await response.text()
    if (!text) return undefined as T
    try {
      return JSON.parse(text) as T
    } catch {
      throw new ApiError(response.status, MESSAGES.invalidResponse)
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    // Cancelled by the caller (e.g. TanStack Query on unmount): not an error for the UI.
    if (signal?.aborted) throw error
    if (controller.signal.aborted) throw new ApiError(408, MESSAGES.timeout)
    throw new ApiError(0, MESSAGES.unreachable)
  } finally {
    clearTimeout(timeoutId)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}
