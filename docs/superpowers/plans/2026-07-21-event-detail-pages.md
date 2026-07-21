# Event Detail Pages (SSG + SEO) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Statically pre-rendered `/event/<id>` detail pages with full SEO surface (OG tags, JSON-LD, sitemap, generated OG images), plus add-to-calendar, share, map, and related-event blocks.

**Architecture:** Convert the SPA entry to `vite-ssg` (keeps vue-router file routing and all existing plugins); a new file-based dynamic page renders one event from the already-bundled `allEvents`; all heavy assets (OG PNGs, per-event ICS, sitemap) are produced by node build scripts following the existing `generate-ics.mjs` pattern, so runtime stays 100% static.

**Tech Stack:** Vue 3, vue-router 5 (file routing via `vue-router/vite`), vite-ssg, @unhead/vue, UnoCSS, satori + @resvg/resvg-js + subset-font, Leaflet, Nominatim (one-time script), vitest.

**Spec:** `docs/superpowers/specs/2026-07-21-event-detail-pages-design.md`

## Global Constraints

- Canonical site URL: `https://event.rizumu.me` (constant `siteUrl` in `src/config.ts`; scripts keep a synced copy).
- Detail route shape: `/event/<id>` where id = event JSON filename without `.json`.
- Coordinates are stored **WGS-84, `[lng, lat]`** (GeoJSON order). Leaflet wants `[lat, lng]` — flip at the call site.
- No paid map APIs; map deep links must work with zero keys and zero coordinates.
- Generated artifacts (`public/og/`, `public/ics/`, `public/sitemap.xml`) are gitignored, like `public/events.ics`.
- Comments in English, `/** ... */` interface comments, no body noise comments (per repo CLAUDE.md).
- Every task ends with: `pnpm lint --fix` on touched files passes, `pnpm typecheck` passes, `pnpm test -- --run` passes.
- Commit messages: conventional commits, English.
- Netlify `NODE_VERSION=23`; build scripts may rely on Node ≥23.6 native TypeScript import (type stripping) but must degrade gracefully (try/catch fallback).
- `netlify.toml` needs **no change**: Netlify serves existing static files before applying the `/* → /index.html` redirect.

---

### Task 1: Site URL + SEO utilities (`src/utils/seo.ts`)

**Files:**

- Modify: `src/config.ts`
- Create: `src/utils/seo.ts`
- Test: `test/seo.test.ts`

**Interfaces:**

- Consumes: `NormalizedEvent` from `~/types`, `normalizeEvent` from `~/utils/events` (tests).
- Produces (later tasks import these exact names from `~/utils/seo` / `~/config`):
  - `siteUrl: string` (from `~/config`) — `'https://event.rizumu.me'`, no trailing slash.
  - `eventCanonicalUrl(id: string): string` → `https://event.rizumu.me/event/<id>`
  - `eventOgImageUrl(id: string): string` → `https://event.rizumu.me/og/<id>.png`
  - `buildEventJsonLd(event: NormalizedEvent): Record<string, unknown>` — schema.org `Event`.

- [ ] **Step 1: Write the failing test**

Create `test/seo.test.ts`:

```ts
import type { TechEvent } from '~/types'
import { describe, expect, it } from 'vitest'
import { normalizeEvent } from '~/utils/events'
import { buildEventJsonLd, eventCanonicalUrl, eventOgImageUrl } from '~/utils/seo'

const base: TechEvent = {
  id: '',
  name: 'VueConf China 2026',
  description: 'Vue.js 官方大会',
  startDate: '2026-07-18',
  city: '上海',
  venue: '上海东方万国会议中心',
  url: 'https://vueconf.cn/',
  tags: ['vue'],
  organizer: 'Vue.js 官方',
}

describe('seo urls', () => {
  it('builds canonical and og image urls', () => {
    expect(eventCanonicalUrl('vueconf-china-2026')).toBe('https://event.rizumu.me/event/vueconf-china-2026')
    expect(eventOgImageUrl('vueconf-china-2026')).toBe('https://event.rizumu.me/og/vueconf-china-2026.png')
  })
})

describe('buildEventJsonLd', () => {
  it('maps an offline event to a schema.org Event with a Place', () => {
    const ld = buildEventJsonLd(normalizeEvent(base, 'vueconf-china-2026'))
    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('Event')
    expect(ld.name).toBe('VueConf China 2026')
    expect(ld.startDate).toBe('2026-07-18')
    expect(ld.endDate).toBe('2026-07-18')
    expect(ld.eventAttendanceMode).toBe('https://schema.org/OfflineEventAttendanceMode')
    expect(ld.location).toEqual({
      '@type': 'Place',
      'name': '上海东方万国会议中心',
      'address': { '@type': 'PostalAddress', 'addressLocality': '上海', 'addressCountry': '中国' },
    })
    expect(ld.organizer).toEqual({ '@type': 'Organization', 'name': 'Vue.js 官方' })
    expect(ld.url).toBe('https://event.rizumu.me/event/vueconf-china-2026')
    expect(ld.sameAs).toBe('https://vueconf.cn/')
    expect(ld.image).toBe('https://event.rizumu.me/og/vueconf-china-2026.png')
  })

  it('maps an online event to VirtualLocation and mixed to Mixed mode', () => {
    const online = buildEventJsonLd(normalizeEvent({ ...base, format: 'online', venue: undefined, city: '线上' }, 'x'))
    expect(online.eventAttendanceMode).toBe('https://schema.org/OnlineEventAttendanceMode')
    expect(online.location).toEqual({ '@type': 'VirtualLocation', 'url': 'https://vueconf.cn/' })
    const hybrid = buildEventJsonLd(normalizeEvent({ ...base, format: 'hybrid' }, 'x'))
    expect(hybrid.eventAttendanceMode).toBe('https://schema.org/MixedEventAttendanceMode')
  })

  it('omits optional fields that are absent', () => {
    const ld = buildEventJsonLd(normalizeEvent({ ...base, description: undefined, organizer: undefined, venue: undefined }, 'x'))
    expect(ld).not.toHaveProperty('description')
    expect(ld).not.toHaveProperty('organizer')
    expect((ld.location as any).name).toBe('上海')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/seo.test.ts`
