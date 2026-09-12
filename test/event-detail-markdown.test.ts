import { createHead } from '@unhead/vue/client'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import EventComments from '~/components/EventComments.vue'
import EventMarkdownButton from '~/components/EventMarkdownButton.vue'
import { allEvents } from '~/composables/events'
import EventDetail from '~/pages/event/[id].vue'
import { eventMarkdown } from '~/utils/eventMarkdown'

vi.mock('~/composables/dark', () => ({ isDark: ref(false), toggleDark: vi.fn() }))

vi.mock('@giscus/vue', () => ({
  default: defineComponent({
    name: 'Giscus',
    inheritAttrs: false,
    setup: (_, { attrs }) => () => h('giscus-widget', { ...attrs, 'data-testid': 'giscus' }),
  }),
}))

afterEach(() => vi.unstubAllGlobals())

describe('event detail Markdown integration', () => {
  it('keeps copying and discussion tied to the displayed event across route changes', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/event/:id', name: '/event/[id]', component: EventDetail },
      ],
    })
    await router.push('/event/vueconf-china-2026')
    await router.isReady()
    const wrapper = mount(EventDetail, {
      global: {
        plugins: [router, createHead()],
        stubs: { ContributionMenu: true, RelatedEvents: true, EventMapEmbed: true, EventShareButtons: true },
      },
    })

    try {
      for (const id of ['vueconf-china-2026', 'apsara-conference-2026']) {
        await router.push(`/event/${id}.html`)
        await flushPromises()
        const event = allEvents.find(event => event.id === id)!
        expect(wrapper.get('h1').text()).toBe(event.name)
        expect(wrapper.get('#comments').isVisible()).toBe(true)
        expect(wrapper.getComponent(EventComments).props('eventId')).toBe(id)
        expect(wrapper.get('[data-testid="giscus"]').attributes('term')).toBe(`event:${id}`)
        await wrapper.getComponent(EventMarkdownButton).get('button').trigger('click')
        await flushPromises()
        expect(writeText).toHaveBeenLastCalledWith(eventMarkdown(event))
        expect(wrapper.getComponent(EventMarkdownButton).text()).toContain('已复制 Markdown')
      }

      await router.push('/event/missing-event')
      await flushPromises()
      expect(wrapper.text()).toContain('活动不存在或已被移除')
      expect(wrapper.findComponent(EventMarkdownButton).exists()).toBe(false)
      expect(wrapper.findComponent(EventComments).exists()).toBe(false)
    }
    finally {
      wrapper.unmount()
    }
  })
})
