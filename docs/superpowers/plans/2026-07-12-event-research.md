# Event Research + Source Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow `data/events/` from 8 to 28+ verified tech events and produce a reusable information-source archive (`docs/research/sources.md`) for a future automation phase.

**Architecture:** A small schema change adds a provenance field (`sources`) to event JSON. Then four research passes (aggregator scan, conference sweep, hackathon/meetup sweep, vendor-expo sweep) each produce verified event JSON files plus source-archive entries, committed per pass. A final task consolidates the archive and validates everything.

**Tech Stack:** Vue 3 / Vite repo; events are plain JSON files under `data/events/`. Research uses WebSearch + WebFetch. Validation via `pnpm lint --fix`, `pnpm typecheck`, `pnpm test`, `pnpm gen:ics`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-12-event-research-design.md`. Read it before starting any task.
- "Today" for this plan is **2026-07-12**. Scope: future events first; representative first-half-2026 conferences are also allowed.
- **Quality bar (hard rule):** every event's `startDate`, `city`, and `url` must be verified by actually fetching an official page (official site or official announcement). If the official date cannot be confirmed, do NOT create the JSON — record the series in the "awaiting announcement" list in `docs/research/sources.md` instead.
- Online events only with a concrete date; ongoing streams/communities are excluded.
- Do not duplicate the 8 existing events: `adventurex-2026`, `coscon-2025`, `feday-2025`, `liangzhu-qishifu-demoday`, `pycon-china-2025`, `pyconjp-2026`, `shanghai-lug-20260618`, `vueconf-china-2026`.
- Event JSON conventions: filename is a kebab-case slug + year (`gopherchina-2026.json`); recurring meetups append the date (`shanghai-lug-20260618.json`); tags are lowercase; `description` is 1–2 sentences in Chinese; every new file includes a `sources` array of provenance URLs.
- All commits must pass the pre-commit hook (lint-staged runs eslint, which also parses markdown code blocks — TS blocks in docs must be syntactically valid).
- Comments and commit messages in English.

---

### Task 1: `sources` provenance field

**Files:**

- Modify: `src/types.ts` (TechEvent ~line 6–31, NormalizedEvent ~line 36–53)
- Modify: `data/events/_template.json`
- Test: `test/events.test.ts`

**Interfaces:**

- Produces: `TechEvent.sources?: string[]` and `NormalizedEvent.sources?: string[]` — provenance URLs. All later tasks write this field in event JSON files.

- [ ] **Step 1: Write the test**

Add to the `normalizeEvent` describe block in `test/events.test.ts`:

```ts
it('preserves provenance sources', () => {
  const e = make('a', { sources: ['https://example.com/announcement'] })
  expect(e.sources).toEqual(['https://example.com/announcement'])
})
```

- [ ] **Step 2: Run typecheck to verify it fails**

Run: `pnpm typecheck`
Expected: FAIL — `'sources' does not exist in type 'Partial<TechEvent>'`. (The runtime test would already pass because `normalizeEvent` spreads `...raw`; the type system is the failing gate here.)

- [ ] **Step 3: Add the field**

In `src/types.ts`, add to `TechEvent` (after `organizer`):

```ts
interface TechEvent {
  // ...existing fields
  /** Provenance URLs (official site, announcement post) the data was verified against. Not rendered in the UI. */
  sources?: string[]
}
```

Add the same `sources?: string[]` line (with the same comment) to `NormalizedEvent`.

In `data/events/_template.json`, add after `"organizer"`:

```json
{
  "organizer": "主办方，可省略",
  "sources": ["https://example.com/官方发布页，记录数据出处，可省略"]
}
```

- [ ] **Step 4: Verify it passes**

Run: `pnpm typecheck && pnpm test`
Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts data/events/_template.json test/events.test.ts
git commit -m "feat(data): add optional sources provenance field to event schema"
```

---

### Task 2: Aggregator scan

**Files:**

- Create: `docs/research/sources.md`
- Create: `data/events/*.json` (one per verified event found on aggregators)

**Interfaces:**

- Consumes: `sources` field from Task 1.
- Produces: `docs/research/sources.md` with the table format below; Tasks 3–5 append entries to the same tables.

- [ ] **Step 1: Create the archive skeleton**

Create `docs/research/sources.md`:

```markdown
# 活动信息源调研档案

> 2026-07 一次性人工调研的过程记录，为未来自动化数据管道提供依据。
> 评估口径见 docs/superpowers/specs/2026-07-12-event-research-design.md。

## 信息源档案

| 信息源 | URL | 覆盖范围 | 机器可读性 | 抓取难度 | 更新频率 | 自动化评估 | 本次收获 |
| ------ | --- | -------- | ---------- | -------- | -------- | ---------- | -------- |

## 无收获信息源

| 信息源 | URL | 原因 |
| ------ | --- | ---- |

## 待官宣清单

尚未公布 2026 场次日期的年度系列活动。

| 系列 | 往届规律 | 官方渠道 | 检查日期 |
| ---- | -------- | -------- | -------- |
```

