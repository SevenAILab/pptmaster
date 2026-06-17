# 品牌中台引擎重设计 · Spec + 开发计划

日期：2026-06-17
作者：Seven（构想） + Claude（设计）
状态：设计已收敛，待 Seven 评审 → 进入 writing-plans 细拆
基线：当前最新 skill 驱动 fullcase 管线（入口 `scripts/gen-fullcase-cli.mjs`），**非** Jun9 前的子 Agent 层（已废弃）

---

## 0. 北极星与边界

**北极星**：让每个人都能构建自己的品牌。

**本次范围（已锁）**：
- 交付层：**工作流引擎（Harness）**，CLI / Claude Code Skill 形态。这是未来"品牌中台 Web App"的大脑，本次不做 Web UI。
- 人群：**有自己生意、想做品牌、但请不起咨询公司**的非专业创始人。
- 成品：**结论导向**的「对内对外品牌手册（Brand Book）」+「独立站前端」两种对外成品（MVP 先做手册，独立站为第二出口）。
- 线：**只做品牌线**。实体店 / 小生意 / 融资报告为未来插口，架构预留、本期不实现。

**明确不做（YAGNI）**：Web UI / 账号 / 支付；实体店 & 小生意线；视觉生成（logo/物料/配图）；PPTX 导出。

**架构总原则（方案 C）**：锁战略主线 + 章节契约 + 证据纪律，放开每章写法。最少 Agent——只有"研究扇出"用并行子任务，其余留主编排上下文以共享战略主线。红线：失败必抛，不静默 fallback。

---

## 1. 核心数据模型（Phase 0 · 地基）

一切对外/对内成品都由**唯一真相源** `BrandSystemContent` 经"可见性过滤 + 输出转换器"产生。

### 1.1 BrandSystemContent schema

```jsonc
{
  "meta": {
    "brand_slug": "string",
    "created_at": "ISO8601",
    "output_types_selected": ["brand-book"],        // 用户轻选，可改，定框架关口锁定
    "intake_sufficiency": 0.0                        // 0-10，<7 不得进入生成
  },
  "strategic_spine": {                               // Phase B 锁定，全局唯一主线
    "positioning_statement": "string",
    "mission": "string",
    "vision": "string",
    "proposition": "string",
    "chosen_direction_id": "string",                // 三方向里创始人选的那个
    "locked": false,
    "locked_at": "ISO8601|null"
  },
  "tonality": {
    "keywords": ["克制", "温暖"],
    "reference_brands": ["观夏", "..."],
    "source": "qa | upload",                         // 默认 qa（问答调性），upload 可选覆盖
    "palette": { "primary": "#...", "secondary": "#...", "accent": "#...", "text": "#..." }
  },
  "modules": [
    {
      "id": "positioning",
      "kind": "positioning | proposition | slogan | mission | vision | values | story | selling-points | core-values | trust-system | personality | risk-check | founder-fit | research-note | audience-profile | differentiation",
      "visibility": "external | internal",          // 对外 / 对内 —— 硬约束
      "content": { /* 结构化结论，按 kind 定形 */ },
      "evidence_refs": ["ind-01", "comp-05"],        // 指向 analysis-cards / sources
      "depth_level": "L1 | L2 | L3 | L4",            // 仅 L3/L4 合格
      "spine_alignment": "string"                    // 本模块如何回扣 strategic_spine（coherence 检查）
    }
  ]
}
```

### 1.2 可见性默认分类（SEED — Codex 清洗的真实案例到位后校准）

| visibility | 模块 kind |
|---|---|
| **对外 external** | positioning / proposition / slogan / mission / vision / values / story / selling-points / core-values / trust-system / audience-profile(对外简版) / differentiation |
| **对内 internal** | personality(原型) / risk-check(诚实体检) / founder-fit / research-note(调研底稿) / 竞品深扒细节 |

> **硬规则**：对外成品（手册/独立站）**只**渲染 `visibility=external` 的模块。对内模块只用于驱动生成 + 内部视图，**绝不混入对外展示**。

### 1.3 输出转换器接口（pluggable）

