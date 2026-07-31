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

/** Iconify collections referenced by tag-icons.ts, keyed by the `i-<collection>-` prefix. */
const ICON_COLLECTIONS = ['simple-icons', 'carbon', 'mdi']
const iconSetCache = new Map()

/** Load (and cache) an @iconify-json collection's icons.json. */
function loadIconSet(collection) {
  if (!iconSetCache.has(collection)) {
    const path = join(root, 'node_modules', '@iconify-json', collection, 'icons.json')
    iconSetCache.set(collection, existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null)
  }
  return iconSetCache.get(collection)
}

/**
 * Resolve a UnoCSS icon class (`i-<collection>-<name>`) to an inline SVG data
 * URI satori can render as an `img`. Longest-prefix match against the known
 * collections since icon names themselves may contain dashes. Returns null
 * (icon skipped, never a thrown error) when the collection or name is unknown.
 */
function resolveIcon(iconClass, color) {
  const collection = ICON_COLLECTIONS.find(c => iconClass.startsWith(`i-${c}-`))
  if (!collection)
    return null
  const set = loadIconSet(collection)
  const name = iconClass.slice(`i-${collection}-`.length)
  const icon = set?.icons?.[name]
  if (!icon)
    return null
  const width = icon.width ?? set.width ?? 24
  const height = icon.height ?? set.height ?? 24
  const body = icon.body.replaceAll('currentColor', color)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="${color}">${body}</svg>`
  return { src: `data:image/svg+xml,${encodeURIComponent(svg)}`, width, height }
}

/** Best-effort event theme (brand color + up to 3 watermark icons) from tag-icons.ts. */
async function loadEventTheme() {
  try {
    // Node >= 23.6 strips types natively; older Node throws and we fall back.
    const { tagIcons } = await import('../src/data/tag-icons.ts')
    return (tags) => {
      // Mirror src/utils/eventTheme.ts resolveEventTheme: tier !== 3, dedupe by
      // def identity, stable sort by tier ascending, take up to 3, primary = first.
      const defs = []
      for (const tag of tags ?? []) {
        const def = tagIcons[tag]
        if (!def || def.tier === 3 || defs.includes(def))
          continue
        defs.push(def)
      }
      const icons = defs.sort((a, b) => a.tier - b.tier).slice(0, 3)
      return { color: icons[0]?.colorDark ?? icons[0]?.color ?? '#14b8a6', icons }
    }
  }
  catch (err) {
    // A silent fallback here once shipped icon-less OG images from a CI whose
    // Node predated type stripping (see .node-version) — stay loud about it.
    console.warn(`[gen:og] WARNING: failed to import src/data/tag-icons.ts (${err.message}).`)
    console.warn('[gen:og] OG images will have NO theme icons and use the fallback color. Check the Node version (needs >= 22.18 / 23.6 for native TS import; pinned via .node-version).')
    return () => ({ color: '#14b8a6', icons: [] })
  }
}

/** Bottom-right watermark echoing the site's `ev-watermark`: primary icon large, up to 2 secondaries smaller behind it. */
function watermark(icons, longName) {
  if (!icons.length)
    return h('div', { display: 'flex' })
  const [primary, ...secondaries] = icons
  const primaryIcon = resolveIcon(primary.icon, primary.colorDark ?? primary.color)
  if (!primaryIcon)
    return h('div', { display: 'flex' })
  // Long event names already shrink to the 56px font branch; ease the watermark back too so text stays legible.
  const primaryOpacity = longName ? 0.4 : 0.75
  const secondaryOpacity = longName ? 0.3 : 0.55
  const children = [
    ...secondaries.slice().reverse().map((def) => {
      const resolved = resolveIcon(def.icon, def.colorDark ?? def.color)
      return resolved && { type: 'img', props: { src: resolved.src, width: 130, height: 130, style: { marginRight: '-28px', marginBottom: '10px', opacity: secondaryOpacity } } }
    }).filter(Boolean),
    { type: 'img', props: { src: primaryIcon.src, width: 280, height: 280, style: { opacity: primaryOpacity } } },
  ]
  // Bleed slightly off-canvas like the site's .ev-watermark for a broader, more generous look.
  return h('div', { display: 'flex', alignItems: 'flex-end', position: 'absolute', right: '-12px', bottom: '-28px' }, children)
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

function card(e, color, icons) {
  const meta = [dateLabel(e), [e.city, e.country && e.country !== '中国' ? e.country : ''].filter(Boolean).join(' · ')]
  const longName = e.name.length > 18
  return h('div', {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '64px',
    backgroundColor: '#0f172a',
    backgroundImage: `linear-gradient(135deg, #0f172a 0%, #1e293b 100%)`,
    color: '#f8fafc',
    fontFamily: 'Noto Sans SC',
    position: 'relative',
  }, [
    // Soft corner glow mirroring the site's .ev-themed::after (18% brand color fading by 70%), instead of a loud corner gradient.
    h('div', { display: 'flex', position: 'absolute', right: '-100px', bottom: '-100px', width: '640px', height: '560px', backgroundImage: `radial-gradient(circle at bottom right, ${color}2E 0%, ${color}00 70%)` }),
    watermark(icons, longName),
    h('div', { display: 'flex', flexDirection: 'column', gap: '28px' }, [
      h('div', { display: 'flex', fontSize: e.name.length > 18 ? '56px' : '68px', fontWeight: 700, lineHeight: 1.25 }, e.name),
      h('div', { display: 'flex', gap: '32px', fontSize: '34px', color: '#cbd5e1' }, meta.filter(Boolean).map(text => h('div', { display: 'flex' }, text))),
      (e.tags ?? []).length
        ? h('div', { display: 'flex', gap: '14px', marginTop: '8px' }, e.tags.slice(0, 5).map(tag =>
            h('div', { display: 'flex', fontSize: '26px', padding: '6px 20px', borderRadius: '999px', backgroundColor: '#33415588', color: '#e2e8f0' }, tag)))
        : h('div', { display: 'flex' }),
    ]),
    h('div', { display: 'flex', alignItems: 'center' }, [
      h('div', { display: 'flex', fontSize: '30px', color }, SITE),
    ]),
  ])
}

const fullFont = await loadFont()
const themeFor = await loadEventTheme()

const allText = `${events.map(e => `${e.name}${dateLabel(e)}${e.city}${e.country ?? ''}${(e.tags ?? []).join('')}`).join('')}${SITE}0123456789 –·`
const font = await subsetFont(fullFont, allText, { targetFormat: 'sfnt' })
console.log(`Font subset: ${(font.length / 1024).toFixed(0)} KB`)

for (const e of events) {
  const { color, icons } = themeFor(e.tags)
  const svg = await satori(card(e, color, icons), {
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
