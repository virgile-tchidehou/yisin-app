import type { YisinApiClient } from './client'
import { streamRunEvents, type StreamRunEventsOptions } from './streaming'
import type { LegalRunCreateRequest, LegalRunResponse } from './types'

export class LegalRunsService {
  constructor(private readonly client: YisinApiClient) {}

  async create(
    request: LegalRunCreateRequest,
    idempotencyKey: string
  ): Promise<LegalRunResponse> {
    return this.client.post<LegalRunResponse>('/api/v1/legal-runs', request, {
      idempotencyKey
    })
  }

  async get(runId: string): Promise<LegalRunResponse> {
    return this.client.get<LegalRunResponse>(
      `/api/v1/legal-runs/${encodeURIComponent(runId)}`
    )
  }

  async cancel(runId: string): Promise<unknown> {
    return this.client.post<unknown>(
      `/api/v1/legal-runs/${encodeURIComponent(runId)}/cancel`
    )
  }

  async retry(runId: string, idempotencyKey: string): Promise<unknown> {
    return this.client.post<unknown>(
      `/api/v1/legal-runs/${encodeURIComponent(runId)}/retry`,
      undefined,
      { idempotencyKey }
    )
  }

  stream(runId: string, options?: StreamRunEventsOptions) {
    return streamRunEvents(this.client, runId, options)
  }
}
