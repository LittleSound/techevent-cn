<script setup lang="ts">
const { url, title } = defineProps<{ url: string, title: string }>()

const { copy, copied } = useClipboard({ source: () => url })

/**
 * navigator.share exists only in secure contexts on supporting browsers.
 * Read lazily in onMounted (not at setup) so SSG-prerendered HTML always
 * omits the button on first paint, matching the client's first render and
 * avoiding a hydration mismatch; it then appears once the client confirms
 * support.
 */
const canShare = ref(false)

onMounted(() => {
  canShare.value = !!navigator.share
})

function systemShare() {
  navigator.share({ title, url }).catch(() => {})
}
</script>

<template>
  <button
    type="button"
    hover="border-teal-600 text-teal-600" text-sm px-3 py-1.5 border border-gray-200 rounded-md inline-flex gap-1.5 w-full transition items-center justify-center dark:border-gray-700
    @click="copy()"
  >
    <div :class="copied ? 'i-carbon-checkmark' : 'i-carbon-link'" />
    {{ copied ? '已复制' : '复制链接' }}
  </button>
  <button
    v-if="canShare"
    type="button"
    hover="border-teal-600 text-teal-600" text-sm px-3 py-1.5 border border-gray-200 rounded-md inline-flex gap-1.5 w-full transition items-center justify-center dark:border-gray-700
    @click="systemShare"
  >
    <div i-carbon-share />
    分享
  </button>
</template>
