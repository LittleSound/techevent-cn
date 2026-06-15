<script setup lang="ts">
import type { NormalizedEvent } from '~/types'
import { formatDateRange } from '~/utils/format'

const { event } = defineProps<{ event: NormalizedEvent }>()

const formatLabel: Record<NormalizedEvent['format'], string> = {
  offline: '线下',
  online: '线上',
  hybrid: '线上+线下',
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex gap-2 items-start justify-between">
      <h3 class="text-base leading-snug font-600">
        {{ event.name }}
      </h3>
      <span class="text-xs op70 shrink-0">{{ formatLabel[event.format] }}</span>
    </div>

    <div class="text-sm op80 flex flex-col gap-1">
      <span class="flex gap-1.5 items-center">
        <div class="i-carbon-calendar shrink-0" /> {{ formatDateRange(event.start, event.end) }}
      </span>
      <span class="flex gap-1.5 items-center">
        <div class="i-carbon-location shrink-0" />
        {{ event.city }}<template v-if="event.country !== '中国'"> · {{ event.country }}</template><template v-if="event.venue"> · {{ event.venue }}</template>
      </span>
      <span v-if="event.organizer" class="flex gap-1.5 items-center">
        <div class="i-carbon-group shrink-0" /> {{ event.organizer }}
      </span>
    </div>

    <p v-if="event.description" class="text-sm leading-relaxed op70">
      {{ event.description }}
    </p>

    <div v-if="event.tags.length" class="flex flex-wrap gap-1.5">
      <span
        v-for="tag in event.tags"
        :key="tag"
        class="text-xs px-2 py-0.5 rounded bg-gray-100 op80 dark:bg-gray-800"
      >
        {{ tag }}
      </span>
    </div>

    <a
      :href="event.url"
      target="_blank"
      rel="noopener"
      class="text-sm text-white mt-1 px-3 py-1.5 rounded-md bg-teal-600 inline-flex gap-1 transition items-center justify-center hover:bg-teal-700"
    >
      前往官网 <div class="i-carbon-arrow-up-right" />
    </a>
  </div>
</template>
