import { describe, expect, it } from 'vitest'
import { resolveEventLink } from '~/utils/eventLinks'

describe('resolveEventLink', () => {
  it('detects X regardless of the twitter.com/x.com domain used', () => {
    expect(resolveEventLink({ url: 'https://x.com/example' })).toMatchObject({ icon: 'i-simple-icons-x', label: 'X (Twitter)' })
    expect(resolveEventLink({ url: 'https://twitter.com/example' })).toMatchObject({ icon: 'i-simple-icons-x', label: 'X (Twitter)' })
  })

  it('matches subdomains, e.g. space.bilibili.com', () => {
    expect(resolveEventLink({ url: 'https://space.bilibili.com/123456' }))
      .toMatchObject({ icon: 'i-simple-icons-bilibili', label: '哔哩哔哩' })
  })

  it('a provided label always overrides the inferred default', () => {
    expect(resolveEventLink({ url: 'https://github.com/vuejs/core', label: 'Vue 源码' }))
      .toMatchObject({ icon: 'i-simple-icons-github', label: 'Vue 源码' })
  })

  it('recognizes ticketing platforms', () => {
    expect(resolveEventLink({ url: 'https://www.huodongxing.com/event/123' }))
      .toMatchObject({ icon: 'i-carbon-ticket', label: '活动行' })
    expect(resolveEventLink({ url: 'https://www.eventbrite.co.uk/e/123' }))
      .toMatchObject({ icon: 'i-carbon-ticket', label: 'Eventbrite' })
  })

  it('falls back to a generic link icon and the bare hostname for unknown domains', () => {
    expect(resolveEventLink({ url: 'https://example.com/page' }))
      .toMatchObject({ icon: 'i-carbon-link', label: 'example.com' })
  })

  it('falls back to the raw url when it fails to parse', () => {
    expect(resolveEventLink({ url: 'not a url' }))
      .toMatchObject({ icon: 'i-carbon-link', label: 'not a url', url: 'not a url' })
  })
})
