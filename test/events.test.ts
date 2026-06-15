import type { TechEvent } from '~/types'
import { describe, expect, it } from 'vitest'
import {
  cityFacets,
  dayDiff,
  emptyFilter,
  filterEvents,
  layoutWeek,
  monthMatrix,
  normalizeEvent,
  occursOn,
  tagFacets,
} from '~/utils/events'
import { formatDateRange } from '~/utils/format'

function make(id: string, overrides: Partial<TechEvent>): ReturnType<typeof normalizeEvent> {
  const base: TechEvent = {
    id,
    name: id,
    startDate: '2026-06-20',
    city: '上海',
    url: 'https://example.com',
  }
  return normalizeEvent({ ...base, ...overrides }, id)
}

const NOW = new Date(2026, 5, 15) // 2026-06-15

describe('normalizeEvent', () => {
  it('fills defaults', () => {
    const e = make('a', {})
    expect(e.country).toBe('中国')
    expect(e.format).toBe('offline')
    expect(e.tags).toEqual([])
    expect(e.end.getTime()).toBe(e.start.getTime())
  })

  it('lowercases tags and parses end date', () => {
    const e = make('a', { tags: ['Vue', 'Frontend'], endDate: '2026-06-22' })
    expect(e.tags).toEqual(['vue', 'frontend'])
    expect(e.end.getDate()).toBe(22)
  })
})

describe('filterEvents', () => {
  const events = [
    make('past', { startDate: '2026-01-01' }),
    make('today', { startDate: '2026-06-15' }),
    make('future-vue', { startDate: '2026-08-01', city: '深圳', tags: ['vue'] }),
    make('future-go', { startDate: '2026-09-01', city: '北京', tags: ['go'] }),
  ]

  it('defaults to upcoming (includes events ending today)', () => {
    const r = filterEvents(events, { ...emptyFilter }, NOW)
    expect(r.map(e => e.id)).toEqual(['today', 'future-vue', 'future-go'])
  })

  it('filters past events', () => {
    const r = filterEvents(events, { ...emptyFilter, time: 'past' }, NOW)
    expect(r.map(e => e.id)).toEqual(['past'])
  })

  it('filters by city', () => {
    const r = filterEvents(events, { ...emptyFilter, time: 'all', cities: ['深圳'] }, NOW)
    expect(r.map(e => e.id)).toEqual(['future-vue'])
  })

  it('filters by tag (OR within facet)', () => {
    const r = filterEvents(events, { ...emptyFilter, time: 'all', tags: ['vue', 'go'] }, NOW)
    expect(r.map(e => e.id)).toEqual(['future-vue', 'future-go'])
  })

  it('matches search across multiple terms', () => {
    const events2 = [make('x', { name: 'VueConf China', city: '深圳', tags: ['vue'] })]
    expect(filterEvents(events2, { ...emptyFilter, time: 'all', search: 'vue 深圳' }, NOW)).toHaveLength(1)
    expect(filterEvents(events2, { ...emptyFilter, time: 'all', search: 'vue 北京' }, NOW)).toHaveLength(0)
  })
})

describe('facets', () => {
  const events = [
    make('a', { city: '上海', tags: ['vue'] }),
    make('b', { city: '上海', tags: ['vue', 'go'] }),
    make('c', { city: '北京', tags: ['go'] }),
  ]

  it('counts cities sorted by frequency', () => {
    expect(cityFacets(events)).toEqual([
      { value: '上海', count: 2 },
      { value: '北京', count: 1 },
    ])
  })

  it('counts tags', () => {
    expect(tagFacets(events)).toEqual([
      { value: 'go', count: 2 },
      { value: 'vue', count: 2 },
    ])
  })
})