Expected: FAIL — cannot resolve `~/utils/seo`.

- [ ] **Step 3: Implement**

Append to `src/config.ts`:

```ts
/** Canonical production origin, no trailing slash. Used for OG/canonical/JSON-LD/sitemap. */
export const siteUrl = 'https://event.rizumu.me'
```

Create `src/utils/seo.ts`:

```ts
import type { NormalizedEvent } from '~/types'
import { siteUrl } from '~/config'

export function eventCanonicalUrl(id: string): string {
  return `${siteUrl}/event/${id}`
}

export function eventOgImageUrl(id: string): string {
  return `${siteUrl}/og/${id}.png`
}

const attendanceMode = {
  offline: 'https://schema.org/OfflineEventAttendanceMode',
  online: 'https://schema.org/OnlineEventAttendanceMode',
  hybrid: 'https://schema.org/MixedEventAttendanceMode',
} as const

/**
 * Build schema.org `Event` structured data for Google rich results.
 * `url` points at our detail page (the canonical shareable link) while the
 * official site goes into `sameAs`; dates stay as `YYYY-MM-DD` day precision.
 */
export function buildEventJsonLd(event: NormalizedEvent): Record<string, unknown> {
  const location = event.format === 'online'
    ? { '@type': 'VirtualLocation', 'url': event.url }
    : {
        '@type': 'Place',
        'name': event.venue ?? event.city,
        'address': { '@type': 'PostalAddress', 'addressLocality': event.city, 'addressCountry': event.country },
      }
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    'name': event.name,
    'startDate': event.startDate,
    'endDate': event.endDate ?? event.startDate,
    'eventAttendanceMode': attendanceMode[event.format],
    location,
    'url': eventCanonicalUrl(event.id),
    'sameAs': event.url,
    'image': eventOgImageUrl(event.id),
    ...(event.description && { description: event.description }),
    ...(event.organizer && { organizer: { '@type': 'Organization', 'name': event.organizer } }),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/seo.test.ts`
Expected: PASS (all 4 tests).

- [ ] **Step 5: Lint, typecheck, commit**

```bash
pnpm lint --fix && pnpm typecheck
git add src/config.ts src/utils/seo.ts test/seo.test.ts
git commit -m "feat(seo): site url constant and schema.org Event builder"
```

---

### Task 2: Related events scoring (`src/utils/related.ts`)

**Files:**

- Create: `src/utils/related.ts`
- Test: `test/related.test.ts`

**Interfaces:**

- Produces: `relatedEvents(event: NormalizedEvent, all: NormalizedEvent[], count = 4): NormalizedEvent[]` — excludes the event itself, only score > 0, sorted best-first.

- [ ] **Step 1: Write the failing test**

Create `test/related.test.ts`:

```ts
import type { TechEvent } from '~/types'
import { describe, expect, it } from 'vitest'
import { normalizeEvent } from '~/utils/events'
import { relatedEvents } from '~/utils/related'

function make(id: string, patch: Partial<TechEvent>): ReturnType<typeof normalizeEvent> {
  return normalizeEvent({
    id: '',
    name: id,
    startDate: '2026-08-01',
    city: '上海',
    url: 'https://example.com',
    tags: [],
    ...patch,
  } as TechEvent, id)
}

describe('relatedEvents', () => {
  const self = make('self', { tags: ['vue', 'frontend'], city: '上海' })

  it('scores shared tags (2pt each) above same city (1pt)', () => {
    const tagMatch = make('tag-match', { tags: ['vue'], city: '北京' })
    const cityMatch = make('city-match', { tags: ['ai'], city: '上海' })
    expect(relatedEvents(self, [self, cityMatch, tagMatch]).map(e => e.id))
      .toEqual(['tag-match', 'city-match'])
  })

  it('excludes itself and zero-score events, caps at count', () => {
    const others = [
      make('a', { tags: ['vue'] }),
      make('b', { tags: ['frontend'] }),
      make('c', { tags: ['vue', 'frontend'] }),
      make('d', { tags: ['vue'], city: '北京' }),
      make('e', { tags: ['rust'], city: '深圳' }),
    ]
    const picked = relatedEvents(self, [self, ...others], 3)
    expect(picked).toHaveLength(3)
    expect(picked.map(e => e.id)).not.toContain('self')
    expect(picked.map(e => e.id)).not.toContain('e')
    expect(picked[0].id).toBe('c')
  })

  it('breaks score ties by date proximity to the source event', () => {
    const near = make('near', { tags: ['vue'], city: '北京', startDate: '2026-08-10' })
    const far = make('far', { tags: ['vue'], city: '北京', startDate: '2027-03-01' })
    expect(relatedEvents(self, [self, far, near]).map(e => e.id)).toEqual(['near', 'far'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/related.test.ts`
Expected: FAIL — cannot resolve `~/utils/related`.

- [ ] **Step 3: Implement**

Create `src/utils/related.ts`:

