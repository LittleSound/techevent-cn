import type { RouterScrollBehavior } from 'vue-router'

/**
 * Preserve the reading position for detail-page tab changes, including browser history.
 * New discussion deep links land on the tab bar after the page has mounted.
 */
export const scrollBehavior: RouterScrollBehavior = (to, from, savedPosition) => {
  if (savedPosition)
    return savedPosition
  if (to?.hash === '#comments' || to?.hash === '#details')
    return to.path === from?.path ? false : { el: '#detail-tabs', top: 24 }
  return { top: 0 }
}
