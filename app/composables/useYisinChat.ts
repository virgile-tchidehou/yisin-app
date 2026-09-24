import type {
  ChatMessageResponse,
  Clarification,
  DocumentRequest,
  LegalRunResponse,
  PublicCitation,
  RunStatus
} from '~/services/yisin-api'
import { isTerminalRunStatus } from '~/services/yisin-api'

export type YisinChatStatus = 'ready' | 'submitted' | 'streaming' | 'error'

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function useYisinChat(conversationId: string) {
  const { api } = useYisinApi()
  const conversationLoader = useYisinConversation()
  const yisinConversations = useYisinConversations()
  const { pendingRunIds } = yisinConversations

  const messages = useState<ChatMessageResponse[]>(`yisin:chat:${conversationId}:messages`, () => [])
  const run = useState<LegalRunResponse | null>(`yisin:chat:${conversationId}:run`, () => null)
  const status = useState<YisinChatStatus>(`yisin:chat:${conversationId}:status`, () => 'ready')
  const error = useState<Error | null>(`yisin:chat:${conversationId}:error`, () => null)
  const clarification = useState<Clarification | null>(`yisin:chat:${conversationId}:clarification`, () => null)
  const documentRequest = useState<DocumentRequest | null>(`yisin:chat:${conversationId}:document-request`, () => null)
  const citations = useState<PublicCitation[]>(`yisin:chat:${conversationId}:citations`, () => [])
  const lastEventId = useState<string | null>(`yisin:chat:${conversationId}:last-event-id`, () => null)

  const abortController = shallowRef<AbortController | null>(null)

  function applyRunSnapshot(snapshot: LegalRunResponse) {
    run.value = snapshot
    clarification.value = snapshot.clarification
    documentRequest.value = snapshot.document_request
    citations.value = snapshot.citations

    if (snapshot.status === 'failed' || snapshot.status === 'cancelled') {
      status.value = snapshot.status === 'failed' ? 'error' : 'ready'
    } else if (isTerminalRunStatus(snapshot.status)) {
      status.value = 'ready'
    }
  }

  async function refreshMessages() {
    const history = await api.conversations.getMessages(conversationId)
    messages.value = history.messages
    return history.messages
  }

  async function refreshRun(runId: string) {
    const snapshot = await api.legalRuns.get(runId)
    applyRunSnapshot(snapshot)
    return snapshot
  }

  async function followRun(runId: string) {
    abortController.value?.abort()
    abortController.value = new AbortController()
    status.value = 'streaming'

    let reconnectAttempt = 0
    let terminalStatus: RunStatus | null = null

    while (!abortController.value.signal.aborted && reconnectAttempt < 3 && !terminalStatus) {
      try {
        for await (const event of api.legalRuns.stream(runId, {
          lastEventId: lastEventId.value ?? undefined,
          signal: abortController.value.signal
        })) {
          if (event.id) lastEventId.value = event.id
          run.value = run.value ? { ...run.value, status: event.data.status } : run.value

          if (isTerminalRunStatus(event.data.status)) {
            terminalStatus = event.data.status
            break
          }
        }

        if (!terminalStatus) reconnectAttempt += 1
      } catch (cause) {
        if (abortController.value.signal.aborted) return
        reconnectAttempt += 1

        if (reconnectAttempt >= 3) {
          error.value = cause instanceof Error ? cause : new Error('Connexion au traitement YISIN interrompue')
          break
        }

        await sleep(750 * reconnectAttempt)
      }
    }

    if (abortController.value.signal.aborted) return

    const snapshot = await refreshRun(runId)
    await refreshMessages()
    const { [conversationId]: _completedRun, ...remainingPendingRuns } = pendingRunIds.value
    pendingRunIds.value = remainingPendingRuns

    if (snapshot.status === 'failed') {
      error.value = new Error(snapshot.message || snapshot.failure_code || 'Le traitement YISIN a échoué')
      status.value = 'error'
    }
  }

  async function load() {
    error.value = null

    const result = await conversationLoader.load(conversationId)
    messages.value = result.messages

    const lastRunMessage = [...result.messages]
      .reverse()
      .find(message => Boolean(message.run_id))

    const runId = pendingRunIds.value[conversationId] ?? lastRunMessage?.run_id

    if (!runId) {
      status.value = 'ready'
      return result
    }

    const snapshot = await refreshRun(runId)

    if (!isTerminalRunStatus(snapshot.status)) {
      await followRun(snapshot.run_id)
    } else {
      const { [conversationId]: _completedRun, ...remainingPendingRuns } = pendingRunIds.value
      pendingRunIds.value = remainingPendingRuns
    }

    return result
  }

  async function send(content: string) {
    const trimmed = content.trim()
    if (!trimmed || status.value === 'submitted' || status.value === 'streaming') return

    error.value = null
    clarification.value = null
    documentRequest.value = null
    citations.value = []
    lastEventId.value = null
    status.value = 'submitted'

    try {
      const submission = await yisinConversations.submitMessage(conversationId, trimmed)

      await refreshMessages()

      if (submission.assistant_message) {
        messages.value = [
          ...messages.value.filter(message => message.message_id !== submission.assistant_message?.message_id),
          submission.assistant_message
        ]
      }

      if (submission.run) {
        applyRunSnapshot(submission.run)

        if (isTerminalRunStatus(submission.run.status)) {
          await refreshMessages()
        } else {
          await followRun(submission.run.run_id)
        }
      } else {
        status.value = 'ready'
      }
    } catch (cause) {
      error.value = cause instanceof Error ? cause : new Error('Impossible d’envoyer le message')
      status.value = 'error'
      throw cause
    }
  }

  async function answerClarification(answer: string) {
    await send(answer)
  }

  async function cancel() {
    const activeRun = run.value

    abortController.value?.abort()

    if (activeRun && !isTerminalRunStatus(activeRun.status)) {
      await api.legalRuns.cancel(activeRun.run_id)
      await refreshRun(activeRun.run_id)
    }

    status.value = 'ready'
  }

  return {
    messages: readonly(messages),
    run: readonly(run),
    status: readonly(status),
    error: readonly(error),
    clarification: readonly(clarification),
    documentRequest: readonly(documentRequest),
    citations: readonly(citations),
    load,
    send,
    answerClarification,
    cancel,
    refreshMessages,
    refreshRun
  }
}
