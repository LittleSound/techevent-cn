import type { NormalizedEvent } from '~/types'
import { resolveEventLink } from '~/utils/eventLinks'
import { eventCanonicalUrl } from '~/utils/seo'

/** Keep event text literal when embedded in Markdown headings, lists, and links. */
function escapeText(text: string): string {
  return text.replace(/[\\`*_{}[\]<>()#+\-.!|~]/g, '\\$&')
}

/** Angle-delimited destinations preserve URLs containing parentheses or spaces. */
function link(label: string, url: string): string {
  return `[${escapeText(label)}](<${url.replace(/[<>\s]/g, char => encodeURIComponent(char))}>)`
}

/** Export all collected event details, retaining date-only precision and a canonical update path. */
export function eventMarkdown(event: NormalizedEvent): string {
  const formatLabel = { offline: '线下', online: '线上', hybrid: '线上+线下' }
  const lines = [
    `# ${escapeText(event.name.replace(/\s*\n\s*/g, ' '))}`,
    '',
    `来源：${link('techevent-cn 活动详情', eventCanonicalUrl(event.id))}`,
    '',
    '> 可通过来源链接查看最新活动信息，或贡献更正与补充。',
    '',
    '## 活动信息',
    '',
    `- 活动 ID：${escapeText(event.id)}`,
    `- 日期：${event.startDate}${event.endDate && event.endDate !== event.startDate ? ` 至 ${event.endDate}` : ''}`,
    `- 形式：${formatLabel[event.format]}`,
    `- 国家：${escapeText(event.country)}`,
    `- 城市：${escapeText(event.city)}`,
  ]

  if (event.venue)
    lines.push(`- 场馆：${escapeText(event.venue)}`)
  if (event.coordinates)
    lines.push(`- 坐标（WGS-84）：经度 ${event.coordinates[0]}，纬度 ${event.coordinates[1]}`)
  if (event.organizer)
    lines.push(`- 主办方：${escapeText(event.organizer)}`)
  if (event.tags.length)
    lines.push(`- 标签：${event.tags.map(escapeText).join('、')}`)
  lines.push(`- 官网：${link('活动官网', event.url)}`)

  if (event.description)
    lines.push('', '## 活动介绍', '', escapeText(event.description))
  if (event.links?.length)
    lines.push('', '## 相关链接', '', ...event.links.map(item => `- ${link(resolveEventLink(item).label, item.url)}`))
  if (event.sources?.length)
    lines.push('', '## 原始信息来源', '', ...event.sources.map((url, index) => `- ${link(`来源 ${index + 1}`, url)}`))

  return `${lines.join('\n')}\n`
}
