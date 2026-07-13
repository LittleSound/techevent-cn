# Design: One-time Event Research + Reusable Source Archive

Date: 2026-07-12
Status: Approved

## Problem

The calendar currently holds only 8 real events. The event list is too sparse
to be useful for browsing or subscribing. Before investing in an automated
ingestion pipeline, we do a one-time manual research pass — and record the
research process itself so a future automation phase can build on it instead
of rediscovering the same sources.

## Goals

1. Add 20–40 future tech events (after 2026-07-12; plus representative
   first-half-2026 conferences) covering four categories:
   developer conferences, hackathons / demo days, small community meetups,
   and large vendor expos (WAIC, 云栖, HDC, …).
2. Produce a source archive (`docs/research/sources.md`) documenting every
   information source checked — including the ones that yielded nothing —
   with enough metadata to evaluate automation feasibility later.

## Non-goals

- No automation scripts in this phase; the source archive is the only
  deliverable serving that future phase.
- No UI changes; the `sources` field is provenance-only and not rendered.

## Deliverables

### 1. Event data (`data/events/*.json`)

- Scope: future events first (after 2026-07-12), plus representative
  already-finished 2026 conferences for archival value.
- Quality bar: date, city, and official URL must be verified against an
  official page (site, official announcement post). Events without an
  officially confirmed date are NOT added — a calendar with wrong dates is
  worse than a sparse one.
- Annual series whose 2026 edition is not yet announced go into a
  "awaiting announcement" list inside sources.md, not into `data/events/`.
- Online events are included only when they have a concrete date; ongoing
  streams / communities are excluded.
- Dedupe against the 8 existing events.

### 2. Source archive (`docs/research/sources.md`)

One entry per information source with fields:

| Field               | Meaning                                         |
| ------------------- | ----------------------------------------------- |
| Name / URL          | Entry point of the source                       |
| Coverage            | Regions and event categories it covers          |
| Machine readability | RSS / API / iCal / structured HTML available?   |
| Scraping difficulty | Login wall? Anti-bot? Static HTML?              |
| Update cadence      | How promptly events appear                      |
| Automation verdict  | worth automating / semi-automatic / manual only |

Sources that yielded nothing are recorded too, with the reason, so the
automation phase doesn't re-explore dead ends.

### 3. Schema change

`TechEvent` gains an optional field:

```ts
interface TechEvent {
  // ...existing fields
  /** Provenance URLs (official site, announcement post) the data was verified against. */
  sources?: string[]
}
```

Declared in `src/types.ts` and shown in `data/events/_template.json`.
`normalizeEvent` needs no change — loading is tolerant of extra fields.
The UI does not render it.

## Research process (Plan C: source-first + keyword sweep)

1. **Aggregator scan** — walk known aggregators (活动行, 百格 bagevent,
   Luma cn/jp, Meetup, 开源社/KAIYUANSHE calendar, SegmentFault 活动,
   Connpass, Doorkeeper, OSChina/掘金 event pages, …), collect future
   events, and record each source's metadata for the archive.
2. **Keyword sweep** — for each category × known series (GOTC, Google
   DevFest, KubeCon China, JSConf, RubyConf China, QCon, ArchSummit, WAIC,
   云栖大会, HDC, PyCon, VueConf, AdventureX, city LUGs, …), search for the
   2026 edition and verify on the official site. This catches events that
   never appear on aggregators.
3. **Dedupe & verify** — cross-check every candidate's date on its official
   page; drop unverifiable ones.
4. **Write & validate** — emit event JSONs with `sources`, write
   sources.md, then run `pnpm lint --fix`, `pnpm typecheck`, `pnpm test`,
   and `pnpm gen:ics` — all must pass.

## Acceptance criteria

- ≥20 new event JSON files, each with verified date/city/url and a
  `sources` array.
- `docs/research/sources.md` exists with ≥8 source entries (including
  no-yield ones) and an "awaiting announcement" list.
- `src/types.ts` and `_template.json` document the `sources` field.
- Lint, typecheck, tests, and ICS generation all pass.