```jsonc
OutputTransformer {
  "type": "brand-book | independent-site | economics | financing | visual",
  "visibility_filter": ["external"],                // 本输出渲染哪些可见性
  "module_allowlist": ["positioning", "mission", ...],
  "template": "templates/template-brand-book.html",
  "render(content: BrandSystemContent) -> artifact" // HTML 文档 / 站点 / 报告
}
```

MVP 实现 `brand-book`、`independent-site` 两个 transformer；`economics / financing / visual` 仅占接口位（未来）。

**Phase 0 交付物**：`core/content-model.mjs`（schema + 校验 + 构造器）、`core/output-registry.mjs`（transformer 注册表）、`schemas/brand-system-content.schema.json`、对应 `test-*.mjs`。

---

## 2. 七阶段流水线（映射真实引擎：复用/改造/新建）

| # | 阶段 | 复用/改造/新建 | 关键模块 | 借鉴来源 |
|---|---|---|---|---|
| ① | 榨需求 intake | 🆕 新建 | `scripts/intake-strategist.mjs` | brand-strategy-guide 交互 + 资料3 三层 + 资料1 充分度门 |
| ② | 调研补料 | ♻️ 直接复用 | `research-worker.mjs`(gatherResearchDeep) | 自有（已 85%） |
| ③ | 定框架 + 锁输出类型 | 🔧 改造 | `detect-proposal-type.mjs` / `case-logic.mjs` + 新 `brand_book` 类型 | 自有雏形 |
| ④ | 战略推导 + 创始人拍板 | 🆕 新建 | `scripts/strategy-decider.mjs` | 资料1 决策点+一致性 / 资料3 洞察=张力 |
| ⑤ | 生成内容 | 🔧 改造 | `draft-chapter.mjs` + 注入现成方法论 + 写入 content-model | 资料1 方法论库 |
| ⑥ | 多层质检 + 一致性门 | 🔧+🆕 | `critic-deck.mjs`(改) + `validators/coherence-validator.mjs`(新) | 资料1 L1-L4 + 可互换测试 |
| ⑦ | 品牌识别 + 渲染 | 🆕 新建 | `brand-profiler.mjs` + `renderers/render-brand-book.mjs` + `template-brand-book.html` | tonality 默认走 qa；whitepaper 五部分 |

**关键纠偏**：
- 战略三方向**由四维深调研（行业/竞品/消费者/自身）的 analysis-cards 推导**，不是 intake 拍脑袋。整条链路是问答式，战略只是研究收敛出的关键决策节点。
- tonality **默认源 = 问答里"你想参考哪些品牌（带示例）"**；上传网站/识别物为可选覆盖。
- 渲染**只出对外模块**；修复 whitepaper 把"排版备注"漏进页面的坑（页面内容 vs 制作备注严格分离）。

---

## 3. 五个新模块 · 文件级契约

### 3.1 `intake-strategist.mjs`（炸需求 · 灵魂模块）

**职责**：吃乱料多源（灵感/会议纪要/网站/文件/Brief）→ 渐进式对话 → 输出充分度≥7 的结构化 brief，喂下游。

**交互铁律（借 brand-strategy-guide，并修其"问题太多"）**：
- 一问 → 复述理解 → 给选项/示例 + 初步判断 → 再问（Expand-Confirm）。
- **侧面提问**：绝不直接问术语（"你的品牌主张是什么"），而问具体经历/场景，由系统翻译成品牌概念。
- 充分度门：7 维加权评分 ≥7 才放行，否则指出缺口退回追问。

**核心交付物：侧面提问映射表**（`assets/intake/question-map.json`）：
```jsonc
{
  "target_concept": "品牌主张",
  "oblique_prompt": "如果你的品牌明天消失，用户会失去什么？为什么得是你来填这个空？",
  "options_or_examples": ["...3-5 个降门槛的示例/选项..."],
  "follow_ups": ["具体到一个真实的人/一个真实的时刻"],
  "restate_template": "我理解你是说……对吗？",
  "maps_to_modules": ["proposition", "core-values"],
  "simplify_tag": "keep | mergeable | optional",
  "sufficiency_weight": 0.15
}
```
- 种子来自 brand-strategy-guide 的 22 轮（已拆解），**逐题标注 keep/mergeable/optional**，目标"问得更少、背景更足"。
- 同时产出 `output_types_selected`（轻选：手册/独立站/还不确定）。

