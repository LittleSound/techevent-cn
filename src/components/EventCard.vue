<script setup lang="ts">
import type { NormalizedEvent } from '~/types'
import { resolveEventTheme, tagIconFor } from '~/utils/eventTheme'
import { formatDateRange, isPast } from '~/utils/format'

const { event } = defineProps<{ event: NormalizedEvent }>()

const formatLabel: Record<NormalizedEvent['format'], string> = {
  offline: '线下',
  online: '线上',
  hybrid: '线上+线下',
}

const past = computed(() => isPast(event.end))

const theme = computed(() => resolveEventTheme(event))

/** Inline CSS vars feeding .ev-themed; undefined keeps the plain card. */
const themeStyle = computed(() => theme.value && {
  '--ev-color': theme.value.primary.color,
  '--ev-color-dark': theme.value.primary.colorDark ?? theme.value.primary.color,
})

const taggedChips = computed(() =>
  event.tags.map(tag => ({ tag, def: tagIconFor(tag) })),
)
</script>

<template>
  <a
    :href="event.url"
    target="_blank"
    rel="noopener"
    class="card"
    p-4 block
    :class="[past ? 'op60 hover:op100' : '', theme ? 'ev-themed' : '']"
    :style="themeStyle"
  >
    <div flex="~ items-start justify-between gap-3">
      <h3 text-lg leading-snug font-600 :class="theme ? 'ev-title-themed' : ''">
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
      <span
        v-for="{ tag, def } in taggedChips"
        :key="tag"

        bg="gray-100 dark:gray-800"

        text-xs px-2 py-0.5 rounded op80 inline-flex gap-1 items-center
      >
        <div v-if="def" :class="def.icon" class="ev-icon-tinted" text-xs :style="{ '--ev-icon-c': def.color, '--ev-icon-c-dark': def.colorDark }" />
        {{ tag }}
      </span>
    </div>

    <div v-if="theme" class="ev-watermark" aria-hidden="true">
      <div
        v-for="def in theme.icons.slice(1).reverse()"
        :key="def.icon"
        class="ev-icon-tinted" :class="[def.icon]"
        :style="{ 'fontSize': '58px', 'marginRight': '-18px', 'marginBottom': '6px', '--ev-icon-c': def.color, '--ev-icon-c-dark': def.colorDark }"
      />
      <div :class="theme.primary.icon" :style="{ fontSize: '105px', color: 'var(--ev-c)' }" />
    </div>
  </a>
</template>
