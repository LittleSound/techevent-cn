<script setup lang="ts">
import type { NormalizedEvent } from '~/types'
import { layoutWeek, monthMatrix, sameDay } from '~/utils/events'
import { resolveEventTheme } from '~/utils/eventTheme'

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
const weekdays = ['一', '二', '三', '四', '五', '六', '日']

/** Each week carries its day cells plus the laid-out event bars for that row. */
const weeks = computed(() =>
  monthMatrix(cursor.value).map((cells) => {
    const segments = layoutWeek(cells.map(c => c.date), events)
    const lanes = segments.reduce((max, s) => Math.max(max, s.lane + 1), 0)
    return { cells, segments, lanes }
  }),
)

/** One lookup per event id; segments of multi-week events share the entry. */
const themeById = computed(() =>
  new Map(events.map(e => [e.id, resolveEventTheme(e)])),
)

function shiftMonth(delta: number) {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + delta, 1)
}

function goToday() {
  cursor.value = startOfMonth(today)
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
    <div class="mb-4 px-4 flex items-center justify-between sm:px-0">
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

    <div class="border-y border-gray-200 sm:border dark:border-gray-800 sm:rounded-lg sm:overflow-hidden">
      <div class="border-b border-gray-200 grid grid-cols-7 dark:border-gray-800">
        <div
          v-for="d in weekdays"
          :key="d"
          class="text-[10px] py-1.5 text-center op50 sm:text-xs"
        >
          {{ d }}
        </div>
      </div>

      <div
        v-for="(week, w) in weeks"
        :key="w"
        class="min-h-13 relative sm:min-h-24"
        :class="w < weeks.length - 1 ? 'border-b border-gray-100 dark:border-gray-800/60' : ''"
      >
        <!-- Background columns: vertical separators (desktop only) and out-of-month shading. -->
        <div class="grid grid-cols-7 inset-0 absolute">
          <div
            v-for="(cell, c) in week.cells"
            :key="c"
            :class="[
              cell.inMonth ? '' : 'bg-gray-50/60 dark:bg-gray-900/30',
              c < 6 ? 'sm:border-r sm:border-gray-100 sm:dark:border-gray-800/60' : '',
            ]"
          />
        </div>

        <!-- Content: day numbers on row 1, event bars on the lanes below. -->
        <div
          class="pb-1 gap-y-0.5 grid grid-cols-7 relative"
          :style="{ gridTemplateRows: `auto repeat(${week.lanes}, auto)` }"
        >
          <div
            v-for="(cell, c) in week.cells"
            :key="c"
            class="px-0.5 pt-0.5"
            :style="{ gridColumn: c + 1, gridRow: 1 }"
          >
            <div
              class="text-[10px] rounded-full flex h-5 w-5 items-center justify-center sm:text-xs sm:h-6 sm:w-6"
              :class="sameDay(cell.date, today)
                ? 'bg-teal-600 text-white'
                : cell.inMonth ? 'op70' : 'op30'"
            >
              {{ cell.date.getDate() }}
            </div>
          </div>

          <button
            v-for="seg in week.segments"
            :key="seg.event.id + seg.startCol"
            type="button"
            class="text-[10px] leading-4.5 mx-0.5 px-1 text-left block truncate transition sm:text-xs sm:leading-5"
            :class="[
              themeById.get(seg.event.id)
                ? (selected === seg.event ? 'ev-bar ev-bar-selected' : 'ev-bar')
                : (selected === seg.event
                  ? 'bg-teal-600 text-white'
                  : 'bg-teal-50 text-teal-800 hover:bg-teal-100 dark:bg-teal-900/40 dark:text-teal-200 dark:hover:bg-teal-900/70'),
              seg.continuesLeft ? 'rounded-l-none' : 'rounded-l',
              seg.continuesRight ? 'rounded-r-none' : 'rounded-r',
            ]"
            :style="{
              'gridColumn': `${seg.startCol + 1} / span ${seg.span}`,
              'gridRow': seg.lane + 2,
              '--ev-color': themeById.get(seg.event.id)?.primary.color,
              '--ev-color-dark': themeById.get(seg.event.id)?.primary.colorDark
                ?? themeById.get(seg.event.id)?.primary.color,
            }"
            :title="seg.event.name"
            @mouseenter="onChipEnter(seg.event, $event.currentTarget)"
            @mouseleave="scheduleClose()"
            @click="onChipClick(seg.event, $event.currentTarget)"
          >
            <div
              v-if="themeById.get(seg.event.id) && !seg.continuesLeft"
              :class="themeById.get(seg.event.id)!.primary.icon"
              class="text-[11px] mr-0.5 align-[-2px] inline-block sm:text-xs"
            />
            {{ seg.continuesLeft ? '◂ ' : '' }}{{ seg.event.name }}
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
