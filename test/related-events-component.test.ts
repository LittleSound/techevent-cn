import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import RelatedEvents from '~/components/RelatedEvents.vue'
import { normalizeEvent } from '~/utils/events'

const events = Array.from({ length: 4 }, (_, index) => normalizeEvent({
  id: `event-${index}`,
  name: `Community event ${index}`,
  startDate: '2026-10-24',
  city: '上海',
  url: 'https://example.com',
}, `event-${index}`))

describe('relatedEvents', () => {
  it('keeps all four recommendations as individually navigable links when events change', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/event/:id', component: { template: '<div />' } }] })
    await router.push('/event/current')
    await router.isReady()
    const wrapper = mount(RelatedEvents, { props: { events }, global: { plugins: [router] } })
    expect(wrapper.get('section').attributes('aria-labelledby')).toBe(wrapper.get('h2').attributes('id'))
    expect(wrapper.findAll('li')).toHaveLength(4)
    expect(wrapper.findAll('a').map(link => link.attributes('href'))).toEqual(events.map(event => `/event/${event.id}`))
    await wrapper.findAll('a')[3]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.params.id).toBe('event-3')
    await wrapper.setProps({ events: events.slice(1) })
    expect(wrapper.findAll('a').map(link => link.attributes('href'))).toEqual(events.slice(1).map(event => `/event/${event.id}`))
    wrapper.unmount()
  })
})
