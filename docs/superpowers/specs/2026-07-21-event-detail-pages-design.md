# Design: Per-Event Detail Pages with SSG for SEO

Date: 2026-07-21
Status: Approved

## Problem

Every event surface links directly out to the official site. There is no
shareable per-event URL, so promoting the platform means sharing the homepage
or the external site — neither carries techevent-cn branding or SEO value.
The site is a pure client-rendered SPA with no per-route meta tags, so even if
detail URLs existed, crawlers and chat-app link previews would see nothing.

## Goals

1. A detail page per event at `/event/<id>` (id = event JSON filename slug),
   statically pre-rendered at build time so crawlers and link scrapers see
   real HTML.
2. Rich SEO surface: per-page title/description, canonical URL, Open Graph /
   Twitter card tags, JSON-LD `Event` structured data, `sitemap.xml`, and a
   build-time-generated OG share image per event.
3. Detail page content beyond the raw fields: add-to-calendar, share buttons,
   venue map (deep links + optional embed), and related-event recommendations.
4. Keep the zero-budget, zero-runtime-dependency philosophy: everything is
   static output of the build; no paid APIs, no runtime services.

## Non-goals

- WeChat in-app share cards: customizing them requires a registered 公众号 +
  WeChat JS-SDK regardless of og:image. Out of scope; og:image still serves
  X / Telegram / Discord / QQ and browser-initiated shares.
- Server-side 404 status for unknown event ids (static hosting limitation).
- An all-events map view (coordinates data added here would enable it later).

## Decisions (with rationale)

- **SSG: `vite-ssg` + `@unhead/vue`.** Designed for exactly this stack
  (Vue 3 + vue-router file routing + Vite, the Vitesse pattern). Alternatives
  rejected: a custom meta-stamping prerender script leaves the body
  client-rendered (bad for Baidu, which does not execute JS); migrating to
  Nuxt/Astro costs far more than it returns for a mature small project.
- **Canonical site URL: `https://event.rizumu.me`**, introduced as a constant
  in `src/config.ts` (currently the project has no absolute URL anywhere).
- **OG images: build-time generation** with `satori` + `@resvg/resvg-js` +
  `subset-font` (Noto Sans SC subset), following the existing
  `generate-ics.mjs` build-script pattern. Third-party image services
  rejected: foreign CDNs are unreliable from mainland China and runtime edge
  functions are flaky for CN link scrapers; static PNGs on the site's own
  host are strictly better.
- **Map: deep links always, embed as progressive enhancement.** Research
  finding: OSM tiles are served via Fastly and effectively unusable from
  mainland China, and the only reliable free tiles (天地图) require a
  registered key. So the guaranteed path is key-free map deep links built
  from `venue + city` strings (Gaode `uri.amap.com/search?keyword=…`, Apple
  Maps) — no key, no coordinates, no GCJ-02 conversion. For users who can
  load them, a lazy-loaded Leaflet + OSM embed is layered on top; its failure
  never affects the deep links.
- **Card click goes to the detail page.** `EventCard` currently links out to
  the official site; it becomes an internal router link, and the detail page
  carries the "前往官网" button. This creates internal links (SEO) and makes
  the detail page the platform's entry point.

## Deliverables

### 1. Route and page (`src/pages/event/[id].vue`)

- File-based dynamic route, auto-typed by `vue-router/vite`.
- Content: full field display reusing the `EventDetailCard` visual language
  (theme watermark, tag chips), 前往官网 button, add-to-calendar (download a
  single-event `.ics`), share buttons (copy link + `navigator.share`), map
  block, related events.
- Related events: 3–4 picks scored by tag/city overlap, pure function,
  rendered with `EventCard`.
- Unknown id: an "活动不存在" state with a link home. Build enumerates only
  known ids; unknown URLs at runtime fall through Netlify's SPA redirect.
- `EventCard` links internally to `/event/<id>`; the calendar popover's
  `EventDetailCard` gains a "查看详情" entry.

### 2. SSG + head management

- `ViteSSG(...)` replaces `createApp` in `src/main.ts`; `ssgOptions.includedRoutes`
  enumerates `/` plus all 31 `/event/<id>` routes from `data/events/*.json`.
- `@unhead/vue` per-page head: title (`<活动名> · techevent-cn`), description,
  canonical, OG/Twitter tags, JSON-LD `Event` (name, startDate/endDate,
  location, organizer, url, image).
- `siteUrl` constant in `src/config.ts`.
- Build-time `sitemap.xml` generation (same script pattern as ICS).
- `netlify.toml` catch-all redirect stays — Netlify serves existing static
  files before applying redirects, so prerendered pages are unaffected.

### 3. OG image generation (`scripts/generate-og.mjs`)

- For each event: 1200×630 PNG at `public/og/<id>.png` with event name, date
  range, city, and tag chips, styled with the site's tag theme colors.
- Pipeline: subset Noto Sans SC to the glyphs actually used across all events
  (`subset-font`), render layout with `satori`, rasterize with
  `@resvg/resvg-js`. Runs in the `build` script chain; ~31 images in seconds;
  pure npm, works on Netlify CI.

### 4. Venue coordinates + map block

- Optional `coordinates: [lng, lat]` (WGS-84) field added to event JSON.
- One-time script `scripts/geocode-venues.mjs` drafts coordinates via
  Nominatim (1 req/s per usage policy); results are hand-verified before
  committing — Nominatim accuracy for Chinese venues is mediocre.
- Detail page map block: a row of key-free deep-link buttons (高德, Apple 地图)
  always shown; when coordinates exist, a lazy-loaded Leaflet + OSM mini-map
  renders above them. Tile failure (expected for most mainland users)
  degrades silently to the buttons.

### 5. Testing & quality

- Unit tests (vitest): related-events scoring, JSON-LD builder, map deep-link
  URL construction, single-event ICS content.
- Build verification: OG script produces 31 PNGs; post-`vite-ssg` build spot
  checks that emitted HTML contains OG tags and JSON-LD.
- `pnpm lint --fix`, `pnpm typecheck`, full vitest suite pass.

## Research references

- satori static-site OG pattern: https://knaap.dev/posts/dynamic-og-images-with-any-static-site-generator/
- satori CJK dual-font example: https://shinyaz.com/en/blog/2026/02/28/dynamic-og-images
- OSM unusable in mainland China: https://help.openstreetmap.org/questions/86556/is-there-any-way-to-use-openstreetmap-in-china
- Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/
- GCJ-02 vs WGS-84: https://abstractkitchen.com/blog/a-short-guide-to-chinese-coordinate-system/
- WeChat in-app share card limitation: https://segmentfault.com/a/1190000012860070
