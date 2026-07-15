# Tag Icons & Theme Colors — Design

Date: 2026-07-16
Status: approved (brainstormed with visual mockups; option C2 selected)

## Problem

Event entries have no graphical identity, making the list monotonous and hard to
scan. Traditional cover images would require storing bitmaps in the repo or an
object-storage service — both rejected. Instead, derive each event's visual
identity from its existing `tags` via Iconify icons compiled by UnoCSS
(`presetIcons`), which adds zero runtime assets.

## Goals

- Each event card shows up to 3 matched icons and a theme color derived from its tags.
- Tag chips show a small icon when the tag is in the mapping table.
- Calendar entries and the hover/detail card carry the same identity.
- No bitmap storage, no new runtime dependencies; icon sets are devDependencies only.

## Non-goals

- No changes to the event JSON schema or the ICS generation.
- No per-event manual icon overrides (tags are the single source of truth).
- Not every tag needs an icon; unmatched events keep the current teal styling.

## 1. Data layer — mapping table

New file `src/data/tag-icons.ts`, starting with `// @unocss-include` so UnoCSS
extracts the icon class names (plain `.ts` files are outside the default
extraction pipeline).

```ts
export interface TagIconDef {
  /** UnoCSS icon class, any Iconify collection, e.g. 'i-simple-icons-vuedotjs' */
  icon: string
  /** Brand/theme color (hex) */
  color: string
  /** Optional dark-mode override for colors that fail contrast on dark backgrounds */
  colorDark?: string
  /**
   * 1 = brand/tech logo (vue, python, ubuntu…)
   * 2 = domain concept (ai, opensource, hackathon, 3dprinting…)
   * 3 = chip-only: icon shows on the tag chip but never at card level (conference, meetup…)
   */
  tier: 1 | 2 | 3
}

export const tagIcons: Record<string, TagIconDef> = { /* … */ }
```

Icon sets are added as devDependencies as needed (`@iconify-json/simple-icons`,
`@iconify-json/mdi`, existing `@iconify-json/carbon`).

### Initial table (from a scan of all 31 events' tags)

Tier 1 — brand/tech logos (simple-icons, official brand colors):
`vue` `vite` `javascript` `typescript` `python` `pycon`(→Python) `pytorch`
`linux` `ubuntu` `kubernetes` `cncf` `aws` `android` `kotlin` `apache` `zabbix`
`openinfra`(→OpenStack) `gdg`/`devfest`(→Google)

Tier 2 — domain concepts (grouped tags share icon + color):

| Concept | Tags | Icon direction | Color |
|---|---|---|---|
| AI | `ai`, `artificial-intelligence`, `llm`, `agentic-ai` | carbon machine-learning | violet |
| Open source | `opensource`, `foss` | simple-icons OSI | `#3DA639` |
| 3D printing | `3dprinting`, `additive-manufacturing` | mdi printer-3d | orange |
| Cloud | `cloud`, `cloud-native` | carbon cloud | sky blue |
| Robotics | `robotics`, `embodied-ai` | mdi robot | blue gray |
| Hardware | `hardware` | carbon chip | indigo |
| Frontend/Web | `frontend`, `web` | carbon web | cyan |
| Mobile | `mobile` | carbon mobile | green |
| Hackathon | `hackathon` | mdi lightning/code | amber |
| Startup | `startup`, `demoday`, `indiehacker` | rocket | rose |
| Academia | `academic`, `computer-science`, `student`, `youth` | graduation cap | brown |
| Monitoring | `monitoring` | carbon dashboard | gray blue |
| Compiler | `compiler` | carbon code | dark gray |

Tier 3 — chip-only: `conference` `meetup` `community` `expo` `enterprise` `maker`

Excluded: event self-referential tags (`vuefes`, `vueconf`, `kubecon`,
`droidkaigi`, `tct`, `formnext`, `waic`, `gosim`, `community-over-code`) —
they always co-occur with the underlying tech tag.

Exact icon names are validated by the existence test (see Testing), so the
table can be authored without checking every collection by hand.

## 2. Matching logic — `src/utils/eventTheme.ts`

Pure function:

```ts
interface EventTheme {
  /** Up to 3 matched defs, primary first (tier asc, then tag order); tier 3 excluded */
  icons: TagIconDef[]
  /** icons[0]; drives accent color, watermark, calendar bar */
  primary: TagIconDef
}
function resolveEventTheme(event: NormalizedEvent): EventTheme | undefined
```

Rules: map `event.tags` through `tagIcons`; sort hits by tier ascending, then
by original tag order; dedupe by icon name (grouped tags like `ai`+`llm` hit
the same def); take the first 3; tier-3 hits never reach card level.
`undefined` (no tier-1/2 hit) means the component keeps today's teal styling —
callers never branch on errors, only on presence.

## 3. Color mechanism (key implementation constraint)

Icon class names are static strings in the table → compiled by UnoCSS.
Theme colors are runtime data and CANNOT become UnoCSS classes (arbitrary-value
classes are compiled statically). Colors are injected as an inline CSS variable
(`style="--ev-color: #42b883"`); derived tints (border, background, radial
glow) use `color-mix(in srgb, var(--ev-color) N%, transparent)` in shared CSS.
Dark-mode contrast failures (near-black brand colors) use the `colorDark`
override.

## 4. UI application (selected design: C2 watermark + themed calendar)

**EventCard** — stacked watermark bottom-right (primary icon ~105px, secondary
~58px beside it); light mode: watermark opacity 0.16 plus a theme-color radial
glow in the corner (`radial-gradient` of `--ev-color` at ~18%); dark mode:
opacity 0.13, same glow. Border tinted with `--ev-color`, title colored with
it. Matched tag chips get a 12px icon prefix (all tiers).

**EventDetailCard** (calendar popover + mobile sheet) — same watermark and chip
treatment, smaller watermark (~70px).

**CalendarView bars** — primary icon (12px) at the start of the bar text;
background `color-mix(var(--ev-color) ~18%)`, text in theme color; selected
state: solid theme color with white text. Unmatched events keep the existing
teal styling exactly.

Past-event dimming (`op60`) and all existing card fields/behavior are preserved.

## 5. Testing

- Unit tests for `resolveEventTheme`: tier priority, tag-order tiebreak,
  dedupe of grouped tags, 3-icon cap, tier-3 exclusion, no-match → `undefined`.
- Table validation test: every `icon` in `tagIcons` resolves against the
  installed `@iconify-json/*` collections (guards against typos in icon names).
- Component snapshots/behavior are covered by existing test setup where present.

## Out of scope / notes

- `data/events/_template.json` contains placeholder tags (`关键词`,
  `lowercase`); it is gitignored and not real data — no action needed.
- ICS generation and event JSON schema are untouched.
