# 内容生成修复计划（P0 真内容 + P1 tonality/coherence + F3 白名单）

> **For agentic workers（Codex）：** 逐任务 TDD：先写/改测试 → 跑红 → 实现 → 跑绿 → `git add <files>` 显式提交。**红线：失败必抛，不静默 fallback；deterministic 仅 `--no-model` 显式门控并标注"离线占位非交付"。** 真实 LLM 用 `env -u ANTHROPIC_API_KEY -u ANTHROPIC_BASE_URL node -r dotenv/config ...`。

**Goal：** 把 `gen-fullcase-cli.mjs:buildBrandModules` 的中文模板桩，换成**真·LLM 驱动、吃调研+analysis-cards、回扣锁定主线、每模块 L3/L4 且引用真证据**的内容生成；同步修 tonality 采集走偏、coherence 被字面粘贴绕过、渲染白名单削薄内容三个连带问题。

**Architecture：** 逐模块生成——对 `chapterWeights>0` 的每个对外模块 kind，注入（锁定 spine + 该 kind 对应方法论 skill + 相关 analysis-cards + brief + 已生成模块摘要防重复 + 该 kind 的 renderable-fields 字段清单），LLM 产结构化 `content`，强制 `evidence_refs` 引用真 card id + 反套话自检；失败抛。一个 `renderable-fields.json` 做"生成器产什么字段 = 渲染器显什么字段"的唯一真相源，杜绝漂移。

**Tech Stack：** Node ESM(.mjs)、复用 `skill-injector.loadSkillGuidance`、`analysis-pass` 产物、现有 `@anthropic-ai/sdk`/`openai`。无新依赖。

**评审依据：** `docs/handoffs/2026-06-17-mvp-implementation-plan.md` 的 CP 评审发现（buildBrandModules 是模板桩 / tonality 把人格当调性 / coherence 被字面定位语绕过 / SAFE_KEYS 硬编码削薄）。

---

## 文件分解

| 文件 | 动作 | 职责 |
|---|---|---|
| `assets/content/renderable-fields.json` | 新建 | 每个对外 kind → 外显内容字段清单（生成器与渲染器共用的唯一真相源） |
| `scripts/generate-brand-modules.mjs` | 新建 | 真内容生成器（LLM，逐模块，证据回溯，反套话）+ 标注的 `--no-model` 离线占位 |
| `scripts/gen-fullcase-cli.mjs` | 改 | 用 `generateBrandModules` 替换 `buildBrandModules`；deterministic 仅 `--no-model` |
| `assets/intake/question-map.json` | 改 | 加 `q_tonality`（参考品牌+调性词+示例）；tonality 充分度维改指向 `q_tonality` |
| `scripts/intake-strategist.mjs` | 改 | `finalizeBrief` 正确映射 tonality（keywords+reference_brands），人格归人格 |
| `validators/coherence-validator.mjs` | 改 | 加"证据缺失/反套话/跨模块模板重复"判定 |
| `scripts/renderers/render-brand-book.mjs` | 改 | 用 `renderable-fields` 替换硬编码 `SAFE_KEYS`（保留制作备注黑名单） |
| `scripts/renderers/render-independent-site.mjs` | 改 | 同上对齐 |
| `scripts/test-generate-brand-modules.mjs` | 新建 | 生成器离线门 |
| `scripts/test-coherence-validator.mjs` | 改 | 加反套话断言 |
| `scripts/test-intake-strategist.mjs` | 改 | 加 tonality 映射断言 |
| `scripts/test-render-brand-book.mjs` | 改 | 加 renderable-fields 断言 |

---

## Task 1：renderable-fields.json（生成/渲染唯一真相源）
**Files:** Create `assets/content/renderable-fields.json`