**输出**：`inputs/{slug}/brief.json`（替代手填 form.json+summary.md）+ `intake-trace.json`。
**验收**：给只有模糊想法的人，把 22 问简化到 ~12 问内，产出充分度≥7 的 brief。

### 3.2 `strategy-decider.mjs`（战略主线锁）

**职责**：读 analysis-cards（四维）→ 生成 3 个战略方向（每个含 洞察=张力 + 生态位依据）→ 创始人选 1 → 写 `strategic_spine` 并 `locked=true`。
**输入**：`analysis-cards.json`、`brief.json`。**输出**：`strategy-directions.json` + 锁定后的 spine。
**验收**：3 方向各自可回溯到具体 analysis-card；创始人选定后 spine 不可被下游覆盖。

### 3.3 `validators/coherence-validator.mjs`（一致性门 · 新）

**职责**：deck/content 合并后、渲染前的**跨模块**硬门：
- 每个对外模块的结论是否回扣 `strategic_spine`（spine_alignment 非空且成立）？
- 跨模块假设冲突（如市场容量数字不一致）？
- 逐模块深度 ≥L3？**可互换测试**："换个品牌还成立 = 不合格"。
**失败必抛**，定位到违规模块。**验收**：能复现并拦截"第15页与第14页重复""跨页承接错误"这类 critic 历史失败。

### 3.4 `brand-profiler.mjs`（品牌识别）

**职责**：产出 `tonality.palette`。默认源 = intake 的调性问答（关键词 + 参考品牌）→ 生成主/辅/强调/文本色板；`upload`（网站/logo）为可选覆盖（可用 vision 提色）。
**验收**：无任何上传时，仅凭问答调性也能产出一套自洽色板，注入渲染。

### 3.5 `renderers/render-brand-book.mjs` + `templates/template-brand-book.html`

**职责**：把 `BrandSystemContent` 的**对外模块**渲染成可滚动 HTML 文档（非翻页 deck），含 TOC、章节、注入品牌色、打印友好。
**模板来源**：Codex 清洗的真实案例范式（不是 whitepaper）。结构种子参考 whitepaper 五部分：我是谁 / 我服务谁 / 我有什么不同 / 我为什么值得相信 / 我怎么对外表达。
**必修坑**：页面内容 vs 制作备注分离，备注绝不渲染进成品。复用 `freeform-renderer` 块渲染 + `deck-design-system/anti-ai-slop` 视觉门。
**验收**：拿一份现有内容 → 干净、无备注泄漏、过视觉审计的滚动手册。

> 未来：`render-independent-site.mjs`（Phase D）、`economics-analyzer.mjs`（Phase E，借 small-business 单位经济 + founder-fit + 暗知识）。

---

## 4. 真实案例如何接入（与 Codex 清洗并行，不阻塞）

Codex 正在拆逻辑/清洗真实品牌手册。产物预期含：① 标准手册章节范式 ② 各章对内/对外归属 ③ 语气/深度范例。接入点：
- → **Phase 0**：校准 `modules.kind` 全集 + §1.2 对内/对外默认表。
- → **Phase A**：作为 `template-brand-book.html` 的结构基准 + 80 分验收基准。
- 在案例就位前，先用 §1.2 SEED 表推进 Phase 0/A 骨架；案例到位后做一次"校准提交"。**不阻塞写计划与起步。**

---

## 5. 外部资料借鉴总表（设计阶段显式标注）

| 部件 | 借鉴 | 借的是什么 |
|---|---|---|
| intake 侧面提问 + 选项/示例 + 一问一复述 | brand-strategy-guide | 交互范式（你试用最认可） |
| 三层拆 brief（表层/里层/隐性） | 资料3 | 拆需求 |
| 充分度门≥7 | 资料1 | Layer0 输入门 |
| 研究扇出（已自有更强） | 资料2 思想 | 子任务分工 + 渐进披露 |
| 战略主线锁 + 一致性铁律 + L1-L4 + 可互换测试 | 资料1 | 质量引擎 |
| 洞察=张力（三方向必须让策略转弯） | 资料3 | 战略推导判据 |
| 诚实体检（对内）= 定位是否成立/假设/风险 | 资料4 | founder-fit/暗知识/"不拿大盘当个体证据" |
| tonality 问答驱动视觉延续 | brand-strategy-guide | 调性题 + 参考品牌示例 |
| 结论导向白皮书 ≠ 推导提案 | Seven 咨询洞察 | 成品定性 |

