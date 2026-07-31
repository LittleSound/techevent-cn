import type { RouterScrollBehavior } from 'vue-router'

/**
 * Keeps browser history navigation natural while ensuring every new page starts at the top.
 */
export const scrollBehavior: RouterScrollBehavior = (_to, _from, savedPosition) =>
  savedPosition ?? { top: 0 }
