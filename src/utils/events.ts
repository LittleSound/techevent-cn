import type { NormalizedEvent, TechEvent } from '~/types'

export type TimeRange = 'upcoming' | 'past' | 'all'

export interface EventFilter {
  /** Free-text query matched against name, description, city, organizer and tags. */
  search: string
  /** Selected cities; empty means "any city". */
  cities: string[]
  /** Selected tags; an event matches if it carries any one of them (OR). */
  tags: string[]
  /** Time window relative to "today". */
  time: TimeRange
}

export interface Facet {
  value: string
  count: number
}

export const emptyFilter: EventFilter = {
  search: '',
  cities: [],
  tags: [],
  time: 'upcoming',
}

/**
 * Parse a `YYYY-MM-DD` string into a local-midnight Date. Using explicit parts
 * avoids the UTC interpretation that `new Date('2026-01-01')` would apply,
 * which could shift the day across timezones.
 */
export function parseDay(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/** Strip the time component so two dates can be compared by calendar day. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Fill defaults and attach parsed Date objects. Pure: no I/O, easy to test. */
export function normalizeEvent(raw: TechEvent, id: string): NormalizedEvent {
  const start = parseDay(raw.startDate)
  const end = raw.endDate ? parseDay(raw.endDate) : start
  return {
    ...raw,
    id,
    country: raw.country ?? '中国',
    format: raw.format ?? 'offline',
    tags: (raw.tags ?? []).map(t => t.toLowerCase()),
    start,
    end,
  }
}

function matchesSearch(event: NormalizedEvent, query: string): boolean {
  const haystack = [
    event.name,
    event.description ?? '',
    event.city,
    event.country,
    event.organizer ?? '',
    event.tags.join(' '),
  ].join(' ').toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every(term => haystack.includes(term))
}

/**
 * Apply a filter to a list of events. `now` is injected (defaults to the
 * current date) so callers and tests can pin "today" deterministically.
 */
export function filterEvents(
  events: NormalizedEvent[],
  filter: EventFilter,
  now: Date = new Date(),
): NormalizedEvent[] {
  const today = startOfDay(now)
  return events.filter((event) => {
    if (filter.time === 'upcoming' && event.end < today)
      return false
    if (filter.time === 'past' && event.end >= today)
      return false
    if (filter.cities.length && !filter.cities.includes(event.city))
      return false
    if (filter.tags.length && !filter.tags.some(t => event.tags.includes(t)))
      return false
    if (filter.search && !matchesSearch(event, filter.search))
      return false
    return true
  })
}

/** Count occurrences of a key across events, sorted by count then value. */
function tally(events: NormalizedEvent[], pick: (e: NormalizedEvent) => string[]): Facet[] {
  const counts = new Map<string, number>()
  for (const event of events) {
    for (const value of pick(event))
      counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

/** True if `day` falls within the event's inclusive start–end span. */
export function occursOn(event: NormalizedEvent, day: Date): boolean {
  const d = startOfDay(day).getTime()
  return d >= event.start.getTime() && d <= event.end.getTime()
}

export interface MonthCell {
  date: Date
  /** Whether the day belongs to the displayed month (vs. leading/trailing days). */
  inMonth: boolean
}

/**
 * Build the 6×7 day matrix for a month's calendar grid, Monday-first.
 * Leading/trailing days fill the first and last weeks so every row has 7 cells.
 */
export function monthMatrix(month: Date): MonthCell[][] {
  const year = month.getFullYear()
  const m = month.getMonth()
  const first = new Date(year, m, 1)
  // JS getDay() is Sunday=0; shift so Monday=0 to start weeks on Monday.
  const lead = (first.getDay() + 6) % 7
  const start = new Date(year, m, 1 - lead)

  const weeks: MonthCell[][] = []
  for (let w = 0; w < 6; w++) {
    const week: MonthCell[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d)
      week.push({ date, inMonth: date.getMonth() === m })
    }
    weeks.push(week)
  }
  return weeks
}

export function sameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

const MS_PER_DAY = 86_400_000

/** Whole-day distance from `from` to `to` (negative if `to` is earlier). */
export function dayDiff(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY)
}

export interface EventSegment {
  event: NormalizedEvent
  /** Column index within the week, 0 (Monday) … 6 (Sunday). */
  startCol: number
  /** Number of columns this bar spans within the week, 1 … 7. */
  span: number
  /** Stacking row so overlapping events don't collide. */
  lane: number
  /** Event began before this week (bar should look open on the left). */
  continuesLeft: boolean
  /** Event ends after this week (bar should look open on the right). */
  continuesRight: boolean
}

/**
 * Lay out a single week's events as horizontal bars. A multi-day event becomes
 * one segment spanning its days; events that would overlap on a row are pushed
 * to a lower lane. Longer events are placed first so they form stable base rows.
 */
export function layoutWeek(week: Date[], events: NormalizedEvent[]): EventSegment[] {
  const weekStart = startOfDay(week[0])
  const weekEnd = startOfDay(week[week.length - 1])

  const overlapping = events
    .filter(e => e.end >= weekStart && e.start <= weekEnd)
    .sort((a, b) =>
      a.start.getTime() - b.start.getTime()
      || (b.end.getTime() - b.start.getTime()) - (a.end.getTime() - a.start.getTime()),
    )

  const lanes: EventSegment[][] = []
  const segments: EventSegment[] = []

  for (const event of overlapping) {
    const startCol = Math.max(0, dayDiff(weekStart, event.start))
    const endCol = Math.min(6, dayDiff(weekStart, event.end))
    const span = endCol - startCol + 1

    let lane = 0
    while (lanes[lane]?.some(s => startCol <= s.startCol + s.span - 1 && endCol >= s.startCol))
      lane++

    const segment: EventSegment = {
      event,
      startCol,
      span,
      lane,
      continuesLeft: event.start < weekStart,
      continuesRight: event.end > weekEnd,
    }
    ;(lanes[lane] ??= []).push(segment)
    segments.push(segment)
  }

  return segments
}

export function cityFacets(events: NormalizedEvent[]): Facet[] {
  return tally(events, e => [e.city])
}

export function tagFacets(events: NormalizedEvent[]): Facet[] {
  return tally(events, e => e.tags)
}