- [ ] **Step 2: Scan each aggregator**

For each source below: open/search it for upcoming (after 2026-07-12) tech events in China + nearby (Japan mainly); note candidate events; and record one row in the archive table (machine readability = check for RSS/API/iCal endpoints; scraping difficulty = login wall / anti-bot / static HTML). Record dead or useless sources under 无收获信息源.

1. 活动行 — `https://www.huodongxing.com/` (search: 技术大会 / 开发者 / 前端 / AI)
2. 百格活动 — `https://www.bagevent.com/`
3. Luma — `https://lu.ma/` (explore Shanghai / Beijing / Shenzhen / Hangzhou / Tokyo pages)
4. Meetup — `https://www.meetup.com/` (Shanghai / Tokyo tech groups)
5. 开源社活动日历 — `https://kaiyuanshe.cn/activity`
6. SegmentFault 活动 — `https://segmentfault.com/events`
7. OSChina 活动 — `https://www.oschina.net/event`
8. 掘金活动 — `https://juejin.cn/events`
9. Connpass — `https://connpass.com/` (Tokyo, for 顺路参加 events)
10. Doorkeeper — `https://www.doorkeeper.jp/`

- [ ] **Step 3: Verify candidates and write event JSONs**

For every candidate: WebFetch its official page, confirm date/city/venue, then create `data/events/<slug>.json` following this shape (example, not a real event):

```json
{
  "name": "GopherChina 2026",
  "description": "中国 Go 语言开发者年度大会。",
  "startDate": "2026-08-15",
  "endDate": "2026-08-16",
  "city": "北京",
  "country": "中国",
  "venue": "具体场馆",
  "format": "offline",
  "url": "https://gopherchina.org/",
  "tags": ["go", "gopherchina", "backend"],
  "organizer": "GoCN 社区",
  "sources": ["https://gopherchina.org/", "https://mp.weixin.qq.com/s/xxxx"]
}
```

Unverifiable candidates go to the 待官宣清单 table instead.

- [ ] **Step 4: Validate**

Run: `pnpm lint --fix && pnpm typecheck && pnpm test && pnpm gen:ics`
Expected: all PASS; `pnpm gen:ics` regenerates `public/events.ics` including the new events.

- [ ] **Step 5: Commit**

```bash
git add docs/research/sources.md data/events/ public/events.ics
git commit -m "feat(data): add events from aggregator scan with source archive"
```

---

### Task 3: Keyword sweep — developer conferences

**Files:**

- Create: `data/events/*.json`
- Modify: `docs/research/sources.md` (append rows; add per-series official channels as sources when notable)

**Interfaces:**

- Consumes: archive table format from Task 2; `sources` field from Task 1.
- Produces: verified conference JSONs.

- [ ] **Step 1: Sweep known conference series**

For each series, WebSearch for the 2026 edition (query pattern: `<series> 2026 大会 时间` and `<series> 2026 conference date`), then WebFetch the official site to verify:

GOTC 全球开源技术峰会, GOSIM, COSCon 2026 中国开源年会, CommunityOverCode Asia (Apache), KubeCon + CloudNativeCon China, QCon 北京/上海, ArchSummit, GopherChina, Rust China Conf, JSConf China, VueConf 以外的前端大会 (D2, FEDay 2026, Vite Conf 线下场), PyCon China 2026, RubyConf China, Google DevFest 主要城市场, GDC? (跳过非技术类), TiDB/PingCAP DevCon, OpenInfra Days China, KCD (Kubernetes Community Days) 各城市场.

Also Japan-side (顺路参加): DroidKaigi, RubyKaigi 2026 (若在未来), JSConf JP, Vue Fes Japan 2026.

- [ ] **Step 2: Write verified event JSONs**

Same JSON shape and quality bar as Task 2 Step 3. Unconfirmed series → 待官宣清单 with 往届规律 (e.g. "每年9月，杭州") and official channel URL.

- [ ] **Step 3: Update sources.md**

Append any newly used sources (e.g. CNCF events page, InfoQ 会议页) to the 信息源档案 table.

- [ ] **Step 4: Validate**

