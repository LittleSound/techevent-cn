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
})
