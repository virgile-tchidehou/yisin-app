import { generateIdempotencyKey } from '~/services/yisin-api'
import type {
  ChatMessageResponse,
  ChatSubmissionResponse,
  ConversationSummaryResponse,
  ListConversationsParams
} from '~/services/yisin-api'

export function useYisinConversations() {
  const { api, accessToken } = useYisinApi()
  const { workspace } = useYisinWorkspace()

  const conversations = useState<ConversationSummaryResponse[]>('yisin:conversations', () => [])
  const loading = useState<boolean>('yisin:conversations-loading', () => false)
  const error = useState<Error | null>('yisin:conversations-error', () => null)
  const hasMore = useState<boolean>('yisin:conversations-has-more', () => false)
  const pendingRunIds = useState<Record<string, string>>('yisin:pending-run-ids', () => ({}))

  async function list(params: ListConversationsParams = {}) {
    if (!accessToken.value) {
      conversations.value = []
      hasMore.value = false
      return []
    }

    loading.value = true
    error.value = null

    try {
      const result = await api.conversations.list(params)
      conversations.value = result.items
      hasMore.value = result.has_more
      return result.items
    } catch (cause) {
      error.value = cause instanceof Error ? cause : new Error('Impossible de charger les conversations')
      throw cause
    } finally {
      loading.value = false
    }
  }

  async function get(conversationId: string) {
    return api.conversations.get(conversationId)
  }

  async function getMessages(conversationId: string): Promise<ChatMessageResponse[]> {
    const result = await api.conversations.getMessages(conversationId)
    return result.messages
  }

  async function submitFirstMessage(content: string): Promise<ChatSubmissionResponse> {
    const activeWorkspace = workspace.value

    if (!accessToken.value) {
      throw new Error('Authentification YISIN requise')
    }

    if (!activeWorkspace) {
      throw new Error('Aucun workspace YISIN disponible')
    }

    const submission = await api.conversations.submitMessage(
      {
        workspace_id: activeWorkspace.workspace_id,
        content
      },
      generateIdempotencyKey('conversation')
    )

    if (submission.run) {
      pendingRunIds.value[submission.conversation_id] = submission.run.run_id
    }

    return submission
  }

  async function submitMessage(conversationId: string, content: string): Promise<ChatSubmissionResponse> {
    if (!accessToken.value) {
      throw new Error('Authentification YISIN requise')
    }

    const submission = await api.conversations.submitConversationMessage(
      conversationId,
      { content },
      generateIdempotencyKey('message')
    )

    if (submission.run) {
      pendingRunIds.value[conversationId] = submission.run.run_id
    }

    return submission
  }

  async function rename(conversationId: string, title: string) {
    const updated = await api.conversations.update(conversationId, { title })
    conversations.value = conversations.value.map(conversation =>
      conversation.conversation_id === conversationId ? updated : conversation
    )
    return updated
  }

  async function remove(conversationId: string) {
    await api.conversations.delete(conversationId)
    conversations.value = conversations.value.filter(
      conversation => conversation.conversation_id !== conversationId
    )
  }

  return {
    conversations: readonly(conversations),
    loading: readonly(loading),
    error: readonly(error),
    hasMore: readonly(hasMore),
    pendingRunIds,
    list,
    get,
    getMessages,
    submitFirstMessage,
    submitMessage,
    rename,
    remove
  }
}
