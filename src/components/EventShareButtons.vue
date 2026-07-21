<script setup lang="ts">
const { url, title } = defineProps<{ url: string, title: string }>()

const { copy, copied } = useClipboard({ source: () => url })

/** navigator.share exists only in secure contexts on supporting browsers. */
const canShare = typeof navigator !== 'undefined' && !!navigator.share

function systemShare() {
  navigator.share({ title, url }).catch(() => {})
}
</script>

<template>
  <div flex="~ wrap gap-2">
    <button
      type="button"
      hover="border-teal-600 text-teal-600" text-sm px-3 py-1.5 border border-gray-200 rounded-md inline-flex gap-1.5 transition items-center dark:border-gray-700
      @click="copy()"
    >
      <div :class="copied ? 'i-carbon-checkmark' : 'i-carbon-link'" />
      {{ copied ? '已复制' : '复制链接' }}
    </button>
    <button
      v-if="canShare"
      type="button"

      hover="border-teal-600 text-teal-600" text-sm px-3 py-1.5 border border-gray-200 rounded-md inline-flex gap-1.5 transition items-center dark:border-gray-700
      @click="systemShare"
    >
      <div i-carbon-share />
      分享
    </button>
  </div>
</template>
