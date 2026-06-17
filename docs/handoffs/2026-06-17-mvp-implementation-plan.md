# 品牌中台引擎 MVP 实施计划（Phase 0→D）

> **For agentic workers（Codex）：** 本计划逐任务执行，按 Phase 顺序。每个 Task 用 `- [ ]` 勾选跟踪。先写测试 → 跑红 → 实现 → 跑绿 → commit。**红线：任何失败必抛，不静默 fallback。** 离线测试全过再跑真实 LLM（真实 LLM 用 `env -u ANTHROPIC_API_KEY -u ANTHROPIC_BASE_URL node -r dotenv/config ...` 规避 .env 第三方代理被遮蔽的坑）。

**Goal：** 把现有 skill 驱动 fullcase 引擎改造成"乱料 → 对话榨需求 → 四维调研 → 创始人锁战略主线 → 类型感知生成 → 一致性质检 → 渲染对外品牌手册（+独立站）"的流水线，产出结论导向、对内对外分明的品牌说明书。

**Architecture：** 方案 C——锁战略主线 + 章节契约 + 证据纪律，放开每章写法。单编排器状态机（复用 `core/runtime` run-state/event-ledger），最少 Agent（只研究扇出并行）。一个 `BrandSystemContent` 唯一真相源 + 每模块 `对内/对外` 标签 + 可插拔输出转换器（手册/独立站 MVP；测算/融资/视觉=未来插口）。

**Tech Stack：** Node.js ESM(.mjs, node>=18)、现有 `@anthropic-ai/sdk`/`openai`、Playwright（视觉体检）、Python3（既有质量门 `check_*.py`/`audit_visual.py`）。无新增重依赖。

**依据文档：**
- 设计 spec：`docs/handoffs/2026-06-17-brand-engine-redesign-spec.md`
- 清洗报告：`白皮书案例/品牌手册白皮书结构化清洗报告.md`（下称"清洗报告"）
- 现成 schema：`白皮书案例/brand_manual_whitepaper_schema.json`、`白皮书案例/brand_manual_case_extractions.json`

## Codex 开发前评审修订（2026-06-18）

- **首批进入开发的闭环缩到 Phase 0 + Phase A**：先落唯一内容模型、可见性过滤、输出注册表、类型感知品牌手册渲染，并跑通离线门；Phase B/C/D/集成保留在同一总体计划里，但等 Phase 0+A 绿灯后再接入现有 fullcase 流水线，避免一次性把 intake、战略锁、渲染出口和 CLI 全部揉在同一批结构调整里。
- **提交命令以真实 `git status` 为准**：本计划里的 `git commit -am ...` 只表达提交边界；新文件必须先显式 `git add <files>`，避免新建 schema/script/template 没进 commit。
- **`content-model` 遵守项目 immutability 规则**：`addModule` / `lockSpine` 这类 API 应返回更新后的新对象；测试样例使用 `c = addModule(c, ...)`。如为了旧脚本兼容临时支持原地写入，需在实现里明确隔离并后续移除。
- **不新增重依赖优先**：当前 `package.json` 没有 `ajv`；Phase 0 schema 校验先用轻量内置 validator 覆盖本 schema 所需的 required/enum/type/min/max/array/object 规则。只有当校验面显著扩大时再引入依赖并同步 `package-lock.json`。

---

## A. 报告校准（相对 spec 的关键修订）

1. **不用单一固定模板**：必须先判定**品牌类型（5 类）**再加权章节（报告 §0/§4/§11）。→ Phase A 新增 `detect-brand-type` + `brand-type-weights.json`，模板按权重选章。
2. **内容模型对齐报告 §8 `brand_manual` schema**：10 个一级模块 + `internal_only` + `classification`。→ Phase 0 直接采用，不另拍。
3. **对外/对内自动判定 = 报告 §5/§6/§7 规则**：一律对外 / 一律对内 / 需人工确认。→ Phase 0 `visibility-classifier` 落这套规则。
4. **人格的微妙之处（报告 §6.3）**：品牌人格"是什么"=对外；"怎么执行"（行为准则/话术边界/危机语气）=对内。→ `personality` 模块拆 `statement(对外)` + `playbook(对内)` 两层。
5. **intake 问卷种子 = 报告 §10**（必问 13 + 品类条件触发）+ brand-strategy-guide 22 轮（侧面提问）。→ Phase C `question-map.json`。

---

## B. 范围决策（请 Seven 过目，可否决）

- **MVP 对外手册覆盖**：清洗报告 §3.1 的模块 **1–7 + 10**（品牌入口/背景市场/定义/人群场景/战略核心/叙事系统/产品体系/证明收束）+ **视觉方向 lite**（色彩+字体+符号概念，**文字描述级**，由 tonality 推导）。
- **MVP 暂不做**：报告 §3.1 模块 8（完整 VI：logo/超级符号/辅助图形实物）和模块 9（应用传播实物：包装/门店/物料）的**视觉生成**——这些需要设计资产/生图模型，属未来"视觉插口"。MVP 只产出它们的**策略级文字方向**，不产实物图。
- **默认版本**：先做"最小可用版"（报告 §3.2，~13 章），类型加权后裁剪；"完整版"（§3.3）走同一引擎、后续放开页数。
- **理由**：小白创始人没有现成 VI/经营数据，引擎此刻只能从 intake+research 产出"战略+叙事+产品+调性方向"，这正是 80 分手册的核心；实物视觉留给生图插口（Phase E 之后）。

---

## C. 文件分解（先锁边界，再拆任务）

### Phase 0 · 内容数据模型（地基）
| 文件 | 职责 |
|---|---|
| `schemas/brand-system-content.schema.json`（新） | 唯一真相源 JSON Schema，对齐清洗报告 §8 + 加 `visibility/depth_level/spine_alignment/evidence_refs` |
| `core/content-model.mjs`（新） | 构造/校验/读写 `BrandSystemContent`；模块增删查；可见性过滤 |
| `assets/content/visibility-map.json`（新） | 模块 kind → 默认 visibility（external/internal/review），含人格双层 |
| `core/visibility-classifier.mjs`（新） | 落地报告 §7 规则：一律对外/一律对内/需人工确认 |
| `core/output-registry.mjs`（新） | OutputTransformer 接口 + 注册表 + 按 visibility/allowlist 过滤 |
| `scripts/test-content-model.mjs` / `test-visibility-classifier.mjs` / `test-output-registry.mjs`（新） | 离线门 |

