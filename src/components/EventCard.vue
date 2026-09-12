<script setup lang="ts">
import type { NormalizedEvent } from '~/types'
import { resolveEventTheme, tagIconFor } from '~/utils/eventTheme'
import { formatDateRange, isPast } from '~/utils/format'

const { event, variant = 'default' } = defineProps<{
  event: NormalizedEvent
  variant?: 'default' | 'compact'
}>()

const compact = computed(() => variant === 'compact')

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
  (compact.value ? event.tags.slice(0, 2) : event.tags).map(tag => ({ tag, def: tagIconFor(tag) })),
)
</script>

<template>
  <RouterLink
    :to="`/event/${event.id}`"
    class="card"
    p-4
    block
    :class="[past ? 'op60 hover:op100' : '', compact ? 'event-card-compact' : theme ? 'ev-themed' : '']"
    :style="themeStyle"
  >
    <div flex="~ items-start justify-between gap-3">
      <h3 leading-snug font-600 :class="compact ? 'text-base' : ['text-lg', theme ? 'ev-title-themed' : '']">
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
      <span v-if="event.organizer && !compact" flex="~ items-center gap-1">
        <div i-carbon-group shrink-0 /> {{ event.organizer }}
      </span>
    </div>

    <p v-if="event.description" text-sm leading-relaxed mt-2 op70 :class="{ 'compact-description': compact }">
      {{ event.description }}
    </p>

    <div v-if="event.tags.length" mt-3 flex="~ wrap gap-1.5">
      <span
        v-for="{ tag, def } in taggedChips"
        :key="tag"

        bg="gray-100 dark:gray-800"

        text-xs px-2 py-0.5 rounded op80 inline-flex gap-1 items-center
      >
        <div v-if="def" :class="[def.icon, compact ? 'text-gray-500 dark:text-gray-400' : 'ev-icon-tinted']" text-xs :style="compact ? undefined : { '--ev-icon-c': def.color, '--ev-icon-c-dark': def.colorDark }" />
        {{ tag }}
      </span>
    </div>

    <div v-if="theme && !compact" class="ev-watermark" aria-hidden="true">
      <div
        v-for="def in theme.icons.slice(1).reverse()"
        :key="def.icon"
        class="ev-icon-tinted" :class="[def.icon]"
        :style="{ 'fontSize': '58px', 'marginRight': '-18px', 'marginBottom': '6px', '--ev-icon-c': def.color, '--ev-icon-c-dark': def.colorDark }"
      />
      <div :class="theme.primary.icon" :style="{ fontSize: '105px', color: 'var(--ev-c)' }" />
    </div>
  </RouterLink>
</template>

<style scoped>
.event-card-compact h3 {
  transition: color 150ms;
}

.event-card-compact:hover h3,
.event-card-compact:focus-visible h3 {
  color: var(--ev-color, #0f766e);
}

html.dark .event-card-compact:hover h3,
html.dark .event-card-compact:focus-visible h3 {
  color: var(--ev-color-dark, #2dd4bf);
}

.compact-description {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
</style>
