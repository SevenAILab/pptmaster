---
name: pptmaster
description: PPTAgent · 品牌策略 AI Agent · 上传客户资料 + 填表单选择题 -> 输出咨询级品牌全案 HTML 横向翻页 PPT. 复用 Seven 247 页品牌方法论体系 + 132 营销模型 + 真实案例库. Phase 1 Skill v1.0 支持 6 个 Sub-Agent 与全案串联.
---

# PPTAgent · 品牌策略 AI Agent

## 这是什么

PPTAgent 面向甲方品牌人 / 独立品牌策划顾问,把客户资料、表单字段、Seven 方法论资产、真实案例/SOP 和搜索数据组织成咨询级品牌策略 HTML PPT。

它不是通用 AI PPT 工具。它的重点是按真实提案逻辑完成诊断、推导、结论和落地,再交给渲染层生成横向翻页方案。

## 当前能力 (Phase 1 Skill v1.0)

已支持 **Chief Strategist Orchestrator + 6 个 Sub-Agent**:

- Chief Strategist Orchestrator: 负责需求澄清、根问题定义、blueprint 选择、任务派发、上下文裁剪、证据核查和整案汇总。
- Sub-Agent: 负责自己 chunk 的局部策略判断,并把 `chunk_takeaway` / `chunk_insights` / `thinking_log` / `slides` 回传。

主 Agent 注入的任务包协议为 `chief-strategist-task-packet/v1`。不要让 Sub-Agent 自由写一份独立小方案,必须遵守 blueprint chunk。

6 个 Sub-Agent:

| Agent | ID | 产出 |
|---|---|---|
| ① 消费者洞察 | `consumer_insight` | JTBD / Persona / Journey / 需求分层 |
| ② 行业分析 | `industry_analysis` | PESTEL / Porter5 / 生命周期 / 趋势机会 |
| ③ 竞争分析 | `competitor_analysis` | SWOT / 竞品矩阵 / 感知地图 / 空位判断 |
| ④ 品牌定位 | `brand_positioning` | STP / 定位三角 / BMC / VPC / RTB / 人格 |
| ⑤ 品牌建设 | `brand_building` | 品牌屋 / 产品屋 / 口号 / 视觉锤 / 语言钉 / 资产闭环 |
| ⑥ 年度规划 | `annual_planning` | OKR / 营销日历 / 4P 节奏 / AARRR |

默认 blueprint flow:

`用户资料 -> Chief Strategist -> strategic-question.md -> blueprint -> chunk task packets -> Sub-Agent outputs -> assemble-by-blueprint -> render-deck`

## 首次使用流程

### Step 1: 先问用户 10 个字段

为用户创建 `inputs/{client_slug}/form.json`:

```json
{
  "name": "...",
  "industry": "...",
  "stage": "...",
  "core_products": ["..."],
  "target_audience": ["..."],
  "competitors": ["..."],
  "budget_level": "...",
  "tonality": "...",
  "render_style": "swiss",
  "expected_pages": 12
}
```

### Step 2: 收集客户资料

请用户把资料放到 `inputs/{client_slug}/raw/`,并整理 800-1500 字摘要到 `inputs/{client_slug}/summary.md`。

摘要优先级:

- 公司是谁
- 主营产品
- 目标用户
- 竞争格局
- 财务 / 规模 / 估值
- 当前挑战
- 自我感知与期待

### Step 3: 单 Agent 或 blueprint 全案运行

单 Agent:

```bash
node scripts/run-sub-agent.mjs brand_positioning {client_slug}
node scripts/run-sub-agent.mjs brand_positioning {client_slug} --validate
```

带 suffix 的 Agent:

```bash
node scripts/run-sub-agent.mjs brand_building {client_slug} --output-suffix=building
node scripts/run-sub-agent.mjs brand_building {client_slug} --output-suffix=building --validate
```

全案串联:

```bash
npm run blueprint:suite -- {client_slug} --scheme brand_positioning_case --force --fail-fast
npm run blueprint:assemble -- {client_slug} --scheme brand_positioning_case --output-slug {client_slug}-blueprint
node scripts/render-deck.mjs outputs/{client_slug}-blueprint/raw-output.json outputs/{client_slug}-blueprint/index.html --style=swiss
```

`blueprint:suite` 会生成每个 chunk 的 prompt bundle。读取 bundle 后,按契约生成 `outputs/{client_slug}/_chunks/<chunk_id>.json`,再执行 assemble + render。

本地 demo 快速验证:

```bash
node scripts/generate-blueprint-demo.mjs {client_slug} --scheme brand_positioning_case --output-slug {client_slug}-blueprint --force
```

旧脚本 `run-full-suite.mjs` 保留为兼容入口,默认不要用它做新方案。

## 提案逻辑要求

品牌定位案必须按:

`Brief / 核心问题 -> 行业诊断 -> 竞争诊断 -> 消费者诊断 -> 自身资产 -> 定位机会 -> 定位结论 -> RTB / 价值主张 -> 落地建议`

品牌建设案必须按:

`起点诊断 -> 定位承接 -> 品牌屋 / 产品屋 -> 产品/渠道/营销/服务配称 -> 口号/视觉锤/语言钉 -> 资产闭环 -> 落地规范`

不要把每页都写成一个大结论加三个小点。根据内容选择不同结构和版式。

## 资产层

- 247 页 Seven 原创体系书: `assets/_raw/books/0to1-brand/`
- 132 营销模型卡片: `assets/_raw/models/`
- 8 张品牌全案知识全景图: `assets/visuals/master-map/`
- 60+ 个黄金概念: `assets/_compiled/concepts-golden/`
- 应用矩阵: `assets/_compiled/concept-application-matrix.json`
- 案例/SOP patterns: `assets/_compiled/case-patterns/`
- SmallRig MI 真实案例 OCR: `assets/_raw/cases/标杆案例/smallrig/`
- 品牌定位 / 品牌建设案例拆解: `assets/_raw/cases/品牌定位/案例库/`, `assets/_raw/cases/品牌建设/案例库/`
- 2024 品牌管理 SOP: `assets/_raw/sops/`

## Web Search 边界

- `industry_analysis`: 必须 web search
- `competitor_analysis`: 必须 web search
- `consumer_insight`: 可选 web search
- `annual_planning`: 可选 web search
- `brand_positioning` / `brand_building`: 不直接 web search,优先吃上游输出和客户资料

所有事实必须可追溯。没有 source 的内容只能写入 assumptions,不得伪装成事实。
