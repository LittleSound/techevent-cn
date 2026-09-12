import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { parse } from 'vue/compiler-sfc'
import EventCard from '~/components/EventCard.vue'
import eventCardSource from '~/components/EventCard.vue?raw'
import eventThemeCss from '~/styles/event-theme.css?raw'
import { normalizeEvent } from '~/utils/events'

const event = normalizeEvent({
  id: 'vue-community',
  name: 'Vue community meetup',
  startDate: '2026-10-24',
  city: '上海',
  organizer: 'Community organizers',
  description: 'A community meetup with talks and workshops.',
  tags: ['vue', 'ai', 'opensource'],
  url: 'https://example.com',
}, 'vue-community')

describe('eventCard', () => {
  it('uses the neutral card border at rest in both color schemes', () => {
    const style = document.createElement('style')
    style.textContent = (eventThemeCss + parse(eventCardSource).descriptor.styles.map(block => block.content).join('\n'))
      .replaceAll('var(--colors-gray-200)', '#e5e7eb')
      .replaceAll('var(--colors-gray-800)', '#1f2937')
    const card = document.createElement('a')
    card.className = 'card ev-themed event-card-muted'
    document.head.append(style)
    document.body.append(card)
    const originalClass = document.documentElement.className
    try {
      document.documentElement.classList.remove('dark')
      expect(getComputedStyle(card).borderTopColor).toBe('rgb(229, 231, 235)')
      document.documentElement.classList.add('dark')
      expect(getComputedStyle(card).borderTopColor).toBe('rgb(31, 41, 55)')
    }
    finally {
      card.remove()
      style.remove()
      document.documentElement.className = originalClass
    }
  })

  it('preserves all content and decorative icons when only the palette is muted', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/event/:id', component: { template: '<div />' } }] })
    await router.push('/event/current')
    const wrapper = mount(EventCard, { props: { event }, global: { plugins: [router] } })
    expect(wrapper.classes()).toContain('ev-themed')
    expect(wrapper.find('.ev-watermark').exists()).toBe(true)
    expect(wrapper.text()).toContain(event.organizer)
    expect(wrapper.text()).toContain('opensource')

    const originalContent = wrapper.text()
    const originalPalette = wrapper.attributes('style')
    const originalIconPalette = wrapper.findAll('.ev-icon-tinted').map(icon => icon.attributes('style')?.split(';').map(part => part.trim()).sort())
    const originalIcons = wrapper.findAll('.ev-watermark > div').map(icon => icon.classes())
    const originalTitle = wrapper.get('h3').attributes()
    const originalDescription = wrapper.get('p').attributes()
    await wrapper.setProps({ variant: 'muted' })
    expect(wrapper.classes()).toContain('event-card-muted')
    expect(wrapper.classes()).toContain('ev-themed')
    expect(wrapper.text()).toBe(originalContent)
    expect(wrapper.attributes('style')).toBe(originalPalette)
    expect(wrapper.findAll('.ev-icon-tinted').map(icon => icon.attributes('style')?.split(';').map(part => part.trim()).sort())).toEqual(originalIconPalette)
    expect(wrapper.findAll('.ev-watermark > div').map(icon => icon.classes())).toEqual(originalIcons)
    expect(wrapper.get('h3').attributes()).toEqual(originalTitle)
    expect(wrapper.get('p').attributes()).toEqual(originalDescription)
    expect(wrapper.find('.ev-watermark').exists()).toBe(true)
    expect(wrapper.text()).toContain(event.organizer)
    expect(wrapper.text()).toContain('opensource')
    expect(wrapper.attributes('href')).toBe(`/event/${event.id}`)

    await wrapper.setProps({ variant: 'default' })
    expect(wrapper.find('.ev-watermark').exists()).toBe(true)
    expect(wrapper.text()).toContain('opensource')
    wrapper.unmount()
  })
})
