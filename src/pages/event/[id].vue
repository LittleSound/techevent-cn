<script setup lang="ts">
import { useHead, useSeoMeta } from '@unhead/vue'
import { missingContributionFields } from '~/utils/contribution'
import { resolveEventLink } from '~/utils/eventLinks'
import { resolveEventTheme, tagIconFor } from '~/utils/eventTheme'
import { formatDateRange, isPast } from '~/utils/format'
import { amapSearchUrl, appleMapsSearchUrl, baiduMapSearchUrl, hasLocation, hasPreciseLocation, mapSearchQuery } from '~/utils/mapLinks'
import { relatedEvents } from '~/utils/related'
import { buildEventJsonLd, eventCanonicalUrl, eventOgImageUrl } from '~/utils/seo'

const route = useRoute('/event/[id]')

/** Prerendered files live at /event/<id>.html, so direct visits may carry the extension in the param; strip it so both URL forms resolve to the same event. */
const eventId = computed(() => String(route.params.id).replace(/\.html$/, ''))

const event = computed(() => allEvents.find(e => e.id === eventId.value))

const related = computed(() => event.value ? relatedEvents(event.value, allEvents, 4) : [])

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

const missingDetails = computed(() => event.value ? missingContributionFields(event.value) : [])

useSeoMeta({
  title: () => event.value ? `${event.value.name} · Techevents` : '活动不存在 · Techevents',
  description: () => event.value?.description ?? '中国（及周边）科技活动日历',
  ogTitle: () => event.value?.name ?? '活动不存在',
  ogDescription: () => event.value?.description ?? '',
  ogType: 'website',
  ogUrl: () => event.value ? eventCanonicalUrl(event.value.id) : undefined,
  ogImage: () => event.value ? eventOgImageUrl(event.value.id) : undefined,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  meta: event.value ? [{ name: 'giscus:backlink', content: eventCanonicalUrl(event.value.id) }] : [],
  link: event.value ? [{ rel: 'canonical', href: eventCanonicalUrl(event.value.id) }] : [],
  script: event.value
    // Escape `<` so event text can never close the script tag early.
    ? [{ type: 'application/ld+json', innerHTML: JSON.stringify(buildEventJsonLd(event.value)).replace(/</g, '\\u003C') }]
    : [],
}))

const past = computed(() => event.value ? isPast(event.value.end) : false)
</script>

