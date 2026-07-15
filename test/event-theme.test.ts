import type { TechEvent } from '~/types'
import { describe, expect, it } from 'vitest'
import { normalizeEvent } from '~/utils/events'
import { resolveEventTheme, tagIconFor } from '~/utils/eventTheme'

function make(tags: string[]) {
  const base: TechEvent = {
    id: 't',
    name: 't',
    startDate: '2026-06-20',
    city: '上海',
    url: 'https://example.com',
    tags,
  }
  return normalizeEvent(base, 't')
}

describe('resolveEventTheme', () => {
  it('returns undefined when no tier-1/2 tag matches', () => {
    expect(resolveEventTheme(make(['conference', 'meetup', 'unknown-tag']))).toBeUndefined()
  })

  it('picks the first matched tag as primary, capped at 3 icons', () => {
    const theme = resolveEventTheme(make(['vue', 'vite', 'javascript', 'typescript']))!
    expect(theme.primary.icon).toBe('i-simple-icons-vuedotjs')
    expect(theme.icons).toHaveLength(3)
  })

  it('sorts tier 1 before tier 2 regardless of tag order', () => {
    const theme = resolveEventTheme(make(['ai', 'python']))!
    expect(theme.primary.icon).toBe('i-simple-icons-python')
    expect(theme.icons[1].icon).toBe('i-carbon-machine-learning-model')
  })

  it('dedupes grouped tags sharing one def', () => {
    const theme = resolveEventTheme(make(['ai', 'llm', 'agentic-ai']))!
    expect(theme.icons).toHaveLength(1)
  })

  it('excludes tier-3 tags from card-level icons', () => {
    const theme = resolveEventTheme(make(['conference', 'vue']))!
    expect(theme.icons.map(d => d.icon)).toEqual(['i-simple-icons-vuedotjs'])
  })
})

describe('tagIconFor', () => {
  it('returns defs for all tiers, undefined for unknown tags', () => {
    expect(tagIconFor('conference')?.tier).toBe(3)
    expect(tagIconFor('vue')?.tier).toBe(1)
    expect(tagIconFor('nope')).toBeUndefined()
  })
})
