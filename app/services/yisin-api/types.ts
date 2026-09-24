/**
 * Types TypeScript pour les contrats yisin-api
 * Générés depuis BACKEND_CONTRACTS.md et NEW_CHAT_BACKEND_CONTRACT.md
 */

// ============================================================================
// Identité et Workspaces
// ============================================================================

export type WorkspaceKind = 'personal' | 'family' | 'professional' | 'organization'
export type AccountStatus = 'active' | 'suspended' | 'closed'

export interface Workspace {
  workspace_id: string
  kind: WorkspaceKind
  name: string
  roles: string[]
  permissions: string[]
}

export interface MeResponse {
  account_id: string
  status: AccountStatus
  workspaces: Workspace[]
}

// ============================================================================
// Conversations
// ============================================================================

export type ConversationMode = 'chat' | 'document_analysis'

export interface ConversationSummaryResponse {
  conversation_id: string
  title: string
  created_at: string
  updated_at: string
  workspace_id: string | null
  last_message_at: string | null
  ephemeral: boolean
  archived: boolean
  document_id: string | null
  document_ids: string[]
  mode: ConversationMode
}

export interface ConversationCreateRequest {
  workspace_id: string
  title?: string | null
  ephemeral?: boolean
  document_id?: string | null
}

export interface ConversationUpdateRequest {
  title?: string | null
  archived?: boolean | null
}

export interface ConversationHistoryResponse {
  items: ConversationSummaryResponse[]
  limit: number
  offset: number
  has_more: boolean
}

// ============================================================================
// Messages
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system'
export type FeedbackRating = 'positive' | 'negative'

export interface ChatMessageResponse {
  message_id: string
  role: MessageRole
  content: string
  created_at: string
  run_id: string | null
  response_status: string | null
  citations: PublicCitation[]
  feedback_rating: FeedbackRating | null
  metadata: Record<string, unknown>
}

export interface ConversationMessagesResponse {
  conversation_id: string
  messages: ChatMessageResponse[]
}

export interface ChatMessageCreateRequest {
  workspace_id: string
  conversation_id?: string | null
  content: string
  document_id?: string | null
}

export interface ConversationMessageCreateRequest {
  content: string
}

export interface ChatSubmissionResponse {
  conversation_id: string
  run: LegalRunResponse | null
  assistant_message: ChatMessageResponse | null
}

export interface MessageFeedbackRequest {
  rating: FeedbackRating
}

export interface MessageFeedbackResponse {
  message_id: string
  rating: FeedbackRating
}

// ============================================================================
// Legal Runs
// ============================================================================

export type RunStatus =
  | 'created'
  | 'executing'
  | 'authorizing'
  | 'quota_reserved'
  | 'validating_input'
  | 'analyzing_query'
  | 'routing_corpus'
  | 'retrieving'
  | 'reranking'
  | 'building_evidence'
  | 'drafting'
  | 'verifying_claims'
  | 'verifying_citations'
  | 'finalizing'
  | 'cancellation_requested'
  | 'needs_input'
  | 'completed'
  | 'cancelled'
  | 'failed'
  // Legacy compatibility
  | 'needs_clarification'
  | 'insufficient_evidence'
  | 'validation_rejected'

export type RunAction =
  | 'answer_directly'
  | 'ask_clarification'
  | 'ask_for_document'
  | 'refuse'
  | 'escalate'

export type ClarificationKind = 'free_text' | 'yes_no' | 'single_choice' | 'multi_choice' | 'date'

export interface Clarification {
  question_id: string
  question: string
  kind: ClarificationKind
  options: string[]
  allow_other: boolean
  step_index: number | null
  fact_key: string | null
}

export interface DocumentRequest {
  request_id: string
  purpose: string
  accepted_document_categories: string[]
  required: boolean
  multiple_allowed: boolean
}

export type MatterStatus =
  | 'understanding'
  | 'clarifying'
  | 'researching'
  | 'reasoning'
  | 'answering'
  | 'answered'
  | 'resolved'
  | 'closed'

export interface Matter {
  matter_id: string
  status: MatterStatus
  goal: string | null
  clarification_count: number
  answered_at: string | null
  resolved_at: string | null
  mode: string
  analysis_intent: string | null
  document_kinds: string[]
  authority_statuses: string[]
}

export interface LegalRunResponse {
  run_id: string
  conversation_id: string
  workspace_id: string
  status: RunStatus
  question: string
  result_text: string | null
  failure_code: string | null
  created_at: string
  completed_at: string | null
  updated_at: string
  citations: PublicCitation[]
  validation_diagnostics: Record<string, unknown> | null
  action: RunAction | null
  message: string | null
  clarification: Clarification | null
  document_request: DocumentRequest | null
  matter: Matter | null
  answer_contract: Record<string, unknown> | null
  warnings: string[]
  replayed: boolean
}

export interface LegalRunCreateRequest {
  workspace_id: string
  conversation_id?: string | null
  question: string
  document_id?: string | null
}

// ============================================================================
// Citations
// ============================================================================

export type SourceType = 'legal_source' | 'institutional_web' | 'user_document' | 'user_provided_text' | string
export type AuthorityLevel = 'OFFICIAL_PRIMARY' | 'OFFICIAL_SECONDARY' | 'USER_DOCUMENT' | 'UNKNOWN' | null

export interface PublicCitation {
  evidence_id: string
  reference: string
  document_title: string | null
  excerpt: string
  source_type: SourceType
  source_url: string | null
  page: number | null
  authority_level: AuthorityLevel
}

// ============================================================================
// Documents
// ============================================================================

export type DocumentStatus = 'uploaded' | 'scanning' | 'ready' | 'infected' | 'scan_failed'
export type QuarantineStatus = 'not_scanned' | 'scanning' | 'clean' | 'infected' | 'scan_failed'
export type AnalysisStatus = 'pending' | 'queued' | 'processing' | 'completed' | 'partial' | 'failed'

export interface DocumentResponse {
  document_id: string
  workspace_id: string
  original_filename: string
  mime_type: string
  size_bytes: number
  sha256: string
  status: DocumentStatus
  quarantine_status: QuarantineStatus
  analysis_status: AnalysisStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  conversation_eligible: boolean
}

export interface DocumentListResponse {
  items: DocumentResponse[]
  limit: number
  offset: number
  has_more: boolean
}

export interface DocumentAnalysisStartRequest {
  workspace_id: string
  document_ids: string[]
  instruction?: string | null
}

export interface DocumentAnalysisStartResponse {
  mode: 'document_analysis'
  conversation_id: string
  document_ids: string[]
  run: LegalRunResponse
}

// ============================================================================
// SSE Streaming
// ============================================================================

export interface SSEEvent<T = unknown> {
  id: string
  event: string
  data: T
}

export interface RunEventData {
  status: RunStatus
  data: {
    capabilities?: string[]
    freshness?: string
    response_mode?: string
    submitted_document_ids?: string[]
    entry_mode?: string
    citations?: PublicCitation[]
  }
  created_at: string
}

// ============================================================================
// Erreurs
// ============================================================================

export interface ApiErrorResponse {
  code: string
  message: string
  request_id?: string
  details?: Record<string, unknown>
}

export class YisinApiError extends Error {
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

// ============================================================================
// Query Parameters
// ============================================================================

export interface ListConversationsParams {
  limit?: number
  offset?: number
  search?: string | null
  archived?: boolean
}

export interface ListDocumentsParams {
  workspace_id?: string
  limit?: number
  offset?: number
}

export interface ListLegalRunsParams {
  limit?: number
  offset?: number
}