### Phase A · 类型感知品牌手册渲染（出口）
| 文件 | 职责 |
|---|---|
| `assets/content/brand-type-weights.json`（新） | 5 品牌类型 → 章节权重/裁剪（报告 §4.2 + §3.2/§3.3） |
| `scripts/detect-brand-type.mjs`（新） | 由 6 输入维度（报告 §4.1）判定品牌类型 → 类型 + 权重 |
| `scripts/renderers/render-brand-book.mjs`（新） | 取对外模块 → 按类型权重选章 → 注入 palette → 可滚动 HTML；**修"制作备注漏出"** |
| `templates/template-brand-book.html`（新） | 滚动文档模板：TOC、章节、CSS 变量色板、打印友好、无外链 |
| `core/output-registry.mjs`（改） | 注册 brand-book transformer |
| `scripts/test-detect-brand-type.mjs` / `test-render-brand-book.mjs`（新） | 离线门 |

### Phase B · 战略主线锁 + 一致性门
| 文件 | 职责 |
|---|---|
| `scripts/strategy-decider.mjs`（新） | analysis-cards → 3 战略方向（洞察=张力）→ 创始人选 → 锁 spine |
| `validators/coherence-validator.mjs`（新） | 跨模块主线对齐 + 假设冲突 + L3 深度 + 可互换测试；失败必抛 |
| `scripts/fullcase-pipeline.mjs`（改） | 插入 strategy-decider（analysis 后 / outline 前）+ coherence-gate（render 前）；spine 注入 draft |
| `scripts/test-strategy-decider.mjs` / `test-coherence-validator.mjs`（新） | 离线门 |

### Phase C · 榨需求 intake（侧面提问）
| 文件 | 职责 |
|---|---|
| `assets/intake/question-map.json`（新） | 侧面提问表：概念→侧面问法+选项/示例+简化标注（种子=报告 §10 + 22 轮） |
| `scripts/ingest-sources.mjs`（新） | 多源乱料（文本/纪要/网站/文件）→ 归一 pre-brief |
| `scripts/intake-strategist.mjs`（新） | 渐进对话（一问→复述→选项+初判）+ 表层/里层/隐性 + 充分度门≥7 + 轻选输出类型 → `brief.json` |
| `scripts/test-ingest-sources.mjs` / `test-intake-strategist.mjs`（新） | 离线门 |

### Phase D · 品牌识别 + 独立站第二出口
| 文件 | 职责 |
|---|---|
| `scripts/brand-profiler.mjs`（新） | tonality(qa 默认)→palette；upload(网站/logo) 可选覆盖（vision 提色） |
| `scripts/renderers/render-independent-site.mjs`（新） | 对外模块 → 单页独立站，tonality 驱动 |
| `templates/template-independent-site.html`（新） | 独立站模板（hero/section/CTA，CSS 变量色板） |
| `core/output-registry.mjs`（改） | 注册 independent-site transformer |
| `scripts/test-brand-profiler.mjs` / `test-render-independent-site.mjs`（新） | 离线门 |

### 集成
| 文件 | 职责 |
|---|---|
| `scripts/gen-fullcase-cli.mjs`（改） | 串联 intake→research→analysis→strategy-decider→outline/draft→coherence→brand-profiler→render；新 `--mode=brand-book` |
| `package.json`（改） | 加 `brandbook:gen`、`test:mvp`（批量跑 test-*.mjs） |

---

## Phase 0 · 内容数据模型

### Task 0.1：BrandSystemContent JSON Schema
**Files:** Create `schemas/brand-system-content.schema.json`

- [ ] **Step 1 写 schema（对齐清洗报告 §8 + 扩展字段）**

顶层对象 `BrandSystemContent`，`required: ["meta","strategic_spine","tonality","modules"]`：
```jsonc
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["meta", "strategic_spine", "tonality", "modules"],
  "properties": {
    "meta": { "type": "object", "required": ["brand_slug","output_types_selected","intake_sufficiency","brand_type"],
      "properties": {
        "brand_slug": {"type":"string"},
        "document_type": {"enum":["brand_manual","whitepaper","investment_brand_book","internal_brand_playbook"]},
        "brand_type": {"enum":["strategy_charter","new_consumer_full","brand_asset_story","lifestyle_ops","worldview_visual"]},
        "audience": {"type":"array","items":{"enum":["consumer","partner","media","franchisee","internal_team","investor"]}},
        "output_types_selected": {"type":"array","items":{"enum":["brand-book","independent-site"]}},
        "intake_sufficiency": {"type":"number","minimum":0,"maximum":10}
      }},
    "strategic_spine": {"type":"object","required":["positioning_statement","mission","vision","proposition","locked"],
      "properties":{"positioning_statement":{"type":"string"},"mission":{"type":"string"},"vision":{"type":"string"},
        "proposition":{"type":"string"},"chosen_direction_id":{"type":["string","null"]},
        "locked":{"type":"boolean"},"locked_at":{"type":["string","null"]}}},
    "tonality": {"type":"object","required":["keywords","source"],
      "properties":{"keywords":{"type":"array","items":{"type":"string"}},
        "reference_brands":{"type":"array","items":{"type":"string"}},
        "source":{"enum":["qa","upload"]},
        "palette":{"type":"object","properties":{"primary":{"type":"string"},"secondary":{"type":"string"},"accent":{"type":"string"},"text":{"type":"string"},"bg":{"type":"string"}}}}},
    "modules": {"type":"array","items":{"type":"object",
      "required":["id","kind","visibility","content"],
      "properties":{
        "id":{"type":"string"},
        "kind":{"enum":["brand_entry","market_context","brand_definition","audience_scenarios","strategy_core","narrative_system","product_system","visual_direction","proof_growth","personality_statement","personality_playbook","risk_check","founder_fit","research_note"]},
        "visibility":{"enum":["external","internal","review"]},
        "content":{"type":"object"},
        "evidence_refs":{"type":"array","items":{"type":"string"}},
        "depth_level":{"enum":["L1","L2","L3","L4"]},
        "spine_alignment":{"type":"string"}
      }}}
  }
}
```

- [ ] **Step 2 commit** `git add schemas/brand-system-content.schema.json && git commit -m "feat(phase0): brand-system-content json schema"`

### Task 0.2：content-model.mjs（构造/校验/过滤）
**Files:** Create `core/content-model.mjs`；Test `scripts/test-content-model.mjs`

