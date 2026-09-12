import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EventMarkdownButton from '~/components/EventMarkdownButton.vue'
import { eventMarkdown } from '~/utils/eventMarkdown'
import { normalizeEvent } from '~/utils/events'

const event = normalizeEvent({ id: 'sample', name: '开发者大会', startDate: '2026-09-12', city: '上海', url: 'https://example.com' }, 'sample')

afterEach(() => vi.unstubAllGlobals())

describe('eventMarkdownButton', () => {
  it('copies the complete Markdown and follows event prop changes', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const wrapper = mount(EventMarkdownButton, { props: { event } })
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenLastCalledWith(eventMarkdown(event))
    expect(wrapper.text()).toContain('已复制 Markdown')
    const nextEvent = { ...event, id: 'next', name: '下一场活动' }
    await wrapper.setProps({ event: nextEvent })
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenLastCalledWith(eventMarkdown(nextEvent))
    wrapper.unmount()
  })

  it('allows retrying after clipboard access is denied', async () => {
    const writeText = vi.fn().mockRejectedValueOnce(new Error('Denied')).mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const wrapper = mount(EventMarkdownButton, { props: { event } })
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('复制失败，请重试')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('已复制 Markdown')
    wrapper.unmount()
  })
})
