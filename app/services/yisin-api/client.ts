/**
 * Client HTTP pour yisin-api
 * Gère l'authentification bearer et les erreurs
 */

import type { ApiErrorResponse, YisinApiError as YisinApiErrorType } from './types'

export class YisinApiError extends Error implements YisinApiErrorType {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public requestId?: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'YisinApiError'
  }
}

export interface YisinApiClientConfig {
  baseUrl: string
  getToken: () => string | Promise<string | null> | null
}

export class YisinApiClient {
  private baseUrl: string
  private getToken: () => string | Promise<string | null> | null

  constructor(config: YisinApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.getToken = config.getToken
  }

  /**
   * Effectue une requête HTTP vers yisin-api
   */
  async request<T>(
    path: string,
    options: RequestInit & {
      idempotencyKey?: string
    } = {}
  ): Promise<T> {
    const { idempotencyKey, ...fetchOptions } = options

    // Construire l'URL
    const url = `${this.baseUrl}${path}`

    // Construire les headers
    const headers = new Headers(fetchOptions.headers)

    // Ajouter le token bearer si disponible
    const token = await this.getToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    // Ajouter Idempotency-Key si fourni
    if (idempotencyKey) {
      headers.set('Idempotency-Key', idempotencyKey)
    }

    // Content-Type par défaut pour les requêtes avec body
    if (fetchOptions.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    // Effectuer la requête
    const response = await fetch(url, {
      ...fetchOptions,
      headers
    })

    // Gérer les erreurs
    if (!response.ok) {
      await this.handleError(response)
    }

    // Retourner le JSON si status != 204
    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  }

  /**
   * Gère les erreurs HTTP
   */
  private async handleError(response: Response): Promise<never> {
    let errorData: ApiErrorResponse | null = null

    try {
      errorData = await response.json()
    } catch {
      // Réponse non-JSON
    }

    const code = errorData?.code || 'unknown_error'
    const message = errorData?.message || response.statusText || 'Une erreur est survenue'
    const requestId = errorData?.request_id

    throw new YisinApiError(code, message, response.status, requestId, errorData?.details)
  }

  /**
   * GET request
   */
  async get<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  /**
   * POST request
   */
  async post<T>(
    path: string,
    body?: unknown,
    options?: RequestInit & { idempotencyKey?: string }
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    })
  }

  /**
   * PATCH request
   */
  async patch<T>(
    path: string,
    body?: unknown,
    options?: RequestInit & { idempotencyKey?: string }
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    })
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' })
  }

  /**
   * Upload multipart/form-data
   */
  async upload<T>(path: string, formData: FormData, options?: RequestInit): Promise<T> {
    // Ne pas définir Content-Type, le navigateur le fera avec boundary
    const token = await this.getToken()
    const headers = new Headers(options?.headers)

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      method: 'POST',
      headers,
      body: formData
    })

    if (!response.ok) {
      await this.handleError(response)
    }

    return response.json()
  }
}

/**
 * Génère une clé d'idempotence unique
 */
export function generateIdempotencyKey(prefix = 'yisin'): string {
  return `${prefix}-${crypto.randomUUID()}`
}
