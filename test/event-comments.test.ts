import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import EventComments from '~/components/EventComments.vue'
import { isDark } from '~/composables/dark'

vi.mock('~/composables/dark', () => ({ isDark: ref(false) }))

vi.mock('@giscus/vue', () => ({
  default: defineComponent({
    name: 'Giscus',
    inheritAttrs: false,
    setup: (_, { attrs }) => () => h('giscus-widget', { ...attrs, 'data-testid': 'giscus' }),
  }),
}))

afterEach(() => {
  isDark.value = false
})

describe('eventComments', () => {
  it('keeps the discussion link in static HTML without rendering the browser widget', async () => {
    const html = await renderToString(createSSRApp(EventComments, { eventId: 'vueconf-2026' }))
    expect(html).toContain('活动讨论')
    expect(html).toContain('github.com/LittleSound/techevent-cn/discussions')
    expect(html).not.toContain('data-testid="giscus"')
  })

  it('offers a retry for service errors but ignores unrelated messages and empty discussions', async () => {
    const wrapper = mount(EventComments, { props: { eventId: 'vueconf-2026' }, attachTo: document.body })
    await flushPromises()
    const element = wrapper.get('[data-testid="giscus"]').element
    const iframe = document.createElement('iframe')
    Object.defineProperty(iframe, 'contentWindow', { value: window })
    element.attachShadow({ mode: 'open' }).appendChild(iframe)
    const send = (error: string, origin = 'https://giscus.app', source = iframe.contentWindow) => window.dispatchEvent(new MessageEvent('message', {
      origin,
      source,
      data: { giscus: { error } },
    }))
    send('Service unavailable', 'https://example.com')
    send('Service unavailable', 'https://giscus.app', null)
    send('Discussion not found')
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    send('Service unavailable')
    await nextTick()
    expect(wrapper.get('[role="status"]').text()).toContain('暂时无法加载评论')
    const previous = element
    await wrapper.get('button').trigger('click')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="giscus"]').element).not.toBe(previous)
    wrapper.unmount()
  })

  it('uses stable event keys, lazy loading and the site theme', async () => {
    const wrapper = mount(EventComments, { props: { eventId: 'vueconf-2026' } })
    await flushPromises()
    const widget = () => wrapper.get('[data-testid="giscus"]')
    expect(widget().attributes()).toMatchObject({
      'mapping': 'specific',
      'term': 'event:vueconf-2026',
      'strict': '1',
      'loading': 'lazy',
      'lang': 'zh-CN',
      'theme': 'light',
      'input-position': 'top',
    })
    isDark.value = true
    await nextTick()
    expect(widget().attributes('theme')).toBe('dark')
    await wrapper.setProps({ eventId: 'adventurex-2026' })
    expect(widget().attributes('term')).toBe('event:adventurex-2026')
    expect(decodeURIComponent(wrapper.get('a').attributes('href'))).toContain('event:adventurex-2026')
    wrapper.unmount()
  })
})
