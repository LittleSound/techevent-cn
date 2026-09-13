import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import EventCard from '~/components/EventCard.vue'
import EventDetailCard from '~/components/EventDetailCard.vue'
import { tagIcons } from '~/data/tag-icons'
import { tagIconSources } from '~/data/tag-icons.mjs'
import { normalizeEvent } from '~/utils/events'

const event = normalizeEvent({
  id: 'huawei-brand',
  name: 'Huawei developer event',
  startDate: '2026-10-24',
  city: 'Shanghai',
  tags: ['huawei', 'vue'],
  url: 'https://example.com',
}, 'huawei-brand')

describe('brand icon colors', () => {
  it('keeps source colors separate from readable text colors', () => {
    for (const [tag, source] of Object.entries(tagIconSources)) {
      expect(tagIcons[tag]?.iconColor, tag).toBe(source.color)
    }
    expect(tagIcons.linux?.iconColorDark).toBe('#e0e0e0')
    expect(tagIcons.huawei?.iconColorDark).toBeUndefined()
    expect(tagIcons.huawei?.color).not.toBe('#cf0a2c')
  })

  it.each([EventCard, EventDetailCard])('preserves Huawei red in chips and watermarks', (component) => {
    const wrapper = mount(component, {
      props: { event },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    expect(wrapper.element.style.getPropertyValue('--ev-color')).toBe(tagIcons.huawei?.color)
    const icons = wrapper.findAll('.i-simple-icons-huawei')
    expect(icons).toHaveLength(2)
    for (const icon of icons) {
      expect(icon.classes()).toContain('ev-icon-tinted')
      expect((icon.element as HTMLElement).style.getPropertyValue('--ev-icon-c')).toBe('#cf0a2c')
      expect((icon.element as HTMLElement).style.getPropertyValue('--ev-icon-c-dark') || '#cf0a2c').toBe('#cf0a2c')
    }
    const secondary = wrapper.get('.i-simple-icons-vuedotjs')
    expect((secondary.element as HTMLElement).style.getPropertyValue('--ev-icon-c')).toBe('#42b883')
    wrapper.unmount()
  })
})