- [ ] **Step 1 写失败测试** `scripts/test-content-model.mjs`：
```js
import assert from 'node:assert'
import { createBrandContent, validateBrandContent, addModule, externalModules, internalModules } from '../core/content-model.mjs'

let c = createBrandContent({ brand_slug: 'demo', brand_type: 'new_consumer_full' })
assert.equal(c.strategic_spine.locked, false)
assert.deepEqual(c.meta.output_types_selected, [])

c = addModule(c, { id:'pos-1', kind:'brand_definition', visibility:'external', content:{positioning:'x'}, depth_level:'L3' })
c = addModule(c, { id:'risk-1', kind:'risk_check', visibility:'internal', content:{risks:[]}, depth_level:'L3' })
assert.equal(externalModules(c).length, 1)
assert.equal(internalModules(c).length, 1)

// schema 校验：缺 required 必抛
assert.throws(() => validateBrandContent({ meta:{} }), /required|invalid/i)
const ok = validateBrandContent(c); assert.equal(ok.valid, true)
console.log('PASS test-content-model')
```
- [ ] **Step 2 跑红** `node scripts/test-content-model.mjs` → 期望报 `createBrandContent is not a function` 类错误。
- [ ] **Step 3 实现 `core/content-model.mjs`（接口契约）**：
  - `createBrandContent({brand_slug, brand_type, document_type='brand_manual'})` → 返回符合 schema 的空壳（spine.locked=false，modules=[]，tonality.source='qa'）。
  - `validateBrandContent(obj)` → 用 `schemas/brand-system-content.schema.json` 做 draft-07 校验；返回 `{valid, errors}`；**对完全非法对象（如缺 meta）抛错**。校验器可用轻量内置实现或 ajv（若引入 ajv 写进 package.json deps）。
  - `addModule(content, module)` → 返回带新增 module 的新 content；写入前校验 `kind/visibility` 合法，重复 id 抛错。
  - `externalModules(content)` / `internalModules(content)` → 按 `visibility` 过滤（`review` 不计入 external）。
  - `lockSpine(content, {chosen_direction_id})` / `readContent(path)` / `writeContent(path, content)`。
- [ ] **Step 4 跑绿** `node scripts/test-content-model.mjs` → `PASS`。
- [ ] **Step 5 commit** `git commit -am "feat(phase0): content-model构造/校验/可见性过滤"`

### Task 0.3：visibility-map.json + visibility-classifier.mjs（报告 §5/6/7）
**Files:** Create `assets/content/visibility-map.json`、`core/visibility-classifier.mjs`；Test `scripts/test-visibility-classifier.mjs`

- [ ] **Step 1 写 visibility-map.json**（模块 kind → 默认 visibility）：
```jsonc
{
  "brand_entry":"external","market_context":"external","brand_definition":"external",
  "audience_scenarios":"external","strategy_core":"external","narrative_system":"external",
  "product_system":"external","visual_direction":"external","proof_growth":"external",
  "personality_statement":"external","personality_playbook":"internal",
  "risk_check":"internal","founder_fit":"internal","research_note":"internal"
}
```
- [ ] **Step 2 写失败测试** `scripts/test-visibility-classifier.mjs`：
```js
import assert from 'node:assert'
import { classifyVisibility } from '../core/visibility-classifier.mjs'
// 一律对内：出现未公开财务/单店模型/底价/KPI/未发布战略/竞品攻击
assert.equal(classifyVisibility({kind:'risk_check', text:'单店回本测算 毛利 35%'}).visibility, 'internal')
assert.equal(classifyVisibility({kind:'strategy_core', text:'品牌使命：让每个人都能…'}).visibility, 'external')
// 需人工确认：行业第一/最大/领先 无证据；功效/投资回报
assert.equal(classifyVisibility({kind:'proof_growth', text:'行业第一 领先'}).visibility, 'review')
// 人格双层
assert.equal(classifyVisibility({kind:'personality_statement', text:'有责任感的创新者'}).visibility, 'external')
assert.equal(classifyVisibility({kind:'personality_playbook', text:'客服话术：不可说…'}).visibility, 'internal')
console.log('PASS test-visibility-classifier')
```
- [ ] **Step 3 跑红 → 实现** `core/visibility-classifier.mjs`：
  - `classifyVisibility({kind, text})` → 先取 `visibility-map.json` 默认；再用报告 §7 关键词规则覆盖：
    - 一律对内命中词：`营收|利润|毛利|成本|现金流|单店|回本|测算|底价|返点|KPI|薪酬|绩效|未发布|风险清单|竞品弱点` → `internal`。
    - 需人工确认命中词：`行业第一|最大|领先|功效|投资回报|加盟收益|名人|授权|用户数据|隐私`（且无 evidence_refs）→ `review`。
    - 否则取默认（多为 external）。
  - 返回 `{visibility, reason, matched_rule}`。
- [ ] **Step 4 跑绿 + commit** `git commit -am "feat(phase0): 对外/对内自动判定（报告§5-7）"`

### Task 0.4：output-registry.mjs（可插拔输出接口）
**Files:** Create `core/output-registry.mjs`；Test `scripts/test-output-registry.mjs`

- [ ] **Step 1 写失败测试**：
```js
import assert from 'node:assert'
import { registerTransformer, getTransformer, listTransformers, filterForOutput } from '../core/output-registry.mjs'
import { createBrandContent, addModule } from '../core/content-model.mjs'
registerTransformer({ type:'brand-book', visibility_filter:['external'], module_allowlist:['brand_definition','strategy_core'], render: c => ({ html:`<n>${filterForOutput(c,'brand-book').length}</n>` }) })
let c = createBrandContent({brand_slug:'d', brand_type:'strategy_charter'})
c = addModule(c,{id:'a',kind:'brand_definition',visibility:'external',content:{}})
c = addModule(c,{id:'b',kind:'risk_check',visibility:'internal',content:{}})
assert.equal(filterForOutput(c,'brand-book').length, 1)            // 只过对外+allowlist
assert.ok(listTransformers().includes('brand-book'))
assert.equal(getTransformer('brand-book').render(c).html, '<n>1</n>')
assert.throws(()=>getTransformer('nope'), /unknown transformer/i) // 未知必抛
console.log('PASS test-output-registry')
```
- [ ] **Step 2 跑红 → 实现**：
  - `registerTransformer({type, visibility_filter, module_allowlist, render})`；重复 type 抛错。
  - `getTransformer(type)`：未知抛 `unknown transformer`。
  - `listTransformers()` / `filterForOutput(content, type)`（按 transformer 的 visibility_filter ∩ module_allowlist 过滤模块）。
- [ ] **Step 3 跑绿 + commit** `git commit -am "feat(phase0): 可插拔输出转换器注册表"`

> **Phase 0 验收**：`node scripts/test-content-model.mjs && node scripts/test-visibility-classifier.mjs && node scripts/test-output-registry.mjs` 全 PASS；构造一份内容，`risk_check/personality_playbook` 判为 internal，`personality_statement` 判 external。

---

## Phase A · 类型感知品牌手册渲染

### Task A.1：brand-type-weights.json（5 类型→章节权重）
**Files:** Create `assets/content/brand-type-weights.json`

