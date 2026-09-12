<script setup lang="ts">
import type { NormalizedEvent } from '~/types'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'

const { event, canHover, open } = defineProps<{
  event: NormalizedEvent
  canHover: boolean
  open: boolean
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  'select': []
}>()

const openedByHover = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | undefined

function cancelClose() {
  clearTimeout(closeTimer)
}

function enter(event: PointerEvent) {
  cancelClose()
  if (!canHover || event.pointerType === 'touch' || open)
    return
  openedByHover.value = true
  emit('update:open', true)
}

function leave() {
  if (openedByHover.value) {
    cancelClose()
    closeTimer = setTimeout(() => emit('update:open', false), 140)
  }
}

function updateOpen(value: boolean) {
  cancelClose()
  if (canHover)
    emit('update:open', value)
}

function click() {
  openedByHover.value = false
  if (!canHover)
    emit('select')
}

watch(() => open, cancelClose)
onBeforeUnmount(cancelClose)
</script>

<template>
  <PopoverRoot :open="canHover && open" @update:open="updateOpen">
    <PopoverTrigger as-child @pointerenter="enter" @pointerleave="leave" @click="click">
      <slot />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        side="bottom"
        align="start"
        :collision-padding="8"
        class="calendar-event-popover py-1.5 w-72 z-50"
        :aria-label="event.name"
        @pointerenter="cancelClose"
        @pointerleave="leave"
        @focusin="openedByHover = false"
        @open-auto-focus="openedByHover && $event.preventDefault()"
        @close-auto-focus="openedByHover && $event.preventDefault()"
      >
        <div class="calendar-event-popover-card text-gray-700 p-4 card shadow-xl overflow-auto dark:text-gray-200">
          <EventDetailCard :event="event" />
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style scoped>
/* Padding belongs to the hit area, so pausing in the visual gap stays open. */
.calendar-event-popover {
  max-width: calc(100vw - 16px);
}

.calendar-event-popover-card {
  max-height: calc(var(--reka-popover-content-available-height) - 12px);
}
</style>
