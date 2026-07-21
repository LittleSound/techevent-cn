<script setup lang="ts">
import { useHead, useSeoMeta } from '@unhead/vue'
import { eventEditUrl, newEventUrl } from '~/config'
import { resolveEventLink } from '~/utils/eventLinks'
import { resolveEventTheme, tagIconFor } from '~/utils/eventTheme'
import { formatDateRange, isPast } from '~/utils/format'
import { amapSearchUrl, appleMapsSearchUrl, baiduMapSearchUrl, hasLocation, hasPreciseLocation, mapSearchQuery } from '~/utils/mapLinks'
import { relatedEvents } from '~/utils/related'
import { buildEventJsonLd, eventCanonicalUrl, eventOgImageUrl } from '~/utils/seo'

const route = useRoute('/event/[id]')

const event = computed(() => allEvents.find(e => e.id === route.params.id))

const related = computed(() => event.value ? relatedEvents(event.value, allEvents) : [])

const theme = computed(() => event.value && resolveEventTheme(event.value))

/** Inline CSS vars feeding .ev-themed; undefined keeps the plain card. */
const themeStyle = computed(() => theme.value && {
  '--ev-color': theme.value.primary.color,
  '--ev-color-dark': theme.value.primary.colorDark ?? theme.value.primary.color,
})

const taggedChips = computed(() =>
  (event.value?.tags ?? []).map(tag => ({ tag, def: tagIconFor(tag) })),
)

const formatLabel = { offline: '线下', online: '线上', hybrid: '线上+线下' } as const

const mapQuery = computed(() => event.value ? mapSearchQuery(event.value) : '')

const { copy: copyAddress, copied: addressCopied } = useClipboard({ source: mapQuery })

const resolvedLinks = computed(() => (event.value?.links ?? []).map(resolveEventLink))

useSeoMeta({
  title: () => event.value ? `${event.value.name} · techevent-cn` : '活动不存在 · techevent-cn',
  description: () => event.value?.description ?? '中国（及周边）科技活动日历',
  ogTitle: () => event.value?.name ?? '活动不存在',
  ogDescription: () => event.value?.description ?? '',
  ogType: 'website',
  ogUrl: () => event.value ? eventCanonicalUrl(event.value.id) : undefined,
  ogImage: () => event.value ? eventOgImageUrl(event.value.id) : undefined,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: event.value ? [{ rel: 'canonical', href: eventCanonicalUrl(event.value.id) }] : [],
  script: event.value
    // Escape `<` so event text can never close the script tag early.
    ? [{ type: 'application/ld+json', innerHTML: JSON.stringify(buildEventJsonLd(event.value)).replace(/</g, '\\u003C') }]
    : [],
}))
</script>