```ts
import type { NormalizedEvent } from '~/types'

/**
 * Pick up to `count` events related to `event`: shared tags weigh 2 points
 * each, same city 1 point; zero-score events are dropped. Ties break by
 * calendar distance so recommendations stay temporally relevant.
 */
export function relatedEvents(event: NormalizedEvent, all: NormalizedEvent[], count = 4): NormalizedEvent[] {
  return all
    .filter(e => e.id !== event.id)
    .map((e) => {
      const shared = e.tags.filter(t => event.tags.includes(t)).length
      return {
        e,
        score: shared * 2 + (e.city === event.city ? 1 : 0),
        distance: Math.abs(e.start.getTime() - event.start.getTime()),
      }
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score || a.distance - b.distance)
    .slice(0, count)
    .map(r => r.e)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/related.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint, typecheck, commit**

```bash
pnpm lint --fix && pnpm typecheck
git add src/utils/related.ts test/related.test.ts
git commit -m "feat: related-events scoring by tag and city overlap"
```

---

### Task 3: Map deep-link builders (`src/utils/mapLinks.ts`)

**Files:**

- Create: `src/utils/mapLinks.ts`
- Test: `test/map-links.test.ts`

**Interfaces:**

- Consumes: `NormalizedEvent`.
- Produces:
  - `hasLocation(event: NormalizedEvent): boolean` — false for online-only events with no venue.
  - `mapSearchQuery(event: NormalizedEvent): string` — `"<venue> <city>"` (venue optional).
  - `amapSearchUrl(query: string): string`
  - `appleMapsSearchUrl(query: string): string`

- [ ] **Step 1: Write the failing test**

Create `test/map-links.test.ts`:

```ts
import type { TechEvent } from '~/types'
import { describe, expect, it } from 'vitest'
import { normalizeEvent } from '~/utils/events'
import { amapSearchUrl, appleMapsSearchUrl, hasLocation, mapSearchQuery } from '~/utils/mapLinks'

function make(patch: Partial<TechEvent>): ReturnType<typeof normalizeEvent> {
  return normalizeEvent({
    id: '',
    name: 'x',
    startDate: '2026-08-01',
    city: '上海',
    url: 'https://example.com',
    ...patch,
  } as TechEvent, 'x')
}

describe('map links', () => {
  it('builds the search query from venue and city', () => {
    expect(mapSearchQuery(make({ venue: '世博展览馆' }))).toBe('世博展览馆 上海')
    expect(mapSearchQuery(make({}))).toBe('上海')
  })

  it('urls are key-free and percent-encoded', () => {
    expect(amapSearchUrl('世博展览馆 上海'))
      .toBe(`https://uri.amap.com/search?keyword=${encodeURIComponent('世博展览馆 上海')}`)
    expect(appleMapsSearchUrl('世博展览馆 上海'))
      .toBe(`https://maps.apple.com/?q=${encodeURIComponent('世博展览馆 上海')}`)
  })

  it('online events without a venue have no location', () => {
    expect(hasLocation(make({ format: 'online', city: '线上' }))).toBe(false)
    expect(hasLocation(make({ venue: '会议中心' }))).toBe(true)
    expect(hasLocation(make({}))).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/map-links.test.ts`
Expected: FAIL — cannot resolve `~/utils/mapLinks`.

- [ ] **Step 3: Implement**

Create `src/utils/mapLinks.ts`:

```ts
import type { NormalizedEvent } from '~/types'

/**
 * Key-free map deep links built from plain text search, so they work for
 * every user with no API key, no coordinates and no GCJ-02 conversion.
 */
export function mapSearchQuery(event: NormalizedEvent): string {
  return [event.venue, event.city].filter(Boolean).join(' ')
}

export function amapSearchUrl(query: string): string {
  return `https://uri.amap.com/search?keyword=${encodeURIComponent(query)}`
}

export function appleMapsSearchUrl(query: string): string {
  return `https://maps.apple.com/?q=${encodeURIComponent(query)}`
}

/** Online-only events with no physical venue get no map block at all. */
export function hasLocation(event: NormalizedEvent): boolean {
  return event.format !== 'online' || !!event.venue
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/map-links.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint, typecheck, commit**

```bash
pnpm lint --fix && pnpm typecheck
git add src/utils/mapLinks.ts test/map-links.test.ts
git commit -m "feat: key-free map deep-link builders"
```

---

### Task 4: Per-event ICS files (`scripts/generate-ics.mjs`)

**Files:**

- Modify: `scripts/generate-ics.mjs`
- Modify: `.gitignore`

**Interfaces:**

- Produces: `public/ics/<id>.ics` for every event (plus the existing combined `public/events.ics`). The detail page links to `/ics/<id>.ics` (Task 5).

- [ ] **Step 1: Extend the script**

In `scripts/generate-ics.mjs`, extract the per-event VEVENT lines into a function and write one single-event VCALENDAR per event. Replace the section from `const lines = [` to the final `writeFileSync` with:

```js
const calendarHeader = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//techevent-cn//Tech Events Calendar//ZH',
  'CALSCALE:GREGORIAN',
  'METHOD:PUBLISH',
]

/** VEVENT block for one event; shared between the feed and per-event files. */
function veventLines(e) {
  const end = e.endDate ?? e.startDate
  const place = [e.venue, e.city, e.country].filter(Boolean).join(', ')
  return [
    'BEGIN:VEVENT',
    `UID:${e.id}@techevent-cn`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${toIcsDate(e.startDate)}`,
    `DTEND;VALUE=DATE:${nextDay(end)}`,
    fold(`SUMMARY:${escapeText(e.name)}`),
    fold(`DESCRIPTION:${escapeText([e.description, e.url].filter(Boolean).join('\n'))}`),
    fold(`LOCATION:${escapeText(place)}`),
    fold(`URL:${escapeText(e.url)}`),
    'END:VEVENT',
  ]
}

const lines = [
  ...calendarHeader,
  'X-WR-CALNAME:techevent-cn',
  'X-WR-CALDESC:中国（及周边）科技活动日历',
  ...events.flatMap(veventLines),
  'END:VCALENDAR',
]
writeFileSync(outFile, `${lines.join('\r\n')}\r\n`, 'utf8')

const perEventDir = join(root, 'public', 'ics')
mkdirSync(perEventDir, { recursive: true })
for (const e of events) {
  const single = [...calendarHeader, ...veventLines(e), 'END:VCALENDAR']
  writeFileSync(join(perEventDir, `${e.id}.ics`), `${single.join('\r\n')}\r\n`, 'utf8')
}
console.log(`Wrote ${events.length} events to ${outFile} and ${perEventDir}/`)
```

Add `mkdirSync` to the existing `node:fs` import.

- [ ] **Step 2: Run and verify**

Run: `pnpm gen:ics && ls public/ics | wc -l && head -5 public/ics/vueconf-china-2026.ics && grep -c 'BEGIN:VEVENT' public/events.ics`
Expected: file count equals the number of event JSONs (31); the sample file starts with `BEGIN:VCALENDAR` and contains one VEVENT; the combined feed still contains all 31 VEVENTs.

- [ ] **Step 3: Gitignore the new output**

Append to `.gitignore` (next to the existing `public/events.ics` entry):

```txt
public/ics/
```

- [ ] **Step 4: Lint, commit**

```bash
pnpm lint --fix
git add scripts/generate-ics.mjs .gitignore
git commit -m "feat(ics): emit per-event ics files for add-to-calendar"
```

---

### Task 5: Event detail page (`src/pages/event/[id].vue`)

**Files:**

- Create: `src/pages/event/[id].vue`
- Create: `src/components/EventShareButtons.vue`

**Interfaces:**

- Consumes: `allEvents` (auto-imported from `~/composables/events`), `relatedEvents` (`~/utils/related`), `buildEventJsonLd` / `eventCanonicalUrl` / `eventOgImageUrl` (`~/utils/seo`), `hasLocation` / `mapSearchQuery` / `amapSearchUrl` / `appleMapsSearchUrl` (`~/utils/mapLinks`), `resolveEventTheme` / `tagIconFor` (`~/utils/eventTheme`), `formatDateRange` (`~/utils/format`).
- Produces: route `/event/[id]`; `EventShareButtons` component with prop `{ url: string, title: string }`. The location block markup lives inline in the page for now; Task 11 extracts the embed part.

Note: `useHead`/`useSeoMeta` come from `@unhead/vue`, installed in this task. `useHead` throws without an installed head instance, so this task also adds `createHead` to `src/main.ts` for the interim SPA mode; Task 7 rewrites `main.ts` for vite-ssg, which installs unhead itself — the interim lines disappear with that rewrite.

- [ ] **Step 1: Create `src/components/EventShareButtons.vue`**

```vue
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
      class="share-btn"

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
```

- [ ] **Step 2: Create `src/pages/event/[id].vue`**

```vue
<script setup lang="ts">
import { useHead, useSeoMeta } from '@unhead/vue'
import { newEventUrl } from '~/config'
import { resolveEventTheme, tagIconFor } from '~/utils/eventTheme'
import { formatDateRange, isPast } from '~/utils/format'
import { amapSearchUrl, appleMapsSearchUrl, hasLocation, mapSearchQuery } from '~/utils/mapLinks'
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
    ? [{ type: 'application/ld+json', innerHTML: JSON.stringify(buildEventJsonLd(event.value)) }]
    : [],
}))
</script>

