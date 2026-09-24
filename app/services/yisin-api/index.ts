import { YisinApiClient, type YisinApiClientConfig } from './client'
import { ConversationsService } from './conversations'
import { DocumentsService } from './documents'
import { IdentityService } from './identity'
import { LegalRunsService } from './legal-runs'

export * from './client'
export * from './conversations'
export * from './documents'
export * from './errors'
export * from './identity'
export * from './legal-runs'
export * from './streaming'
export * from './types'

export function createYisinApi(config: YisinApiClientConfig) {
  const client = new YisinApiClient(config)

  return {
    client,
    conversations: new ConversationsService(client),
    legalRuns: new LegalRunsService(client),
    documents: new DocumentsService(client),
    identity: new IdentityService(client)
  }
}

export type YisinApi = ReturnType<typeof createYisinApi>
