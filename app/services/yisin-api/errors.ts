import type { ApiErrorResponse } from './types'

export class YisinApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly requestId?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'YisinApiError'
  }
}

export async function toYisinApiError(response: Response): Promise<YisinApiError> {
  let payload: ApiErrorResponse | null = null

  try {
    payload = await response.json() as ApiErrorResponse
  } catch {
    // Non-JSON error responses are normalized below.
  }

  return new YisinApiError(
    payload?.code ?? 'unknown_error',
    payload?.message ?? response.statusText ?? 'Une erreur est survenue',
    response.status,
    payload?.request_id,
    payload?.details
  )
}