<template>
  <div mx-auto px-4 pb-16 max-w-3xl>
    <div pt-6>
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

        <div flex="~ wrap gap-2" mt-6>
          <a
            :href="event.url" target="_blank" rel="noopener"
            text-sm text-white px-3 py-1.5 rounded-md bg-teal-600 inline-flex gap-1 transition items-center hover:bg-teal-700
          >
            前往官网 <div i-carbon-arrow-up-right />
          </a>
          <a
            :href="`/ics/${event.id}.ics`"

            hover="border-teal-600 text-teal-600" download text-sm px-3 py-1.5 border border-gray-200 rounded-md inline-flex gap-1.5 transition items-center dark:border-gray-700
          >
            <div i-carbon-calendar-add /> 加入日历
          </a>
          <EventShareButtons :url="eventCanonicalUrl(event.id)" :title="event.name" />
        </div>

        <div v-if="theme" class="ev-watermark" aria-hidden="true">
          <div :class="theme.primary.icon" :style="{ fontSize: '105px', color: 'var(--ev-c)' }" />
        </div>
      </article>

      <section v-if="hasLocation(event)" mt-8>
        <h2 text-sm tracking-wide font-600 mb-3 op50>
          地点
        </h2>
        <div flex="~ wrap gap-2">
          <a
            :href="amapSearchUrl(mapQuery)" target="_blank" rel="noopener"

            hover="border-teal-600 text-teal-600" text-sm px-3 py-1.5 border border-gray-200 rounded-md inline-flex gap-1.5 transition items-center dark:border-gray-700
          >
            <div i-carbon-map /> 在高德地图中打开
          </a>
          <a
            :href="appleMapsSearchUrl(mapQuery)" target="_blank" rel="noopener"

            hover="border-teal-600 text-teal-600" text-sm px-3 py-1.5 border border-gray-200 rounded-md inline-flex gap-1.5 transition items-center dark:border-gray-700
          >
            <div i-carbon-map /> 在 Apple 地图中打开
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
```

- [ ] **Step 3: Install @unhead/vue and wire it for SPA mode**

```bash
pnpm add @unhead/vue
```

In `src/main.ts`, add the head plugin (temporary — Task 7 replaces this file):

```ts
import { createHead } from '@unhead/vue/client'
```

and after `const app = createApp(App)`:

```ts
app.use(createHead())
```

- [ ] **Step 4: Verify in dev**

```bash
pnpm dev
```

Open `http://localhost:60086/event/vueconf-china-2026`:

- Page renders name, dates, venue, tags, 前往官网 / 加入日历 / 复制链接 buttons, 地点 deep links, 相关活动 cards.
- `http://localhost:60086/event/does-not-exist` shows the 活动不存在 state.
- The tab title changes to `<活动名> · techevent-cn` (proves the head plugin works).

- [ ] **Step 5: Lint, typecheck, test, commit**

```bash
pnpm lint --fix && pnpm typecheck && pnpm vitest run
git add src/pages/event/ src/components/EventShareButtons.vue src/main.ts package.json pnpm-lock.yaml
git commit -m "feat: per-event detail page with share, calendar and map links"
```

---

### Task 6: Internal links from list and calendar

**Files:**

- Modify: `src/components/EventCard.vue`
- Modify: `src/components/EventDetailCard.vue`

**Interfaces:**

- Consumes: route `/event/<id>` from Task 5.

- [ ] **Step 1: EventCard links to the detail page**

In `src/components/EventCard.vue`, replace the root element:

