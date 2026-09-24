<script setup lang="ts">
import type { DocumentRequest } from '~/services/yisin-api'

defineProps<{
  request: DocumentRequest
}>()
</script>

<template>
  <UCard class="mt-4">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-file-up" class="size-4 text-primary" />
        <span class="text-sm font-medium">Document demandé</span>
      </div>
    </template>

    <p class="text-sm text-highlighted">
      {{ request.purpose }}
    </p>

    <div v-if="request.accepted_document_categories.length" class="mt-3 flex flex-wrap gap-1.5">
      <UBadge
        v-for="category in request.accepted_document_categories"
        :key="category"
        :label="category"
        color="neutral"
        variant="subtle"
      />
    </div>

    <p class="mt-3 text-xs text-muted">
      Le dépôt de document sera activé dans la prochaine tranche d’intégration.
    </p>
  </UCard>
</template>
