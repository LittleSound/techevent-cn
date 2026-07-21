import { describe, expect, it } from 'vitest'
import { eventEditUrl } from '~/config'

describe('eventEditUrl', () => {
  it('builds a GitHub web-editor deep link for the event JSON file', () => {
    expect(eventEditUrl('x')).toBe('https://github.com/LittleSound/techevent-cn/edit/master/data/events/x.json')
  })
})