- [ ] **Step 1 写权重表**（报告 §4.2 + §3.2/§3.3；weight: 0=不出, 1=简, 2=标准, 3=重点）：
```jsonc
{
  "strategy_charter":   {"brand_entry":2,"market_context":1,"brand_definition":3,"audience_scenarios":2,"strategy_core":3,"narrative_system":2,"product_system":1,"visual_direction":1,"proof_growth":1},
  "new_consumer_full":  {"brand_entry":2,"market_context":3,"brand_definition":2,"audience_scenarios":3,"strategy_core":2,"narrative_system":2,"product_system":3,"visual_direction":2,"proof_growth":2},
  "brand_asset_story":  {"brand_entry":2,"market_context":1,"brand_definition":2,"audience_scenarios":2,"strategy_core":1,"narrative_system":3,"product_system":3,"visual_direction":2,"proof_growth":3},
  "lifestyle_ops":      {"brand_entry":2,"market_context":2,"brand_definition":2,"audience_scenarios":3,"strategy_core":3,"narrative_system":2,"product_system":1,"visual_direction":1,"proof_growth":3},
  "worldview_visual":   {"brand_entry":2,"market_context":1,"brand_definition":3,"audience_scenarios":3,"strategy_core":2,"narrative_system":3,"product_system":2,"visual_direction":3,"proof_growth":1}
}
```
- [ ] **Step 2 commit** `git commit -am "feat(phaseA): 品牌类型章节权重表（报告§4.2）"`

### Task A.2：detect-brand-type.mjs
**Files:** Create `scripts/detect-brand-type.mjs`；Test `scripts/test-detect-brand-type.mjs`

- [ ] **Step 1 写失败测试**（输入 6 维 → 类型）：
```js
import assert from 'node:assert'
import { detectBrandType, chapterWeights } from '../scripts/detect-brand-type.mjs'
// B2B/技术 → strategy_charter
assert.equal(detectBrandType({ category:'tech_b2b', stage:'new', delivery_goal:'external_intro', has_visual:false, has_ops_data:false }).brand_type, 'strategy_charter')
// 新消费饮品 → new_consumer_full
assert.equal(detectBrandType({ category:'fnb', stage:'new', delivery_goal:'channel', has_visual:true, has_ops_data:false }).brand_type, 'new_consumer_full')
// 成熟消费品牌资产 → brand_asset_story
assert.equal(detectBrandType({ category:'consumer', stage:'mature', delivery_goal:'asset', has_visual:true, has_ops_data:true }).brand_type, 'brand_asset_story')
const w = chapterWeights('lifestyle_ops'); assert.equal(w.proof_growth, 3)
console.log('PASS test-detect-brand-type')
```
- [ ] **Step 2 跑红 → 实现** `detect-brand-type.mjs`：
  - `detectBrandType({category, stage, delivery_goal, has_visual, has_ops_data, audience})` → 规则优先（报告 §4.1/§4.2 映射）：`tech_b2b`→strategy_charter；`fnb`→new_consumer_full；`lifestyle/travel`→lifestyle_ops；`fashion/youth`→worldview_visual；`consumer & stage=mature`→brand_asset_story；兜底 new_consumer_full。可选：含 `callModel` 时用 LLM 复核，但规则为主、**LLM 不可推翻明确规则**。
  - `chapterWeights(brand_type)` → 读 `brand-type-weights.json`。
- [ ] **Step 3 跑绿 + commit** `git commit -am "feat(phaseA): 品牌类型判定+章节权重"`

### Task A.3：template-brand-book.html（滚动文档模板）
**Files:** Create `templates/template-brand-book.html`

- [ ] **Step 1 写模板**（单文件、无外链、CSS 变量色板、TOC、打印友好）：
  - `:root` 暴露 `--primary/--secondary/--accent/--text/--bg`（由渲染器注入）。
  - 结构：`<header class="cover">`（品牌名+一句话定位）、`<nav class="toc">`（章节锚点）、`<main>` 内多个 `<section class="chapter" id="...">`、`<footer>`。
  - `@media print` 隐藏 toc 浮动、保证分页。
  - **占位记号**：渲染器用 `{{COVER}} {{TOC}} {{CHAPTERS}} {{PALETTE_VARS}}` 注入；模板自身不含任何"排版备注/制作备注"字样。
- [ ] **Step 2 commit** `git commit -am "feat(phaseA): 品牌手册滚动文档模板"`

### Task A.4：render-brand-book.mjs（**含修"备注漏出"**）
**Files:** Create `scripts/renderers/render-brand-book.mjs`；Test `scripts/test-render-brand-book.mjs`

- [ ] **Step 1 写失败测试**（关键：只出对外、注色板、**无备注泄漏**、按权重裁章）：
```js
import assert from 'node:assert'
import { renderBrandBook } from '../scripts/renderers/render-brand-book.mjs'
import { createBrandContent, addModule } from '../core/content-model.mjs'
let c = createBrandContent({ brand_slug:'demo', brand_type:'strategy_charter' })
c.tonality.palette = { primary:'#1a3c34', secondary:'#cfe3da', accent:'#e08a2c', text:'#1c1c1c', bg:'#faf8f4' }
c = addModule(c,{id:'def',kind:'brand_definition',visibility:'external',depth_level:'L3',
  content:{ title:'品牌定位', body:'为独立咖啡馆提供…', production_note:'左图右文，配竞品对比' }})
c = addModule(c,{id:'risk',kind:'risk_check',visibility:'internal',depth_level:'L3',content:{title:'风险',body:'定位假设未验证'}})
const { html } = renderBrandBook(c)
assert.ok(html.includes('品牌定位'))                 // 对外模块在
assert.ok(!html.includes('风险'))                    // 对内模块不在
assert.ok(!html.includes('production_note') && !html.includes('左图右文') && !html.includes('制作备注') && !html.includes('排版备注')) // 备注绝不泄漏
assert.ok(html.includes('#1a3c34'))                  // 色板注入
assert.ok(/<section class="chapter"/.test(html))
console.log('PASS test-render-brand-book')
```
- [ ] **Step 2 跑红 → 实现** `render-brand-book.mjs`：
  - `renderBrandBook(content, {template='templates/template-brand-book.html'})`：
    1. `mods = filterForOutput(content,'brand-book')`（只对外）。
    2. 按 `chapterWeights(content.meta.brand_type)`：weight=0 跳过、1 取精简字段、2/3 全展开，并按 §9.1 顺序排章。
    3. 渲染每模块时**只读白名单字段**（如 `title/body/points/...`），**显式剔除 `production_note`、`*_note`、`layout_*` 等制作字段**（这是"备注漏出"根因——whitepaper 把 MD-brief 的备注键直接渲染了）。
    4. 注入 `PALETTE_VARS`（由 `content.tonality.palette`）、`COVER`、`TOC`、`CHAPTERS` 到模板。
  - 返回 `{html, chapters_rendered}`；**无对外模块时抛错**（不产空壳）。
