<script setup lang="ts">
import type { NormalizedEvent } from '~/types'

defineProps<{ events: NormalizedEvent[] }>()
</script>

<template>
  <section aria-labelledby="related-events-heading" min-w-0>
    <h2 id="related-events-heading" text-sm tracking-wide font-600 mb-3 op60>
      相关活动
    </h2>
    <ul class="related-list" aria-label="相关活动">
      <li v-for="event in events" :key="event.id" min-w-0>
        <EventCard :event="event" variant="muted" h-full />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.related-list {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: min(88%, 22rem);
  gap: 0.75rem;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
  padding: 2px;
  scrollbar-width: none;
}

.related-list::-webkit-scrollbar {
  display: none;
}

.related-list > li {
  scroll-snap-align: start;
}

@media (min-width: 1024px) {
  .related-list {
    grid-auto-flow: row;
    grid-auto-columns: auto;
    overflow: visible;
    padding: 2px;
  }
}
</style>