- [ ] **Step 1 写清单**（每 kind 的对外字段，取自清洗报告 §8；`title` 始终允许；不含任何 `*_note/production_*`）：
```jsonc
{
  "brand_entry": ["name","slogan","one_liner","category"],
  "market_context": ["title","body","category_trends","old_problem","new_opportunity","points"],
  "brand_definition": ["title","positioning","what_it_is","what_it_is_not","differentiation","name_interpretation","body"],
  "audience_scenarios": ["title","body","core_audience","personas","scenarios","motivations"],
  "strategy_core": ["title","mission","vision","values","philosophy","proposition","body","points"],
  "narrative_system": ["title","brand_story","manifesto","slogan","slogan_interpretation","body"],
  "product_system": ["title","product_positioning","product_keywords","product_series","methodology","core_selling_points","functional_value","emotional_value","social_cultural_value","body"],
  "visual_direction": ["title","color_direction","typography_direction","symbol_concept","body"],
  "proof_growth": ["title","milestones","public_metrics","partners","future_plan","body"],
  "personality_statement": ["title","archetype","traits","tone","body"]
}
```
- [ ] **Step 2 commit** `git add assets/content/renderable-fields.json && git commit -m "feat(fix): renderable-fields 唯一真相源（生成=渲染字段对齐）"`

## Task 2：generate-brand-modules.mjs（真内容生成器）
**Files:** Create `scripts/generate-brand-modules.mjs`；Test `scripts/test-generate-brand-modules.mjs`

- [ ] **Step 1 写失败测试**（stub callModel 返回结构化、引真证据的模块；断言证据回溯 + 字段在清单内 + 深度 + 反套话拒绝）：
```js
import assert from 'node:assert'
import { generateBrandModules } from '../scripts/generate-brand-modules.mjs'
import { createBrandContent, lockSpine } from '../core/content-model.mjs'

let c = createBrandContent({ brand_slug:'demo', brand_type:'new_consumer_full' })
c = lockSpine(c, { chosen_direction_id:'d1', positioning_statement:'独立咖啡馆的稳定品质供应',
  mission:'让小馆也能稳定出品', vision:'成为独立咖啡馆第一供应选择', proposition:'稳定品质+灵活配送' })
const analysisCards = { byType:{ competitor:{cards:[{id:'comp-1',claim:'头部只服务连锁，忽视独立小馆',source_tier:'T2'}]},
  user:{cards:[{id:'usr-1',claim:'独立馆主最痛采购不稳定',source_tier:'T1'}]} } }

// stub：按 kind 返回结构化内容 + 真 evidence_ref
const callModel = async (sys, user) => JSON.stringify({
  content: { title:'品牌定义', positioning:'独立咖啡馆的稳定品质供应',
    what_it_is:'专为独立小馆做的稳定供应链', differentiation:['只服务独立馆','按小批量稳定配送'],
    body:'针对 comp-1 揭示的空白与 usr-1 的采购焦虑，提供稳定供应。' },
  evidence_refs:['comp-1','usr-1'], depth_level:'L4' })

const out = await generateBrandModules({ content:c, brief:{form:{name:'demo'}}, analysisCards, callModel, kinds:['brand_definition'] })
const def = out.modules.find(m=>m.kind==='brand_definition')
assert.ok(def && def.visibility==='external')
assert.deepEqual(def.evidence_refs.sort(), ['comp-1','usr-1'])   // 证据回溯真 card id
assert.ok(['L3','L4'].includes(def.depth_level))                 // 深度达标
assert.ok(!('production_note' in def.content))                   // 不含制作字段
// 反套话：模型只回定位语+空泛，必须被拒
const lazy = async()=>JSON.stringify({ content:{title:'品牌定义',positioning:'独立咖啡馆的稳定品质供应',body:'独立咖啡馆的稳定品质供应。'}, evidence_refs:[], depth_level:'L4' })
await assert.rejects(generateBrandModules({ content:c, brief:{}, analysisCards, callModel:lazy, kinds:['brand_definition'] }), /evidence|boilerplate|套话|specific/i)
console.log('PASS test-generate-brand-modules')
```
- [ ] **Step 2 跑红 → 实现** `scripts/generate-brand-modules.mjs`：
  - `MODULE_KIND_TO_SKILL`：`brand_definition/strategy_core/narrative_system/personality_statement → 'draft'`(proposal-narrative)；`audience_scenarios → 'analysis_user'`；`market_context → 'analysis_industry'`；`product_system/proof_growth → 'analysis_self'`。用 `loadSkillGuidance({root,stage})` 取方法论。
  - `selectRelevantCards(analysisCards, kind)`：按 kind 取相关维度卡（market←industry/competitor；audience←user；definition/strategy←competitor/self/user；product/proof←self/competitor）。
  - `generateBrandModules({content, brief, analysisCards, researchBrief, callModel, root, kinds})`：
    1. `kinds` 缺省 = 该 brand_type `chapterWeights>0` 的对外 kinds（按 BRAND_BOOK_MODULES 顺序）。
    2. 逐 kind 构造 prompt：注入 `content.strategic_spine`（**硬约束：本模块必须从主线推导**）+ 该 kind 方法论 + 相关 cards（含 id 与 source_tier）+ brief + `renderable-fields[kind]`（**只准产这些字段**）+ 已生成模块的 `title/positioning` 摘要（**防重复**）。要求只输出 `{content, evidence_refs, depth_level}` JSON。
    3. 解析→**校验**：`evidence_refs` 非空且全部 ∈ 真 card id（否则抛）；`content` 字段全部 ∈ `renderable-fields[kind]`（剔除越界键）；`depth_level ∈ {L3,L4}`（否则抛或退回重生一次）。
    4. **反套话自检**：`assertNotBoilerplate(content, spine, cards)` —— 模块正文去掉定位语字面后，仍须含 ≥1 个来自 cards/brief 的品牌专属具体词（行业名/产品名/人群/证据关键词）；否则抛 `boilerplate: module not brand-specific`。
    5. `visibility` 走 `classifyVisibility`；`addModule`（immutable，返回新 content）。
  - 返回 `{ content, modules }`。**任何 kind 生成失败抛**（不静默跳过）。
  - 末尾导出 `deterministicBrandModules({content, brief})`：保留原模板逻辑**仅供 `--no-model`**，每模块 content 加 `{offline:true}` 标记，标注"离线占位非交付"。
