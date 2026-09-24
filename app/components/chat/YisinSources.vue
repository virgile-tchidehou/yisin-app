<script setup lang="ts">
import type { PublicCitation } from '~/services/yisin-api'

defineProps<{
  citations: readonly PublicCitation[]
}>()
</script>

<template>
  <div v-if="citations.length" class="mt-4 space-y-2">
    <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
      Sources
    </p>

    <div class="grid gap-2">
      <a
        v-for="citation in citations"
        :key="citation.evidence_id"
        :href="citation.source_url || undefined"
        :target="citation.source_url ? '_blank' : undefined"
        :rel="citation.source_url ? 'noopener noreferrer' : undefined"
        class="rounded-lg border border-default bg-elevated/40 px-3 py-2 transition-colors"
        :class="citation.source_url ? 'hover:bg-elevated' : 'cursor-default'"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-sm font-medium text-highlighted truncate">
              {{ citation.document_title || citation.reference }}
            </p>
            <p class="mt-1 text-xs text-muted line-clamp-2">
              {{ citation.excerpt }}
            </p>
          </div>

          <UBadge
            v-if="citation.authority_level"
            :label="citation.authority_level"
            color="neutral"
            variant="subtle"
            size="xs"
            class="shrink-0"
          />
        </div>

        <p v-if="citation.page" class="mt-1 text-xs text-dimmed">
          Page {{ citation.page }}
        </p>
      </a>
    </div>
  </div>
</template>