```html
<a :href="event.url" target="_blank" rel="noopener" class="card" ...> </a>
```

with an internal `RouterLink` (all other attributes/classes/body unchanged):

```html
<RouterLink
  :to="`/event/${event.id}`"
  class="card"
  p-4
  block
  :class="[past ? 'op60 hover:op100' : '', theme ? 'ev-themed' : '']"
  :style="themeStyle"
>
</RouterLink>
```

and change the closing `</a>` to `</RouterLink>`.

- [ ] **Step 2: EventDetailCard gains a 查看详情 entry**

In `src/components/EventDetailCard.vue`, replace the single 前往官网 anchor block with a two-button row (前往官网 keeps its styles; add the RouterLink):

```html
<div class="mt-1 flex gap-2">
  <RouterLink
    :to="`/event/${event.id}`"
    class="text-sm text-white px-3 py-1.5 rounded-md bg-teal-600 inline-flex gap-1 transition items-center justify-center hover:bg-teal-700"
  >
    查看详情
    <div class="i-carbon-arrow-right" />
  </RouterLink>
  <a
    :href="event.url"
    target="_blank"
    rel="noopener"
    class="text-sm px-3 py-1.5 border border-gray-200 rounded-md inline-flex gap-1 transition items-center justify-center dark:border-gray-700 hover:border-teal-600 hover:text-teal-600"
  >
    前往官网
    <div class="i-carbon-arrow-up-right" />
  </a>
</div>
```

- [ ] **Step 3: Verify in dev**

Run: `pnpm dev`

- Homepage card click navigates to `/event/<id>` (no new tab).
- Calendar view → click an event bar → popover 查看详情 navigates to the detail page; 前往官网 still opens the external site.

- [ ] **Step 4: Lint, typecheck, test, commit**

```bash
pnpm lint --fix && pnpm typecheck && pnpm vitest run
git add src/components/EventCard.vue src/components/EventDetailCard.vue
git commit -m "feat: route event cards and calendar popover to detail pages"
```

---

### Task 7: vite-ssg conversion

**Files:**

- Modify: `src/main.ts`
- Modify: `vite.config.ts`
- Modify: `package.json` (build script, devDependency)
- Modify: `src/pages/index.vue` (homepage og tags)

**Interfaces:**

- Produces: `pnpm build` emits `dist/index.html` + `dist/event/<id>.html` (or `dist/event/<id>/index.html`, both fine on Netlify) containing rendered body HTML, OG tags and JSON-LD.

- [ ] **Step 1: Install vite-ssg**

```bash
pnpm add -D vite-ssg
```

Compatibility note: this repo uses vue-router **v5** with the `vue-router/vite` unplugin. Use the latest vite-ssg; if `vite-ssg build` errors about router creation or peer deps, check `pnpm why vue-router` and vite-ssg's release notes for the version adding router v5 support before downgrading anything else. Do not silently pin vue-router back to v4.

- [ ] **Step 2: Convert `src/main.ts`**

Replace the whole file with:

```ts
import { ViteSSG } from 'vite-ssg'
import { routes } from 'vue-router/auto-routes'
import App from './App.vue'

import './styles/main.css'
import 'uno.css'
// Load event-theme.css after uno.css so .ev-themed border-color overrides .card shortcut at equal specificity
import './styles/event-theme.css'

/**
 * vite-ssg entry: creates the app + router per rendered route at build time
 * and hydrates on the client. Head management (unhead) is wired in by ViteSSG.
 */
export const createApp = ViteSSG(App, {
  routes,
  base: import.meta.env.BASE_URL,
})
```

- [ ] **Step 3: Enumerate event routes in `vite.config.ts`**

Add to the imports:

```ts
import { readdirSync } from 'node:fs'
```

Add a top-level key next to `test:` in the `defineConfig({...})` object:

```txt
// vite-ssg: statically render the homepage plus one page per event JSON.
ssgOptions: {
  formatting: 'minify',
  includedRoutes(paths: string[]) {
    const ids = readdirSync(path.resolve(__dirname, 'data/events'))
      .filter(f => f.endsWith('.json') && !f.startsWith('_'))
      .map(f => f.replace(/\.json$/, ''))
    return [
      ...paths.filter(p => !p.includes(':') && !p.includes('[')),
      ...ids.map(id => `/event/${id}`),
    ]
  },
},
```

If TypeScript rejects `ssgOptions` on the config object, add `import 'vite-ssg'` (type augmentation) to the top of `vite.config.ts`.

- [ ] **Step 4: Homepage head tags**

In `src/pages/index.vue` `<script setup>`, add (after the existing imports):

```ts
import { useSeoMeta } from '@unhead/vue'
import { siteUrl } from '~/config'
```

```ts
useSeoMeta({
  ogTitle: 'techevent-cn · 中国科技活动日历',
  ogDescription: '中国（及周边）科技活动日历 — 开发者可浏览、筛选与订阅。',
  ogType: 'website',
  ogUrl: siteUrl,
})
```

- [ ] **Step 5: Switch the build command**

In `package.json`, update the build entry:

```json
{
  "build": "pnpm gen:ics && vite-ssg build"
}
```

- [ ] **Step 6: Build and verify output**

```bash
pnpm build
ls dist/event/ | head
```

Expected: one HTML file per event. Then:

```bash
grep -l 'og:title' dist/event/*.html | wc -l          # expect 31 (or count of events)
grep -c 'application/ld+json' dist/event/vueconf-china-2026*.html   # expect >= 1
grep -o '<h1[^>]*>[^<]*' dist/event/vueconf-china-2026*.html        # expect the event name in body HTML
grep -o '<link rel="canonical"[^>]*>' dist/event/vueconf-china-2026*.html  # expect the event.rizumu.me URL
```

Also `pnpm preview` and click through homepage → detail → back; verify hydration (buttons work, no console errors).

- [ ] **Step 7: Lint, typecheck, test, commit**

