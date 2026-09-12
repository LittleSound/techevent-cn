<script setup lang="ts">
import type { NormalizedEvent } from '~/types'
import { eventMarkdown } from '~/utils/eventMarkdown'

const { event, variant = 'default' } = defineProps<{ event: NormalizedEvent, variant?: 'default' | 'primary' }>()
const copied = ref(false)
const failed = ref(false)
const { start: resetCopied } = useTimeoutFn(() => copied.value = false, 1500, { immediate: false })

/** Generate on click so navigation always copies the currently displayed event. */
async function copyMarkdown() {
  failed.value = false
  copied.value = false
  try {
    await navigator.clipboard.writeText(eventMarkdown(event))
    copied.value = true
    resetCopied()
  }
  catch {
    failed.value = true
  }
}
</script>

<template>
  <button
    type="button"
    :class="{ 'markdown-primary': variant === 'primary' }"
    title="复制完整活动信息，方便交给 Agent 规划行程"
    hover="border-teal-600 text-teal-600" text-sm px-3 py-1.5 border border-gray-200 rounded-md inline-flex gap-1.5 w-full transition items-center justify-center dark:border-gray-700
    @click="copyMarkdown"
  >
    <div :class="copied && !failed ? 'i-carbon-checkmark' : 'i-carbon-copy'" aria-hidden="true" />
    <span aria-live="polite">{{ failed ? '复制失败，请重试' : copied ? '已复制 Markdown' : '复制 Markdown' }}</span>
  </button>
</template>

<style scoped>
.markdown-primary {
  padding: 0.85rem 1rem;
  color: white;
  background: var(--detail-action, #0d7664);
  border-color: var(--detail-action, #0d7664);
}

.markdown-primary:hover {
  color: white;
  background: var(--detail-action-hover, #115e52);
  border-color: var(--detail-action-hover, #115e52);
}
</style>
