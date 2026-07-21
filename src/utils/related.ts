import type { NormalizedEvent } from '~/types'

/**
 * Pick up to `count` events related to `event`: shared tags weigh 2 points
 * each, same city 1 point; zero-score events are dropped. Ties break by
 * calendar distance so recommendations stay temporally relevant.
 */
export function relatedEvents(event: NormalizedEvent, all: NormalizedEvent[], count = 4): NormalizedEvent[] {
  return all
    .filter(e => e.id !== event.id)
    .map((e) => {
      const shared = e.tags.filter(t => event.tags.includes(t)).length
      return {
        e,
        score: shared * 2 + (e.city === event.city ? 1 : 0),
        distance: Math.abs(e.start.getTime() - event.start.getTime()),
      }
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score || a.distance - b.distance)
    .slice(0, count)
    .map(r => r.e)
}
