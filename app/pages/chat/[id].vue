<script setup lang="ts">
const route = useRoute()
const { accessToken } = useYisinApi()

const conversationId = computed(() => String(route.params.id))
</script>

<template>
  <ChatYisinChatView
    v-if="accessToken"
    :conversation-id="conversationId"
  />

  <ChatLegacyChatView v-else />
</template>
