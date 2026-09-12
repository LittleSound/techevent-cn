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
        <span class="site-name">techevent-cn</span>
        <span class="site-caption">中国（及周边）科技活动日历</span>
      </RouterLink>
      <button class="icon-btn" title="切换暗色模式" aria-label="切换暗色模式" @click="toggleDark()">
        <div i-carbon-sun dark:i-carbon-moon />
      </button>
    </header>
    <RouterLink to="/" class="back-link">
      <div i-carbon-arrow-left aria-hidden="true" /> 返回活动列表
    </RouterLink>

    <template v-if="event">
      <article class="event-hero card" :class="theme ? 'ev-themed' : ''" :style="themeStyle">
        <div class="hero-meta">
          <span><div :class="event.format === 'online' ? 'i-carbon-video' : 'i-carbon-location'" aria-hidden="true" />{{ event.format === 'online' ? '线上活动' : [event.country, event.city].join(' · ') }}</span>
          <span class="format-badge">{{ formatLabel[event.format] }}</span>
          <span v-if="past" class="past-badge">已结束</span>
        </div>
        <h1 :class="theme ? 'ev-title-themed' : ''">
          {{ event.name }}
        </h1>
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

      <section class="official-strip" aria-label="活动官网">
        <div class="official-copy">
          <div i-carbon-launch aria-hidden="true" />
          <div>
            <h2>{{ past ? '回顾这场活动' : '准备参加这场活动？' }}</h2>
            <p>{{ past ? '回顾资料与后续动态，请查看主办方官网。' : '报名方式、参与条件与最新安排，请以主办方官网为准。' }}</p>
          </div>
        </div>
        <a :href="event.url" target="_blank" rel="noopener" class="official-button">前往官网 <div i-carbon-arrow-up-right aria-hidden="true" /></a>
      </section>

      <div class="planning-grid">
        <section class="facts-panel" aria-labelledby="facts-heading">
          <div class="panel-kicker">
            <div i-carbon-notebook aria-hidden="true" /> 活动信息
          </div>
          <h2 id="facts-heading">
            {{ past ? '活动备忘' : '你的参会备忘' }}
          </h2>
          <dl class="event-facts">
            <div>
              <dt><div i-carbon-calendar aria-hidden="true" /> 日期</dt>
              <dd>{{ formatDateRange(event.start, event.end) }}</dd>
            </div>
            <div>
              <dt><div :class="event.format === 'online' ? 'i-carbon-video' : 'i-carbon-location'" aria-hidden="true" /> {{ event.format === 'online' && !event.venue ? '参与方式' : '地点' }}</dt>
              <dd v-if="event.format === 'online' && !event.venue">
                线上参与<small>参与入口请查看活动官网。</small>
              </dd>
              <dd v-else>
                {{ event.venue || event.city }}
                <small>{{ event.country }} · {{ event.city }}<template v-if="!event.venue"> · 具体场馆待补充</template></small>
              </dd>
            </div>
            <div v-if="event.organizer">
              <dt><div i-carbon-group aria-hidden="true" /> 主办方</dt>
              <dd>{{ event.organizer }}</dd>
            </div>
          </dl>
        </section>

        <section class="takeaway-panel" aria-labelledby="takeaway-heading">
          <div class="panel-kicker">
            <div i-carbon-document aria-hidden="true" /> 保存与分享
          </div>
          <h2 id="takeaway-heading">
            {{ past ? '把活动信息带走' : '交给 Agent，接着规划。' }}
          </h2>
          <p>{{ past ? '复制完整活动信息，方便整理资料，或和朋友交流。' : event.format === 'online' ? '复制活动信息，让你的 Agent 帮你安排参与时间和关注的内容。' : '复制活动信息，让你的 Agent 帮你安排交通、住宿与参会日程。' }}</p>
          <div class="export-preview" aria-label="导出内容摘要">
            <div class="preview-title">
              <div i-carbon-document-blank aria-hidden="true" /><span>{{ event.name }}</span><span class="file-format">.md</span>
            </div>
            <p>日期、地点、活动介绍及已收录的相关链接</p>
            <a :href="eventCanonicalUrl(event.id)" class="preview-source">附活动详情页来源链接 <div i-carbon-link aria-hidden="true" /></a>
          </div>
          <EventMarkdownButton :key="event.id" :event="event" variant="primary" />
          <div class="secondary-actions">
            <a :href="`/ics/${event.id}.ics`" download><div i-carbon-calendar-add aria-hidden="true" /> 加入日历</a>
            <EventShareButtons :key="event.id" :url="eventCanonicalUrl(event.id)" :title="event.name" />
          </div>
        </section>
      </div>
      <section
        class="contribution-panel"
      >
        <div flex="~ items-start gap-3">
          <div i-carbon-collaborate text-xl text-teal-600 mt-0.5 shrink-0 dark:text-teal-400 />
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

      <div class="reading-layout" :class="{ 'has-related': related.length }">
        <RelatedEvents v-if="related.length" :key="event.id" :events="related" class="event-related" />
        <div class="reading-content">
          <div id="details">
            <section class="event-intro" aria-labelledby="intro-heading">
              <h2 id="intro-heading">
                关于这场活动
              </h2>
              <p v-if="event.description">
                {{ event.description }}
              </p>
              <div v-else class="missing-description">
                <p>暂时还没有活动介绍，详情请查看官网。</p><ContributionMenu intent="edit" :event="event" label="补充介绍" />
              </div>
            </section>
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
          </div>
          <EventComments :event-id="event.id" />
        </div>
      </div>
    </template>
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
  --detail-ink: #203e35;
  --detail-muted: #677d72;
  --detail-line: #dfe7e1;
  --detail-surface: #fff;
  --detail-soft: #f5f8f5;
  --detail-accent: #0d806a;
  --detail-action: #0d7664;
  --detail-action-hover: #115e52;
  max-width: 72rem;
  margin: 0 auto;
  padding: 0 2rem 4rem;
  color: var(--detail-ink);
}
html.dark .detail-page {
  --detail-ink: var(--colors-gray-200);
  --detail-muted: var(--colors-gray-400);
  --detail-line: var(--colors-gray-800);
  --detail-surface: var(--colors-gray-900);
  --detail-soft: var(--colors-gray-900);
  --detail-accent: var(--colors-teal-400);
  --detail-action: var(--colors-teal-700);
  --detail-action-hover: var(--colors-teal-800);
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
  font-size: 1.1rem;
  font-weight: 750;
  letter-spacing: -0.04em;
}
.site-caption {
  display: block;
  font-size: 0.7rem;
  color: var(--detail-muted);
  margin-top: 0.15rem;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--detail-muted);
  margin: 1.5rem 0;
}
.event-hero {
  padding: 2.5rem;
  border-radius: 1.35rem;
  background: var(--detail-surface);
}
.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
  font-size: 0.75rem;
  color: var(--detail-muted);
  margin-bottom: 1.3rem;
}
.hero-meta > span {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
}
.format-badge,
.past-badge {
  padding: 0.2rem 0.6rem;
  border-radius: 2rem;
  border: 1px solid var(--detail-line);
}
.past-badge {
  background: var(--detail-soft);
}
h1 {
  max-width: 53rem;
  font-size: clamp(1.65rem, 3vw, 2.75rem);
  letter-spacing: -0.035em;
  line-height: 1.3;
  font-weight: 750;
  overflow-wrap: anywhere;
}
/** Preserve each event’s brand hue while making dark titles readable. */
html.dark .event-hero .ev-title-themed {
  color: color-mix(in srgb, var(--ev-c) 70%, white);
}
.event-hero :deep(.ev-watermark) {
  right: 1rem;
  bottom: -0.5rem;
  opacity: 0.12;
}
.event-hero :deep(.ev-watermark > div:last-child) {
  font-size: 9rem !important;
}
.official-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.2rem 1.5rem;
  margin: 1rem 0 1.5rem;
  border: 1px solid var(--detail-line);
  border-radius: 1rem;
  background: var(--detail-surface);
}
.official-copy {
  display: flex;
  gap: 1rem;
  align-items: center;
  min-width: 0;
}
.official-copy > div:first-child {
  flex-shrink: 0;
  color: var(--detail-accent);
}
.official-copy h2 {
  font-size: 0.9rem;
  font-weight: 650;
}
.official-copy p {
  font-size: 0.75rem;
  color: var(--detail-muted);
  margin-top: 0.25rem;
  line-height: 1.8;
}
.official-button {
  display: inline-flex;
  flex-shrink: 0;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.15rem;
  border-radius: 0.65rem;
  background: var(--detail-action);
  color: white;
  font-size: 0.85rem;
  font-weight: 600;
}
.official-button:hover {
  background: var(--detail-action-hover);
}
.planning-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}
.facts-panel,
.takeaway-panel {
  min-width: 0;
  padding: 1.75rem;
  border: 1px solid var(--detail-line);
  border-radius: 1.2rem;
  background: var(--detail-surface);
}
.panel-kicker {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.7rem;
  color: var(--detail-muted);
  margin-bottom: 0.9rem;
}
.facts-panel h2,
.takeaway-panel h2 {
  font-size: 1.45rem;
  letter-spacing: -0.025em;
  font-weight: 700;
  margin-bottom: 1rem;
}
.event-facts {
  margin: 0;
}
.event-facts > div {
  padding: 1rem 0;
  border-bottom: 1px solid var(--detail-line);
}
.event-facts > div:last-child {
  border: 0;
  padding-bottom: 0;
}
.event-facts dt {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.7rem;
  color: var(--detail-muted);
  margin-bottom: 0.4rem;
}
.event-facts dd {
  margin: 0 0 0 1.5rem;
  font-size: 0.95rem;
  font-weight: 550;
  overflow-wrap: anywhere;
  line-height: 1.75;
}
.event-facts small {
  display: block;
  font-size: 0.75rem;
  color: var(--detail-muted);
  font-weight: 400;
  margin-top: 0.25rem;
}
.takeaway-panel {
  background: #edf4e9;
  border-color: #dbe6d5;
}
html.dark .takeaway-panel {
  background: color-mix(in srgb, var(--colors-teal-950) 35%, var(--detail-surface));
  border-color: var(--detail-line);
}
.takeaway-panel > p {
  color: var(--detail-muted);
  font-size: 0.8rem;
  line-height: 1.9;
}
.export-preview {
  margin: 1.2rem 0;
  padding: 1rem;
  border: 1px solid var(--detail-line);
  border-radius: 0.7rem;
  background: var(--detail-surface);
}
.preview-title {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  font-size: 0.75rem;
}
.preview-title > div {
  flex-shrink: 0;
}
.preview-title > span:not(.file-format) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-format {
  margin-left: auto;
  font-family: monospace;
  color: var(--detail-muted);
  flex-shrink: 0;
}
.export-preview p,
.preview-source {
  font-size: 0.7rem;
  color: var(--detail-muted);
  margin-top: 0.5rem;
}
.preview-source {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  text-decoration: underline;
  text-underline-offset: 0.2rem;
}
.secondary-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 0.7rem;
  border-top: 1px solid var(--detail-line);
}
.secondary-actions > a,
.secondary-actions :deep(button) {
  display: inline-flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 0.4rem;
  border: 0;
  width: auto;
  background: transparent;
  color: var(--detail-ink);
  font-size: 0.75rem;
  border-radius: 0.5rem;
}
.secondary-actions > a:hover,
.secondary-actions :deep(button:hover) {
  background: var(--detail-surface);
}
.contribution-panel {
  margin-top: 1.5rem;
  padding: 1.4rem 1.5rem;
  border: 1px solid var(--detail-line);
  border-radius: 1rem;
  background: var(--detail-soft);
}
.reading-layout {
  display: grid;
  grid-template-areas: 'content';
  gap: 2rem;
  margin-top: 2rem;
}
.reading-layout.has-related {
  grid-template-columns: minmax(0, 1fr) 18rem;
  grid-template-areas: 'content related';
}
.reading-content {
  grid-area: content;
  min-width: 0;
}
.event-related {
  grid-area: related;
  min-width: 0;
}
.event-intro h2 {
  font-size: 1.05rem;
  font-weight: 650;
  margin-bottom: 0.8rem;
}
.event-intro p {
  font-size: 0.9rem;
  line-height: 1.9;
  color: var(--detail-muted);
  white-space: pre-line;
  overflow-wrap: anywhere;
}
.missing-description {
  display: flex;
  gap: 0.6rem;
  flex-direction: column;
  align-items: flex-start;
}
.detail-page :is(button, a, [tabindex]):focus-visible {
  outline: 2px solid #36a48c;
  outline-offset: 4px;
}
@media (max-width: 1023px) {
  .reading-layout.has-related {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'related' 'content';
  }
}
@media (max-width: 700px) {
  .detail-page {
    padding: 0 1.25rem 3rem;
  }
  .site-header {
    padding: 1.1rem 0;
  }
  .back-link {
    margin: 1.25rem 0;
  }
  .event-hero {
    padding: 1.6rem 1.4rem;
  }
  .official-strip {
    align-items: stretch;
    flex-direction: column;
    gap: 1rem;
    padding: 1.25rem;
  }
  .official-copy {
    align-items: flex-start;
    gap: 0.7rem;
  }
  .official-copy > div:first-child {
    margin-top: 0.2rem;
  }
  .planning-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 1rem;
  }
  .facts-panel,
  .takeaway-panel {
    padding: 1.4rem;
  }
  .facts-panel h2,
  .takeaway-panel h2 {
    font-size: 1.3rem;
  }
  .contribution-panel {
    padding: 1.25rem;
  }
  .reading-layout {
    margin-top: 1.5rem;
    gap: 1.5rem;
  }
}
</style>