Run: `pnpm lint --fix && pnpm typecheck && pnpm test && pnpm gen:ics`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/research/sources.md data/events/ public/events.ics
git commit -m "feat(data): add developer conferences from keyword sweep"
```

---

### Task 4: Keyword sweep — hackathons, demo days, community meetups

**Files:**

- Create: `data/events/*.json`
- Modify: `docs/research/sources.md`

**Interfaces:**

- Consumes: archive table format from Task 2; `sources` field from Task 1.
- Produces: verified hackathon/meetup JSONs.

- [ ] **Step 1: Sweep hackathons & demo days**

WebSearch + official-page verification for: AdventureX 后续场/衍生活动, 黑客松 2026 (上海/北京/深圳/杭州), OpenBuild 黑客松, 稀土掘金黑客松, 奇绩创坛 Demo Day (良渚 DemoDay 已收录，查后续场), HackathonWeekly / 周周黑客松, AI Hackathon (各大模型厂商), Google / Microsoft / AWS 黑客松中国场.

- [ ] **Step 2: Sweep community meetups**

WebSearch + verification for: 上海 LUG 下一场 (已有 20260618，查 7 月后), 北京 LUG, Rust 社区线下 meetup, Vue/前端城市 meetup, GDG DevFest 前哨 meetup, RustCC, 龙蜥/openEuler 社区 meetup, WebAssembly/AI infra 上海线下活动. Recurring meetups use date-suffixed filenames (`shanghai-lug-20260716.json`).

- [ ] **Step 3: Write JSONs + update sources.md**

Same shape and quality bar as Task 2 Step 3; append new sources / no-yield rows / 待官宣 entries.

- [ ] **Step 4: Validate**

Run: `pnpm lint --fix && pnpm typecheck && pnpm test && pnpm gen:ics`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/research/sources.md data/events/ public/events.ics
git commit -m "feat(data): add hackathons and community meetups from keyword sweep"
```

---

### Task 5: Keyword sweep — large vendor expos

**Files:**

- Create: `data/events/*.json`
- Modify: `docs/research/sources.md`

**Interfaces:**

- Consumes: archive table format from Task 2; `sources` field from Task 1.
- Produces: verified vendor-expo JSONs.

- [ ] **Step 1: Sweep vendor/industry events**

WebSearch + official-page verification for: WAIC 世界人工智能大会 2026 (通常7月，上海), 云栖大会 2026 (通常9-10月，杭州), 华为开发者大会 HDC 2026, 微信公开课 PRO, 腾讯全球数字生态大会, 百度世界大会 / Create 开发者大会, 阿里云 AI 势能大会, 火山引擎原动力大会, MWC 上海, 世界人形机器人/具身智能大会 (若为技术向). Skip pure marketing/consumer expos.

- [ ] **Step 2: Write JSONs + update sources.md**

Same shape and quality bar as Task 2 Step 3. Tag these with vendor + domain tags (e.g. `["ai", "waic", "上海"]` → cities are NOT tags; use `["ai", "waic"]`). Unconfirmed → 待官宣清单.

- [ ] **Step 3: Validate**

Run: `pnpm lint --fix && pnpm typecheck && pnpm test && pnpm gen:ics`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add docs/research/sources.md data/events/ public/events.ics
git commit -m "feat(data): add large vendor expos from keyword sweep"
```

---

### Task 6: Consolidate, verify acceptance, ship

**Files:**

- Modify: `docs/research/sources.md` (final automation verdicts, dedupe)
- Modify: `data/events/*.json` (only if dedupe/fixes needed)

**Interfaces:**

- Consumes: everything above.
- Produces: the shipped branch + draft PR.

- [ ] **Step 1: Dedupe and consistency pass**

Run: `ls data/events/*.json | wc -l` and list all events sorted by date:

```bash
node -e "const fs=require('fs');const d='data/events';fs.readdirSync(d).filter(f=>f.endsWith('.json')&&!f.startsWith('_')).map(f=>({f,...JSON.parse(fs.readFileSync(d+'/'+f))})).sort((a,b)=>a.startDate.localeCompare(b.startDate)).forEach(e=>console.log(e.startDate,e.city,e.name,'('+e.f+')'))"
```

Check: no duplicate events under different slugs; no event missing `sources`; dates plausible (no past-dated "upcoming" typos).

- [ ] **Step 2: Verify acceptance criteria from the spec**

- ≥20 new event JSONs (total ≥28 files excluding `_template.json`)
- `docs/research/sources.md` has ≥8 source rows (incl. no-yield) and a 待官宣 list
- Every 信息源档案 row has a filled 自动化评估 verdict (值得自动化 / 半自动 / 只适合人工)
- `src/types.ts` + `_template.json` document `sources`

If any criterion fails, go back to the relevant task and fill the gap before proceeding.

- [ ] **Step 3: Full validation**

Run: `pnpm lint --fix && pnpm typecheck && pnpm test && pnpm gen:ics && pnpm build`
Expected: all PASS.

- [ ] **Step 4: Commit, push, open draft PR**

```bash
git add -A
git commit -m "docs: finalize source archive with automation verdicts"
git push -u origin worktree-event-research-spec
gh pr create --draft --title "feat(data): add researched events + source archive" --body "See docs/superpowers/specs/2026-07-12-event-research-design.md"
```