<template>
  <div mx-auto px-4 pb-16 max-w-3xl>
    <header pt-6 flex="~ items-center justify-between gap-3">
      <RouterLink to="/" title="返回首页" class="group">
        <span text-base tracking-tight font-700 transition group-hover:text-teal-600>techevent-cn</span>
        <span text-xs op60 block>中国（及周边）科技活动日历</span>
      </RouterLink>
      <button class="icon-btn" title="切换暗色模式" @click="toggleDark()">
        <div i-carbon-sun dark:i-carbon-moon />
      </button>
    </header>

    <div mt-4>
      <RouterLink to="/" text-sm op60 inline-flex gap-1 items-center hover:text-teal-600 hover:op100>
        <div i-carbon-arrow-left /> 返回活动列表
      </RouterLink>
    </div>

    <template v-if="event">
      <article
        class="card" mt-4 p-6 relative
        :class="theme ? 'ev-themed' : ''" :style="themeStyle"
      >
        <div flex="~ items-start justify-between gap-3">
          <h1 text-2xl leading-snug font-700 :class="theme ? 'ev-title-themed' : ''">
            {{ event.name }}
          </h1>
          <span text-xs mt-2 op70 shrink-0>{{ formatLabel[event.format] }}</span>
        </div>

        <div flex="~ col gap-1.5" text-sm mt-4 op80>
          <span flex="~ items-center gap-1.5">
            <div i-carbon-calendar shrink-0 /> {{ formatDateRange(event.start, event.end) }}
            <span v-if="isPast(event.end)" text-xs px-1.5 rounded bg-gray-100 op70 dark:bg-gray-800>已结束</span>
          </span>
          <span flex="~ items-center gap-1.5">
            <div i-carbon-location shrink-0 />
            {{ event.city }}<template v-if="event.country !== '中国'"> · {{ event.country }}</template><template v-if="event.venue"> · {{ event.venue }}</template>
          </span>
          <span v-if="event.organizer" flex="~ items-center gap-1.5">
            <div i-carbon-group shrink-0 /> {{ event.organizer }}
          </span>
        </div>

        <p v-if="event.description" text-base leading-relaxed mt-4 op80>
          {{ event.description }}
        </p>

        <div v-if="event.tags.length" mt-4 flex="~ wrap gap-1.5">
          <span
            v-for="{ tag, def } in taggedChips" :key="tag"
            bg="gray-100 dark:gray-800"
            text-xs px-2 py-0.5 rounded op80 inline-flex gap-1 items-center
          >
            <div v-if="def" :class="def.icon" class="ev-icon-tinted" text-xs :style="{ '--ev-icon-c': def.color, '--ev-icon-c-dark': def.colorDark }" />
            {{ tag }}
          </span>
        </div>

        <div v-if="theme" class="ev-watermark" aria-hidden="true">
          <div
            v-for="def in theme.icons.slice(1).reverse()"
            :key="def.icon"
            class="ev-icon-tinted" :class="[def.icon]"
            :style="{ 'fontSize': '58px', 'marginRight': '-18px', 'marginBottom': '6px', '--ev-icon-c': def.color, '--ev-icon-c-dark': def.colorDark }"
          />
          <div :class="theme.primary.icon" :style="{ fontSize: '105px', color: 'var(--ev-c)' }" />
        </div>
      </article>

      <div grid="~ cols-2 sm:cols-4 gap-2" mt-3>
        <a
          :href="event.url" target="_blank" rel="noopener"
          text-sm text-white px-3 py-1.5 rounded-md bg-teal-600 inline-flex gap-1 w-full transition items-center justify-center hover:bg-teal-700
        >
          前往官网 <div i-carbon-arrow-up-right />
        </a>
        <a
          :href="`/ics/${event.id}.ics`"
          hover="border-teal-600 text-teal-600" download text-sm px-3 py-1.5 border border-gray-200 rounded-md inline-flex gap-1.5 w-full transition items-center justify-center dark:border-gray-700
        >
          <div i-carbon-calendar-add /> 加入日历
        </a>
        <EventShareButtons :url="eventCanonicalUrl(event.id)" :title="event.name" />
      </div>

      <section v-if="hasLocation(event)" mt-8>
        <h2 text-sm tracking-wide font-600 mb-3 op50>
          地点
        </h2>
        <template v-if="hasPreciseLocation(event)">
          <div flex="~ items-center gap-3 justify-between" p-3 border border-gray-200 rounded-lg dark:border-gray-800>
            <div text-sm op90 flex="~ items-center gap-1.5" min-w-0>
              <div i-carbon-location op60 shrink-0 />
              <span truncate>{{ event.venue }} · {{ event.city }}<template v-if="event.country !== '中国'"> · {{ event.country }}</template></span>
            </div>
            <button
              type="button"
              text-sm text-white px-3 py-1.5 rounded-md bg-teal-600 inline-flex shrink-0 gap-1.5 transition items-center hover:bg-teal-700
              @click="copyAddress()"
            >
              <div :class="addressCopied ? 'i-carbon-checkmark' : 'i-carbon-copy'" />
              {{ addressCopied ? '已复制' : '复制地址' }}
            </button>
          </div>

          <EventMapEmbed v-if="event.coordinates" :coordinates="event.coordinates" :label="event.venue ?? event.city" mt-3 />

          <div text-sm mt-3 op80 flex="~ wrap items-center gap-x-2 gap-y-1.5">
            <span op60>在地图中打开：</span>
            <a :href="amapSearchUrl(mapQuery)" target="_blank" rel="noopener" class="chip chip-idle">
              <div i-carbon-send-alt /> 高德地图
            </a>
            <a :href="baiduMapSearchUrl(mapQuery)" target="_blank" rel="noopener" class="chip chip-idle">
              <div i-simple-icons-baidu /> 百度地图
            </a>
            <a :href="appleMapsSearchUrl(mapQuery)" target="_blank" rel="noopener" class="chip chip-idle">
              <div i-simple-icons-apple /> Apple 地图
            </a>
          </div>
        </template>
        <div v-else p-3 border border-gray-200 rounded-lg dark:border-gray-800>
          <div text-sm op90 flex="~ items-center gap-1.5">
            <div i-carbon-location op60 shrink-0 />
            {{ event.city }}<template v-if="event.country !== '中国'">
              · {{ event.country }}
            </template>
          </div>
          <div text-xs mt-1.5 op60 flex="~ items-center gap-1.5">
            <div i-carbon-information shrink-0 /> 具体活动地点请查看官网信息。
          </div>
        </div>
      </section>

      <section v-if="resolvedLinks.length" mt-8>
        <h2 text-sm tracking-wide font-600 mb-3 op50>
          相关链接
        </h2>
        <div flex="~ wrap gap-2">
          <a
            v-for="link in resolvedLinks" :key="link.url"
            :href="link.url" target="_blank" rel="noopener"
            hover="border-teal-600 text-teal-600" text-sm px-3 py-1.5 border border-gray-200 rounded-md inline-flex gap-1.5 transition items-center dark:border-gray-700
          >
            <div :class="link.icon" /> {{ link.label }}
          </a>
        </div>
      </section>

      <section v-if="related.length" mt-8>
        <h2 text-sm tracking-wide font-600 mb-3 op50>
          相关活动
        </h2>
        <div grid="~ cols-1 sm:cols-2 gap-3">
          <EventCard v-for="rel in related" :key="rel.id" :event="rel" />
        </div>
      </section>

      <footer text-sm mt-12 pt-6 border-t border-gray-100 op60 flex="~ wrap items-center justify-center gap-x-2 gap-y-1" dark:border-gray-800>
        <span>发现信息有误或想补充？</span>
        <a :href="eventEditUrl(event.id)" target="_blank" rel="noopener" text-teal-600 inline-flex gap-1 items-center hover:underline>
          <div i-carbon-edit /> 在 GitHub 上编辑此活动
        </a>
        <span op50>·</span>
        <a :href="newEventUrl" target="_blank" rel="noopener" text-teal-600 hover:underline>
          贡献指南
        </a>
      </footer>
    </template>

    <div v-else mt-16 text-center op60>
      <div i-carbon-help text-4xl mx-auto mb-3 op50 />
      <p>活动不存在或已被移除。</p>
      <RouterLink to="/" text-teal-600 hover:underline>
        返回活动列表 →
      </RouterLink>
      <p text-sm mt-2>
        知道这个活动？<a :href="newEventUrl" target="_blank" rel="noopener" text-teal-600 hover:underline>欢迎提交 →</a>
      </p>
    </div>
  </div>
</template>