- [ ] **Step 3 跑绿** `node scripts/test-render-brand-book.mjs` → PASS。
- [ ] **Step 4 注册 transformer**（改 `core/output-registry.mjs` 启动注册或在 CLI 注册）：`registerTransformer({type:'brand-book', visibility_filter:['external'], module_allowlist:<全部对外kind>, render: renderBrandBook})`。
- [ ] **Step 5 commit** `git commit -am "feat(phaseA): 类型感知品牌手册渲染+修备注泄漏"`

> **Phase A 验收**：构造含对外+对内模块的内容 → `renderBrandBook` 出 HTML：对外在、对内不在、备注零泄漏、色板注入、章节按类型权重。可选 Playwright `page-inspect` 0 越界。

---

## Phase B · 战略主线锁 + 一致性门

### Task B.1：strategy-decider.mjs（3 方向→创始人选→锁 spine）
**Files:** Create `scripts/strategy-decider.mjs`；Test `scripts/test-strategy-decider.mjs`

- [ ] **Step 1 写失败测试**（用 stub callModel，验证契约与锁定）：
```js
import assert from 'node:assert'
import { deriveStrategyDirections, lockChosenDirection } from '../scripts/strategy-decider.mjs'
import { createBrandContent } from '../core/content-model.mjs'

const analysisCards = { byType:{
  industry:{cards:[{id:'ind-1',claim:'品类增速30%',source_tier:'T2'}]},
  competitor:{cards:[{id:'comp-1',claim:'头部主打便捷，无人做品质',source_tier:'T2'}]},
  user:{cards:[{id:'usr-1',claim:'用户为品质愿付溢价',source_tier:'T1'}]},
  self:{cards:[{id:'self-1',claim:'自有DTC运营',source_tier:'T1'}]} }}
// stub：返回 3 个方向的 JSON
const callModel = async () => JSON.stringify({ directions:[
  {id:'d1',positioning:'品质便捷',tension:'用户要品质但市场只给便捷',mission:'m1',vision:'v1',proposition:'p1',evidence_refs:['comp-1','usr-1']},
  {id:'d2',positioning:'社群品牌',tension:'…',mission:'m2',vision:'v2',proposition:'p2',evidence_refs:['usr-1']},
  {id:'d3',positioning:'性价比',tension:'…',mission:'m3',vision:'v3',proposition:'p3',evidence_refs:['ind-1']} ]})

const { directions } = await deriveStrategyDirections({ analysisCards, brief:{}, callModel })
assert.equal(directions.length, 3)
assert.ok(directions[0].tension && directions[0].evidence_refs.length >= 1)  // 洞察=张力 + 证据回溯

const c = createBrandContent({ brand_slug:'d', brand_type:'new_consumer_full' })
lockChosenDirection(c, directions, 'd1')
assert.equal(c.strategic_spine.locked, true)
assert.equal(c.strategic_spine.chosen_direction_id, 'd1')
assert.equal(c.strategic_spine.positioning_statement, '品质便捷')
assert.throws(()=>lockChosenDirection(c, directions, 'd2'), /already locked/i)  // 锁后不可改
console.log('PASS test-strategy-decider')
```
- [ ] **Step 2 跑红 → 实现** `scripts/strategy-decider.mjs`：
  - `deriveStrategyDirections({analysisCards, brief, callModel})`：构造 prompt——喂四维 analysis-cards，要求**恰好 3 个方向**，每个含 `positioning/mission/vision/proposition/tension/evidence_refs/niche_basis`；**硬约束**：`tension` 必须"让策略转弯"（资料3 洞察=张力）、`evidence_refs` 必须引用真实 card id（否则该方向作废重生）。解析 JSON；少于 3 个或缺字段抛错。
  - `lockChosenDirection(content, directions, chosen_id)`：找到方向→写入 `strategic_spine`（positioning/mission/vision/proposition）→ `locked=true, locked_at=now, chosen_direction_id`；**已 locked 再调抛 `already locked`**。
- [ ] **Step 3 跑绿 + commit** `git commit -am "feat(phaseB): 战略三方向推导+主线锁定"`

### Task B.2：coherence-validator.mjs（一致性硬门，失败必抛）
**Files:** Create `validators/coherence-validator.mjs`；Test `scripts/test-coherence-validator.mjs`

- [ ] **Step 1 写失败测试**：
```js
import assert from 'node:assert'
import { validateCoherence, assertCoherence } from '../validators/coherence-validator.mjs'
import { createBrandContent, addModule, lockSpine } from '../core/content-model.mjs'

let c = createBrandContent({ brand_slug:'d', brand_type:'new_consumer_full' })
c.strategic_spine = { positioning_statement:'品质便捷', mission:'m', vision:'v', proposition:'p', locked:true, locked_at:'now', chosen_direction_id:'d1' }
// 对齐主线的对外模块（spine_alignment 非空 + 含主线锚词"品质"）
c = addModule(c,{id:'m1',kind:'product_system',visibility:'external',depth_level:'L4',content:{body:'围绕品质做爆品'},spine_alignment:'承接品质便捷定位'})
let r = validateCoherence(c); assert.equal(r.ok, true)

// 注入一个断层模块：与主线无关、无 spine_alignment、深度 L1
c = addModule(c,{id:'m2',kind:'narrative_system',visibility:'external',depth_level:'L1',content:{body:'我们追求性价比和低价'},spine_alignment:''})
r = validateCoherence(c)
assert.equal(r.ok, false)
assert.ok(r.violations.some(v=>v.id==='m2' && /spine_alignment|深度|可互换/.test(v.reason)))
assert.throws(()=>assertCoherence(c), /coherence/i)  // 失败必抛
console.log('PASS test-coherence-validator')
```
- [ ] **Step 2 跑红 → 实现** `validators/coherence-validator.mjs`：
  - `validateCoherence(content)` → 遍历**对外模块**，逐项规则（离线可判定）：
    1. **主线对齐**：`spine_alignment` 非空，且模块文本含 `strategic_spine.positioning_statement` 的关键锚词（取定位语分词后的实词，命中≥1）。否则 violation `主线断层`。
    2. **深度**：关键 kind（brand_definition/strategy_core/product_system/narrative_system）`depth_level` ∈ {L3,L4}，否则 `深度不足`。
    3. **假设冲突**：收集模块内 `数字+单位` 声明，同一指标出现互斥数值 → `假设冲突`。
    4. **可互换测试**：模块文本若与主线锚词零交集且无品牌专属名词 → `可互换(换品牌也成立)`。
  - 返回 `{ok, violations:[{id, reason, rule}]}`。
  - `assertCoherence(content)`：`!ok` 抛 `coherence gate failed: <violations 摘要>`（红线，不静默）。
  - 可选 `deepCoherenceCheck(content, callModel)`：LLM 复核断层（仅在离线规则通过后加跑，不替代硬门）。
