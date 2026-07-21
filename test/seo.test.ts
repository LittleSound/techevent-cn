import type { TechEvent } from '~/types'
import { describe, expect, it } from 'vitest'
import { normalizeEvent } from '~/utils/events'
import { buildEventJsonLd, eventCanonicalUrl, eventOgImageUrl } from '~/utils/seo'

const base: TechEvent = {
  id: '',
  name: 'VueConf China 2026',
  description: 'Vue.js 官方大会',
  startDate: '2026-07-18',
  city: '上海',
  venue: '上海东方万国会议中心',
  url: 'https://vueconf.cn/',
  tags: ['vue'],
  organizer: 'Vue.js 官方',
}

describe('seo urls', () => {
  it('builds canonical and og image urls', () => {
    expect(eventCanonicalUrl('vueconf-china-2026')).toBe('https://event.rizumu.me/event/vueconf-china-2026')
    expect(eventOgImageUrl('vueconf-china-2026')).toBe('https://event.rizumu.me/og/vueconf-china-2026.png')
  })
})

describe('buildEventJsonLd', () => {
  it('maps an offline event to a schema.org Event with a Place', () => {
    const ld = buildEventJsonLd(normalizeEvent(base, 'vueconf-china-2026'))
    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('Event')
    expect(ld.name).toBe('VueConf China 2026')
    expect(ld.startDate).toBe('2026-07-18')
    expect(ld.endDate).toBe('2026-07-18')
    expect(ld.eventAttendanceMode).toBe('https://schema.org/OfflineEventAttendanceMode')
    expect(ld.location).toEqual({
      '@type': 'Place',
      'name': '上海东方万国会议中心',
      'address': { '@type': 'PostalAddress', 'addressLocality': '上海', 'addressCountry': '中国' },
    })
    expect(ld.organizer).toEqual({ '@type': 'Organization', 'name': 'Vue.js 官方' })
    expect(ld.url).toBe('https://event.rizumu.me/event/vueconf-china-2026')
    expect(ld.sameAs).toBe('https://vueconf.cn/')
    expect(ld.image).toBe('https://event.rizumu.me/og/vueconf-china-2026.png')
  })

  it('maps an online event to VirtualLocation and mixed to Mixed mode', () => {
    const online = buildEventJsonLd(normalizeEvent({ ...base, format: 'online', venue: undefined, city: '线上' }, 'x'))
    expect(online.eventAttendanceMode).toBe('https://schema.org/OnlineEventAttendanceMode')
    expect(online.location).toEqual({ '@type': 'VirtualLocation', 'url': 'https://vueconf.cn/' })
    const hybrid = buildEventJsonLd(normalizeEvent({ ...base, format: 'hybrid' }, 'x'))
    expect(hybrid.eventAttendanceMode).toBe('https://schema.org/MixedEventAttendanceMode')
  })

  it('omits optional fields that are absent', () => {
    const ld = buildEventJsonLd(normalizeEvent({ ...base, description: undefined, organizer: undefined, venue: undefined }, 'x'))
    expect(ld).not.toHaveProperty('description')
    expect(ld).not.toHaveProperty('organizer')
    expect((ld.location as any).name).toBe('上海')
  })
})
