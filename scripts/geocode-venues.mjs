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
