# techevent-cn

> 中国（及周边）科技活动日历

一个记录中国技术活动的日历 —— VueConf、AdventureX，也包括上海 Linux 用户组聚会这类小型活动。想参加类似活动的开发者可以直接来这里浏览、按地区和关键词筛选，并订阅到自己的日历应用。

偶尔也会顺手收录一些不在中国、但很有趣、值得顺路参加的活动（大多在周边，比如日本）。这是一份以开源精神维护、由社区共同补充的记录。

## 功能

- 📅 列表 / 月历两种视图，一键切换；列表按月份分组并区分「即将举行 / 已结束」
- 🔍 按**地区**、**关键词**（如 `vue`、`linux`）筛选，支持全文搜索
- 🌗 亮色 / 暗色主题
- 🔔 日历订阅（webcal / `.ics` 下载）
- 🧩 数据即文件：每个活动一个 JSON，提交 PR 即可贡献

## 添加活动

复制 `data/events/_template.json`，填好后提交 PR 即可，无需懂前端。详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 本地开发

```bash
pnpm install
pnpm dev          # 本地预览
pnpm gen:ics      # 生成 public/events.ics 订阅文件
pnpm build        # 构建（会先生成 .ics）
pnpm test         # 运行测试
```

## 技术栈

Vue 3 · Vite · UnoCSS · vue-router（文件路由）。活动数据存放在 `data/events/*.json`，构建时一并生成 [iCalendar](https://datatracker.ietf.org/doc/html/rfc5545) 订阅源。