- [ ] **Step 3 跑绿 + commit** `git commit -am "feat(phaseB): 跨模块一致性硬门（失败必抛）"`

### Task B.3：接入 fullcase-pipeline.mjs
**Files:** Modify `scripts/fullcase-pipeline.mjs`

- [ ] **Step 1 写集成测试** `scripts/test-pipeline-spine-wiring.mjs`：用 stub callModel 跑 `runFullcasePipeline`，断言：(a) analysis 后、outline 前调用了 `deriveStrategyDirections` 且 `strategic_spine.locked===true`；(b) 渲染/合并前调用了 `assertCoherence`；(c) draft 的 prompt context 里包含 `strategic_spine.positioning_statement`。
- [ ] **Step 2 跑红 → 改 `fullcase-pipeline.mjs`**：
  - 在 `runAnalysisPass` 之后、`outline` 之前插入：`deriveStrategyDirections` → （CLI/web 决策关口选定，见集成节）→ `lockChosenDirection`，把 spine 写进 `BrandSystemContent` 与 run-state（新 event `strategy_locked`）。
  - 把 `strategic_spine` 注入 `buildOutlinePrompt`/`draftChapter` 的 context（draft 每章必须回扣 spine）。
  - 在 `flattenSkeleton`/合并后、渲染前调用 `assertCoherence(content)`；失败抛（不静默 fallback）。
- [ ] **Step 3 跑绿 + commit** `git commit -am "feat(phaseB): pipeline接入主线锁+一致性门"`

> **Phase B 验收**：luma fixture 真实跑（provider 可用时）critic 从 `revise→pass`、无重复页/跨页承接错误；离线 `test-strategy-decider`/`test-coherence-validator`/`test-pipeline-spine-wiring` 全 PASS。

---

## Phase C · 榨需求 intake（侧面提问）

### Task C.1：question-map.json（侧面提问表）
**Files:** Create `assets/intake/question-map.json`

- [ ] **Step 1 写映射表**（种子=清洗报告 §10 必问 13 + 品类条件触发 + brand-strategy-guide 22 轮的"给选项/示例"）。每条：
```jsonc
{
  "questions": [
    {
      "id":"q_proposition",
      "target_concepts":["proposition","core_values"],
      "oblique_prompt":"如果你的品牌明天消失，你的用户会失去什么？为什么得是你来填这个空，而不是别人？",
      "options_or_examples":["失去一个'懂我'的选择","失去一种省心","失去一种身份认同","其他（自述）"],
      "follow_ups":["具体到一个真实的人、一个真实的时刻"],
      "restate_template":"我理解你想填的空是「{{answer}}」——对吗？",
      "simplify_tag":"keep",
      "sufficiency_weight":0.15,
      "category_trigger":null
    },
    {
      "id":"q_persona_personality",
      "target_concepts":["personality_statement"],
      "oblique_prompt":"如果你的品牌是一个人，他在饭桌上会怎么说话？他会因为坚持什么而得罪人？",
      "options_or_examples":["温和可靠不制造焦虑","犀利敢说真话","专业克制有距离感","热情爱分享","其他"],
      "follow_ups":["他绝对不会说的一句话是什么？"],
      "restate_template":"那他的人格更接近「{{answer}}」，我先记下，后面会落成对外人格+对内话术边界。",
      "simplify_tag":"keep",
      "sufficiency_weight":0.1,
      "category_trigger":null
    }
    // … 其余按报告 §10 必问逐条补全：品牌名/品类(q_category)/对象(q_audience_doc)/目的(q_goal)/阶段(q_stage)/核心用户(q_user)/场景(q_scene)/旧问题(q_old_problem)/新认知(q_new_cognition)/产品(q_product)/已有视觉(q_has_visual)/可公开数据(q_public_data)/仅内部数据(q_internal_data)
    // 条件触发（category_trigger）：fnb/tech_b2b/lifestyle/fashion/franchise 各补 §10.2 专属题
  ],
  "merge_rules":[
    {"merge":["q_old_problem","q_new_cognition"],"into":"一题两问：你最受不了这个行业的什么？你想让用户改成怎么想？","tag":"mergeable"},
    {"optional_if":"document_type!=internal_brand_playbook","ids":["q_internal_data"],"tag":"optional"}
  ],
  "sufficiency_dimensions":[
    {"dim":"brand_basics","weight":0.15},{"dim":"audience_scene","weight":0.2},
    {"dim":"problem_opportunity","weight":0.2},{"dim":"product","weight":0.15},
    {"dim":"strategy_seed","weight":0.2},{"dim":"tonality","weight":0.1}
  ]
}
```
- [ ] **Step 2 commit** `git commit -am "feat(phaseC): 侧面提问映射表（报告§10种子+简化/归并标注）"`

### Task C.2：ingest-sources.mjs（多源乱料归一）
**Files:** Create `scripts/ingest-sources.mjs`；Test `scripts/test-ingest-sources.mjs`

- [ ] **Step 1 写失败测试**：
```js
import assert from 'node:assert'
import { ingestSources } from '../scripts/ingest-sources.mjs'
const pre = await ingestSources({ items:[
  { type:'text', value:'我想做一个面向独立咖啡馆的供应链品牌' },
  { type:'note', value:'会议纪要：客户说最大痛点是小馆采购难、品质不稳' },
  { type:'url', value:'https://example.com', fetched:'<html><title>Demo</title><body>独立咖啡 供应链</body></html>' }
], callModel: async()=>JSON.stringify({ brand_basics:{name_guess:'?',category_guess:'供应链/咖啡'}, problem:'小馆采购难、品质不稳', raw_spans:[{source:'note',span:'采购难'}] }) })
assert.ok(pre.problem.includes('采购'))
assert.ok(Array.isArray(pre.raw_spans) && pre.raw_spans[0].source==='note')  // 保留来源
console.log('PASS test-ingest-sources')
```
- [ ] **Step 2 跑红 → 实现** `scripts/ingest-sources.mjs`：
  - `ingestSources({items, callModel})`：`items[]` 形如 `{type:'text|note|url|file', value, fetched?}`；对 url/file 取已抓取/已读文本（抓取由调用方或既有 web-search 提供，本函数不联网）；调 callModel 把杂料归一成 `pre-brief`：`{brand_basics, problem, opportunity, audience_hint, product_hint, tonality_hint, raw_spans:[{source,span}]}`。**每条结论保留 `raw_spans` 来源**（可追溯）。空输入抛错。
