import { readFileSync } from 'node:fs'
import { compileStyle, parse } from '@vue/compiler-sfc'
import { afterEach, describe, expect, it } from 'vitest'

const { descriptor } = parse(readFileSync(`${process.cwd()}/src/pages/event/[id].vue`, 'utf8'))
const compiled = compileStyle({ source: descriptor.styles[0]!.content, filename: 'event-detail.vue', id: 'data-v-theme-test', scoped: true })

afterEach(() => {
  document.documentElement.classList.remove('dark')
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

/** Exercise the compiled scoped selectors against the real html-level theme switch. */
function mountStyles(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
  const style = document.createElement('style')
  style.textContent = compiled.code
  document.head.append(style)
  document.body.innerHTML = '<div class="detail-page" data-v-theme-test></div>'
  return getComputedStyle(document.querySelector('.detail-page')!)
}

describe('event detail theme integration', () => {
  it('inherits the shared dark palette through the html theme switch', () => {
    const style = mountStyles(true)
    expect(style.getPropertyValue('--detail-surface').trim()).toBe('var(--colors-gray-900)')
    expect(style.getPropertyValue('--detail-ink').trim()).toBe('var(--colors-gray-200)')
    expect(style.getPropertyValue('--detail-line').trim()).toBe('var(--colors-gray-800)')
  })

  it('keeps the approved light surfaces when dark mode is off', () => {
    const style = mountStyles(false)
    expect(style.getPropertyValue('--detail-surface').trim()).toBe('#fff')
    expect(style.getPropertyValue('--detail-ink').trim()).toBe('var(--colors-gray-700)')
  })
})
