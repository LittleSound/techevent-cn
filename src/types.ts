/**
 * Shape of a single tech event, mirroring one JSON file under `data/events/`.
 * Optional fields are intentionally permissive so contributors only need to
 * fill what they know; the loader normalizes missing values into safe defaults.
 */
export interface TechEvent {
  /** Stable id, derived from the source filename by the loader. */
  id: string
  /** Display name, e.g. "VueConf China 2025". */
  name: string
  /** Short, one or two sentence summary. */
  description?: string
  /** Start day in `YYYY-MM-DD` (local date, no timezone). */
  startDate: string
  /** End day in `YYYY-MM-DD`; defaults to `startDate` for single-day events. */
  endDate?: string
  /** City or "线上" for fully online events, e.g. "上海" / "东京". */
  city: string
  /** Country, defaults to "中国"; set for events outside mainland China. */
  country?: string
  /** Specific venue, e.g. "上海国际会议中心". */
  venue?: string
  /** Venue coordinates as WGS-84 `[lng, lat]`; drafted by scripts/geocode-venues.mjs, hand-verified. */
  coordinates?: [number, number]
  /** Whether attendees gather in person, remotely, or both. */
  format?: EventFormat
  /** Official link for details and registration. */
  url: string
  /** Lowercase keyword tags used by the filter, e.g. ["vue", "frontend"]. */
  tags?: string[]
  /** Hosting organization or community. */
  organizer?: string
  /** Provenance URLs (official site, announcement post) the data was verified against. Not rendered in the UI. */
  sources?: string[]
  /** Related links (official X account, ticketing page, …). Platform icon and default label are inferred from the URL's hostname; `label` overrides. */
  links?: EventLink[]
}

export interface EventLink {
  url: string
  /** Optional display text; defaults to the platform name inferred from the hostname. */
  label?: string
}

export type EventFormat = 'offline' | 'online' | 'hybrid'

/** A `TechEvent` after the loader has filled defaults and parsed dates. */
export interface NormalizedEvent {
  id: string
  name: string
  description?: string
  startDate: string
  endDate?: string
  city: string
  country: string
  venue?: string
  /** Venue coordinates as WGS-84 `[lng, lat]`; drafted by scripts/geocode-venues.mjs, hand-verified. */
  coordinates?: [number, number]
  format: EventFormat
  url: string
  tags: string[]
  organizer?: string
  /** Provenance URLs (official site, announcement post) the data was verified against. Not rendered in the UI. */
  sources?: string[]
  /** Related links (official X account, ticketing page, …). Platform icon and default label are inferred from the URL's hostname; `label` overrides. */
  links?: EventLink[]
  /** Parsed `startDate`, set to local midnight. */
  start: Date
  /** Parsed `endDate` (or `startDate`), set to local midnight. */
  end: Date
}
