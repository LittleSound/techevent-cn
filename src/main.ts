import { ViteSSG } from 'vite-ssg'
import { routes } from 'vue-router/auto-routes'
import App from './App.vue'

import './styles/main.css'
import 'uno.css'
// Load event-theme.css after uno.css so .ev-themed border-color overrides .card shortcut at equal specificity
import './styles/event-theme.css'

/**
 * vite-ssg entry: creates the app + router per rendered route at build time
 * and hydrates on the client. Head management (unhead) is wired in by ViteSSG.
 */
export const createApp = ViteSSG(App, {
  routes,
  base: import.meta.env.BASE_URL,
})
