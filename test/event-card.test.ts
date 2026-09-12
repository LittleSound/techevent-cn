import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import EventCard from '~/components/EventCard.vue'
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
  it('preserves all content and decorative icons when only the palette is muted', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/event/:id', component: { template: '<div />' } }] })
    await router.push('/event/current')
    const wrapper = mount(EventCard, { props: { event }, global: { plugins: [router] } })
    expect(wrapper.classes()).toContain('ev-themed')
    expect(wrapper.find('.ev-watermark').exists()).toBe(true)
    expect(wrapper.text()).toContain(event.organizer)
    expect(wrapper.text()).toContain('opensource')

    const originalContent = wrapper.text()
    const originalIcons = wrapper.findAll('.ev-watermark > div').map(icon => icon.classes())
    const originalTitle = wrapper.get('h3').attributes()
    const originalDescription = wrapper.get('p').attributes()
    await wrapper.setProps({ variant: 'muted' })
    expect(wrapper.classes()).toContain('event-card-muted')
    expect(wrapper.classes()).toContain('ev-themed')
    expect(wrapper.text()).toBe(originalContent)
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
