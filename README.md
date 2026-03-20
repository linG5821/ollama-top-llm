# Ollama 下载量排行榜

一个基于 **React + Vite + TypeScript** 的静态排行榜页面，用于展示 Ollama 模型下载量数据，并支持：

- 关键词搜索
- 标签筛选
- 分页浏览
- 深浅色主题切换
- 一键复制 `ollama pull` 命令
- 点击模型名跳转官网详情页
- 显示排行榜更新时间

## 本地开发

```bash
npm ci
npm run dev
```

默认开发地址：`http://localhost:5173`

## 常用脚本

- `npm run dev`：启动开发服务器
- `npm run typecheck`：TypeScript 类型检查
- `npm run test`：运行单元测试（Vitest）
- `npm run test:e2e`：运行端到端测试（Playwright）
- `npm run build`：构建生产产物
- `npm run validate:schema-structure`：校验 schema 结构
- `npm run validate:models`：校验模型数据文件
- `npm run verify:release`：发布前全量校验

## 数据来源与更新

模型数据存放在：`data/models.json`，schema 在：`data/models.schema.json`。

更新数据：

```bash
node scripts/scrape-models.mjs
```

说明：

- 脚本会抓取并生成 **Top 100** 模型数据
- `generatedAt` 字段会记录数据生成时间
- 前端页面会在标题下展示“更新时间”

## 发布流程

推荐在发布前执行：

```bash
npm run verify:release
```

若使用 GitHub Pages，可参考：

- `docs/上线操作清单.md`

## 技术栈

- React 19
- Vite 7
- TypeScript 5
- Vitest
- Playwright