- [ ] **Step 3 跑绿** `node scripts/test-generate-brand-modules.mjs` → PASS。
- [ ] **Step 4 commit** `git add scripts/generate-brand-modules.mjs scripts/test-generate-brand-modules.mjs && git commit -m "feat(fix-P0): 真·LLM内容生成（证据回溯+反套话+字段约束）"`

## Task 3：gen-fullcase-cli 接入真生成器
**Files:** Modify `scripts/gen-fullcase-cli.mjs`

- [ ] **Step 1 改集成测试** `scripts/test-brandbook-cli.mjs`：把现有用例的 callModel 换成"按 kind 返回结构化+真证据"的 stub，断言 `brand-system-content.json` 的 `brand_definition` 模块含 `evidence_refs` 且**非纯定位语**；`--no-model` 路径模块带 `offline:true`。
- [ ] **Step 2 改 `gen-fullcase-cli.mjs`**：
  - 删 `buildBrandModules(content, brief)` 调用（第 387 行），改为：
    ```
    content = opts.noModel
      ? deterministicBrandModules({ content, brief }).content
      : (await generateBrandModules({ content, brief, analysisCards, researchBrief, callModel, root })).content
    ```
  - `buildBrandModules` 函数体迁入 `generate-brand-modules.mjs` 的 `deterministicBrandModules` 后，从 CLI 删除（DRY）。
  - 保留 `assertCoherence(content)` 在渲染前（已有，第 393）。
- [ ] **Step 3 跑绿 + commit** `git add scripts/gen-fullcase-cli.mjs scripts/test-brandbook-cli.mjs && git commit -m "feat(fix-P0): CLI接入真内容生成，模板降级为--no-model离线"`

## Task 4：修 tonality 采集（F2）
**Files:** Modify `assets/intake/question-map.json`、`scripts/intake-strategist.mjs`、`scripts/test-intake-strategist.mjs`

