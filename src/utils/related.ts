import type { NormalizedEvent } from '~/types'
import { startOfDay } from '~/utils/events'

/**
 * Pick up to `count` events related to `event`: shared tags weigh 2 points
 * each, same city 1 point; zero-score events are dropped. Events that have
 * already ended sort after upcoming ones (so a stale-but-high-scoring match
 * doesn't crowd out something the reader could actually attend), then ties
 * break by calendar distance so recommendations stay temporally relevant.
 * `now` is injected (defaults to the current date) so tests can pin "today".
 */
export function relatedEvents(event: NormalizedEvent, all: NormalizedEvent[], count = 4, now: Date = new Date()): NormalizedEvent[] {
  const today = startOfDay(now)
  return all
    .filter(e => e.id !== event.id)
    .map((e) => {
      const shared = e.tags.filter(t => event.tags.includes(t)).length
      return {
        e,
        score: shared * 2 + (e.city === event.city ? 1 : 0),
        ended: e.end < today,
        distance: Math.abs(e.start.getTime() - event.start.getTime()),
      }
    })
    .filter(r => r.score > 0)
    .sort((a, b) => Number(a.ended) - Number(b.ended) || b.score - a.score || a.distance - b.distance)
    .slice(0, count)
    .map(r => r.e)
}
