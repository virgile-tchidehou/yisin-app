import type { YisinApiClient } from './client'
import type { MeResponse } from './types'

export class IdentityService {
  constructor(private readonly client: YisinApiClient) {}

  async getMe(): Promise<MeResponse> {
    return this.client.get<MeResponse>('/api/v1/me')
  }
}