<template>
  <div class="detail-page">
    <header class="site-header">
      <RouterLink to="/" title="返回首页">
        <span class="site-name">Techevents</span>
        <span class="site-caption">中国（及周边）科技活动日历</span>
      </RouterLink>
      <button class="icon-btn" title="切换暗色模式" aria-label="切换暗色模式" @click="toggleDark()">
        <div i-carbon-sun dark:i-carbon-moon />
      </button>
    </header>
    <RouterLink to="/" class="back-link">
      <div i-carbon-arrow-left aria-hidden="true" /> 返回活动列表
    </RouterLink>

    <div v-if="event" class="hybrid-layout">
      <div class="main-column">
        <div class="overview-stack">
          <article
            id="details" class="event-overview card" p-6 relative
            :class="theme ? 'ev-themed' : ''" :style="themeStyle"
          >
            <div flex="~ items-start justify-between gap-3">
              <h1 text-2xl leading-snug font-700 :class="theme ? 'ev-title-themed' : ''">
                {{ event.name }}
              </h1>
              <span class="format-label" text-xs mt-2 op70 shrink-0>{{ formatLabel[event.format] }}</span>
            </div>

            <div flex="~ col gap-1.5" text-sm mt-4 op80>
              <span flex="~ items-center gap-1.5">
                <div i-carbon-calendar shrink-0 /> {{ formatDateRange(event.start, event.end) }}
                <span v-if="isPast(event.end)" class="past-label" text-xs px-1.5 rounded bg-gray-100 op70 dark:bg-gray-800>已结束</span>
              </span>
              <span flex="~ items-center gap-1.5">
                <div :class="event.format === 'online' ? 'i-carbon-video' : 'i-carbon-location'" shrink-0 />
                {{ event.format === 'online' ? '线上参与' : event.city }}<template v-if="event.country !== '中国'"> · {{ event.country }}</template><template v-if="event.venue"> · {{ event.venue }}</template><template v-else-if="event.format !== 'online'"> · 具体场馆待补充</template>
              </span>
              <span v-if="event.organizer" flex="~ items-center gap-1.5">
                <div i-carbon-group shrink-0 /> {{ event.organizer }}
              </span>
            </div>

            <a href="#comments" class="discussion-shortcut" text-sm text-teal-700 mt-2 py-2 inline-flex gap-1.5 items-center dark:text-teal-400 hover:underline>
              <div i-carbon-chat aria-hidden="true" /> 查看讨论 <div i-carbon-arrow-down aria-hidden="true" />
            </a>

            <p v-if="event.description" class="overview-description" text-base leading-relaxed mt-4 op80>
              {{ event.description }}
            </p>

            <div v-if="!event.description" class="missing-description" text-sm mt-4>
              <span op60>暂时还没有活动介绍，详情请查看官网。</span>
              <ContributionMenu intent="edit" :event="event" label="补充介绍" />
            </div>
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

          <section class="official-strip action-panel" aria-label="活动官网">
            <div class="official-copy">
              <div i-carbon-launch text-xl text-teal-600 mt-0.5 shrink-0 aria-hidden="true" />
              <div>
                <h2 text-base font-700>
                  {{ past ? '回顾这场活动' : '准备参加这场活动？' }}
                </h2>
                <p text-sm mt-1 op70>
                  {{ past ? '回顾资料与后续动态，请查看主办方官网。' : '报名方式、参与条件与最新安排，请以主办方官网为准。' }}
                </p>
              </div>
            </div>
            <a :href="event.url" target="_blank" rel="noopener" class="official-button action-button">前往官网 <div i-carbon-arrow-up-right aria-hidden="true" /></a>
          </section>
        </div>
        <div class="supplemental-information">
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
              <div
                v-if="missingDetails.includes('venue')"
                text-sm mt-3 pt-3 border-t border-gray-100 flex="~ wrap items-center gap-x-2 gap-y-1.5"
                dark:border-gray-800
              >
                <span op65>知道具体场馆？欢迎帮大家补上。</span>
                <ContributionMenu intent="edit" :event="event" label="补充地点" />
              </div>
            </div>
          </section>

          <section mt-8>
            <h2 text-sm tracking-wide font-600 mb-3 op50>
              相关链接
            </h2>
            <div v-if="resolvedLinks.length" flex="~ wrap gap-2">
              <a
                v-for="link in resolvedLinks" :key="link.url"
                :href="link.url" target="_blank" rel="noopener"
                hover="border-teal-600 text-teal-600" text-sm px-3 py-1.5 border border-gray-200 rounded-md inline-flex gap-1.5 transition items-center dark:border-gray-700
              >
                <div :class="link.icon" /> {{ link.label }}
              </a>
            </div>
            <div
              v-else
              flex="~ wrap items-center gap-x-2 gap-y-1.5"
              text-sm p-3 border border-gray-300 rounded-lg border-dashed dark:border-gray-700
            >
              <div i-carbon-link op45 shrink-0 />
              <span op65>暂时还没有收录报名、议程或官方社媒等相关链接。</span>
              <ContributionMenu intent="edit" :event="event" label="补充相关链接" />
            </div>
          </section>

          <section
            class="contribution-panel action-panel"
          >
            <div flex="~ items-start gap-3">
              <div i-carbon-collaborate text-xl text-teal-600 mt-0.5 shrink-0 />
              <div>
                <h2 text-base font-700>
                  发现信息有误或想补充？
                </h2>
                <p text-sm mt-1 op70>
                  活动由社区共同维护。你可以直接编辑数据，也可以复制一份完整提示词，让 Agent 帮你调查和整理。
                </p>
                <div mt-4>
                  <ContributionMenu intent="edit" :event="event" trigger-style="primary" />
                </div>
              </div>
            </div>
          </section>
        </div>
        <EventComments :event-id="event.id" class="event-discussion" />
      </div>
      <aside class="side-column" aria-label="保存与探索">
        <section class="takeaway-panel p-5 border border-gray-200 rounded-lg bg-transparent dark:border-gray-800" aria-labelledby="takeaway-heading">
          <div class="panel-kicker" text-xs mb-2 op60 flex="~ items-center gap-1.5">
            <div i-carbon-document aria-hidden="true" /> 保存与分享
          </div>
          <h2 id="takeaway-heading" text-base font-700>
            {{ past ? '把活动信息带走' : '交给 Agent，接着规划。' }}
          </h2>
          <p text-sm mt-1 op70>
            {{ past ? '复制完整活动信息，方便整理资料，或和朋友交流。' : event.format === 'online' ? '复制活动信息，让你的 Agent 帮你安排参与时间和关注的内容。' : '复制活动信息，让你的 Agent 帮你安排交通、住宿与参会日程。' }}
          </p>
          <div class="export-preview" text-xs my-4 p-3 border border-gray-200 rounded-lg bg-white dark:border-gray-800 dark:bg-gray-900 aria-label="导出内容摘要">
            <div class="preview-title" flex="~ items-center gap-1.5">
              <div i-carbon-document-blank aria-hidden="true" /><span>{{ event.name }}</span><span class="file-format" font-mono ml-auto op60 shrink-0>.md</span>
            </div>
            <p mt-2 op60>
              日期、地点、活动介绍及已收录的相关链接
            </p>
            <a :href="eventCanonicalUrl(event.id)" class="preview-source" mt-2 op60 underline underline-offset-2 inline-flex gap-1.5 items-center>附活动详情页来源链接 <div i-carbon-link aria-hidden="true" /></a>
          </div>
          <EventMarkdownButton :key="event.id" :event="event" variant="primary" />
          <div class="secondary-actions" mt-4 flex="~ wrap gap-2">
            <a :href="`/ics/${event.id}.ics`" download text-sm px-3 py-1.5 border border-gray-200 rounded-md inline-flex gap-1.5 transition items-center justify-center hover:text-teal-600 dark:border-gray-700 hover:border-teal-600><div i-carbon-calendar-add aria-hidden="true" /> 加入日历</a>
            <EventShareButtons :key="event.id" :url="eventCanonicalUrl(event.id)" :title="event.name" />
          </div>
        </section>
        <RelatedEvents v-if="related.length" :key="event.id" :events="related" class="event-related" />
      </aside>
    </div>
    <div v-else mt-16 text-center op60>
      <div i-carbon-help text-4xl mx-auto mb-3 op50 />
      <p>活动不存在或已被移除。</p>
      <RouterLink to="/" text-teal-600 hover:underline>
        返回活动列表 →
      </RouterLink>
      <p text-sm mt-2>
        知道这个活动？<ContributionMenu intent="add" label="欢迎提交" />
      </p>
    </div>
  </div>
