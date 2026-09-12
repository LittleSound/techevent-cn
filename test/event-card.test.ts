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
  it('preserves the full default card and reduces secondary content only in compact mode', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/event/:id', component: { template: '<div />' } }] })
    await router.push('/event/current')
    const wrapper = mount(EventCard, { props: { event }, global: { plugins: [router] } })
    expect(wrapper.classes()).toContain('ev-themed')
    expect(wrapper.find('.ev-watermark').exists()).toBe(true)
    expect(wrapper.text()).toContain(event.organizer)
    expect(wrapper.text()).toContain('opensource')

    await wrapper.setProps({ variant: 'compact' })
    expect(wrapper.classes()).not.toContain('ev-themed')
    expect(wrapper.find('.ev-watermark').exists()).toBe(false)
    expect(wrapper.find('.ev-icon-tinted').exists()).toBe(false)
    expect(wrapper.text()).not.toContain(event.organizer)
    expect(wrapper.text()).not.toContain('opensource')
    expect(wrapper.text()).toContain('vue')
    expect(wrapper.text()).toContain('ai')
    expect(wrapper.text()).toContain(event.city)
    expect(wrapper.get('p').text()).toBe(event.description)
    expect(wrapper.get('h3').text()).toBe(event.name)
    expect(wrapper.attributes('href')).toBe(`/event/${event.id}`)

    await wrapper.setProps({ variant: 'default' })
    expect(wrapper.find('.ev-watermark').exists()).toBe(true)
    expect(wrapper.text()).toContain('opensource')
    wrapper.unmount()
  })
})
