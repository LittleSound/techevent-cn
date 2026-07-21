<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { isDark } from '~/composables/dark'

/**
 * `useHead` binds the browser theme-color to the current color scheme, and — as a side effect of
 * being referenced here — forces `dark.ts` to evaluate on every route, not just the homepage where
 * `TheHeader.vue` used to be the only consumer. Without this, a direct load of `/event/<id>` never
 * ran `useDark()`, so the stored preference was never applied post-hydration.
 */
useHead({
  meta: [{ name: 'theme-color', content: () => isDark.value ? '#0a0a0a' : '#ffffff' }],
})
</script>

<template>
  <main font-sans text="gray-700 dark:gray-200" bg="white dark:gray-950" min-h-screen>
    <RouterView />
  </main>
</template>