</template>

<style scoped>
.detail-page {
  --detail-ink: var(--colors-gray-700);
  --detail-line: var(--colors-gray-200);
  --detail-surface: #fff;
  max-width: 72rem;
  margin: 0 auto;
  padding: 0 2rem 4rem;
}
html.dark .detail-page {
  --detail-ink: var(--colors-gray-200);
  --detail-line: var(--colors-gray-800);
  --detail-surface: var(--colors-gray-900);
}
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--detail-line);
}
.site-name {
  display: block;
  font-size: 1rem;
  font-weight: 700;
}
.site-caption {
  display: block;
  font-size: 0.75rem;
  opacity: 0.6;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  opacity: 0.6;
  margin: 1.5rem 0;
}
.official-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
}
.official-copy {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  min-width: 0;
}
.official-button {
  min-width: 10rem;
  min-height: 2.75rem;
  flex-shrink: 0;
}
.preview-title > div {
  flex-shrink: 0;
}
.preview-title > span:not(.file-format) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.secondary-actions > a,
.secondary-actions :deep(button) {
  flex: 1 1 auto;
  width: auto;
}
.contribution-panel {
  margin-top: 2rem;
}
.missing-description {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}
.detail-page :is(button, a, [tabindex]):focus-visible {
  outline: 2px solid var(--colors-teal-500);
  outline-offset: 4px;
}
.hybrid-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 22rem;
  gap: 2rem;
  align-items: start;
}
.main-column,
.side-column {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  min-width: 0;
}
.overview-stack,
.takeaway-panel,
.supplemental-information,
.event-related,
.event-discussion {
  min-width: 0;
}
.supplemental-information > section:first-child {
  margin-top: 0;
}
.event-discussion {
  margin-top: 0;
}
.event-overview h1 {
  overflow-wrap: anywhere;
}
.overview-description {
  white-space: pre-line;
  overflow-wrap: anywhere;
}
html.dark .event-overview .ev-title-themed {
  color: color-mix(in srgb, var(--ev-c) 70%, white);
}
@media (max-width: 1023px) {
  .hybrid-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.5rem;
  }
  .overview-stack,
  .takeaway-panel,
  .supplemental-information,
  .event-related,
  .event-discussion {
    grid-column: 1;
    grid-row: auto;
  }
  .main-column,
  .side-column,
  .supplemental-information {
    display: contents;
  }
  .supplemental-information > section {
    grid-column: 1;
    order: 1;
    margin-top: 0;
    min-width: 0;
  }
  .takeaway-panel {
    order: 2;
  }
  .supplemental-information > .contribution-panel {
    order: 3;
  }
  .event-related {
    order: 4;
  }
  .event-discussion {
    order: 5;
  }
  .takeaway-panel > p {
    margin-bottom: 1rem;
  }
}
@media (max-width: 700px) {
  .detail-page {
    padding: 0 1.25rem 3rem;
  }
  .site-header {
    padding: 1rem 0;
  }
  .back-link {
    margin: 1.25rem 0;
  }
  .event-overview {
    padding: 1.25rem;
  }
  .official-strip {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
