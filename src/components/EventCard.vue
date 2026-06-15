<script setup lang="ts">
import type { NormalizedEvent } from '~/types'
import { formatDateRange, isPast } from '~/utils/format'

const { event } = defineProps<{ event: NormalizedEvent }>()

const formatLabel: Record<NormalizedEvent['format'], string> = {
  offline: '线下',
  online: '线上',
  hybrid: '线上+线下',
}

const past = computed(() => isPast(event.end))
</script>

<template>
  <a
    :href="event.url"
    target="_blank"
    rel="noopener"
    class="card"
    p-4 block
    :class="past ? 'op60 hover:op100' : ''"
  >
    <div flex="~ items-start justify-between gap-3">
      <h3 text-lg leading-snug font-600>
        {{ event.name }}
      </h3>
      <span text-xs mt-1 op70 shrink-0>{{ formatLabel[event.format] }}</span>
    </div>

    <div flex="~ wrap items-center gap-x-4 gap-y-1" text-sm mt-2 op80>
      <span flex="~ items-center gap-1">
        <div i-carbon-calendar shrink-0 /> {{ formatDateRange(event.start, event.end) }}
      </span>
      <span flex="~ items-center gap-1">
        <div i-carbon-location shrink-0 />
        {{ event.city }}<template v-if="event.country !== '中国'"> · {{ event.country }}</template>
      </span>
      <span v-if="event.organizer" flex="~ items-center gap-1">
        <div i-carbon-group shrink-0 /> {{ event.organizer }}
      </span>
    </div>

    <p v-if="event.description" text-sm leading-relaxed mt-2 op70>
      {{ event.description }}
    </p>

    <div v-if="event.tags.length" mt-3 flex="~ wrap gap-1.5">
      <span v-for="tag in event.tags" :key="tag" text-xs px-2 py-0.5 rounded bg="gray-100 dark:gray-800" op80>
        {{ tag }}
      </span>
    </div>
  </a>
</template>
