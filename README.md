# PPTAgent · 品牌策略 AI Agent

> 上传客户资料 + 填几个字段 -> 输出咨询级品牌全案 HTML PPT
>
> 基于 Seven 247 页《AI 实战, 从 0 到 1 打造你的品牌》体系 + 132 营销模型 + 60 编译后黄金概念

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Version](https://img.shields.io/badge/version-1.0.0-green)
![Stage](https://img.shields.io/badge/stage-Phase%201%20Skill%20MVP-orange)

**官网**: https://pptagent.app (Phase 1.5 上线中)
**Repo**: https://github.com/SevenAILab/pptmaster
**作者**: Seven (深圳品牌策划人 / GEO 顾问)

---

## 这是什么

PPTAgent 是一套面向甲方品牌人 / 独立品牌策划顾问的 AI Agent 框架。

不像 Gamma / AiPPT 等"通用 AI PPT 工具", PPTAgent 把:

- **专业方法论**: 247 页书 + 132 营销模型 + 60 编译后黄金概念
- **真实案例库**: SmallRig MI 升级 / 植愈坊全案 / 行业经典案例
- **实时数据**: Tavily + Serper 双引擎获取行业 / 竞品最新数据
- **专业渲染**: 瑞士国际主义风 / 电子杂志风, 媲美 4A 提案

打包成 **Chief Strategist Orchestrator + 6 个专项 Sub-Agent + blueprint-driven deck flow**:

- 主 Agent 负责需求澄清、根问题定义、方案蓝图选择、任务派发、上下文裁剪、证据核查和整案汇总
- 子 Agent 分别负责行业、竞品、消费者、定位、建设和年度规划的局部策略判断
- blueprint 负责控制真实提案顺序、页码、chunk 边界、每页意图和方法论白名单

这让 PPTAgent 更像一个可复用的品牌策略项目组,而不是把 6 段内容粗暴拼接的 PPT 生成器。

---

## Quick Start (3 步)

```bash
# 1. Clone
git clone https://github.com/SevenAILab/pptmaster.git
cd pptmaster
npm install

# 2. 配密钥 (Tavily + Serper, 详见 docs/setup-search-keys.md)
cp .env.example .env
# 编辑 .env 填入你的 API 密钥

# 3. 装为 Claude Code Skill
ln -s "$(pwd)" ~/.claude/skills/pptmaster

# 4. 在 Claude Code 启动
# /pptmaster
```

5 分钟上手 -> 看 [docs/QUICKSTART.md](docs/QUICKSTART.md)

---

## Chief Strategist Orchestrator

默认架构:

```text
用户资料 / 表单
  -> Chief Strategist Orchestrator
  -> strategic-question.md
  -> brand_positioning_case / brand_building_case blueprint
  -> chunk task packets
  -> 6 个 Sub-Agent
  -> _chunks/*.json + _insights.json
  -> assemble-by-blueprint.mjs
  -> render-deck.mjs
  -> HTML 横向翻页 PPT
```

主 Agent 注入每个子 Agent 的任务包: `chief-strategist-task-packet/v1`。详见 [docs/chief-strategist-orchestrator.md](docs/chief-strategist-orchestrator.md)。

## 6 个 Sub-Agent

| Sub-Agent | 职责 | Blueprint 中的典型角色 | Web Search |
|---|---|---:|---|
| ① `consumer_insight` | 消费者洞察 (JTBD / Persona / Journey) | 人群画像 / 消费心智 | 可选 |
| ② `industry_analysis` | 行业分析 (PESTEL / Porter5 / Lifecycle) | 市场扫描 / 赛道窗口 | 必用 |
| ③ `competitor_analysis` | 竞争分析 (SWOT / Matrix / Perceptual Map) | 竞品格局 / 心智空位 | 必用 |
| ④ `brand_positioning` | 品牌定位 (STP / BMC / VPC / Aaker) | 自身分析 / 定位结论 / 品牌屋 | 不用 |
| ⑤ `brand_building` | 品牌建设 (品牌屋 / 产品屋 / 口号 / VI) | 视觉 / 产品 / 渠道 / 传播配称 | 不用 |
| ⑥ `annual_planning` | 年度规划 (OKR / 营销日历 / AARRR) | 年度节奏 / 营销日历 | 可选 |

---

## 资产库

- **247 页书** (Seven 原创): `assets/_raw/books/0to1-brand/`
- **132 营销模型**: `assets/_raw/models/`
- **60 黄金概念库**: `assets/_compiled/concepts-golden/`
- **8 张品牌全案知识全景图**: `assets/visuals/master-map/`
- **真实案例**: SmallRig MI 升级 (125 页 PDF 拆解)

## Blueprint Flow

当前默认支持两类完整方案:

- `brand_positioning_case`: 品牌定位案,80 页
- `brand_building_case`: 品牌建设案,95 页

本地 demo 生成:

```bash
npm run blueprint:demo -- test-positioning-case --scheme brand_positioning_case --output-slug test-positioning-case-blueprint --force
npm run blueprint:demo -- test-building-case --scheme brand_building_case --output-slug test-building-case-blueprint --force
```

真实分步流程:

```bash
npm run blueprint:suite -- <client-slug> --scheme brand_positioning_case --force --fail-fast
npm run blueprint:assemble -- <client-slug> --scheme brand_positioning_case --output-slug <client-slug>-blueprint
node scripts/render-deck.mjs outputs/<client-slug>-blueprint/raw-output.json outputs/<client-slug>-blueprint/index.html --style=swiss
```

旧版全案串联脚本仍保留为兼容入口,但默认使用 blueprint flow。

---

## 跨 Agent / 跨模型可用

PPTAgent 模型无关 + Agent 框架无关, 可在以下平台运行:

- Claude Code (默认, `SKILL.md`)
- Cursor IDE (`adapters/cursor/`)
- Cline (`adapters/cline/`)
- OpenAI API (`adapters/openai-api/`, Python)
- Anthropic API (`adapters/anthropic-api/`, Python)
- Qwen API / 通义千问 (`adapters/qwen-api/`, Python)

跨模型质量 delta < 20% (Plan 4 验证, 见 [docs/model-agnostic-validation.md](docs/model-agnostic-validation.md))。

---

## Phase 1 Skill MVP 验收 (2026-05)

- 60 黄金概念库 + 矩阵覆盖率 100%
- 6 Sub-Agent 全部跑通 + 全案串联
- SmallRig 真案例内容评分 9/10, Sxx 精雕后视觉层完成 Plan 3 验收
- 4 LLM 跨模型验证框架已完成, 真实 API 验证待密钥和预算确认
- 5 个 adapter 全部可装载

详见 [docs/phase-1-retro.md](docs/phase-1-retro.md)。

---

## 密钥安全 (P0 必读)

本项目使用 Tavily 和 Serper 两个外部搜索 API。请:

1. 复制 `.env.example` 为 `.env`
2. 填入你自己的密钥
3. 绝不要把 `.env` 提交到 git (已在 `.gitignore`)

详见 [docs/setup-search-keys.md](docs/setup-search-keys.md)。

如果不小心提交了密钥, 立刻:

1. 在对应平台撤销该密钥并生成新密钥
2. 用 `git filter-repo` 或 BFG Repo-Cleaner 清理历史
3. 强制推送清理后的历史

---

## Roadmap

- **Phase 1 Skill** (2026-05, v1.0): Claude Code Skill 形态, 适合 AI 圈 / 同行 / 独立顾问
- **Phase 1.5 Web App** (2026-06+, v2.0): Next.js + Supabase, 面向甲方品牌 / 市场部
- **Phase 2+**: PPTX 高保真导出 / 多人协作 / API 开放 / 行业数据库接入

---

## 致谢

- 内容方法论: Seven 7 年品牌策划经验
- 渲染层: 复用 guizang-ppt-skill 瑞士国际主义模板
- AI 引擎: Anthropic Claude + OpenAI + Alibaba Qwen

---

## License

MIT © 2026 SevenAILab
