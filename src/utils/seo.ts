import type { NormalizedEvent } from '~/types'
import { siteUrl } from '~/config'

export function eventCanonicalUrl(id: string): string {
  return `${siteUrl}/event/${id}`
}

export function eventOgImageUrl(id: string): string {
  return `${siteUrl}/og/${id}.png`
}

const attendanceMode = {
  offline: 'https://schema.org/OfflineEventAttendanceMode',
  online: 'https://schema.org/OnlineEventAttendanceMode',
  hybrid: 'https://schema.org/MixedEventAttendanceMode',
} as const

/**
 * Build schema.org `Event` structured data for Google rich results.
 * `url` points at our detail page (the canonical shareable link) while the
 * official site goes into `sameAs`; dates stay as `YYYY-MM-DD` day precision.
 */
export function buildEventJsonLd(event: NormalizedEvent): Record<string, unknown> {
  const location = event.format === 'online'
    ? { '@type': 'VirtualLocation', 'url': event.url }
    : {
        '@type': 'Place',
        'name': event.venue ?? event.city,
        'address': { '@type': 'PostalAddress', 'addressLocality': event.city, 'addressCountry': event.country },
      }
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    'name': event.name,
    'startDate': event.startDate,
    'endDate': event.endDate ?? event.startDate,
    'eventAttendanceMode': attendanceMode[event.format],
    location,
    'url': eventCanonicalUrl(event.id),
    'sameAs': event.url,
    'image': eventOgImageUrl(event.id),
    ...(event.description && { description: event.description }),
    ...(event.organizer && { organizer: { '@type': 'Organization', 'name': event.organizer } }),
  }
}