```bash
pnpm lint --fix && pnpm typecheck && pnpm vitest run
git add src/main.ts vite.config.ts package.json pnpm-lock.yaml src/pages/index.vue
git commit -m "feat: prerender all pages with vite-ssg"
```

---

### Task 8: Sitemap + robots.txt

**Files:**

- Create: `scripts/generate-sitemap.mjs`
- Create: `public/robots.txt`
- Modify: `package.json` (script + build chain), `.gitignore`

**Interfaces:**

- Produces: `public/sitemap.xml` listing `/` and every `/event/<id>`; `public/robots.txt` pointing at it.

- [ ] **Step 1: Write the script**

Create `scripts/generate-sitemap.mjs`:

```js
// Generate sitemap.xml from the event JSON files. Runs before `vite build`.
import { readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Keep in sync with `siteUrl` in src/config.ts.
const siteUrl = 'https://event.rizumu.me'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const ids = readdirSync(join(root, 'data', 'events'))
  .filter(f => f.endsWith('.json') && !f.startsWith('_'))
  .map(f => f.replace(/\.json$/, ''))
  .sort()

const urls = ['/', ...ids.map(id => `/event/${id}`)]

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(u => `  <url><loc>${siteUrl}${u === '/' ? '/' : u}</loc></url>`),
  '</urlset>',
]

writeFileSync(join(root, 'public', 'sitemap.xml'), `${xml.join('\n')}\n`, 'utf8')
console.log(`Wrote ${urls.length} urls to public/sitemap.xml`)
```

- [ ] **Step 2: robots.txt**

Create `public/robots.txt`:

```txt
User-agent: *
Allow: /

Sitemap: https://event.rizumu.me/sitemap.xml
```

- [ ] **Step 3: Wire into the build**

In `package.json`, update/add these script entries:

```json
{
  "build": "pnpm gen:ics && pnpm gen:sitemap && vite-ssg build",
  "gen:sitemap": "node scripts/generate-sitemap.mjs"
}
```

Append to `.gitignore`:

```txt
public/sitemap.xml
```

- [ ] **Step 4: Run and verify**

Run: `pnpm gen:sitemap && head -4 public/sitemap.xml && grep -c '<loc>' public/sitemap.xml`
Expected: valid XML header; loc count = events + 1.

- [ ] **Step 5: Lint, commit**

```bash
pnpm lint --fix
git add scripts/generate-sitemap.mjs public/robots.txt package.json .gitignore
git commit -m "feat(seo): sitemap generation and robots.txt"
```

---

### Task 9: OG share image generation (`scripts/generate-og.mjs`)

**Files:**

- Create: `scripts/generate-og.mjs`
- Modify: `package.json` (deps, script, build chain), `.gitignore`

**Interfaces:**

- Consumes: `data/events/*.json`; optionally `src/data/tag-icons.ts` (native TS import, best-effort).
- Produces: `public/og/<id>.png`, 1200×630, one per event — the URLs Task 1's `eventOgImageUrl` already points at.

- [ ] **Step 1: Install deps**

```bash
pnpm add -D satori @resvg/resvg-js subset-font
```

- [ ] **Step 2: Write the script**

Create `scripts/generate-og.mjs`:

```js
// Generate one 1200x630 OG share image per event. Runs before `vite build`.
// Pipeline: download+cache Noto Sans SC -> subset to used glyphs -> satori
// (object tree, no JSX) -> SVG -> resvg -> PNG in public/og/.
import { Buffer } from 'node:buffer'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import subsetFont from 'subset-font'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'og')
mkdirSync(outDir, { recursive: true })

// Full CJK font is ~16 MB; cache it in node_modules/.cache (kept by Netlify).
const FONT_URL = 'https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Bold.otf'
const cacheDir = join(root, 'node_modules', '.cache', 'techevent-og')
const fontPath = join(cacheDir, 'NotoSansCJKsc-Bold.otf')

async function loadFont() {
  if (!existsSync(fontPath)) {
    mkdirSync(cacheDir, { recursive: true })
    console.log('Downloading Noto Sans CJK SC Bold...')
    const res = await fetch(FONT_URL)
    if (!res.ok)
      throw new Error(`Font download failed: ${res.status} ${FONT_URL}`)
    writeFileSync(fontPath, Buffer.from(await res.arrayBuffer()))
  }
  return readFileSync(fontPath)
}

/** Best-effort brand color per event from tag-icons.ts; teal fallback. */
async function loadPrimaryColor() {
  try {
    // Node >= 23.6 strips types natively; older Node throws and we fall back.
    const { tagIcons } = await import('../src/data/tag-icons.ts')
    return (tags) => {
      for (const tag of tags ?? []) {
        const def = tagIcons[tag]
        if (def && def.tier !== 3)
          return def.colorDark ?? def.color
      }
      return '#14b8a6'
    }
  }
  catch {
    return () => '#14b8a6'
  }
}

const events = readdirSync(join(root, 'data', 'events'))
  .filter(f => f.endsWith('.json') && !f.startsWith('_'))
  .map(f => ({ id: f.replace(/\.json$/, ''), ...JSON.parse(readFileSync(join(root, 'data', 'events', f), 'utf8')) }))

function dateLabel(e) {
  const end = e.endDate && e.endDate !== e.startDate ? ` – ${e.endDate}` : ''
  return `${e.startDate}${end}`
}

const SITE = 'event.rizumu.me · techevent-cn'

/** satori element helper: h('div', style, ...children). */
function h(type, style, ...children) {
  return { type, props: { style, children: children.flat() } }
}

function card(e, color) {
  const meta = [dateLabel(e), [e.city, e.country && e.country !== '中国' ? e.country : ''].filter(Boolean).join(' · ')]
  return h('div', {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '64px',
    backgroundColor: '#0f172a',
    backgroundImage: `linear-gradient(135deg, #0f172a 0%, #1e293b 70%, ${color}33 100%)`,
    color: '#f8fafc',
    fontFamily: 'Noto Sans SC',
  }, [
    h('div', { display: 'flex', flexDirection: 'column', gap: '28px' }, [
      h('div', { display: 'flex', fontSize: e.name.length > 18 ? '56px' : '68px', fontWeight: 700, lineHeight: 1.25 }, e.name),
      h('div', { display: 'flex', gap: '32px', fontSize: '34px', color: '#cbd5e1' }, meta.filter(Boolean).map(text => h('div', { display: 'flex' }, text))),
      (e.tags ?? []).length
        ? h('div', { display: 'flex', gap: '14px', marginTop: '8px' }, e.tags.slice(0, 5).map(tag =>
            h('div', { display: 'flex', fontSize: '26px', padding: '6px 20px', borderRadius: '999px', backgroundColor: '#33415588', color: '#e2e8f0' }, tag)))
        : h('div', { display: 'flex' }),
    ]),
    h('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, [
      h('div', { display: 'flex', fontSize: '30px', color }, SITE),
      h('div', { display: 'flex', width: '18px', height: '18px', borderRadius: '999px', backgroundColor: color }),
    ]),
  ])
}

