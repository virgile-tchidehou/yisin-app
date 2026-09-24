import { toYisinApiError } from './errors'

export interface YisinApiClientConfig {
  baseUrl: string
  getToken: () => string | null | Promise<string | null>
}

export interface YisinRequestOptions extends RequestInit {
  idempotencyKey?: string
}

export class YisinApiClient {
  private readonly baseUrl: string
  private readonly getToken: YisinApiClientConfig['getToken']

  constructor(config: YisinApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.getToken = config.getToken
  }

  resolveUrl(path: string): string {
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`
  }

  async raw(path: string, options: YisinRequestOptions = {}): Promise<Response> {
    const { idempotencyKey, ...fetchOptions } = options
    const headers = new Headers(fetchOptions.headers)
    const token = await this.getToken()

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    if (idempotencyKey) {
      headers.set('Idempotency-Key', idempotencyKey)
    }

    const body = fetchOptions.body
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

    if (body && !isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(this.resolveUrl(path), {
      ...fetchOptions,
      headers
    })

    if (!response.ok) {
      throw await toYisinApiError(response)
    }

    return response
  }

  async request<T>(path: string, options: YisinRequestOptions = {}): Promise<T> {
    const response = await this.raw(path, options)

    if (response.status === 204) {
      return undefined as T
    }

    return await response.json() as T
  }

  async get<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  async post<T>(
    path: string,
    body?: unknown,
    options?: RequestInit & { idempotencyKey?: string }
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body)
    })
  }

  async patch<T>(
    path: string,
    body?: unknown,
    options?: RequestInit & { idempotencyKey?: string }
  ): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body)
    })
  }

  async delete<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' })
  }

  async upload<T>(path: string, formData: FormData, options?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: formData
    })
  }
}

export function generateIdempotencyKey(prefix = 'yisin'): string {
  return `${prefix}-${crypto.randomUUID()}`
}
