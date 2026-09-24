import type {
  ChatMessageResponse,
  ConversationSummaryResponse
} from '~/services/yisin-api'

export function useYisinConversation() {
  const { api, accessToken } = useYisinApi()

  const conversation = useState<ConversationSummaryResponse | null>('yisin:conversation', () => null)
  const messages = useState<ChatMessageResponse[]>('yisin:conversation-messages', () => [])
  const loading = useState<boolean>('yisin:conversation-loading', () => false)
  const error = useState<Error | null>('yisin:conversation-error', () => null)

  async function load(conversationId: string) {
    if (!accessToken.value) {
      throw new Error('Authentification YISIN requise')
    }

    loading.value = true
    error.value = null

    try {
      const [summary, history] = await Promise.all([
        api.conversations.get(conversationId),
        api.conversations.getMessages(conversationId)
      ])

      conversation.value = summary
      messages.value = history.messages

      return {
        conversation: summary,
        messages: history.messages
      }
    } catch (cause) {
      error.value = cause instanceof Error ? cause : new Error('Impossible de charger la conversation')
      throw cause
    } finally {
      loading.value = false
    }
  }

  function reset() {
    conversation.value = null
    messages.value = []
    error.value = null
  }

  return {
    conversation: readonly(conversation),
    messages: readonly(messages),
    loading: readonly(loading),
    error: readonly(error),
    load,
    reset
  }
}
