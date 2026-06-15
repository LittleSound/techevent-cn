import type { NormalizedEvent, TechEvent } from '~/types'
import type { EventFilter } from '~/utils/events'
import {
  cityFacets,
  emptyFilter,
  filterEvents,
  normalizeEvent,
  tagFacets,
} from '~/utils/events'

/** Eagerly bundle every event file. Each module's default export is one event. */
const rawModules = import.meta.glob<TechEvent>('../../data/events/*.json', {
  eager: true,
  import: 'default',
})

function idFromPath(path: string): string {
  return path.split('/').pop()!.replace(/\.json$/, '')
}

/** All events, normalized and sorted by start date ascending. */
export const allEvents: NormalizedEvent[] = Object.entries(rawModules)
  .map(([path, raw]) => normalizeEvent(raw, idFromPath(path)))
  // Files prefixed with `_` (e.g. _template.json) are scaffolding, not events.
  .filter(event => !event.id.startsWith('_'))
  .sort((a, b) => a.start.getTime() - b.start.getTime())

/**
 * Reactive filtering over `allEvents`. Returns the live filter state plus
 * derived lists and facets so the page can stay declarative.
 */
export function useEvents() {
  const filter = reactive<EventFilter>({ ...emptyFilter })

  const filtered = computed(() => filterEvents(allEvents, filter))
  // Same facet filters, but without the time window — the calendar view scopes
  // time by which month is on screen, so applying upcoming/past would hide days.
  const filteredAnyTime = computed(() => filterEvents(allEvents, { ...filter, time: 'all' }))
  const cities = computed(() => cityFacets(allEvents))
  const tags = computed(() => tagFacets(allEvents))

  function toggle(key: 'cities' | 'tags', value: string) {
    const list = filter[key]
    const index = list.indexOf(value)
    if (index === -1)
      list.push(value)
    else
      list.splice(index, 1)
  }

  function reset() {
    Object.assign(filter, { ...emptyFilter, time: filter.time })
  }

  return { filter, filtered, filteredAnyTime, cities, tags, toggle, reset, total: allEvents.length }
}
