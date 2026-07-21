import type { TechEvent } from '~/types'
import { describe, expect, it } from 'vitest'
import { normalizeEvent } from '~/utils/events'
import { amapSearchUrl, appleMapsSearchUrl, baiduMapSearchUrl, hasLocation, hasPreciseLocation, mapSearchQuery } from '~/utils/mapLinks'

function make(patch: Partial<TechEvent>): ReturnType<typeof normalizeEvent> {
  return normalizeEvent({
    id: '',
    name: 'x',
    startDate: '2026-08-01',
    city: '上海',
    url: 'https://example.com',
    ...patch,
  } as TechEvent, 'x')
}

describe('map links', () => {
  it('builds the search query from venue and city', () => {
    expect(mapSearchQuery(make({ venue: '世博展览馆' }))).toBe('世博展览馆 上海')
    expect(mapSearchQuery(make({}))).toBe('上海')
  })

  it('urls are key-free and percent-encoded', () => {
    expect(amapSearchUrl('世博展览馆 上海'))
      .toBe(`https://uri.amap.com/search?keyword=${encodeURIComponent('世博展览馆 上海')}`)
    expect(appleMapsSearchUrl('世博展览馆 上海'))
      .toBe(`https://maps.apple.com/?q=${encodeURIComponent('世博展览馆 上海')}`)
    expect(baiduMapSearchUrl('世博展览馆 上海'))
      .toBe(`https://map.baidu.com/search?querytype=s&wd=${encodeURIComponent('世博展览馆 上海')}`)
  })

  it('online events without a venue have no location', () => {
    expect(hasLocation(make({ format: 'online', city: '线上' }))).toBe(false)
    expect(hasLocation(make({ venue: '会议中心' }))).toBe(true)
    expect(hasLocation(make({}))).toBe(true)
  })

  it('only a concrete venue counts as a precise location', () => {
    expect(hasPreciseLocation(make({ venue: '世博展览馆' }))).toBe(true)
    expect(hasPreciseLocation(make({}))).toBe(false)
    expect(hasPreciseLocation(make({ format: 'online', venue: '会议中心' }))).toBe(true)
  })
})
