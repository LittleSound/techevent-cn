import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetWebFonts,
  presetWind4,
} from 'unocss'

export default defineConfig({
  shortcuts: [
    ['icon-btn', 'inline-flex items-center justify-center text-lg op75 hover:op100 hover:text-teal-600 transition cursor-pointer select-none'],
    ['chip', 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border border-gray-200 dark:border-gray-700 select-none cursor-pointer transition'],
    ['chip-active', 'bg-teal-600 border-teal-600 text-white hover:bg-teal-700'],
    ['chip-idle', 'bg-transparent hover:border-teal-500 hover:text-teal-600'],
    ['card', 'border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 transition hover:border-teal-500 dark:hover:border-teal-500'],
  ],
  presets: [
    presetWind4(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
    presetWebFonts({
      fonts: {
        sans: 'DM Sans',
        serif: 'DM Serif Display',
        mono: 'DM Mono',
      },
    }),
  ],
})
