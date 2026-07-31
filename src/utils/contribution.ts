import type { NormalizedEvent } from '~/types'
import { newEventUrl, repoUrl, siteUrl } from '~/config'
import { eventCanonicalUrl } from '~/utils/seo'
import contributionGuide from '../../CONTRIBUTING.md?raw'

export type MissingContributionField = 'venue' | 'links'

export type ContributionContext
  = | { intent: 'add' }
    | { intent: 'edit', event: NormalizedEvent }

/** Return optional event details that the UI can meaningfully invite contributors to supply. */
export function missingContributionFields(event: NormalizedEvent): MissingContributionField[] {
  const missing: MissingContributionField[] = []
  if (event.format !== 'online' && !event.venue)
    missing.push('venue')
  if (!event.links?.length)
    missing.push('links')
  return missing
}

/** Build the exact repository-relative path used by GitHub and coding agents for one event. */
export function eventDataPath(id: string): string {
  return `data/events/${id}.json`
}

/**
 * Package enough project context and editorial guidance into one self-contained prompt that a
 * general coding agent can safely start an add/edit workflow without the user restating the schema.
 */
export function buildContributionPrompt(context: ContributionContext): string {
  const projectContext = [
    `项目网站：${siteUrl}`,
    `项目代码仓库：${repoUrl}`,
    `贡献指南：${newEventUrl}`,
  ]

  const taskContext = context.intent === 'edit'
    ? [
        '我从这个活动详情页复制了这段提示词，请以这里的活动为当前编辑对象：',
        `- 活动名称：${context.event.name}`,
        `- 当前详情页：${eventCanonicalUrl(context.event.id)}`,
        `- 活动官网：${context.event.url}`,
        `- 当前活动数据文件：${eventDataPath(context.event.id)}`,
        '',
        '请先询问我想纠正或补充哪些信息，以及我是否有可供核实的新链接或线索。开始修改前先读取当前活动数据文件，保留没有充分理由更改的既有信息。',
      ]
    : [
        '我想向这个项目添加一个技术活动。',
        '请先询问我想添加哪个活动，以及我已经知道的活动官网、公告页或报名页；一次只追问开始调查所需的关键信息。',
      ]

  return [
    '你是一位协助我维护 techevent-cn 活动数据的编码 Agent。请在项目仓库中完成活动数据的添加或编辑，并在需要时向我提问。',
    '',
    ...projectContext,
    '',
    ...taskContext,
    '',
    '调查与编写要求：',
    '1. 主动搜索并调查活动官网、主办方官方账号、公告页、议程页和报名页；优先使用第一方来源，并交叉核对活动名称、日期、形式、地点、主办方和链接。',
    '2. 在 `sources` 中记录实际用于核实信息的页面；在 `links` 中补充对参与者有用的官方社媒、报名、议程或直播/回放链接，避免堆放低价值或重复链接。',
    '3. 提供尽可能丰富、准确且简洁的信息，但不要猜测或编造。搜索不到、无法确认或来源相互冲突的信息，请明确告诉我，并让可选字段保持为空或省略；不要用看似合理的内容填空。',
    '4. 严格遵循下方贡献指南和仓库中的现有数据格式。完成后检查 JSON、运行相关校验，并向我概述采用了哪些来源、仍有哪些信息保持为空。',
    '5. 只修改完成当前活动贡献所必需的文件；如果尚未获得足够信息，先继续调查或向我确认，不要贸然提交。',
    '',
    '以下是项目当前的完整贡献指南：',
    '',
    contributionGuide.trim(),
    '',
  ].join('\n')
}
