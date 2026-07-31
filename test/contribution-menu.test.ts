import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ContributionMenu from '~/components/ContributionMenu.vue'
import { newEventFileUrl, newEventUrl } from '~/config'
import { normalizeEvent } from '~/utils/events'

const event = normalizeEvent({
  id: 'vueconf-china-2026',
  name: 'VueConf China 2026',
  startDate: '2026-07-04',
  city: '上海',
  url: 'https://vueconf.cn/',
}, 'vueconf-china-2026')

function mountMenu(props: InstanceType<typeof ContributionMenu>['$props']) {
  return mount(ContributionMenu, {
    props,
    global: {
      stubs: { Teleport: true },
    },
  })
}

describe('contributionMenu', () => {
  it('shows add, guide, and Agent prompt choices for a new event', async () => {
    const wrapper = mountMenu({ intent: 'add' })
    await wrapper.get('button').trigger('click')

    expect(wrapper.get('[role="dialog"]').text()).toContain('贡献一个新活动')
    expect(wrapper.get(`a[href="${newEventFileUrl}"]`).text()).toContain('在 GitHub 上添加活动')
    expect(wrapper.get(`a[href="${newEventUrl}"]`).text()).toContain('阅读贡献指南')
    expect(wrapper.get('[role="dialog"]').text()).toContain('复制给 Agent 的提示词')
  })

  it('puts the Agent prompt before the less common contribution paths', async () => {
    const wrapper = mountMenu({ intent: 'add' })
    await wrapper.get('button').trigger('click')

    const dialogText = wrapper.get('[role="dialog"]').text()
    expect(dialogText.indexOf('复制给 Agent 的提示词')).toBeLessThan(dialogText.indexOf('在 GitHub 上添加活动'))
    expect(dialogText.indexOf('复制给 Agent 的提示词')).toBeLessThan(dialogText.indexOf('阅读贡献指南'))
  })

  it('shows the exact GitHub editor and edit-specific wording for an existing event', async () => {
    const wrapper = mountMenu({ intent: 'edit', event })
    await wrapper.get('button').trigger('click')

    expect(wrapper.get('[role="dialog"]').text()).toContain('编辑或补充此活动')
    expect(wrapper.get('a[href*="/edit/master/data/events/vueconf-china-2026.json"]').text()).toContain('在 GitHub 上编辑此活动')
    expect(wrapper.get('[role="dialog"]').text()).toContain('包含贡献指南、调查要求和当前活动上下文')
  })
})