describe('calendar helpers', () => {
  it('occursOn covers the full inclusive span', () => {
    const e = make('a', { startDate: '2026-06-20', endDate: '2026-06-22' })
    expect(occursOn(e, new Date(2026, 5, 19))).toBe(false)
    expect(occursOn(e, new Date(2026, 5, 20))).toBe(true)
    expect(occursOn(e, new Date(2026, 5, 21))).toBe(true)
    expect(occursOn(e, new Date(2026, 5, 22))).toBe(true)
    expect(occursOn(e, new Date(2026, 5, 23))).toBe(false)
  })

  it('monthMatrix is a Monday-first 6x7 grid', () => {
    const weeks = monthMatrix(new Date(2026, 5, 1)) // June 2026 starts on a Monday
    expect(weeks).toHaveLength(6)
    expect(weeks.every(w => w.length === 7)).toBe(true)
    // First cell is Monday June 1.
    expect(weeks[0][0].date.getDate()).toBe(1)
    expect(weeks[0][0].inMonth).toBe(true)
    // July spillover is marked out-of-month.
    const last = weeks[5][6]
    expect(last.inMonth).toBe(false)
  })

  it('monthMatrix pads leading days from the previous month', () => {
    const weeks = monthMatrix(new Date(2026, 6, 1)) // July 1 2026 is a Wednesday
    expect(weeks[0][0].inMonth).toBe(false) // Monday belongs to June
    expect(weeks[0][2].date.getDate()).toBe(1) // Wednesday is July 1
    expect(weeks[0][2].inMonth).toBe(true)
  })
})

describe('layoutWeek', () => {
  // Week of Mon 2026-06-15 … Sun 2026-06-21.
  const week = Array.from({ length: 7 }, (_, i) => new Date(2026, 5, 15 + i))

  it('spans a multi-day event across its columns', () => {
    const e = make('a', { startDate: '2026-06-16', endDate: '2026-06-18' })
    const [seg] = layoutWeek(week, [e])
    expect(seg.startCol).toBe(1) // Tuesday
    expect(seg.span).toBe(3) // Tue–Thu
    expect(seg.lane).toBe(0)
    expect(seg.continuesLeft).toBe(false)
    expect(seg.continuesRight).toBe(false)
  })

  it('clamps and flags an event that overflows the week edges', () => {
    const e = make('a', { startDate: '2026-06-10', endDate: '2026-06-25' })
    const [seg] = layoutWeek(week, [e])
    expect(seg.startCol).toBe(0)
    expect(seg.span).toBe(7)
    expect(seg.continuesLeft).toBe(true)
    expect(seg.continuesRight).toBe(true)
  })

  it('pushes overlapping events onto separate lanes', () => {
    const a = make('a', { startDate: '2026-06-15', endDate: '2026-06-17' })
    const b = make('b', { startDate: '2026-06-16', endDate: '2026-06-18' })
    const segs = layoutWeek(week, [a, b])
    expect(segs.map(s => s.lane).sort()).toEqual([0, 1])
  })

  it('reuses a lane when events do not overlap', () => {
    const a = make('a', { startDate: '2026-06-15', endDate: '2026-06-16' })
    const b = make('b', { startDate: '2026-06-18', endDate: '2026-06-19' })
    const segs = layoutWeek(week, [a, b])
    expect(segs.every(s => s.lane === 0)).toBe(true)
  })

  it('ignores events outside the week', () => {
    const e = make('a', { startDate: '2026-07-01' })
    expect(layoutWeek(week, [e])).toHaveLength(0)
  })
})

describe('dayDiff', () => {
  it('counts whole days between dates', () => {
    expect(dayDiff(new Date(2026, 5, 15), new Date(2026, 5, 18))).toBe(3)
    expect(dayDiff(new Date(2026, 5, 18), new Date(2026, 5, 15))).toBe(-3)
    expect(dayDiff(new Date(2026, 5, 15), new Date(2026, 5, 15))).toBe(0)
  })
})

describe('formatDateRange', () => {
  it('shows a single day', () => {
    const d = new Date(2026, 5, 20)
    expect(formatDateRange(d, d)).toContain('2026')
  })

  it('collapses same-month ranges', () => {
    expect(formatDateRange(new Date(2026, 5, 20), new Date(2026, 5, 21))).toContain('21日')
  })
})