const fullFont = await loadFont()
const colorFor = await loadPrimaryColor()

const allText = `${events.map(e => `${e.name}${dateLabel(e)}${e.city}${e.country ?? ''}${(e.tags ?? []).join('')}`).join('')}${SITE}0123456789 –·`
const font = await subsetFont(fullFont, allText, { targetFormat: 'sfnt' })
console.log(`Font subset: ${(font.length / 1024).toFixed(0)} KB`)

for (const e of events) {
  const svg = await satori(card(e, colorFor(e.tags)), {
    width: 1200,
    height: 630,
    fonts: [{ name: 'Noto Sans SC', data: font, weight: 700, style: 'normal' }],
  })
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng()
  writeFileSync(join(outDir, `${e.id}.png`), png)
}
console.log(`Wrote ${events.length} OG images to ${outDir}`)

if (events.length === 0)
  process.exit(1)
```

- [ ] **Step 3: Wire into the build**

In `package.json`, update/add these script entries:

```json
{
  "build": "pnpm gen:ics && pnpm gen:sitemap && pnpm gen:og && vite-ssg build",
  "gen:og": "node scripts/generate-og.mjs"
}
```

Append to `.gitignore`:

```txt
public/og/
```

- [ ] **Step 4: Run and verify**

Run: `pnpm gen:og && ls public/og | wc -l`
Expected: PNG count = event count; script logs subset size well under 1 MB. Open one image (`open public/og/vueconf-china-2026.png`) and check: event name renders in Chinese (no tofu boxes), date/city row present, tag pills present, footer shows `event.rizumu.me · techevent-cn`.

If the font URL 404s (repo moved), find the current `NotoSansCJKsc-Bold.otf` raw URL in https://github.com/googlefonts/noto-cjk and update `FONT_URL`.

- [ ] **Step 5: Lint, commit**

```bash
pnpm lint --fix
git add scripts/generate-og.mjs package.json pnpm-lock.yaml .gitignore
git commit -m "feat(seo): build-time og share image generation"
```

---

### Task 10: Venue coordinates (one-time geocoding)

**Files:**

- Modify: `src/types.ts`
- Create: `scripts/geocode-venues.mjs`
- Modify: `data/events/*.json` (add `coordinates` where confidently resolved)
- Modify: `data/events/_template.json` (document the field)

**Interfaces:**

- Produces: optional `coordinates?: [number, number]` (**WGS-84 `[lng, lat]`**) on `TechEvent`/`NormalizedEvent` — flows through `normalizeEvent` automatically via the spread. Task 11 consumes it.

- [ ] **Step 1: Add the field to the types**

In `src/types.ts`, add to `TechEvent` (after `venue?`):

```txt
  /** Venue coordinates as WGS-84 `[lng, lat]`; drafted by scripts/geocode-venues.mjs, hand-verified. */
  coordinates?: [number, number]
```

Add the same line to `NormalizedEvent` (after `venue?`).

In `data/events/_template.json`, if it carries commented/placeholder fields, mirror the existing style to mention `coordinates` (skip if the template is a bare minimal example — do not invent a new convention).

- [ ] **Step 2: Write the one-time geocode script**

Create `scripts/geocode-venues.mjs`:

```js
// One-time helper: draft WGS-84 coordinates for events that have a venue but
// no coordinates yet, via Nominatim (1 req/s per usage policy). Results are
// written back into the event JSON files and MUST be hand-verified before
// committing. Not part of the build chain.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { setTimeout as sleep } from 'node:timers/promises'

const eventsDir = new URL('../data/events', import.meta.url).pathname

const files = readdirSync(eventsDir).filter(f => f.endsWith('.json') && !f.startsWith('_'))

