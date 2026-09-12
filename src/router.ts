import type { RouterScrollBehavior } from 'vue-router'

/**
 * Restore browser history positions and keep existing detail/discussion links navigable.
 */
export const scrollBehavior: RouterScrollBehavior = (to, _from, savedPosition) => {
  if (savedPosition)
    return savedPosition
  if (to?.hash === '#comments' || to?.hash === '#details')
    return { el: to.hash, top: 24 }
  return { top: 0 }
}
