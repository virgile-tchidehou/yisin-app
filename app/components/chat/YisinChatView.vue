<script setup lang="ts">
const props = defineProps<{
  conversationId: string
}>()

const toast = useToast()
const input = ref('')

const chat = useYisinChat(props.conversationId)
const conversationState = useYisinConversation()

const title = computed(() => conversationState.conversation.value?.title ?? null)
const busy = computed(() => chat.status.value === 'submitted' || chat.status.value === 'streaming')

function noopOpen() {}

async function loadConversation() {
  try {
    await chat.load()
  } catch (cause) {
    toast.add({
      description: cause instanceof Error ? cause.message : 'Impossible de charger la conversation',
      icon: 'i-lucide-alert-circle',
      color: 'error',
      duration: 0
    })
  }
}

async function submit() {
  const value = input.value.trim()
  if (!value || busy.value) return

  input.value = ''

  try {
    await chat.send(value)
  } catch {
    // useYisinChat already exposes the normalized error state.
  }
}

async function answerClarification(answer: string) {
  try {
    await chat.answerClarification(answer)
  } catch {
    // Error is displayed by the chat state below.
  }
}

async function stop() {
  try {
    await chat.cancel()
  } catch (cause) {
    toast.add({
      description: cause instanceof Error ? cause.message : 'Impossible d’annuler le traitement',
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

onMounted(loadConversation)

watch(() => props.conversationId, async () => {
  await loadConversation()
})
</script>

<template>
  <UDashboardPanel
    id="chat"
    class="relative min-h-0"
    :ui="{ body: 'p-0 sm:p-0 overscroll-none' }"
  >
    <template #header>
      <Navbar>
        <template #title>
          <ChatTitle
            :chat-id="conversationId"
            :title="title"
            :is-owner="true"
            @update:title="conversationState.conversation.value && (conversationState.conversation.value.title = $event)"
          />
        </template>
      </Navbar>
    </template>

    <template #body>
      <UContainer class="flex-1 flex flex-col gap-4 sm:gap-6">
        <div class="flex-1 pt-(--ui-header-height) pb-4 sm:pb-6">
          <div
            v-if="conversationState.loading.value && !chat.messages.value.length"
            class="flex h-full items-center justify-center"
          >
            <div class="flex items-center gap-2 text-sm text-muted">
              <ChatIndicator />
              <span>Chargement de la conversation…</span>
            </div>
          </div>

          <div v-else class="mx-auto flex w-full max-w-3xl flex-col gap-6 py-6">
            <div
              v-for="message in chat.messages.value"
              :key="message.message_id"
              class="flex"
              :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[88%]"
                :class="message.role === 'user'
                  ? 'rounded-2xl bg-elevated px-4 py-3 text-sm text-highlighted'
                  : 'w-full text-sm text-highlighted'"
              >
                <p
                  v-if="message.role === 'user'"
                  class="whitespace-pre-wrap"
                >
                  {{ message.content }}
                </p>

                <template v-else>
                  <ChatComark
                    :value="message.content"
                    :streaming="false"
                  />
                  <ChatYisinSources :citations="message.citations" />
                </template>
              </div>
            </div>

            <div v-if="busy" class="flex items-center gap-2 text-sm text-muted">
              <ChatIndicator />
              <span>
                {{ chat.status.value === 'submitted' ? 'Envoi de votre demande…' : 'Analyse en cours…' }}
              </span>
            </div>

            <UAlert
              v-if="chat.error.value"
              color="error"
              variant="subtle"
              icon="i-lucide-alert-circle"
              title="Le traitement a rencontré un problème"
              :description="chat.error.value.message"
            />

            <ChatYisinClarificationCard
              v-if="chat.clarification.value"
              :clarification="chat.clarification.value"
              :disabled="busy"
              @submit="answerClarification"
            />

            <ChatYisinDocumentRequestCard
              v-if="chat.documentRequest.value"
              :request="chat.documentRequest.value"
            />
          </div>
        </div>

        <ChatPrompt
          v-model="input"
          mode="yisin"
          :status="chat.status.value"
          :error="chat.error.value || undefined"
          :open="noopOpen"
          class="sticky bottom-0 [view-transition-name:chat-prompt] rounded-b-none z-10"
          @submit.prevent="submit"
          @stop="stop"
          @reload="submit"
        />
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
