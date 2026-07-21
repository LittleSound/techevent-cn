import type { TechEvent } from '~/types'
import { describe, expect, it } from 'vitest'
import { normalizeEvent } from '~/utils/events'
import { relatedEvents } from '~/utils/related'

function make(id: string, patch: Partial<TechEvent>): ReturnType<typeof normalizeEvent> {
  return normalizeEvent({
    id: '',
    name: id,
    startDate: '2026-08-01',
    city: '上海',
    url: 'https://example.com',
    tags: [],
    ...patch,
  } as TechEvent, id)
}

describe('relatedEvents', () => {
  const self = make('self', { tags: ['vue', 'frontend'], city: '上海' })

  it('scores shared tags (2pt each) above same city (1pt)', () => {
    const tagMatch = make('tag-match', { tags: ['vue'], city: '北京' })
    const cityMatch = make('city-match', { tags: ['ai'], city: '上海' })
    expect(relatedEvents(self, [self, cityMatch, tagMatch]).map(e => e.id))
      .toEqual(['tag-match', 'city-match'])
  })

  it('excludes itself and zero-score events, caps at count', () => {
    const others = [
      make('a', { tags: ['vue'] }),
      make('b', { tags: ['frontend'] }),
      make('c', { tags: ['vue', 'frontend'] }),
      make('d', { tags: ['vue'], city: '北京' }),
      make('e', { tags: ['rust'], city: '深圳' }),
    ]
    const picked = relatedEvents(self, [self, ...others], 3)
    expect(picked).toHaveLength(3)
    expect(picked.map(e => e.id)).not.toContain('self')
    expect(picked.map(e => e.id)).not.toContain('e')
    expect(picked[0].id).toBe('c')
  })

  it('breaks score ties by date proximity to the source event', () => {
    const near = make('near', { tags: ['vue'], city: '北京', startDate: '2026-08-10' })
    const far = make('far', { tags: ['vue'], city: '北京', startDate: '2027-03-01' })
    expect(relatedEvents(self, [self, far, near]).map(e => e.id)).toEqual(['near', 'far'])
  })

  it('sorts ended events after upcoming ones regardless of score', () => {
    const now = new Date(2026, 7, 1)
    const endedHighScore = make('ended-high', { tags: ['vue', 'frontend'], city: '上海', startDate: '2026-01-01', endDate: '2026-01-02' })
    const upcomingLowScore = make('upcoming-low', { tags: ['ai'], city: '上海', startDate: '2026-09-01' })
    expect(relatedEvents(self, [self, endedHighScore, upcomingLowScore], 4, now).map(e => e.id))
      .toEqual(['upcoming-low', 'ended-high'])
  })
})
