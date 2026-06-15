// Generate a static iCalendar feed from the event JSON files so calendar apps
// can subscribe to the site. Run automatically before `vite build`.
import { Buffer } from 'node:buffer'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const eventsDir = join(root, 'data', 'events')
const outFile = join(root, 'public', 'events.ics')

/** Fold lines to 75 octets as required by RFC 5545. */
function fold(line) {
  const bytes = Buffer.from(line, 'utf8')
  if (bytes.length <= 75)
    return line
  const chunks = []
  let rest = line
  let limit = 75
  while (Buffer.byteLength(rest, 'utf8') > limit) {
    let slice = rest.slice(0, limit)
    while (Buffer.byteLength(slice, 'utf8') > limit)
      slice = slice.slice(0, -1)
    chunks.push(slice)
    rest = rest.slice(slice.length)
    limit = 74 // continuation lines start with a leading space
  }
  chunks.push(rest)
  return chunks.join('\r\n ')
}

function escapeText(value) {
  return String(value).replace(/[\\;,]/g, m => `\\${m}`).replace(/\n/g, '\\n')
}

/** `YYYY-MM-DD` -> `YYYYMMDD` for DATE-valued properties. */
function toIcsDate(value) {
  return value.replaceAll('-', '')
}

/** All-day DTEND is exclusive, so add one day to the inclusive end date. */
function nextDay(value) {
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + 1))
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`
}

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')

const events = readdirSync(eventsDir)
  .filter(f => f.endsWith('.json') && !f.startsWith('_'))
  .map(f => ({ id: f.replace(/\.json$/, ''), ...JSON.parse(readFileSync(join(eventsDir, f), 'utf8')) }))
  .sort((a, b) => a.startDate.localeCompare(b.startDate))

const lines = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//techevent-cn//Tech Events Calendar//ZH',
  'CALSCALE:GREGORIAN',
  'METHOD:PUBLISH',
  'X-WR-CALNAME:techevent-cn',
  'X-WR-CALDESC:固执己见的中国（及周边）技术活动日历',
]

for (const e of events) {
  const end = e.endDate ?? e.startDate
  const place = [e.venue, e.city, e.country].filter(Boolean).join(', ')
  lines.push(
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
  )
}

lines.push('END:VCALENDAR')

writeFileSync(outFile, `${lines.join('\r\n')}\r\n`, 'utf8')
console.log(`Wrote ${events.length} events to ${outFile}`)
