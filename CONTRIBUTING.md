# 贡献活动

techevent-cn 的活动数据来自社区共同维护。添加或修改一个活动，只需要提交一个 PR，新增 / 编辑 `data/events/` 下的一个 JSON 文件即可，**不需要懂前端**。

## 快速开始

1. Fork 本仓库。
2. 在 `data/events/` 下复制 `_template.json`，命名为有辨识度的英文小写文件名，例如 `vueconf-china-2026.json`、`shanghai-lug-202608.json`。
   - 文件名会作为活动的稳定 id，建议形如 `<活动名>-<年份>` 或 `<社区>-<年月>`。
3. 填写字段（见下表），删掉不需要的可选字段。
4. 提交 PR。CI 会校验 JSON 格式，合并后网站自动更新。

## 字段说明

| 字段          | 必填 | 说明                                                 |
| ------------- | ---- | ---------------------------------------------------- |
| `name`        | ✅   | 活动名称，例如 `VueConf China 2026`                  |
| `startDate`   | ✅   | 开始日期，格式 `YYYY-MM-DD`                          |
| `endDate`     |      | 结束日期；单日活动可省略                             |
| `city`        | ✅   | 城市；纯线上活动填 `线上`                            |
| `country`     |      | 国家，默认 `中国`；非中国活动请填写，如 `日本`       |
| `venue`       |      | 具体场馆                                             |
| `format`      |      | `offline`（默认）/ `online` / `hybrid`               |
| `url`         | ✅   | 官方链接（详情或报名页）                             |
| `tags`        |      | 关键词数组，小写，用于筛选，如 `["vue", "frontend"]` |
| `description` |      | 一两句话简介                                         |
| `organizer`   |      | 主办方 / 社区                                        |

### 关于 tags

标签是筛选的核心，请尽量复用已有标签（如 `vue`、`frontend`、`linux`、`opensource`、`ai`、`go`、`python`、`meetup`、`hackathon`），全部小写。这样 “按关键词筛选” 才好用。

如果你要用的标签还没有对应的图标 / 主题色，欢迎顺手加一个，见下面的 [为 tag 添加图标](#为-tag-添加图标)。

## 收录原则（固执己见）

这是一个**有个人口味**的日历，主要收录：

- 中国大陆的技术活动 —— 大会、Meetup、黑客松、用户组聚会等。
- 维护者或社区觉得有趣、值得去的活动。
- 偶尔也收录周边地区（如日本）值得顺路参加的活动。

只要是真实、对开发者有价值的技术活动，都欢迎提交。日期 / 链接请尽量核对到官方来源。

## 为 tag 添加图标

活动卡片上的图标和主题色不是手动画的封面图，而是根据 `tags` 自动推导出来的：图标来自 [Iconify](https://icones.js.org) 图标集，由 UnoCSS 的 `presetIcons` 按需编译成 CSS，不需要存图片、也不需要对象存储，零运行时资产。

### 在哪里加

映射表在 [`src/data/tag-icons.ts`](./src/data/tag-icons.ts)，每个 tag 对应一条 `TagIconDef`：

| 字段        | 必填 | 说明                                                                     |
| ----------- | ---- | ------------------------------------------------------------------------ |
| `icon`      | ✅   | UnoCSS 图标类名，如 `i-simple-icons-vuedotjs`，可以用任意 Iconify 图标集 |
| `color`     | ✅   | 主题色（hex）。如果品牌色太浅/太亮，白底下不好看，选一个加深过的变体     |
| `colorDark` |      | 暗色模式下的颜色覆盖，可选，用于在暗色模式对比度不够的颜色               |
| `tier`      | ✅   | 图标的展示层级，见下面的说明                                             |

`tier` 决定图标出现在哪里：

- `1` 品牌 / 技术 logo，如 `vue`、`python`、`ubuntu`
- `2` 领域概念，如 `ai`、`opensource`、`hackathon`
- `3` 仅在 tag 小标签上显示图标，不会出现在活动卡片上（如 `conference`、`meetup`）

如果多个相近的 tag 应该共享同一个图标（比如 `ai`、`llm`、`agentic-ai` 都算 AI 类），先定义一个变量，再在表里被多个 key 引用，避免卡片上出现重复图标：

```ts
const ai: TagIconDef = { icon: 'i-carbon-machine-learning-model', color: '#8b5cf6', tier: 2 }

export const tagIcons: Record<string, TagIconDef> = {
  'ai': ai,
  'llm': ai,
  'agentic-ai': ai,
}
```

### 展示逻辑（贡献者视角）

活动卡片会按「先按 tier 升序，同 tier 内按 `tags` 数组里的顺序」挑出最多 3 个图标：

- 排在第一的是「主图标」，决定卡片的主题色、水印图案和日历条的颜色。
- tier 为 `3` 的图标只会出现在 tag 小标签上，不会上卡片、也不参与主题色计算。
- 如果活动的 tags 一个都没命中映射表，卡片保持默认样式，不会报错。

所以给一个新领域的 tag 选图标时，如果它更偏「品牌 logo」就用 tier 1，偏「概念/分类」就用 tier 2，纯粹是活动形式（会议、meetup 之类）就用 tier 3。

### 用什么图标

- 有品牌 logo 的（框架、公司、发行版……）优先用 [simple-icons](https://icon-sets.iconify.design/simple-icons/) 图标集。
- 抽象概念（AI、云原生、机器人……）用 [carbon](https://icon-sets.iconify.design/carbon/) 或 [mdi](https://icon-sets.iconify.design/mdi/)。
- 去 https://icones.js.org 搜索图标名，UnoCSS 类名格式为 `i-<集合名>-<图标名>`。
- 如果现有三个集合（`simple-icons` / `carbon` / `mdi`）都没有合适的图标，需要引入新的 Iconify 集合，把 `@iconify-json/<集合名>` 加到 `package.json` 的 `devDependencies`（版本用 `catalog:build`）。

### 验证

`pnpm test` 会自动校验：图标类名对应的图标在已安装的集合里是否真实存在、`color`/`colorDark` 是否是合法的 hex 颜色。写错了会直接报错并提示是哪个 tag，不需要手动去图标库里一个个核对。

## 本地预览（可选）

```bash
pnpm install
pnpm dev          # 启动本地预览
pnpm gen:ics      # 生成日历订阅文件 public/events.ics
```