---

## 6. 开发路线图（按 价值 + 防返工 排序）

> 下一步立即做的是 **Phase 0 → Phase A**，任务已细化；B–E 待 writing-plans 进一步拆。

### Phase 0 · 内容数据模型（地基，最先）
- [ ] `core/content-model.mjs` + `schemas/brand-system-content.schema.json`（含 visibility）
- [ ] `core/output-registry.mjs`（transformer 接口 + 注册）
- [ ] §1.2 对内/对外 SEED 表落为配置 `assets/content/visibility-map.json`
- [ ] `test-content-model.mjs`（离线门）
- **验收**：能构造/校验一份 BrandSystemContent；可见性过滤函数对"人格/风险"返回 internal。

### Phase A · 出口先打通（最可见、低风险）
- [ ] `renderers/render-brand-book.mjs` + `templates/template-brand-book.html`
- [ ] 修"排版备注漏出"——页面内容/制作备注分离
- [ ] 接 `output-registry`：brand-book transformer（visibility_filter=external）
- [ ] `test-render-brand-book.mjs`
- **验收**：现有内容 → 干净滚动手册，无备注泄漏，过 `audit_visual.py`。

### Phase B · 战略主线锁 + 一致性门
- [ ] `strategy-decider.mjs`（插在 analysis 与 outline 之间）+ test
- [ ] `validators/coherence-validator.mjs`（渲染前硬门）+ test
- [ ] 接入 `fullcase-pipeline.mjs`：analysis → strategy-decider(锁spine) → outline/draft → coherence-gate
- **验收**：luma fixture critic 从 revise→pass，无重复页/跨页承接错误。

### Phase C · 榨需求 intake（最大新工程）
- [ ] `assets/intake/question-map.json`（侧面提问映射表，含 keep/mergeable/optional）
- [ ] `intake-strategist.mjs`（渐进对话 + 充分度门 + 轻选输出类型 + 乱料 ingest）+ test
- [ ] 复用 p9 web-shell 当对话壳；输出 `brief.json`
- **验收**：模糊想法者 ~12 问内得 brief（充分度≥7）→ 喂 B/A 出成品。

### Phase D · 品牌识别 + 独立站第二出口
- [ ] `brand-profiler.mjs`（默认 qa 调性 → 色板；upload 可选）+ test
- [ ] `renderers/render-independent-site.mjs` + transformer + test
- **验收**：同一份锁定内容 → 手册 + 独立站，品牌色自动注入。

### Phase E（post-MVP）· 类型路由扩展
- [ ] 扩 `case-logic` 加 store / small-biz 类型 + 输出契约
- [ ] `economics-analyzer.mjs`（单位经济/盈亏，借 small-business）

---

## 7. 风险与边界

- **红线**：所有失败必抛，不静默 fallback（沿用现有纪律）。
- **provider 不稳**：真实 LLM 跑前用 `env -u ANTHROPIC_API_KEY -u ANTHROPIC_BASE_URL ... -r dotenv/config`（既往 .env 第三方代理坑）；离线门先全过。
- **critic 现状**：06-14 handoff 记录 critic/visual/render 仍有 fail；Phase A/B 正面解决其中的备注泄漏、重复页、跨页承接、多强调色/渐变。
- **案例依赖**：Phase 0/A 用 SEED 起步，案例到位后做"校准提交"，不阻塞。

---

## 8. 评审与下一步

本 spec 待 Seven 评审。确认后用 writing-plans 把 **Phase 0 + Phase A** 细拆为可执行的逐文件实施计划（接口签名、测试用例、提交边界），交 Codex 执行；Claude 跑独立 CP 评审。