- [ ] **Step 3 跑绿 + commit** `git commit -am "feat(phaseC): 多源乱料归一 pre-brief"`

### Task C.3：intake-strategist.mjs（渐进对话 + 充分度门）
**Files:** Create `scripts/intake-strategist.mjs`；Test `scripts/test-intake-strategist.mjs`

- [ ] **Step 1 写失败测试**（驱动一轮问答 + 充分度判定 + 轻选输出类型）：
```js
import assert from 'node:assert'
import { nextIntakeStep, scoreSufficiency, finalizeBrief } from '../scripts/intake-strategist.mjs'

// 给定已答状态，产出下一题（带复述+选项）
const state = { preBrief:{problem:'采购难'}, answers:{ q_category:'咖啡供应链', q_goal:'招商' }, output_types_selected:[] }
const step = await nextIntakeStep({ state, callModel: async()=>JSON.stringify({ restate:'你想做咖啡供应链、目标招商，对吗？', ask_id:'q_user', ask_prompt:'谁会第一个为它买单？', options:['独立咖啡馆主理人','连锁采购','其他'] }) })
assert.ok(step.restate && step.ask_prompt && step.options.length>=2)   // 一问一复述带选项

// 充分度评分：信息不足 <7 → 不放行
const low = scoreSufficiency({ answers:{ q_category:'咖啡供应链' } })
assert.ok(low.score < 7 && low.gaps.length>0)
const high = scoreSufficiency({ answers:{ q_category:'x',q_user:'x',q_scene:'x',q_old_problem:'x',q_product:'x',q_proposition:'x',q_persona_personality:'x',q_public_data:'x',q_goal:'x' } })
assert.ok(high.score >= 7)

const brief = finalizeBrief({ answers:high.answers||{}, preBrief:{}, output_types_selected:['brand-book'] })
assert.equal(brief.gate_passed, true)
assert.deepEqual(brief.output_types_selected, ['brand-book'])
console.log('PASS test-intake-strategist')
```
- [ ] **Step 2 跑红 → 实现** `scripts/intake-strategist.mjs`：
  - `nextIntakeStep({state, callModel})`：基于 `question-map.json` + 已答 `answers` 选下一题；prompt 强制三步（复述上一轮理解 → 行业视角初判 → 给 2-4 个选项+"其他自述"），**绝不直接问术语**（用 oblique_prompt）。返回 `{restate, ask_id, ask_prompt, options, done?}`。
  - `scoreSufficiency({answers})`：按 `sufficiency_dimensions` 加权（每维由相关题是否答 + 答案长度/具体度粗判）→ `{score(0-10), gaps:[dim...], answers}`。
  - `finalizeBrief({answers, preBrief, output_types_selected})`：`score≥7` 才 `gate_passed=true`；产出 `inputs/{slug}/brief.json`（喂下游 research/analysis），包含 `brand_type` 线索（供 detect-brand-type）、`tonality`（关键词+参考品牌）、`output_types_selected`。`score<7` 时 `gate_passed=false` 且列 `gaps`（回退追问）。
  - 轻选输出类型：首轮问"你想要手册 / 独立站 / 还不确定"，写 `output_types_selected`，可在"定框架"关口改。
- [ ] **Step 3 跑绿 + commit** `git commit -am "feat(phaseC): 渐进对话intake+充分度门+侧面提问"`

> **Phase C 验收**：模拟一个"只有模糊想法"的输入，≤12 题内 `scoreSufficiency≥7`，产出 `brief.json`；问题全部 oblique（无"你的品牌主张是什么"式术语直问）。

---

## Phase D · 品牌识别 + 独立站第二出口

### Task D.1：brand-profiler.mjs（tonality→palette，qa 默认）
**Files:** Create `scripts/brand-profiler.mjs`；Test `scripts/test-brand-profiler.mjs`

- [ ] **Step 1 写失败测试**：
```js
import assert from 'node:assert'
import { buildPalette } from '../scripts/brand-profiler.mjs'
// 默认源 qa：仅凭调性关键词+参考品牌出色板
const p = await buildPalette({ tonality:{ keywords:['温暖','克制','自然'], reference_brands:['观夏'], source:'qa' },
  callModel: async()=>JSON.stringify({ primary:'#7a5c3e', secondary:'#e7ddcc', accent:'#c2703d', text:'#2b2a20', bg:'#faf6ef' }) })
assert.ok(/^#?[0-9a-fA-F]{6}$/.test(p.primary.replace('#','')))
assert.ok(p.primary && p.secondary && p.accent && p.text && p.bg)   // 五色齐全
console.log('PASS test-brand-profiler')
```
- [ ] **Step 2 跑红 → 实现** `scripts/brand-profiler.mjs`：
  - `buildPalette({tonality, callModel})`：`source==='qa'`（默认）→ 用关键词+参考品牌让模型产 5 色十六进制 + 各色情绪理由；**无模型时走确定性兜底映射**（温暖→暖棕、克制→低饱和、科技→冷蓝、自然→大地色…）保证离线可测。`source==='upload'` → `extractPaletteFromImage(path, visionModel)` 提主色再补全（可选路径）。
  - 校验输出 5 色均为合法 hex，否则抛错。写回 `content.tonality.palette`。
- [ ] **Step 3 跑绿 + commit** `git commit -am "feat(phaseD): 品牌调性→色板（qa默认/upload可选）"`

### Task D.2：template-independent-site.html
**Files:** Create `templates/template-independent-site.html`

- [ ] **Step 1 写模板**：单页独立站（`hero` 用品牌名+slogan+一句话定位；多 `section` 承载对外模块；`cta` 合作入口；CSS 变量色板 `{{PALETTE_VARS}}`；响应式；无外链）。占位 `{{HERO}} {{SECTIONS}} {{CTA}} {{PALETTE_VARS}}`，**不含任何制作备注字样**。
- [ ] **Step 2 commit** `git commit -am "feat(phaseD): 独立站单页模板"`

### Task D.3：render-independent-site.mjs + 注册
**Files:** Create `scripts/renderers/render-independent-site.mjs`；Modify `core/output-registry.mjs`；Test `scripts/test-render-independent-site.mjs`

