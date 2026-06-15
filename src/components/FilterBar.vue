<script setup lang="ts">
import type { Facet, TimeRange } from '~/utils/events'

const { cities, tags, selectedCities, selectedTags, showTime = true } = defineProps<{
  cities: Facet[]
  tags: Facet[]
  selectedCities: string[]
  selectedTags: string[]
  /** Hide the upcoming/past/all toggle when the host view scopes time itself. */
  showTime?: boolean
}>()

const emit = defineEmits<{
  toggle: ['cities' | 'tags', string]
  reset: []
}>()

const search = defineModel<string>('search', { required: true })
const time = defineModel<TimeRange>('time', { required: true })
const view = defineModel<'list' | 'calendar'>('view', { required: true })

/** Filter panel is collapsed by default to keep the header compact. */
const expanded = ref(false)

const timeOptions: { value: TimeRange, label: string }[] = [
  { value: 'upcoming', label: '即将举行' },
  { value: 'past', label: '已结束' },
  { value: 'all', label: '全部' },
]

const viewOptions = [
  { value: 'list', icon: 'i-carbon-list', label: '列表' },
  { value: 'calendar', icon: 'i-carbon-calendar', label: '日历' },
] as const

const activeCount = computed(() => selectedCities.length + selectedTags.length)

const hasActiveFilters = computed(() => activeCount.value > 0 || search.value.length > 0)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex gap-2 items-center">
      <div class="grow relative">
        <div class="i-carbon-search op50 left-3 top-1/2 absolute -translate-y-1/2" />
        <input
          v-model="search"
          type="search"
          placeholder="搜索活动、城市、关键词…"
          class="py-2 pl-9 pr-3 outline-none border border-gray-200 rounded-lg bg-transparent w-full dark:border-gray-700 focus:border-teal-500"
        >
      </div>

      <button
        class="text-sm px-3 py-2 border rounded-lg flex shrink-0 gap-1 transition items-center"
        :class="expanded || activeCount
          ? 'border-teal-500 text-teal-600'
          : 'border-gray-200 op80 hover:op100 dark:border-gray-700'"
        @click="expanded = !expanded"
      >
        <div class="i-carbon-filter" />
        <span class="hidden sm:inline">筛选</span>
        <span v-if="activeCount" class="text-xs text-white ml-0.5 px-1 rounded-full bg-teal-600 flex h-4 min-w-4 items-center justify-center">
          {{ activeCount }}
        </span>
      </button>

      <div class="p-1 border border-gray-200 rounded-lg flex shrink-0 gap-1 items-center dark:border-gray-700">
        <button
          v-for="v in viewOptions"
          :key="v.value"
          class="text-sm px-2 py-1 rounded-md flex gap-1 transition items-center"
          :class="view === v.value ? 'bg-teal-600 text-white' : 'op70 hover:op100'"
          :title="v.label"
          @click="view = v.value"
        >
          <div :class="v.icon" />
          <span class="hidden sm:inline">{{ v.label }}</span>
        </button>
      </div>
    </div>

    <div v-if="expanded" class="p-3 border border-gray-100 rounded-lg flex flex-col gap-3 dark:border-gray-800">
      <div v-if="showTime" class="flex gap-2 items-center">
        <span class="text-xs op50 shrink-0 w-12">时间</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="opt in timeOptions"
            :key="opt.value"
            class="chip"
            :class="time === opt.value ? 'chip-active' : 'chip-idle'"
            @click="time = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div v-if="cities.length" class="flex gap-2 items-start">
        <span class="text-xs mt-1.5 op50 shrink-0 w-12">地区</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="c in cities"
            :key="c.value"
            class="chip"
            :class="selectedCities.includes(c.value) ? 'chip-active' : 'chip-idle'"
            @click="emit('toggle', 'cities', c.value)"
          >
            {{ c.value }} <span class="text-xs op70">{{ c.count }}</span>
          </button>
        </div>
      </div>

      <div v-if="tags.length" class="flex gap-2 items-start">
        <span class="text-xs mt-1.5 op50 shrink-0 w-12">关键词</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="t in tags"
            :key="t.value"
            class="chip"
            :class="selectedTags.includes(t.value) ? 'chip-active' : 'chip-idle'"
            @click="emit('toggle', 'tags', t.value)"
          >
            {{ t.value }} <span class="text-xs op70">{{ t.count }}</span>
          </button>
        </div>
      </div>

      <div v-if="hasActiveFilters">
        <button class="text-sm op60 hover:op100" @click="emit('reset')">
          清除筛选
        </button>
      </div>
    </div>
  </div>
</template>
