<script setup lang="ts">
import type { NormalizedEvent } from '~/types'
import { monthMatrix, occursOn, sameDay } from '~/utils/events'

const { events, initialDate } = defineProps<{
  events: NormalizedEvent[]
  /** Month to open on; defaults to today. */
  initialDate?: Date
}>()

const today = new Date()

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

const cursor = ref(startOfMonth(initialDate ?? today))

/** Floating popover only works with a real pointer; touch devices get a sheet. */
const canHover = useMediaQuery('(hover: hover) and (pointer: fine)')

const monthLabel = computed(() =>
  new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(cursor.value),
)
const days = computed(() => monthMatrix(cursor.value).flat())
const weekdays = ['一', '二', '三', '四', '五', '六', '日']

function shiftMonth(delta: number) {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + delta, 1)
}

function goToday() {
  cursor.value = startOfMonth(today)
}

function eventsOn(day: Date): NormalizedEvent[] {
  return events.filter(e => occursOn(e, day))
}

// --- detail popover ---
const selected = ref<NormalizedEvent | null>(null)
const anchor = ref<DOMRect | null>(null)
let closeTimer: ReturnType<typeof setTimeout> | undefined

function open(event: NormalizedEvent, el: EventTarget | null) {
  if (!(el instanceof HTMLElement))
    return
  clearTimeout(closeTimer)
  anchor.value = el.getBoundingClientRect()
  selected.value = event
}

function close() {
  clearTimeout(closeTimer)
  selected.value = null
}

function cancelClose() {
  clearTimeout(closeTimer)
}

/** Small grace period so the pointer can travel from the chip into the card. */
function scheduleClose() {
  if (canHover.value)
    closeTimer = setTimeout(() => (selected.value = null), 140)
}

function onChipEnter(event: NormalizedEvent, el: EventTarget | null) {
  if (canHover.value)
    open(event, el)
}

function onChipClick(event: NormalizedEvent, el: EventTarget | null) {
  if (selected.value === event)
    close()
  else
    open(event, el)
}

/** Desktop card position, anchored to the chip and clamped to the viewport. */
const floatStyle = computed(() => {
  if (!canHover.value || !anchor.value)
    return undefined
  const width = 288
  const margin = 8
  const estHeight = 240
  const left = Math.max(margin, Math.min(anchor.value.left, window.innerWidth - width - margin))
  const below = anchor.value.bottom + 6
  const flip = below + estHeight > window.innerHeight
  const top = flip ? Math.max(margin, anchor.value.top - estHeight - 6) : below
  return { left: `${left}px`, top: `${top}px`, width: `${width}px` }
})

watch(cursor, close)
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-600">
        {{ monthLabel }}
      </h2>
      <div class="flex gap-1 items-center">
        <button class="icon-btn" title="上个月" @click="shiftMonth(-1)">
          <div class="i-carbon-chevron-left" />
        </button>
        <button class="text-sm px-2 py-1 rounded-md op70 hover:op100" @click="goToday">
          今天
        </button>
        <button class="icon-btn" title="下个月" @click="shiftMonth(1)">
          <div class="i-carbon-chevron-right" />
        </button>
      </div>
    </div>

    <div class="border border-gray-200 rounded-lg grid grid-cols-7 overflow-hidden dark:border-gray-800">
      <div
        v-for="d in weekdays"
        :key="d"
        class="text-xs py-2 text-center border-b border-gray-200 op50 dark:border-gray-800"
      >
        {{ d }}
      </div>

      <div
        v-for="(cell, i) in days"
        :key="i"
        class="p-1 border-b border-r border-gray-100 min-h-15 min-w-0 dark:border-gray-800/60 sm:min-h-24"
        :class="[
          cell.inMonth ? '' : 'bg-gray-50/60 dark:bg-gray-900/30',
          (i + 1) % 7 === 0 ? 'border-r-0' : '',
          i >= days.length - 7 ? 'border-b-0' : '',
        ]"
      >
        <div
          class="text-xs mb-1 rounded-full flex h-6 w-6 items-center justify-center"
          :class="sameDay(cell.date, today)
            ? 'bg-teal-600 text-white'
            : cell.inMonth ? 'op70' : 'op30'"
        >
          {{ cell.date.getDate() }}
        </div>

        <div class="flex flex-col gap-0.5">
          <button
            v-for="e in eventsOn(cell.date)"
            :key="e.id"
            type="button"
            class="text-xs leading-tight px-1 py-0.5 text-left rounded w-full block truncate transition"
            :class="selected === e
              ? 'bg-teal-600 text-white'
              : 'bg-teal-50 text-teal-800 hover:bg-teal-100 dark:bg-teal-900/40 dark:text-teal-200 dark:hover:bg-teal-900/70'"
            :title="e.name"
            @mouseenter="onChipEnter(e, $event.currentTarget)"
            @mouseleave="scheduleClose()"
            @click="onChipClick(e, $event.currentTarget)"
          >
            {{ e.name }}
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <template v-if="selected && !canHover">
        <div class="bg-black/40 inset-0 fixed z-40" @click="close()" />
        <div class="text-gray-700 p-5 rounded-t-2xl bg-white max-h-[80vh] inset-x-0 bottom-0 fixed z-50 overflow-auto dark:text-gray-200 dark:bg-gray-900">
          <div class="mb-3 flex justify-end">
            <button class="icon-btn" title="关闭" @click="close()">
              <div class="i-carbon-close" />
            </button>
          </div>
          <EventDetailCard :event="selected" />
        </div>
      </template>

      <div
        v-else-if="selected && canHover"
        class="text-gray-700 p-4 card shadow-xl fixed z-50 dark:text-gray-200"
        :style="floatStyle"
        @mouseenter="cancelClose()"
        @mouseleave="scheduleClose()"
      >
        <EventDetailCard :event="selected" />
      </div>
    </Teleport>
  </div>
</template>
