import type { TechEvent } from '~/types'
import { describe, expect, it } from 'vitest'
import { repoUrl, siteUrl } from '~/config'
import { buildContributionPrompt, missingContributionFields } from '~/utils/contribution'
import { normalizeEvent } from '~/utils/events'

function makeEvent(overrides: Partial<TechEvent> = {}) {
  return normalizeEvent({
    id: 'vueconf-china-2026',
    name: 'VueConf China 2026',
    startDate: '2026-07-04',
    city: '上海',
    url: 'https://vueconf.cn/',
    ...overrides,
  }, 'vueconf-china-2026')
}

describe('buildContributionPrompt', () => {
  it('builds an add prompt with project context, the full guide, and careful research instructions', () => {
    const prompt = buildContributionPrompt({ intent: 'add' })

    expect(prompt).toContain(siteUrl)
    expect(prompt).toContain(repoUrl)
    expect(prompt).toContain(`${repoUrl}/blob/master/CONTRIBUTING.md`)
    expect(prompt).toContain('# 贡献活动')
    expect(prompt).toContain('先询问我想添加哪个活动')
    expect(prompt).toContain('搜索并调查活动官网')
    expect(prompt).toContain('不要猜测或编造')
    expect(prompt).toContain('保持为空')
  })

  it('builds an edit prompt with the current detail page and exact source file path', () => {
    const prompt = buildContributionPrompt({
      intent: 'edit',
      event: makeEvent(),
    })

    expect(prompt).toContain('我从这个活动详情页复制了这段提示词')
    expect(prompt).toContain(`${siteUrl}/event/vueconf-china-2026`)
    expect(prompt).toContain('data/events/vueconf-china-2026.json')
    expect(prompt).toContain('VueConf China 2026')
    expect(prompt).toContain('先询问我想纠正或补充哪些信息')
  })
})

describe('missingContributionFields', () => {
  it('reports a missing physical venue and related links', () => {
    expect(missingContributionFields(makeEvent())).toEqual(['venue', 'links'])
  })

  it('does not treat a physical venue as missing for an online event', () => {
    expect(missingContributionFields(makeEvent({
      city: '线上',
      format: 'online',
      links: [{ url: 'https://example.com/community' }],
    }))).toEqual([])
  })

  it('returns no missing fields when both are present', () => {
    expect(missingContributionFields(makeEvent({
      venue: '上海东方万国会议中心',
      links: [{ url: 'https://example.com/community' }],
    }))).toEqual([])
  })
})
