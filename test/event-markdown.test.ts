import { describe, expect, it } from 'vitest'
import { eventMarkdown } from '~/utils/eventMarkdown'
import { normalizeEvent } from '~/utils/events'
import { eventCanonicalUrl } from '~/utils/seo'

const event = normalizeEvent({
  id: 'sample',
  name: '开发者大会',
  startDate: '2026-12-31',
  endDate: '2027-01-02',
  city: '上海',
  venue: '会议中心',
  coordinates: [121.5, 31.2],
  format: 'hybrid',
  organizer: '开发者社区',
  tags: ['vue', 'ai'],
  description: '第一行介绍\n第二行介绍',
  url: 'https://example.com/event',
  links: [{ url: 'https://github.com/example' }, { url: 'https://example.com/tickets', label: '报名' }],
  sources: ['https://example.com/announcement'],
}, 'sample')

describe('eventMarkdown', () => {
  it('puts the canonical source directly below the title and exports all collected details', () => {
    expect(eventMarkdown(event)).toBe(`# 开发者大会

来源：[techevent\\-cn 活动详情](<${eventCanonicalUrl(event.id)}>)

> 可通过来源链接查看最新活动信息，或贡献更正与补充。

## 活动信息

- 活动 ID：sample
- 日期：2026-12-31 至 2027-01-02
- 形式：线上+线下
- 国家：中国
- 城市：上海
- 场馆：会议中心
- 坐标（WGS-84）：经度 121.5，纬度 31.2
- 主办方：开发者社区
- 标签：vue、ai
- 官网：[活动官网](<https://example.com/event>)

## 活动介绍

第一行介绍
第二行介绍

## 相关链接

- [GitHub](<https://github.com/example>)
- [报名](<https://example.com/tickets>)

## 原始信息来源

- [来源 1](<https://example.com/announcement>)
`)
  })

  it('omits unavailable details and keeps single-day online events date-only', () => {
    const minimal = normalizeEvent({ id: 'online', name: '线上活动', startDate: '2026-09-12', city: '线上', format: 'online', url: 'https://example.com' }, 'online')
    const markdown = eventMarkdown(minimal)
    expect(markdown).toContain('- 日期：2026-09-12\n')
    expect(markdown).toContain('- 形式：线上')
    for (const absent of ['undefined', '场馆', '坐标', '主办方', '标签', '## 活动介绍', '## 相关链接', '## 原始信息来源'])
      expect(markdown).not.toContain(absent)
    expect(eventMarkdown({ ...minimal, endDate: minimal.startDate })).toBe(markdown)
  })

  it('escapes Markdown in event text and preserves complex link destinations', () => {
    const markdown = eventMarkdown({ ...event, name: '[大会]\n# 标题', links: [{ label: '[报名]*', url: 'https://example.com/a(b)?q=hello world' }] })
    expect(markdown).toContain('# \\[大会\\] \\# 标题\n')
    expect(markdown).toContain('[\\[报名\\]\\*](<https://example.com/a(b)?q=hello%20world>)')
  })
})
