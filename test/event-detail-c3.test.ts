import { createHead } from '@unhead/vue/client'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import EventMarkdownButton from '~/components/EventMarkdownButton.vue'
import EventDetail from '~/pages/event/[id].vue'

vi.mock('~/composables/dark', () => ({ isDark: ref(false), toggleDark: vi.fn() }))
vi.mock('~/composables/events', async () => {
  const { normalizeEvent } = await import('~/utils/events')
  return {
    allEvents: [
      normalizeEvent({ id: 'online', name: 'Online community', startDate: '2099-10-10', city: '线上', format: 'online', url: 'https://example.com' }, 'online'),
      normalizeEvent({ id: 'offline', name: 'A very long Vue community conference title '.repeat(5), startDate: '2099-10-10', city: '上海', tags: ['vue'], url: 'https://example.com' }, 'offline'),
      normalizeEvent({ id: 'past', name: 'Past hybrid conference', startDate: '2020-12-31', endDate: '2021-01-02', city: '东京', country: '日本', format: 'hybrid', venue: 'Conference hall', organizer: 'Community', description: 'Conference description', url: 'https://example.com' }, 'past'),
    ],
  }
})

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))

async function openEvent(path = '/event/offline') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }, { path: '/event/:id', name: '/event/[id]', component: EventDetail }],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(EventDetail, {
    attachTo: document.body,
    global: {
      plugins: [router, createHead()],
      stubs: { ContributionMenu: true, RelatedEvents: true, EventMapEmbed: true, EventShareButtons: true, EventComments: true },
    },
  })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

describe('c3 event details', () => {
  it('switches accessible tabs without hiding the shared tools or contribution entry', async () => {
    const { wrapper, router } = await openEvent()
    expect(wrapper.get('#details-tab').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('#discussion-panel').attributes('hidden')).toBeDefined()
    await wrapper.get('#discussion-tab').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.hash).toBe('#comments')
    expect(wrapper.get('#discussion-panel').attributes('hidden')).toBeUndefined()
    expect(wrapper.get('#details-panel').attributes('hidden')).toBeDefined()
    expect(wrapper.getComponent(EventMarkdownButton).isVisible()).toBe(true)
    expect(wrapper.get('.contribution-panel').isVisible()).toBe(true)
    await wrapper.get('#detail-tabs').trigger('keydown', { key: 'Home' })
    await flushPromises()
    expect(wrapper.get('#details-tab').attributes('tabindex')).toBe('0')
    expect(document.activeElement?.id).toBe('details-tab')
    expect(router.currentRoute.value.hash).toBe('#details')
    await wrapper.get('#detail-tabs').trigger('keydown', { key: 'ArrowRight' })
    await flushPromises()
    expect(document.activeElement?.id).toBe('discussion-tab')
  })

  it('opens discussion deep links and resets tabs when navigating to another event', async () => {
    const { wrapper, router } = await openEvent('/event/offline.html#comments')
    expect(wrapper.get('#discussion-tab').attributes('aria-selected')).toBe('true')
    await router.push('/event/online')
    await flushPromises()
    expect(wrapper.get('#details-tab').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('event-comments-stub').attributes('eventid')).toBe('online')
  })

  it('handles online-only events without inventing travel details or recommendations', async () => {
    const { wrapper } = await openEvent('/event/online')
    expect(wrapper.get('.event-facts').text()).toContain('线上参与')
    expect(wrapper.get('.takeaway-panel').text()).toContain('安排参与时间')
    expect(wrapper.get('.takeaway-panel').text()).not.toContain('住宿')
    expect(wrapper.find('a[href*="amap"]').exists()).toBe(false)
    expect(wrapper.find('related-events-stub').exists()).toBe(false)
    expect(wrapper.find('.past-badge').exists()).toBe(false)
  })

  it('keeps full titles and theme icons while offering missing-data contributions', async () => {
    const { wrapper } = await openEvent()
    expect(wrapper.get('h1').text()).toBe('A very long Vue community conference title '.repeat(5).trim())
    expect(wrapper.get('.event-hero').classes()).toContain('ev-themed')
    expect(wrapper.get('.event-hero .ev-watermark').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.event-facts').text()).toContain('具体场馆待补充')
    expect(wrapper.find('a[href*="amap"]').exists()).toBe(false)
    expect(wrapper.get('.missing-description contribution-menu-stub').attributes('label')).toBe('补充介绍')
  })

  it('uses historical wording, full years and country details for past hybrid events', async () => {
    const { wrapper } = await openEvent('/event/past')
    expect(wrapper.get('.past-badge').text()).toBe('已结束')
    expect(wrapper.get('.official-strip').text()).toContain('回顾这场活动')
    expect(wrapper.get('.takeaway-panel').text()).toContain('整理资料')
    expect(wrapper.get('.event-facts').text()).toContain('2020年12月31日 – 2021年1月2日')
    expect(wrapper.get('.event-facts').text()).toContain('日本 · 东京')
    expect(wrapper.get('.format-badge').text()).toBe('线上+线下')
    expect(wrapper.find('a[href*="amap"]').exists()).toBe(true)
  })

  it('omits event actions and discussion tabs for an unknown event', async () => {
    const { wrapper } = await openEvent('/event/missing')
    expect(wrapper.text()).toContain('活动不存在或已被移除')
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
    expect(wrapper.findComponent(EventMarkdownButton).exists()).toBe(false)
  })
})
