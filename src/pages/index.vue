<script setup lang="ts">
import { newEventUrl } from '~/config'

const { filter, filtered, filteredAnyTime, cities, tags, toggle, reset } = useEvents()

/** Persisted so the user's preferred view survives reloads. */
const view = useStorage<'list' | 'calendar'>('techevent-view', 'list')

const monthFmt = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' })

/** Group the filtered events into month buckets for list-view section headings. */
const groups = computed(() => {
  const map = new Map<string, typeof filtered.value>()
  for (const event of filtered.value) {
    const key = monthFmt.format(event.start)
    if (!map.has(key))
      map.set(key, [])
    map.get(key)!.push(event)
  }
  return [...map.entries()].map(([label, events]) => ({ label, events }))
})

/** Open the calendar on the next upcoming event so it isn't an empty month. */
const calendarStart = computed(() => {
  const now = new Date()
  const next = filteredAnyTime.value.find(e => e.end >= now)
  return (next ?? filteredAnyTime.value.at(-1))?.start ?? now
})
</script>

<template>
  <div mx-auto pb-16 max-w-4xl>
    <TheHeader />

    <div px-4>
      <FilterBar
        v-model:search="filter.search"
        v-model:time="filter.time"
        v-model:view="view"
        :cities="cities"
        :tags="tags"
        :selected-cities="filter.cities"
        :selected-tags="filter.tags"
        :show-time="view === 'list'"
        @toggle="toggle"
        @reset="reset"
      />

      <p text-sm mt-4 op60>
        共 {{ view === 'list' ? filtered.length : filteredAnyTime.length }} 个活动
      </p>
    </div>

    <template v-if="view === 'calendar'">
      <CalendarView mt-4 sm:px-4 :events="filteredAnyTime" :initial-date="calendarStart" />
    </template>

    <template v-else>
      <div v-if="filtered.length" mt-2 px-4 flex="~ col gap-8">
        <section v-for="group in groups" :key="group.label">
          <h2 text-sm tracking-wide font-600 mb-3 op50>
            {{ group.label }}
          </h2>
          <div grid="~ cols-1 sm:cols-2 gap-3">
            <EventCard v-for="event in group.events" :key="event.id" :event="event" />
          </div>
        </section>
      </div>

      <div v-else mt-12 px-4 text-center op60>
        <div i-carbon-calendar text-4xl mx-auto mb-3 op50 />
        <p>没有符合条件的活动。</p>
        <a :href="newEventUrl" target="_blank" rel="noopener" text-teal-600 hover:underline>
          知道一个？欢迎提交 →
        </a>
      </div>
    </template>

    <footer text-sm mt-16 px-4 pt-6 text-center border-t border-gray-100 op50 dark:border-gray-800>
      以开源精神维护 · 由社区共同补充 ·
      <a :href="newEventUrl" target="_blank" rel="noopener" text-teal-600 hover:underline>
        提交活动
      </a>
    </footer>
  </div>
</template>