for (const file of files) {
  const path = join(eventsDir, file)
  const event = JSON.parse(readFileSync(path, 'utf8'))
  if (event.coordinates || !event.venue || event.format === 'online')
    continue

  const query = `${event.venue}, ${event.city}`
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { 'User-Agent': 'techevent-cn geocoder (https://github.com/LittleSound/techevent-cn)' } })
  const hits = res.ok ? await res.json() : []

  if (hits.length) {
    const { lat, lon, display_name } = hits[0]
    event.coordinates = [Number.parseFloat(Number(lon).toFixed(5)), Number.parseFloat(Number(lat).toFixed(5))]
    // Preserve key order: rewrite via a fresh object with coordinates after venue.
    const ordered = {}
    for (const key of Object.keys(event)) {
      if (key === 'coordinates')
        continue
      ordered[key] = event[key]
      if (key === 'venue')
        ordered.coordinates = event.coordinates
    }
    writeFileSync(path, `${JSON.stringify(ordered, null, 2)}\n`, 'utf8')
    console.log(`OK   ${file}: [${event.coordinates}] <- ${display_name}`)
  }
  else {
    console.log(`MISS ${file}: ${query}`)
  }
  await sleep(1100)
}
console.log('Done. Hand-verify every OK line before committing.')
process.exit(0)
```

- [ ] **Step 3: Run it once and hand-verify**

Run: `node scripts/geocode-venues.mjs`
Expected: a mix of `OK` and `MISS` lines over ~40 s (31 events, 1.1 s apart).

Hand-verify every `OK` result — Nominatim accuracy for Chinese venues is mediocre:

- Plausibility bounds per city (lng, lat): 上海 ≈ [121.2–121.8, 30.9–31.4], 北京 ≈ [116.0–116.8, 39.6–40.2], 深圳 ≈ [113.7–114.4, 22.4–22.9], 杭州 ≈ [119.9–120.5, 30.0–30.5], 广州 ≈ [113.0–113.6, 22.9–23.4]. Others: sanity-check against the `display_name` the script printed (it must mention the right city/district).
- Delete the `coordinates` field from any event whose result falls outside its city or whose `display_name` names an unrelated place. A missing map beats a wrong pin.

- [ ] **Step 4: Verify data still loads, commit**

```bash
pnpm vitest run && pnpm typecheck && pnpm lint --fix
git add src/types.ts scripts/geocode-venues.mjs data/events/
git commit -m "feat(data): wgs-84 venue coordinates via one-time nominatim script"
```

---

### Task 11: Leaflet map embed (progressive enhancement)

**Files:**

- Create: `src/components/EventMapEmbed.vue`
- Modify: `src/pages/event/[id].vue` (drop the embed into the 地点 section)

**Interfaces:**

- Consumes: `event.coordinates` (`[lng, lat]`, WGS-84) from Task 10.
- Produces: `EventMapEmbed` component with prop `{ coordinates: [number, number], label: string }`.

- [ ] **Step 1: Install Leaflet**

```bash
pnpm add leaflet
pnpm add -D @types/leaflet
```

- [ ] **Step 2: Create `src/components/EventMapEmbed.vue`**

```vue
<script setup lang="ts">
const { coordinates, label } = defineProps<{
  /** WGS-84 [lng, lat] — flipped to Leaflet's [lat, lng] internally. */
  coordinates: [number, number]
  label: string
}>()

const container = shallowRef<HTMLElement>()

/**
 * Leaflet touches `window` at import time, so it is loaded dynamically inside
 * onMounted — this never runs during SSG rendering, and if OSM tiles are
 * unreachable (expected in mainland China) the block simply stays blank while
 * the deep-link buttons next to it keep working.
 */
onMounted(async () => {
  const L = (await import('leaflet')).default
  await import('leaflet/dist/leaflet.css')
  if (!container.value)
    return
  const [lng, lat] = coordinates
  const map = L.map(container.value, { scrollWheelZoom: false, attributionControl: true })
    .setView([lat, lng], 14)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map)
  L.circleMarker([lat, lng], { radius: 9, color: '#0d9488', fillColor: '#14b8a6', fillOpacity: 0.9 })
    .addTo(map)
    .bindTooltip(label)
})
</script>

<template>
  <div ref="container" border border-gray-200 rounded-lg h-52 overflow-hidden dark:border-gray-800 />
</template>
```

(`circleMarker` avoids Leaflet's default marker PNGs, which break under bundlers.)

- [ ] **Step 3: Integrate into the detail page**

In `src/pages/event/[id].vue`, inside the `地点` section, above the deep-link button row, add:

```html
<EventMapEmbed v-if="event.coordinates" :coordinates="event.coordinates" :label="event.venue ?? event.city" mb-3 />
```

- [ ] **Step 4: Verify in dev and in the SSG build**

- `pnpm dev` → open an event that got coordinates in Task 10: map renders with a teal dot at the venue (verify visually against the venue name); an event without coordinates shows only the buttons.
- `pnpm build` succeeds (proves Leaflet never loads during SSG) and the built page hydrates with the map in `pnpm preview`.

- [ ] **Step 5: Lint, typecheck, test, commit**

```bash
pnpm lint --fix && pnpm typecheck && pnpm vitest run
git add src/components/EventMapEmbed.vue src/pages/event/ package.json pnpm-lock.yaml
git commit -m "feat: leaflet venue map as progressive enhancement"
```

---

### Task 12: Final verification and ship

**Files:**

- No new files; fixes only if verification fails.

- [ ] **Step 1: Full quality gate**

```bash
pnpm lint --fix
pnpm typecheck
pnpm vitest run
pnpm build
```

Expected: all pass; build emits `dist/event/*.html`, `dist/og/*.png`, `dist/ics/*.ics`, `dist/sitemap.xml`, `dist/robots.txt`, `dist/events.ics`.

- [ ] **Step 2: Built-output spot checks**

```bash
grep -c 'og:image' dist/event/vueconf-china-2026*.html        # >= 1
grep -o 'https://event.rizumu.me/og/[^"]*' dist/event/vueconf-china-2026*.html | head -1
grep -c 'application/ld+json' dist/event/vueconf-china-2026*.html  # >= 1
ls dist/og | wc -l && ls dist/ics | wc -l                     # both = event count
grep -c '<loc>' dist/sitemap.xml                              # events + 1
```

Confirm the OG image URL printed above matches an actual file in `dist/og/`.

- [ ] **Step 3: Push and open a draft PR**

```bash
git push -u origin worktree-event-detail-pages
gh pr create --draft --title "feat: SSG event detail pages with SEO, OG images, map and related events" --body "$(cat <<'EOF'
## Summary
- Per-event detail pages at /event/<id>, statically pre-rendered with vite-ssg
- Full SEO surface: per-page OG/Twitter tags, canonical, JSON-LD Event, sitemap.xml, robots.txt
- Build-time OG share images (satori + resvg, Noto Sans SC subset)
- Add-to-calendar (per-event .ics), share buttons, related events
- Venue map: key-free Gaode/Apple deep links for everyone + Leaflet/OSM embed where reachable
- Event cards and calendar popover now link internally to detail pages

Spec: docs/superpowers/specs/2026-07-21-event-detail-pages-design.md
Plan: docs/superpowers/plans/2026-07-21-event-detail-pages.md
EOF
)"
```
