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
