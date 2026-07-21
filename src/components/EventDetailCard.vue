<script setup lang="ts">
import type { NormalizedEvent } from '~/types'
import { resolveEventTheme, tagIconFor } from '~/utils/eventTheme'
import { formatDateRange } from '~/utils/format'

const { event } = defineProps<{ event: NormalizedEvent }>()

const formatLabel: Record<NormalizedEvent['format'], string> = {
  offline: '线下',
  online: '线上',
  hybrid: '线上+线下',
}

/** Resolved theme (primary icon/color + up to 2 secondary icons) for this event's tags, or null if none matched. */
const theme = computed(() => resolveEventTheme(event))

/** Inline CSS vars feeding .ev-themed; undefined keeps the plain card. */
const themeStyle = computed(() => theme.value && {
  '--ev-color': theme.value.primary.color,
  '--ev-color-dark': theme.value.primary.colorDark ?? theme.value.primary.color,
})

/** Each tag paired with its icon definition (if any) for rendering the tag chips. */
const taggedChips = computed(() =>
  event.tags.map(tag => ({ tag, def: tagIconFor(tag) })),
)
</script>

<template>
  <div class="flex flex-col gap-2" :class="theme ? 'ev-themed' : ''" :style="themeStyle">
    <div class="flex gap-2 items-start justify-between">
      <h3 class="text-base leading-snug font-600" :class="theme ? 'ev-title-themed' : ''">
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
        v-for="{ tag, def } in taggedChips"
        :key="tag"
        class="text-xs px-2 py-0.5 rounded bg-gray-100 op80 inline-flex gap-1 items-center dark:bg-gray-800"
      >
        <div v-if="def" :class="[def.icon]" class="ev-icon-tinted text-xs" :style="{ '--ev-icon-c': def.color, '--ev-icon-c-dark': def.colorDark }" />
        {{ tag }}
      </span>
    </div>

    <div class="mt-1 flex gap-2">
      <RouterLink
        :to="`/event/${event.id}`"
        class="text-sm text-white px-3 py-1.5 rounded-md bg-teal-600 inline-flex gap-1 transition items-center justify-center hover:bg-teal-700"
      >
        查看详情
        <div class="i-carbon-arrow-right" />
      </RouterLink>
      <a
        :href="event.url"
        target="_blank"
        rel="noopener"
        class="text-sm px-3 py-1.5 border border-gray-200 rounded-md inline-flex gap-1 transition items-center justify-center hover:text-teal-600 dark:border-gray-700 hover:border-teal-600"
      >
        前往官网
        <div class="i-carbon-arrow-up-right" />
      </a>
    </div>

    <div v-if="theme" class="ev-watermark" aria-hidden="true">
      <div :class="theme.primary.icon" :style="{ fontSize: '70px', color: 'var(--ev-c)' }" />
    </div>
  </div>
</template>
