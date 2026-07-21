import type { NormalizedEvent } from '~/types'

/**
 * Key-free map deep links built from plain text search, so they work for
 * every user with no API key, no coordinates and no GCJ-02 conversion.
 */
export function mapSearchQuery(event: NormalizedEvent): string {
  return [event.venue, event.city].filter(Boolean).join(' ')
}

export function amapSearchUrl(query: string): string {
  return `https://uri.amap.com/search?keyword=${encodeURIComponent(query)}`
}

export function appleMapsSearchUrl(query: string): string {
  return `https://maps.apple.com/?q=${encodeURIComponent(query)}`
}

/** Online-only events with no physical venue get no map block at all. */
export function hasLocation(event: NormalizedEvent): boolean {
  return event.format !== 'online' || !!event.venue
}
