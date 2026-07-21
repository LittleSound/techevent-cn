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
