<script setup lang="ts">
import type { Clarification } from '~/services/yisin-api'

const props = defineProps<{
  clarification: Readonly<Clarification>
  disabled?: boolean
}>()

const emit = defineEmits<{
  submit: [answer: string]
}>()

const freeText = ref('')
const selected = ref<string[]>([])
const other = ref('')

function submitFreeText() {
  const value = freeText.value.trim()
  if (value) emit('submit', value)
}

function submitSingle(value: string) {
  if (!props.disabled) emit('submit', value)
}

function submitMulti() {
  const answers = [...selected.value]
  const otherValue = other.value.trim()

  if (otherValue) answers.push(otherValue)
  if (answers.length) emit('submit', answers.join(', '))
}
</script>

<template>
  <UCard class="mt-4">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-circle-help" class="size-4 text-primary" />
        <span class="text-sm font-medium">Précision nécessaire</span>
        <span v-if="clarification.step_index" class="ml-auto text-xs text-dimmed">
          Étape {{ clarification.step_index }}
        </span>
      </div>
    </template>

    <p class="text-sm text-highlighted">
      {{ clarification.question }}
    </p>

    <div v-if="clarification.kind === 'yes_no'" class="mt-4 flex gap-2">
      <UButton
        label="Oui"
        :disabled="disabled"
        @click="submitSingle('Oui')"
      />
      <UButton
        label="Non"
        color="neutral"
        variant="outline"
        :disabled="disabled"
        @click="submitSingle('Non')"
      />
    </div>

    <div
      v-else-if="clarification.kind === 'single_choice'"
      class="mt-4 grid gap-2"
    >
      <UButton
        v-for="option in clarification.options"
        :key="option"
        :label="option"
        color="neutral"
        variant="outline"
        block
        :disabled="disabled"
        @click="submitSingle(option)"
      />

      <form
        v-if="clarification.allow_other"
        class="flex gap-2"
        @submit.prevent="submitSingle(other.trim())"
      >
        <UInput
          v-model="other"
          placeholder="Autre réponse"
          class="flex-1"
          :disabled="disabled"
        />
        <UButton
          type="submit"
          label="Envoyer"
          :disabled="disabled || !other.trim()"
        />
      </form>
    </div>

    <div
      v-else-if="clarification.kind === 'multi_choice'"
      class="mt-4 space-y-3"
    >
      <UCheckboxGroup
        v-model="selected"
        :items="clarification.options"
        :disabled="disabled"
      />

      <UInput
        v-if="clarification.allow_other"
        v-model="other"
        placeholder="Autre réponse"
        :disabled="disabled"
      />

      <UButton
        label="Continuer"
        :disabled="disabled || (!selected.length && !other.trim())"
        @click="submitMulti"
      />
    </div>

    <form
      v-else
      class="mt-4 flex gap-2"
      @submit.prevent="submitFreeText"
    >
      <UInput
        v-model="freeText"
        :type="clarification.kind === 'date' ? 'date' : 'text'"
        :placeholder="clarification.kind === 'date' ? undefined : 'Votre réponse'"
        class="flex-1"
        :disabled="disabled"
      />
      <UButton
        type="submit"
        label="Envoyer"
        :disabled="disabled || !freeText.trim()"
      />
    </form>
  </UCard>
</template>
