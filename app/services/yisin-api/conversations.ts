/**
 * Service Conversations pour yisin-api
 */

import type { YisinApiClient } from './client'
import type {
  ChatMessageCreateRequest,
  ChatSubmissionResponse,
  ConversationCreateRequest,
  ConversationHistoryResponse,
  ConversationMessageCreateRequest,
  ConversationMessagesResponse,
  ConversationSummaryResponse,
  ConversationUpdateRequest,
  ListConversationsParams,
  MessageFeedbackRequest,
  MessageFeedbackResponse
} from './types'

export class ConversationsService {
  constructor(private client: YisinApiClient) {}

  /**
   * Liste les conversations
   */
  async list(params: ListConversationsParams = {}): Promise<ConversationHistoryResponse> {
    const searchParams = new URLSearchParams()

    if (params.limit !== undefined) searchParams.set('limit', params.limit.toString())
    if (params.offset !== undefined) searchParams.set('offset', params.offset.toString())
    if (params.search) searchParams.set('search', params.search)
    if (params.archived !== undefined) searchParams.set('archived', params.archived.toString())

    const query = searchParams.toString()
    const path = query ? `/api/v1/conversations?${query}` : '/api/v1/conversations'

    return this.client.get<ConversationHistoryResponse>(path)
  }

  /**
   * Récupère une conversation
   */
  async get(conversationId: string): Promise<ConversationSummaryResponse> {
    return this.client.get<ConversationSummaryResponse>(`/api/v1/conversations/${encodeURIComponent(conversationId)}`)
  }

  /**
   * Récupère les messages d'une conversation
   */
  async getMessages(conversationId: string): Promise<ConversationMessagesResponse> {
    return this.client.get<ConversationMessagesResponse>(
      `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`
    )
  }

  /**
   * Crée une conversation vide (optionnel)
   */
  async create(request: ConversationCreateRequest): Promise<ConversationSummaryResponse> {
    return this.client.post<ConversationSummaryResponse>('/api/v1/conversations', request)
  }

  /**
   * Met à jour une conversation (rename/archive)
   */
  async update(
    conversationId: string,
    request: ConversationUpdateRequest
  ): Promise<ConversationSummaryResponse> {
    return this.client.patch<ConversationSummaryResponse>(
      `/api/v1/conversations/${encodeURIComponent(conversationId)}`,
      request
    )
  }

  /**
   * Supprime une conversation
   */
  async delete(conversationId: string): Promise<void> {
    return this.client.delete<void>(`/api/v1/conversations/${encodeURIComponent(conversationId)}`)
  }

  /**
   * Envoie la première question (crée conversation implicitement)
   */
  async submitMessage(
    request: ChatMessageCreateRequest,
    idempotencyKey: string
  ): Promise<ChatSubmissionResponse> {
    return this.client.post<ChatSubmissionResponse>(
      '/api/v1/conversations/messages',
      request,
      { idempotencyKey }
    )
  }

  /**
   * Continue une conversation existante
   */
  async submitConversationMessage(
    conversationId: string,
    request: ConversationMessageCreateRequest,
    idempotencyKey: string
  ): Promise<ChatSubmissionResponse> {
    return this.client.post<ChatSubmissionResponse>(
      `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
      request,
      { idempotencyKey }
    )
  }

  /**
   * Envoie un feedback sur un message assistant
   */
  async setFeedback(
    conversationId: string,
    messageId: string,
    request: MessageFeedbackRequest
  ): Promise<MessageFeedbackResponse> {
    return this.client.patch<MessageFeedbackResponse>(
      `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/feedback`,
      request
    )
  }

  /**
   * Retry d'un message assistant
   */
  async retryMessage(
    conversationId: string,
    messageId: string,
    idempotencyKey: string
  ): Promise<unknown> {
    return this.client.post(
      `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/retry`,
      undefined,
      { idempotencyKey }
    )
  }
}
