import { describe, expect, it } from 'vitest'
import { scrollBehavior } from '../src/router'

const route = null as never

describe('scrollBehavior', () => {
  it('starts regular navigations at the top of the page', () => {
    expect(scrollBehavior(route, route, null)).toEqual({ top: 0 })
  })

  it('restores the saved position for browser history navigation', () => {
    const savedPosition = { left: 0, top: 640 }

    expect(scrollBehavior(route, route, savedPosition)).toBe(savedPosition)
  })

  it('scrolls detail and discussion links to their sections', () => {
    const details = { path: '/event/vueconf', hash: '#details' } as never
    const discussion = { path: '/event/vueconf', hash: '#comments' } as never
    expect(scrollBehavior(discussion, details, null)).toEqual({ el: '#comments', top: 24 })
    expect(scrollBehavior(details, discussion, null)).toEqual({ el: '#details', top: 24 })
    expect(scrollBehavior(discussion, route, null)).toEqual({ el: '#comments', top: 24 })
  })
})