- [ ] **Step 1 写失败测试**（复用 Phase A 同款断言：只对外、注色板、无备注泄漏）：
```js
import assert from 'node:assert'
import { renderIndependentSite } from '../scripts/renderers/render-independent-site.mjs'
import { createBrandContent, addModule } from '../core/content-model.mjs'
let c = createBrandContent({ brand_slug:'demo', brand_type:'worldview_visual' })
c.tonality.palette = { primary:'#1a3c34', secondary:'#cfe3da', accent:'#e08a2c', text:'#1c1c1c', bg:'#faf8f4' }
c.strategic_spine.positioning_statement = '服装新物种'
c = addModule(c,{id:'entry',kind:'brand_entry',visibility:'external',depth_level:'L3',content:{name:'刺猬',slogan:'活该与众不同',one_liner:'科技刺绣定制'}})
c = addModule(c,{id:'risk',kind:'risk_check',visibility:'internal',depth_level:'L3',content:{body:'x'}})
const { html } = renderIndependentSite(c)
assert.ok(html.includes('活该与众不同') && html.includes('#1a3c34'))
assert.ok(!html.includes('risk') && !html.includes('production_note') && !html.includes('制作备注'))
console.log('PASS test-render-independent-site')
```
- [ ] **Step 2 跑红 → 实现** `renderIndependentSite(content,{template})`：取对外模块→映射到 hero/sections/cta→注入色板→返回 `{html}`；无对外模块抛错。注册 `registerTransformer({type:'independent-site', visibility_filter:['external'], module_allowlist:<对外kind>, render: renderIndependentSite})`。
- [ ] **Step 3 跑绿 + commit** `git commit -am "feat(phaseD): 独立站渲染+注册转换器"`

> **Phase D 验收**：同一份锁定内容 → `brand-book` + `independent-site` 两种 HTML，色板自动注入、对内不泄漏。

---

## 集成 · 串联全链路 + 最终冒烟

### Task INT.1：gen-fullcase-cli.mjs 串联 + package.json
**Files:** Modify `scripts/gen-fullcase-cli.mjs`、`package.json`

- [ ] **Step 1 改 CLI**：新增 `--mode=brand-book` 路径（旧 deck 路径保留兼容）：
  1. 若无 `inputs/{slug}/brief.json` 且 `--intake`：跑 `intake-strategist`（对话壳可复用 p9 web-shell）→ 产 brief；否则读现成 brief。
  2. `gatherResearchDeep`（复用）→ `runAnalysisPass`（复用，四维）。
  3. `detectBrandType(brief)` → 写 `content.meta.brand_type`。
  4. `deriveStrategyDirections` → **决策关口**（CLI 用 `--pick=dN` 或交互；web 走选项）→ `lockChosenDirection`。
  5. `outline`/`draftChapter`（注入 spine）→ 组装进 `BrandSystemContent`（每模块经 `classifyVisibility` 打标）。
  6. `assertCoherence(content)`（失败必抛）。
  7. `buildPalette(content.tonality)`。
  8. 对 `content.meta.output_types_selected` 逐个 `getTransformer(type).render(content)` → 写 `outputs/{slug}/brand-book.html` / `independent-site.html`。
  9. 全程 `appendRunEvent`（新事件：`intake_done/strategy_locked/coherence_passed/rendered`）。
- [ ] **Step 2 改 `package.json` scripts**：
```jsonc
"brandbook:gen": "node scripts/gen-fullcase-cli.mjs",
"test:mvp": "for t in content-model visibility-classifier output-registry detect-brand-type render-brand-book strategy-decider coherence-validator pipeline-spine-wiring ingest-sources intake-strategist brand-profiler render-independent-site; do node scripts/test-$t.mjs || exit 1; done"
```
- [ ] **Step 3 commit** `git commit -am "feat(int): brand-book 全链路串联 + npm 脚本"`

### Task INT.2：最终冒烟（Seven 跑这步看结果）
- [ ] **离线全门**：`npm run test:mvp` → 全 PASS。
- [ ] **Python 质量门**：`python3 skills/proposal-narrative/scripts/check_deck_skeleton.py --selftest && python3 skills/deck-design-system/scripts/audit_visual.py --selftest`。
- [ ] **真实全链路**（provider 可用时，注意环境变量规避）：
```bash
env -u ANTHROPIC_API_KEY -u ANTHROPIC_BASE_URL node -r dotenv/config scripts/gen-fullcase-cli.mjs \
  fixture-luma-coffee --mode=brand-book --intake --research-rounds=3 --pick=d1 \
  --output=outputs/luma-brandbook
```
- [ ] **看点**：`outputs/luma-brandbook/brand-book.html` —— ①对外模块齐、对内（风险/人格话术）不在 ②无任何"制作备注"泄漏 ③色板来自调性 ④章节按品牌类型加权 ⑤每对外模块可回扣锁定主线。可选 `node scripts/page-inspect.mjs outputs/luma-brandbook/brand-book.html --json` 查越界。

---

## 自检（Spec/报告覆盖核对）

- **内容核心+对内/对外+可插拔输出**（spec §1，报告 §5-8）→ Phase 0 全覆盖（含人格双层、§7 判定规则）。✅
- **类型感知模板**（报告 §0/§4/§11）→ Phase A `detect-brand-type`+`brand-type-weights`+按权重渲染。✅
- **战略主线由四维调研推导 + 锁定 + 一致性**（spec §2/§3.2-3.3，资料1/3）→ Phase B。✅
- **侧面提问 intake + 充分度门 + 多源乱料**（spec §3.1，报告 §10，资料1/3）→ Phase C。✅
- **调性默认 qa + 独立站第二出口**（spec §3.4，报告 §3.1 视觉）→ Phase D。✅
- **修"备注漏出"**（spec §3.5，资料3）→ Task A.4/D.3 显式剔除制作字段 + 测试断言。✅
- **红线失败必抛**（项目纪律）→ coherence/transformer/renderer 空输入均抛。✅
- **未覆盖（有意 YAGNI，见范围决策 B）**：实物 VI/视觉生成（模块 8/9 实物）、实体店/小生意线、单位经济（Phase E）、Web UI。

**类型一致性核对**：`createBrandContent/addModule/externalModules/lockSpine/lockChosenDirection/validateCoherence/assertCoherence/filterForOutput/registerTransformer/getTransformer/renderBrandBook/renderIndependentSite/buildPalette/detectBrandType/chapterWeights/scoreSufficiency/finalizeBrief/nextIntakeStep/ingestSources` —— 跨任务签名/字段名已统一（`visibility/kind/depth_level/spine_alignment/strategic_spine.positioning_statement/tonality.palette`）。

---

## 执行交接（面向 Codex 一次性开发）

**构建顺序（依赖序，也是测试序）**：Phase 0 → A → B → C → D → 集成。每 Task 内 TDD（红→绿→commit）。**离线 `npm run test:mvp` 必须全绿**才算该阶段完成；真实 LLM 仅在集成冒烟跑一次。

> 旧子 agent 层（`run-sub-agent.mjs`/`run-blueprint-suite.mjs`）不在本计划改动范围，保持兼容、不复用。

Seven 的回路：Codex 按本计划开发 → 你跑 `npm run test:mvp` + 真实冒烟 → 看 `outputs/{slug}/brand-book.html` 五个看点 → 反馈问题 → 迭代。