- [ ] **Step 1 改测试** `test-intake-strategist.mjs` 增断言：
```js
import { finalizeBrief } from '../scripts/intake-strategist.mjs'
const brief = await finalizeBrief({ answers:{
  q_category:'咖啡供应链', q_user:'独立馆主', q_scene:'每周备货', q_old_problem:'采购不稳', q_product:'稳定豆源',
  q_proposition:'稳定品质', q_persona_personality:'可靠不浮夸', q_public_data:'已服务50家',
  q_tonality:'参考观夏，喜欢它的温暖克制、自然质感' }, output_types_selected:['brand-book'] })
import assert from 'node:assert'
assert.ok(brief.tonality.reference_brands.includes('观夏'))            // 参考品牌进 tonality
assert.ok(brief.tonality.keywords.some(k=>/温暖|克制|自然/.test(k)))   // 调性词进 tonality
assert.ok(!brief.tonality.keywords.includes('可靠不浮夸'))             // 人格不再混入 tonality
```
- [ ] **Step 2 改 `question-map.json`**：新增问题
```jsonc
{ "id":"q_tonality",
  "target_concepts":["tonality"],
  "oblique_prompt":"有没有哪个品牌——不限行业——你看一眼就觉得'这就是我想要的感觉'？是它的什么打动你：颜色、质感、字体、还是气质？",
  "options_or_examples":["像观夏那种温暖克制","像无印良品那种自然留白","像苹果那种冷静科技","其他（说出品牌+你喜欢它哪点）"],
  "follow_ups":["用三个形容词概括你想要的调性"],
  "restate_template":"那视觉基调更接近「{{answer}}」，我会用它来定白皮书和独立站的色彩与气质。",
  "simplify_tag":"keep","sufficiency_weight":0.1,"category_trigger":null }
```
  并把 `sufficiency_dimensions` 里 `tonality` 维的 `question_ids` 从 `["q_persona_personality"]` 改为 `["q_tonality"]`。（`q_persona_personality` 仍保留，喂 personality 模块。）
- [ ] **Step 3 改 `intake-strategist.mjs finalizeBrief`**：tonality 改为解析 `q_tonality`——
  - `reference_brands`：从答案中抽品牌名（命中 options 内品牌词 + "像X""参考X"模式）。
  - `keywords`：抽调性形容词（温暖/克制/自然/科技/高级/活泼…）。
  - 不再用 `q_persona_personality`。
- [ ] **Step 4 跑绿 + commit** `git add assets/intake/question-map.json scripts/intake-strategist.mjs scripts/test-intake-strategist.mjs && git commit -m "feat(fix-P1): tonality改由q_tonality采集（参考品牌+调性词），人格归人格"`

## Task 5：强化 coherence（反套话/反字面粘贴）
**Files:** Modify `validators/coherence-validator.mjs`、`scripts/test-coherence-validator.mjs`

- [ ] **Step 1 改测试**：增"模板套话必须被拦"用例：
```js
// 每个对外模块正文 = 定位语字面 + 空泛，无 evidence_refs → 必须 FAIL
import { validateCoherence } from '../validators/coherence-validator.mjs'
import { createBrandContent, addModule } from '../core/content-model.mjs'
import assert from 'node:assert'
let c = createBrandContent({ brand_slug:'d', brand_type:'new_consumer_full' })
c.strategic_spine = { positioning_statement:'稳定品质供应', mission:'m',vision:'v',proposition:'p', locked:true, locked_at:'now', chosen_direction_id:'d1' }
c = addModule(c,{id:'m1',kind:'brand_definition',visibility:'external',depth_level:'L4',
  content:{positioning:'稳定品质供应',body:'稳定品质供应。'}, spine_alignment:'稳定品质供应', evidence_refs:[]})
const r = validateCoherence(c)
assert.equal(r.ok,false)
assert.ok(r.violations.some(v=>/boilerplate|套话|证据/.test(v.reason)))  // 字面粘贴+无证据被抓
```
- [ ] **Step 2 改 `coherence-validator.mjs`**：对每个对外模块新增规则：
  - **证据缺失**：关键 kind（KEY_KINDS）模块 `evidence_refs` 为空 → violation `证据缺失`（套话的典型特征）。
  - **反套话**：去掉定位语锚词后的剩余正文长度 < 阈值（如 < 8 字有效内容）或与定位语近乎等同 → violation `boilerplate 套话`。
  - **跨模块模板重复**：收集各模块正文，若两模块去锚词后存在 ≥12 字相同子串 → violation `模板重复`。
  - 保留原有 spine_alignment/depth/assumption_conflict 规则。
