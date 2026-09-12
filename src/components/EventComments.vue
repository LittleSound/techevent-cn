<script setup lang="ts">
import Giscus from '@giscus/vue'
import { giscusConfig, repoUrl } from '~/config'

const { eventId } = defineProps<{ eventId: string }>()

/** Keep static HTML independent of the browser-only discussion widget. */
const mounted = ref(false)
onMounted(() => mounted.value = true)

const container = shallowRef<HTMLElement>()
const failed = ref(false)
const attempt = ref(0)

/** Only the current widget can report failure; an empty discussion is a valid first visit. */
function handleMessage(message: MessageEvent) {
  const frame = container.value?.querySelector('giscus-widget')?.shadowRoot?.querySelector('iframe')
  if (message.origin !== 'https://giscus.app' || !frame?.contentWindow || message.source !== frame.contentWindow)
    return
  const error = message.data?.giscus?.error
  if (typeof error !== 'string' || /Discussion not found|Bad credentials|Invalid state value|State has expired/.test(error))
    return
  failed.value = true
}

/** Remounting gives retries a fresh iframe and releases the old widget's listeners. */
function retry() {
  failed.value = false
  attempt.value++
}

useEventListener('message', handleMessage)
watch(() => eventId, retry)

/** Source IDs survive canonical URL variants and changes to an event's title. */
const term = computed(() => `event:${eventId}`)
const discussionUrl = computed(() => `${repoUrl}/discussions?discussions_q=${encodeURIComponent(`category:"${giscusConfig.category}" "${term.value}"`)}`)
</script>

<template>
  <section id="comments" aria-labelledby="comments-heading" mt-10 pt-8 border-t border-gray-200 scroll-mt-6 dark:border-gray-800>
    <div flex="~ wrap items-center justify-between gap-3">
      <h2 id="comments-heading" text-lg font-700 flex="~ items-center gap-2">
        <div i-carbon-chat text-teal-600 aria-hidden="true" />
        活动讨论
      </h2>
      <a :href="discussionUrl" target="_blank" rel="noopener noreferrer" text-sm text-teal-700 py-2 inline-flex gap-1 items-center dark:text-teal-400 hover:underline>
        在 GitHub 查看 <div i-carbon-arrow-up-right aria-hidden="true" />
      </a>
    </div>
    <p text-sm text-gray-600 mt-1 dark:text-gray-400>
      找同行、聊见闻，或分享会后资料。登录 GitHub 即可参与。
    </p>
    <div v-show="!failed" ref="container" mt-5>
      <Giscus
        v-if="mounted"
        :key="`${eventId}:${attempt}`"
        v-bind="giscusConfig"
        mapping="specific"
        :term="term"
        strict="1"
        reactions-enabled="1"
        emit-metadata="0"
        input-position="top"
        :theme="isDark ? 'dark' : 'light'"
        lang="zh-CN"
        loading="lazy"
      />
    </div>
    <div v-if="failed" role="status" mt-5 p-4 rounded-lg bg-gray-50 flex="~ wrap items-center justify-between gap-3" dark:bg-gray-900>
      <p text-sm text-gray-600 dark:text-gray-400>
        暂时无法加载评论，可以重试或前往 GitHub 查看。
      </p>
      <button type="button" text-sm text-teal-700 px-3 py-2 border border-gray-200 rounded-md dark:text-teal-400 dark:border-gray-700 hover:bg-teal-50 dark:hover:bg-gray-800 @click="retry">
        重新加载
      </button>
    </div>
    <p v-else text-xs text-gray-500 mt-3 dark:text-gray-400>
      评论未显示？可通过上方链接前往 GitHub 查看讨论。
    </p>
  </section>
</template>
