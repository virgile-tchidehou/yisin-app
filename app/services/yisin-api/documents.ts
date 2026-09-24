import type { YisinApiClient } from './client'
import type {
  DocumentAnalysisStartRequest,
  DocumentAnalysisStartResponse,
  DocumentListResponse,
  DocumentResponse,
  ListDocumentsParams
} from './types'

export interface UploadDocumentInput {
  workspaceId: string
  file: File | Blob
  filename?: string
  metadata?: Record<string, unknown>
}

export class DocumentsService {
  constructor(private readonly client: YisinApiClient) {}

  async list(params: ListDocumentsParams = {}): Promise<DocumentListResponse> {
    const searchParams = new URLSearchParams()

    if (params.workspace_id) searchParams.set('workspace_id', params.workspace_id)
    if (params.limit !== undefined) searchParams.set('limit', String(params.limit))
    if (params.offset !== undefined) searchParams.set('offset', String(params.offset))

    const query = searchParams.toString()
    const path = query ? `/api/v1/documents?${query}` : '/api/v1/documents'

    return this.client.get<DocumentListResponse>(path)
  }

  async get(documentId: string): Promise<DocumentResponse> {
    return this.client.get<DocumentResponse>(
      `/api/v1/documents/${encodeURIComponent(documentId)}`
    )
  }

  async upload(input: UploadDocumentInput): Promise<DocumentResponse> {
    const formData = new FormData()
    formData.append('workspace_id', input.workspaceId)

    if (typeof File !== 'undefined' && input.file instanceof File) {
      formData.append('file', input.file)
    } else {
      formData.append('file', input.file, input.filename ?? 'document')
    }

    if (input.metadata) {
      formData.append('metadata', JSON.stringify(input.metadata))
    }

    return this.client.upload<DocumentResponse>('/api/v1/documents', formData)
  }

  async delete(documentId: string): Promise<void> {
    return this.client.delete<void>(
      `/api/v1/documents/${encodeURIComponent(documentId)}`
    )
  }

  async process(documentId: string, idempotencyKey: string): Promise<unknown> {
    return this.client.post<unknown>(
      `/api/v1/documents/${encodeURIComponent(documentId)}/process`,
      undefined,
      { idempotencyKey }
    )
  }

  async getAnalysis(documentId: string): Promise<unknown> {
    return this.client.get<unknown>(
      `/api/v1/documents/${encodeURIComponent(documentId)}/analysis`
    )
  }

  async startAnalysis(
    request: DocumentAnalysisStartRequest,
    idempotencyKey: string
  ): Promise<DocumentAnalysisStartResponse> {
    return this.client.post<DocumentAnalysisStartResponse>(
      '/api/v1/document-analyses',
      request,
      { idempotencyKey }
    )
  }
}