- [ ] **Step 3 跑绿 + commit** `git add validators/coherence-validator.mjs scripts/test-coherence-validator.mjs && git commit -m "feat(fix-P1): coherence加反套话/反字面粘贴/跨模块模板重复"`

## Task 6：渲染白名单 → renderable-fields（F3）
**Files:** Modify `scripts/renderers/render-brand-book.mjs`、`scripts/renderers/render-independent-site.mjs`、`scripts/test-render-brand-book.mjs`

- [ ] **Step 1 改测试** `test-render-brand-book.mjs`：模块 content 含 `differentiation`（表内字段）+ `production_note`（制作字段）→ 断言 `differentiation` 渲染出、`production_note` 不渲染。
- [ ] **Step 2 改渲染器**：`isSafeKey` 改为：`renderable-fields[kind]` 决定可显字段（按当前模块 kind 取清单），叠加制作字段黑名单（`*_note/notes/layout_*/production*/offline`）。`render-brand-book` 和 `render-independent-site` 共用一个 `pickRenderableFields(kind)` helper（放 `render-brand-book.mjs` 导出或新建 `renderers/renderable.mjs`）。
- [ ] **Step 3 跑绿 + commit** `git add scripts/renderers/render-brand-book.mjs scripts/renderers/render-independent-site.mjs scripts/test-render-brand-book.mjs && git commit -m "feat(fix-F3): 渲染字段改用renderable-fields，杜绝白名单削薄/漂移"`

## Task 7：回归 + 真实冒烟脚手架
**Files:** （无新文件，跑验证）

- [ ] **Step 1 全量离线门**：`npm run test:mvp` 全绿（含改动的 4 个测试 + 新增 generate）。
- [ ] **Step 2 现有 deck 回归**：`for t in fullcase-pipeline outline-fullcase draft-chapter deck-skeleton process-locks analysis-pass; do node scripts/test-$t.mjs || exit 1; done` 全绿。
- [ ] **Step 3 真实冒烟（provider 可用时，Seven 跑）**：
```bash
env -u ANTHROPIC_API_KEY -u ANTHROPIC_BASE_URL node -r dotenv/config scripts/gen-fullcase-cli.mjs \
  fixture-luma-coffee --mode=brand-book --research-rounds=3 --pick=d1 --output=outputs/luma-brandbook
```
  **看点（这次才验内容质量）**：`outputs/luma-brandbook/brand-book.html` —— ①每模块正文是否**品牌专属**（换个品牌不成立）②引用了真 analysis-card ③对内不漏、零备注 ④色板来自 q_tonality 的参考品牌/调性 ⑤coherence 真通过而非被字面粘贴骗过。同时核对 `brand-system-content.json` 各模块 `evidence_refs` 非空。

---

## 自检（覆盖核对）

- **P0 内容桩 → 真生成**：Task 2/3 覆盖（LLM+证据+反套话+字段约束，模板降级 --no-model）。✅
- **F2 tonality 走偏**：Task 4（q_tonality + 映射）。✅
- **coherence 被字面粘贴绕过**：Task 5（证据缺失/反套话/模板重复）。✅
- **F3 白名单削薄/漂移**：Task 1+6（renderable-fields 唯一真相源）。✅
- **红线**：生成失败抛、deterministic 仅 --no-model 且标注 offline。✅
- **类型一致性**：`generateBrandModules/deterministicBrandModules/assertNotBoilerplate/pickRenderableFields/renderable-fields[kind]/MODULE_KIND_TO_SKILL` 命名跨任务统一；renderable-fields 的 kind 集 = `render-brand-book.BRAND_BOOK_MODULES`。

## 执行交接

构建即测试序：Task 1→2→3→4→5→6→7。每 Task TDD（红→绿→显式 `git add` 提交）。`npm run test:mvp` + deck 回归全绿后，Seven 跑 Task 7 真实冒烟看 5 看点——**这次冒烟才真正回答"能不能出 80 分手册"**。

> 不改旧子 agent 层与旧 deck 路径（mode 门控已隔离）。
