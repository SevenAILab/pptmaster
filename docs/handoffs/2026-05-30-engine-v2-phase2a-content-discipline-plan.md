# Phase 2a：内容纪律确定性闸门 Implementation Plan

> **给执行方（Codex）：** 按本计划逐任务执行（TDD：先写失败测试 → 跑→确认失败 → 写最小实现 → 跑→确认通过 → 提交）。每步用 `- [ ]` 复选框跟踪。**红线：失败必抛错、不静默兜底、不伪造数据、不替用户补数。** 完整最终代码见文末 Appendix A / B —— 各任务片段必须与 Appendix 逐字一致。

**Goal:** 给 `③ 咨询级成稿` 增加一道**确定性（可机器判定）内容纪律闸门** `content-discipline.mjs`，对每页做硬规则校验（缺槽位 / 营销黑名单 / 精确数无出处），违规即抛错、不渲染出违规 deck；与现有 LLM 主观闸门 `consulting-review.mjs` 互补。

**Architecture:** 一个纯函数库（`lintSlide`/`lintDeck`/`assertDeckDiscipline`）+ 一个独立 CLI 闸门 `check-content-discipline.mjs` + 把硬闸门嵌进出稿入口 `render-deck-s.mjs`（出稿前拦截，防止违规 deck 落地）。**复用**既有 `source-tiers.mjs` 的 T1–T4 分级，不另造分级体系。

**Tech Stack:** Node ESM（`type: module`）；测试用 `node:assert/strict` 纯脚本，`console.log('✅ ... passed')`；无 jest/vitest。

---

## 给小白的讲解（Seven 先读这段）

- **现在做的是什么：** 给"成稿"加一个**自动质检员**。它在生成 PPT 之前逐页检查三件硬性的事：①每页有没有"标题/要点/出处"这三样、②有没有用"赋能、打造闭环"这类空话、③出现了像"8.6%"这种精确数字时、这页到底有没有挂出处。任何一条不合格——**直接报错、不出片**。
- **目的·为什么：** 这正是你定的红线——"不许编数据、不许糊空话、每个数字要能追溯"。现在这条红线只靠 AI 主观打分（`consulting-review.mjs`）来把关，主观的东西会漏。加一道**机器铁律**，漏不掉。
- **一个重要发现（也想让你拍板）：** 项目里早就写好了一套"来源分级 T1–T4"的代码（T1=客户一手料最可信，T4=网友帖子最不可信），但**一直没接进生产流程，等于白写**。这次正好把它用起来。另外，当前 80 页的出处文件 `inputs/pptagent/summary.md` 因为没放在约定的 `first-party/` 文件夹里，被系统判成了 T3（中等可信）。所以这一版我**不**因为"出处不够 A 级"就报错（那会冤枉你客户自己给的资料），只在精确数字旁边**提醒**"建议补更硬的来源"；等以后把文件夹规范理顺了，再升级成硬性拦截。
- **你怎么自己核查：** ①执行后我会让你看 `node scripts/test-content-discipline.mjs` 打印 `✅ ... passed`；②`node scripts/check-content-discipline.mjs outputs/pptagent-blueprint/raw-output.json` 对现有 80 页应显示"0 违规"（已提前验证：现有页 0 个黑名单词、0 个精确数字、槽位齐全，所以不会误杀你已有的成果）；③我故意塞一个含"赋能"的假页，让你看到它**确实报错、不出 HTML**。

---

## Grounding：已核实的真实数据事实（Codex 不要再凭空假设）

> 以下来自对 `outputs/pptagent-blueprint/raw-output.json`（80 页）的实测，以及对 `scripts/source-tiers.mjs` 的通读。计划的每条规则都基于这些事实，**不得改成想象的字段**。

1. **每页字段（80/80 一致）：** `page_no, layout, action_title(string,非空), core_points(string[],非空), data_refs(非空), models_used, page_intent, page_subtitle, render_hints, blueprint_page_no, part_no, part_title, chunk_id`。
2. **没有显式"4 槽位"字段**：设计文档要求的 `行动标题/主证据/含义建议/出处置信度` 中，只有"行动标题=`action_title`、主证据≈`core_points`、出处=`data_refs`"能干净映射；**"含义建议"无独立字段** → 归 Phase 2b（需上游 sub-agent 改 schema）。
3. `data_refs` 形状 = `{ value, source, type }`，当前 `type` 仅出现 `"client_input"`；**无 tier / date 字段**。
4. **现有 80 页：0 个营销黑名单词、0 个精确数字（%/万/亿/倍/元）、0 页缺 `action_title`/`core_points`/`data_refs`。** → 一个"违规即抛错"的闸门**不会**误杀现有成果（纯前瞻性保险）。
5. **`source-tiers.mjs` 已实现完整 T1–T4 分级**：`classifySource(source, {slug})→{source_tier}`（一手目录→T1，权威研究/政府/.gov/.edu→T2，行业媒体→T3，UGC→T4，空/未知→T3），`tierRank('T1'..'T4')→1..4`，`verifyLocalDataRef()` 对 T1 本地源做"值能否在文件里追溯"的**抛错**校验。
6. **该分级目前未接入生产流程**：`grep` 全部非测试脚本，无人 `import` 它做校验（只有自身 + 测试引用）。本闸门是其**第一个生产消费者**。
7. **真实出处当前被判 T3**：`inputs/pptagent/summary.md`、`inputs/pptagent/form.json` 不在 `inputs/<slug>/first-party/` 约定路径下，`classifySource` 判为 `T3 未验证本地来源`。→ 故 Phase 2a 的 tier 门槛只发**警告**，硬抛错仅针对"精确数字 + 完全无出处"。

---

## Scope：Phase 2a 做什么 / Phase 2b 推迟什么

| 设计文档 ③半边A 规则 | Phase 2a（本计划，立即可建） | Phase 2b（需上游 schema / Seven 拍板） |
|---|---|---|
| 规则1 每页 4 槽位强制、缺槽位报错 | 硬抛错：`action_title`/`core_points`/`data_refs` 三槽位存在性 | 第 4 槽"含义建议"独立字段 + 硬校验 |
| 规则2 行动标题=结论非话题 | 仅**警告**（保守启发式），硬判定仍交 LLM 关 | 硬抛错的结论性判定（或并入 LLM 关阈值） |
| 规则3 框架库优先级 SCR/SCQA>金字塔>2x2… | —（需每页带 framework 标签字段，当前无） | 框架标签 schema + 优先级校验 |
| 规则4 精确数无 A 级证据不准写 / KPI 6 行卡 | 硬抛错：精确数字+**完全无出处**；tier 不达 A(T1/T2) 发**警告**（复用 `classifySource`/`tierRank`） | tier 不达 A 升级为**硬抛错**（先修出处路径约定使一手料判 T1）；KPI 6 行卡结构校验；为 data_ref 增 date 字段实现"来源+日期+等级"全追溯 |
| 规则5 中文营销语气黑名单 | **完整硬抛错**：设计文档逐字点名的 6 词 | 经 Seven 批准的扩充词表（见 Appendix C 候选清单） |

**为什么这样切（第一性原理）：** 规则5 + 规则4 的"无出处即违规" + 规则1 的三槽位，是**当前数据形状上无歧义、可立即构建、且直接服务红线**的部分；其余（4 槽位、框架标签、KPI 卡、硬 tier）**都需要改上游 sub-agent 的输出 schema**，属于更大、应单独立项的 Phase 2b。先做轻、确定、护红线的一层，避免重蹈 Phase 1"凭想象设计字段"的覆辙。

---

## File Structure

- **Create** `scripts/content-discipline.mjs` —— 纯函数库（黑名单/精确数/分级/槽位/标题启发 + `lintSlide`/`lintDeck`/`assertDeckDiscipline`）。单一职责：内容纪律判定。完整代码见 **Appendix A**。
- **Create** `scripts/check-content-discipline.mjs` —— 独立 CLI 闸门：读 deck.json → `lintDeck` → 打印警告 → 有违规 `exit 1` 否则 `exit 0`。供 CI / 手动独立运行。
- **Create** `scripts/test-content-discipline.mjs` —— 库 + CLI 的全部断言。完整代码见 **Appendix B**。
- **Modify** `scripts/render-deck-s.mjs` —— 解析 JSON 后、渲染前插入 `assertDeckDiscipline(data)`（硬闸门，违规即抛错、不产出 HTML）。
- **Modify** `scripts/test-render-deck-s.mjs` —— 给 3 个 fixture 补 `data_refs`（使合规）+ 新增"含黑名单词 deck 必被拦截"断言。
- **Modify** `package.json` —— 新增 `"check:discipline": "node scripts/check-content-discipline.mjs"`。

---

## Task 1：营销黑名单识别（规则5 基座）

**Files:**
- Create: `scripts/content-discipline.mjs`
- Test: `scripts/test-content-discipline.mjs`

- [ ] **Step 1：写失败测试**（创建 `scripts/test-content-discipline.mjs`，先只放这段）

```js
import assert from 'node:assert/strict'
import { DEFAULT_BLACKLIST, findBlacklistHits } from './content-discipline.mjs'

// ---- 规则5 黑名单 ----
assert.deepEqual(findBlacklistHits('我们要赋能客户、构建生态'), ['赋能', '构建生态'])
assert.deepEqual(findBlacklistHits('清晰的品牌定位与差异化主张'), [])
assert.deepEqual(findBlacklistHits('自定义词命中', ['自定义词']), ['自定义词'])
assert.ok(DEFAULT_BLACKLIST.includes('打造闭环'))

console.log('✅ content-discipline test passed')
```

- [ ] **Step 2：跑测试确认失败**

Run: `node scripts/test-content-discipline.mjs`
Expected: FAIL —— `Cannot find module '.../content-discipline.mjs'`（文件还没建）。

- [ ] **Step 3：写最小实现**（创建 `scripts/content-discipline.mjs`）

```js
// 规则5：中文营销语气黑名单。仅收录 4-stage 设计文档逐字点名的空话词。
// 扩充必须经 Seven 显式批准（每个词都是策略判断，不由 AI 私自添加）。
export const DEFAULT_BLACKLIST = ['赋能', '打造闭环', '构建生态', '标志着', '里程碑', '业内认为']

export function findBlacklistHits(text, blacklist = DEFAULT_BLACKLIST) {
  const value = String(text == null ? '' : text)
  return blacklist.filter(word => word && value.includes(word))
}
```

- [ ] **Step 4：跑测试确认通过**

Run: `node scripts/test-content-discipline.mjs`
Expected: PASS —— 打印 `✅ content-discipline test passed`。

- [ ] **Step 5：提交**

```bash
git add scripts/content-discipline.mjs scripts/test-content-discipline.mjs
git commit -m "feat(discipline): add marketing blacklist detection"
```

---

## Task 2：精确数字识别（规则4 基座）

**Files:**
- Modify: `scripts/content-discipline.mjs`
- Test: `scripts/test-content-discipline.mjs`

- [ ] **Step 1：写失败测试**（在 `test-content-discipline.mjs` 的 `console.log('✅...')` 之前追加）

```js
import { findPreciseNumbers } from './content-discipline.mjs'

// ---- 规则4 精确数字识别 ----
assert.deepEqual(findPreciseNumbers('复购率达到 8.6%'), ['8.6%'])
assert.deepEqual(findPreciseNumbers('市场规模 30万 / 同比 2倍 / 客单 199元'), ['30万', '2倍', '199元'])
// 负例：不应误报（年份/序号/代号/像素/中文数词）
assert.deepEqual(findPreciseNumbers('2024年第3季度的 S03 页面 1080px'), [])
assert.deepEqual(findPreciseNumbers('千万不要忽视一倍的增长'), [])
```

> 注：`import` 语句集中在文件顶部更整洁；可把新 `import` 合并进 Task 1 的 import 行。Appendix B 是最终合并版。

- [ ] **Step 2：跑测试确认失败**

Run: `node scripts/test-content-discipline.mjs`
Expected: FAIL —— `findPreciseNumbers is not a function` / 未导出。

- [ ] **Step 3：写最小实现**（在 `content-discipline.mjs` 追加）

```js
// 规则4：精确数字 = 阿拉伯数字 + 量纲/货币单位。
// 仅匹配"阿拉伯数字+单位"，故"千万/一倍/2024年/第3页/S03/1080px"不会误报。
const PRECISE_NUMBER_RE = /\d+(?:\.\d+)?\s*%|\d+(?:\.\d+)?\s*(?:万|亿|倍|元|个百分点)|[¥￥$]\s*\d/g

export function findPreciseNumbers(text) {
  const value = String(text == null ? '' : text)
  return value.match(PRECISE_NUMBER_RE) || []
}
```

- [ ] **Step 4：跑测试确认通过**

Run: `node scripts/test-content-discipline.mjs`
Expected: PASS。

- [ ] **Step 5：提交**

```bash
git add scripts/content-discipline.mjs scripts/test-content-discipline.mjs
git commit -m "feat(discipline): add precise-number detection"
```

---

## Task 3：出处分级（规则4，复用 source-tiers.mjs）

**Files:**
- Modify: `scripts/content-discipline.mjs`
- Test: `scripts/test-content-discipline.mjs`

- [ ] **Step 1：写失败测试**（追加）

```js
import { bestTier, hasSourcedRef } from './content-discipline.mjs'

// ---- 规则4 出处存在性 ----
assert.equal(hasSourcedRef({ data_refs: [{ source: 'inputs/x/summary.md' }] }), true)
assert.equal(hasSourcedRef({ data_refs: [{ source: '' }] }), false)
assert.equal(hasSourcedRef({ data_refs: [] }), false)
assert.equal(hasSourcedRef({}), false)

// ---- 规则4 出处分级（复用 source-tiers.mjs，不另造分级）----
// 一手目录 → T1
assert.equal(bestTier({ data_refs: [{ source: 'inputs/demo/first-party/a.md' }] }, { slug: 'demo' }).tier, 'T1')
// summary.md（非 first-party 约定）→ 当前被分级为 T3（已实测）
assert.equal(bestTier({ data_refs: [{ source: 'inputs/demo/summary.md' }] }).tier, 'T3')
// 多源取最佳（最小 rank）
assert.equal(
  bestTier({ data_refs: [{ source: 'inputs/demo/summary.md' }, { source: 'inputs/demo/first-party/a.md' }] }, { slug: 'demo' }).tier,
  'T1',
)
assert.equal(bestTier({ data_refs: [] }), null)
```

- [ ] **Step 2：跑测试确认失败**

Run: `node scripts/test-content-discipline.mjs`
Expected: FAIL —— `bestTier is not a function` / 未导出。

- [ ] **Step 3：写最小实现**（在 `content-discipline.mjs` 顶部加 import，并追加函数）

文件顶部加：
```js
import { classifySource, tierRank } from './source-tiers.mjs'
```

追加：
```js
function safeClassify(source, opts) {
  try {
    return classifySource(source, opts)
  } catch {
    return { source_tier: 'T3' }
  }
}

export function hasSourcedRef(slide) {
  const refs = Array.isArray(slide.data_refs) ? slide.data_refs : []
  return refs.some(ref => ref && String(ref.source || ref.source_url || ref.url || '').trim())
}

export function bestTier(slide, opts = {}) {
  const refs = Array.isArray(slide.data_refs) ? slide.data_refs : []
  let best = null
  for (const ref of refs) {
    const source = String((ref && (ref.source || ref.source_url || ref.url)) || '').trim()
    if (!source) continue
    const tier = ref.source_tier || safeClassify(source, opts).source_tier
    const rank = tierRank(tier)
    if (best === null || rank < best.rank) best = { tier, rank }
  }
  return best
}
```

- [ ] **Step 4：跑测试确认通过**

Run: `node scripts/test-content-discipline.mjs`
Expected: PASS。

- [ ] **Step 5：提交**

```bash
git add scripts/content-discipline.mjs scripts/test-content-discipline.mjs
git commit -m "feat(discipline): add source tiering via source-tiers reuse"
```

---

## Task 4：单页校验 `lintSlide` + 标题启发（规则1/2/4/5 合体）

**Files:**
- Modify: `scripts/content-discipline.mjs`
- Test: `scripts/test-content-discipline.mjs`

- [ ] **Step 1：写失败测试**（追加）

```js
import { isTopicLikeTitle, lintSlide } from './content-discipline.mjs'

// ---- 规则2 标题启发式 ----
assert.equal(isTopicLikeTitle('客户行业卡'), true)            // 短名词短语 → 话题
assert.equal(isTopicLikeTitle('竞品分析'), true)
assert.equal(isTopicLikeTitle('PPTAgent 应聚焦品牌策划赛道'), false) // 含"应" → 结论
assert.equal(isTopicLikeTitle('定价应低于行业均值，以换取渗透'), false) // 含标点/谓词
assert.equal(isTopicLikeTitle(''), false)

// ---- lintSlide：干净页通过 ----
const cleanSlide = {
  page_no: 1,
  action_title: 'PPTAgent 应聚焦品牌策划赛道，而非通用 PPT',
  core_points: ['行业边界清晰', '价值边界清晰'],
  data_refs: [{ value: 'x', source: 'inputs/demo/summary.md', type: 'client_input' }],
}
assert.deepEqual(lintSlide(cleanSlide).violations, [])

// ---- lintSlide：缺槽位 + 黑名单 + 无出处精确数 → 违规 ----
const badSlide = {
  page_no: 2,
  action_title: '',                        // 缺行动标题
  core_points: ['赋能用户，复购率 8.6%'],   // 黑名单 + 精确数
  data_refs: [],                            // 缺出处
}
const badResult = lintSlide(badSlide)
assert.ok(badResult.violations.some(v => v.includes('缺「行动标题」')))
assert.ok(badResult.violations.some(v => v.includes('缺「出处」')))
assert.ok(badResult.violations.some(v => v.includes('赋能')))
assert.ok(badResult.violations.some(v => v.includes('8.6%') && v.includes('无任何出处')))

// ---- lintSlide：精确数 + 仅 T3 出处 → 警告（非违规）----
const t3NumberSlide = {
  page_no: 3,
  action_title: '市场仍在高速增长，应尽快卡位',
  core_points: ['年增速 30%'],
  data_refs: [{ value: '30%', source: 'inputs/demo/summary.md', type: 'client_input' }],
}
const t3Result = lintSlide(t3NumberSlide)
assert.deepEqual(t3Result.violations, [])
assert.ok(t3Result.warnings.some(w => w.includes('建议补 A 级')))
```

- [ ] **Step 2：跑测试确认失败**

Run: `node scripts/test-content-discipline.mjs`
Expected: FAIL —— `lintSlide is not a function` / 未导出。

- [ ] **Step 3：写最小实现**（在 `content-discipline.mjs` 追加）

```js
// A 级证据门槛：tierRank ≤ 2，即 T1(一手)/T2(权威研究)。A/B/C↔T1-T4 精确映射 → Phase 2b。
const A_GRADE_MAX_RANK = 2

// 行动标题"结论性"启发标记：含判断/谓词即更像结论。
const PREDICATE_MARKERS = ['应', '要', '需', '将', '是', '不是', '比', '超过', '低于', '高于', '导致', '意味', '源于', '胜', '赢', '可', '能', '必须', '应该', '优于', '劣于', '取决']

function slideText(slide) {
  return [slide.action_title, slide.page_subtitle, ...(slide.core_points || [])]
    .filter(Boolean)
    .map(String)
    .join('  ')
}

export function isTopicLikeTitle(title) {
  const value = String(title || '').trim()
  if (!value) return false
  if (/[，,：:；;。！!？?—-]/.test(value)) return false
  const cjkLen = (value.match(/[一-龥]/g) || []).length
  if (cjkLen > 6) return false
  return !PREDICATE_MARKERS.some(marker => value.includes(marker))
}

export function lintSlide(slide, opts = {}) {
  const blacklist = opts.blacklist || DEFAULT_BLACKLIST
  const page = slide.page_no != null ? slide.page_no : '?'
  const violations = []
  const warnings = []
  const text = slideText(slide)

  // 规则1 槽位存在性（可干净映射的 3 槽位；第4槽"含义建议"需上游 schema → Phase 2b）
  if (!String(slide.action_title || '').trim()) {
    violations.push(`page ${page}: 缺「行动标题」槽位`)
  }
  if (!(Array.isArray(slide.core_points) && slide.core_points.length)) {
    violations.push(`page ${page}: 缺「主证据」槽位（core_points 为空）`)
  }
  if (!(Array.isArray(slide.data_refs) && slide.data_refs.length)) {
    violations.push(`page ${page}: 缺「出处」槽位（data_refs 为空）`)
  }

  // 规则5 营销黑名单（硬违规）
  for (const word of findBlacklistHits(text, blacklist)) {
    violations.push(`page ${page}: 命中营销黑名单词「${word}」`)
  }

  // 规则4 精确数字必须可追溯（硬违规）+ A 级出处（警告 → Phase 2b 升级硬约束）
  const numbers = findPreciseNumbers(text)
  if (numbers.length) {
    if (!hasSourcedRef(slide)) {
      violations.push(`page ${page}: 出现精确数字「${numbers.join('、')}」但 data_ref 无任何出处`)
    } else {
      const best = bestTier(slide, opts)
      if (!best || best.rank > A_GRADE_MAX_RANK) {
        warnings.push(`page ${page}: 精确数字「${numbers.join('、')}」最佳出处仅 ${best ? best.tier : '无'}，建议补 A 级(T1/T2)来源`)
      }
    }
  }

  // 规则2 行动标题=结论（启发式 → 仅警告，硬判定交 LLM 关 / Phase 2b）
  const title = String(slide.action_title || '').trim()
  if (title && isTopicLikeTitle(title)) {
    warnings.push(`page ${page}: 行动标题「${title}」疑似话题而非结论，建议复核`)
  }

  return { page_no: slide.page_no, violations, warnings }
}
```

- [ ] **Step 4：跑测试确认通过**

Run: `node scripts/test-content-discipline.mjs`
Expected: PASS。

- [ ] **Step 5：提交**

```bash
git add scripts/content-discipline.mjs scripts/test-content-discipline.mjs
git commit -m "feat(discipline): add per-slide lint (slots/blacklist/number/title)"
```

---

## Task 5：整册聚合 `lintDeck` / `assertDeckDiscipline` + 真实 80 页基线冒烟

**Files:**
- Modify: `scripts/content-discipline.mjs`
- Test: `scripts/test-content-discipline.mjs`

- [ ] **Step 1：写失败测试**（追加；注意补 `node:fs`/`node:path`/`node:url` 的 import）

```js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertDeckDiscipline, lintDeck } from './content-discipline.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ---- 整册聚合 ----
assert.equal(lintDeck({ slides: [cleanSlide, cleanSlide] }).violations.length, 0)
assert.ok(lintDeck({ slides: [badSlide] }).violations.length >= 3)

// ---- assertDeckDiscipline：有违规必抛错 / 干净 deck 不抛错 ----
assert.throws(() => assertDeckDiscipline({ slides: [badSlide] }), /内容纪律红线违规/)
assert.doesNotThrow(() => assertDeckDiscipline({ slides: [cleanSlide] }))

// ---- 真实 80 页基线冒烟：不得抛错（grounding 已验证 0 黑名单 / 0 精确数 / 槽位齐全）----
const realPath = path.join(REPO_ROOT, 'outputs/pptagent-blueprint/raw-output.json')
if (fs.existsSync(realPath)) {
  const realDeck = JSON.parse(fs.readFileSync(realPath, 'utf8'))
  const realResult = assertDeckDiscipline(realDeck, { slug: 'pptagent' })
  assert.equal(realResult.violations.length, 0)
  console.log(`   · 真实 80 页基线：0 违规，${realResult.warnings.length} 条警告`)
}
```

- [ ] **Step 2：跑测试确认失败**

Run: `node scripts/test-content-discipline.mjs`
Expected: FAIL —— `assertDeckDiscipline is not a function` / 未导出。

- [ ] **Step 3：写最小实现**（在 `content-discipline.mjs` 追加）

```js
export function lintDeck(deck, opts = {}) {
  const slides = Array.isArray(deck && deck.slides) ? deck.slides : []
  const perSlide = slides.map(slide => lintSlide(slide, opts))
  return {
    violations: perSlide.flatMap(result => result.violations),
    warnings: perSlide.flatMap(result => result.warnings),
    perSlide,
  }
}

export function assertDeckDiscipline(deck, opts = {}) {
  const result = lintDeck(deck, opts)
  if (result.violations.length) {
    throw new Error(['内容纪律红线违规（失败必抛错，不静默兜底）：', ...result.violations.map(v => `  - ${v}`)].join('\n'))
  }
  return result
}
```

- [ ] **Step 4：跑测试确认通过**

Run: `node scripts/test-content-discipline.mjs`
Expected: PASS —— 应额外打印 `· 真实 80 页基线：0 违规，N 条警告`。**若真实页出现 >0 违规，停止并按"出错即重新规划"上报 Seven，不要改阈值绕过。**

- [ ] **Step 5：提交**

```bash
git add scripts/content-discipline.mjs scripts/test-content-discipline.mjs
git commit -m "feat(discipline): add deck-level assert gate + real-deck smoke"
```

---

## Task 6：CLI 闸门 + 接入出稿入口 + npm 脚本

**Files:**
- Create: `scripts/check-content-discipline.mjs`
- Modify: `scripts/render-deck-s.mjs`
- Modify: `scripts/test-render-deck-s.mjs`
- Modify: `package.json`
- Test: `scripts/test-content-discipline.mjs`（追加 CLI 段）

- [ ] **Step 1：写失败测试**（在 `test-content-discipline.mjs` 的 `console.log('✅...')` 之前追加 CLI 段；顶部补 `import { spawnSync } from 'node:child_process'` 与 `import os from 'node:os'`）

```js
import { spawnSync } from 'node:child_process'
import os from 'node:os'

// ---- CLI：干净文件 exit 0 / 违规文件 exit 1 ----
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-'))
const okFile = path.join(tmp, 'ok.json')
const badFile = path.join(tmp, 'bad.json')
fs.writeFileSync(okFile, JSON.stringify({ slides: [cleanSlide] }))
fs.writeFileSync(badFile, JSON.stringify({ slides: [badSlide] }))
const cli = path.join(REPO_ROOT, 'scripts/check-content-discipline.mjs')
assert.equal(spawnSync('node', [cli, okFile], { encoding: 'utf8' }).status, 0, 'clean deck CLI 应 exit 0')
assert.equal(spawnSync('node', [cli, badFile], { encoding: 'utf8' }).status, 1, 'violation deck CLI 应 exit 1')
fs.rmSync(tmp, { recursive: true, force: true })
```

- [ ] **Step 2：跑测试确认失败**

Run: `node scripts/test-content-discipline.mjs`
Expected: FAIL —— CLI 文件不存在，`spawnSync(...).status` 非 0/非预期（`Cannot find module`）。

- [ ] **Step 3a：创建 CLI** `scripts/check-content-discipline.mjs`

```js
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lintDeck } from './content-discipline.mjs'

async function cliMain() {
  const args = process.argv.slice(2)
  const inputJson = args.filter(a => !a.startsWith('--'))[0]
  const slugArg = args.find(a => a.startsWith('--slug='))
  if (!inputJson) {
    console.error('Usage: node scripts/check-content-discipline.mjs <deck.json> [--slug=<slug>]')
    process.exit(1)
  }
  const slug = slugArg ? slugArg.slice('--slug='.length) : undefined
  const data = JSON.parse(await fs.readFile(inputJson, 'utf8'))
  const result = lintDeck(data, slug ? { slug } : {})
  for (const w of result.warnings) console.warn(`⚠️  ${w}`)
  if (result.violations.length) {
    console.error(`\n❌ 内容纪律红线违规 ${result.violations.length} 条：`)
    for (const v of result.violations) console.error(`  - ${v}`)
    process.exit(1)
  }
  console.log(`✅ 内容纪律检查通过：${(data.slides || []).length} 页，0 违规，${result.warnings.length} 条警告`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
```

- [ ] **Step 3b：接入出稿入口** `scripts/render-deck-s.mjs`

顶部 import 区追加：
```js
import { assertDeckDiscipline } from './content-discipline.mjs'
```

在 `renderDeckS` 内，`slides.length === 0` 抛错检查之后、`const slidesHtml = ...` 之前，插入：
```js
  // 内容纪律红线闸门：违规直接抛错，绝不渲染出违规 deck（失败必抛错，不静默兜底）
  assertDeckDiscipline(data)
```

- [ ] **Step 3c：让现有渲染测试 deck 合规并新增拦截断言** `scripts/test-render-deck-s.mjs`

把 3 个 fixture 改为各带 `data_refs`（其余字段不变）：
```js
    { page_no: 1, layout: 'S05', action_title: '第一页', core_points: ['a', 'b', 'c'], data_refs: [{ value: 'demo', source: 'inputs/demo/summary.md', type: 'client_input' }] },
    { page_no: 2, layout: 'S03', action_title: '第二页', core_points: ['c'], data_refs: [{ value: 'demo', source: 'inputs/demo/summary.md', type: 'client_input' }] },
    { page_no: 3, layout: 'S09', action_title: '第三页', core_points: ['Q1:一', 'Q2:二', 'Q3:三', 'Q4:四'], data_refs: [{ value: 'demo', source: 'inputs/demo/summary.md', type: 'client_input' }] },
```

在 `await fs.rm(tmp, ...)` 之前追加拦截断言：
```js
// Phase 2a：含营销黑名单词的 deck 必须被出稿闸门拦截、不产出 HTML
const badInp = path.join(tmp, 'bad.json')
await fs.writeFile(badInp, JSON.stringify({
  client_profile: { name: 'x' },
  slides: [{ page_no: 1, layout: 'S03', action_title: '我们要赋能客户', core_points: ['x'], data_refs: [{ source: 'inputs/demo/summary.md' }] }],
}))
await assert.rejects(() => renderDeckS(badInp, path.join(tmp, 'bad.html')), /内容纪律红线违规/, '含黑名单词的 deck 应被渲染闸门拦截')
```

- [ ] **Step 3d：加 npm 脚本** `package.json`（`scripts` 块内 `"deck:pptx"` 之后追加一行）

```json
    "deck:pptx": "node scripts/deck-to-pptx.mjs",
    "check:discipline": "node scripts/check-content-discipline.mjs"
```

- [ ] **Step 4：跑全部相关测试确认通过**

Run（依次）：
```bash
node scripts/test-content-discipline.mjs
node scripts/test-render-deck-s.mjs
node scripts/check-content-discipline.mjs outputs/pptagent-blueprint/raw-output.json --slug=pptagent
```
Expected:
- 前两条均打印各自的 `✅ ... passed`；
- 第三条对真实 80 页打印 `✅ 内容纪律检查通过：80 页，0 违规，N 条警告`。

- [ ] **Step 5：提交**

```bash
git add scripts/check-content-discipline.mjs scripts/render-deck-s.mjs scripts/test-render-deck-s.mjs scripts/test-content-discipline.mjs package.json
git commit -m "feat(discipline): wire content-discipline gate into render + CLI"
```

---

## Self-Review（计划自检）

**1. 规则覆盖（对照设计文档 ③半边A 五条）：** 见上文 Scope 表。Phase 2a 完整覆盖规则5；硬覆盖规则1 的三槽位、规则4 的"无出处即违规"；警告覆盖规则2、规则4 的 tier 质量。规则3（框架优先级）、规则4 的 KPI 6 行卡 / 硬 tier、规则1 第 4 槽 —— 均**显式列入 Phase 2b**（需上游 schema），非遗漏。

**2. 占位符扫描：** 无 TBD/TODO/"类似上文"；每个代码步骤均给出完整可粘贴代码；命令与预期输出明确。

**3. 类型/命名一致性：** 跨任务函数签名一致 —— `findBlacklistHits(text, blacklist?)`、`findPreciseNumbers(text)`、`hasSourcedRef(slide)`、`bestTier(slide, opts)→{tier,rank}|null`、`isTopicLikeTitle(title)`、`lintSlide(slide, opts)→{page_no,violations,warnings}`、`lintDeck(deck, opts)→{violations,warnings,perSlide}`、`assertDeckDiscipline(deck, opts)→result|throw`。与 Appendix A 逐字一致。复用的 `classifySource`/`tierRank` 签名与 `source-tiers.mjs` 一致。

**4. 红线一致性：** 违规 → `assertDeckDiscipline` 抛错 → 渲染入口不产出 HTML；不静默兜底；黑名单只用文档点名词、不私自扩充；精确数无出处=违规、出处不达 A 级=警告（不冤杀现有 T3 一手料）；真实 80 页冒烟保证不误杀既有成果。

**5. 不破坏既有：** 仅 `test-render-deck-s.mjs` 因新增闸门需补 `data_refs`（已给完整改法）。其余测试不受影响（新模块为纯增量）。

---

## Execution Handoff

按项目工作流：**Codex 执行本计划**（非子代理），逐任务 TDD + 频繁提交；完成后 **Claude 跑独立 CP 复核**（重点：真实 80 页 0 违规、拦截断言生效、红线未被绕过），再交 **Seven 决策**。

**给执行方的红线提醒：** 若任一步真实数据出现非预期违规，**停止并上报**，不得通过调阈值/放宽正则/改成静默来"让测试变绿"。

---

## Appendix A：`scripts/content-discipline.mjs`（最终完整版，权威来源）

```js
import { classifySource, tierRank } from './source-tiers.mjs'

// ===== ③ 咨询级成稿 · 半边A 内容纪律（确定性闸门，Phase 2a）=====
// 与 LLM 主观闸门 consulting-review.mjs 互补：这里只做"可机器判定"的硬规则。
// 红线：违规必抛错，不静默兜底；不伪造、不替用户补数据。

// 规则5：中文营销语气黑名单。仅收录 4-stage 设计文档逐字点名的空话词。
// 扩充必须经 Seven 显式批准（每个词都是策略判断，不由 AI 私自添加）。
export const DEFAULT_BLACKLIST = ['赋能', '打造闭环', '构建生态', '标志着', '里程碑', '业内认为']

// 规则4：精确数字 = 阿拉伯数字 + 量纲/货币单位。
// 仅匹配"阿拉伯数字+单位"，故"千万/一倍/2024年/第3页/S03/1080px"不会误报。
const PRECISE_NUMBER_RE = /\d+(?:\.\d+)?\s*%|\d+(?:\.\d+)?\s*(?:万|亿|倍|元|个百分点)|[¥￥$]\s*\d/g

// A 级证据门槛：tierRank ≤ 2，即 T1(一手)/T2(权威研究)。A/B/C↔T1-T4 精确映射 → Phase 2b。
const A_GRADE_MAX_RANK = 2

// 行动标题"结论性"启发标记：含判断/谓词即更像结论。
const PREDICATE_MARKERS = ['应', '要', '需', '将', '是', '不是', '比', '超过', '低于', '高于', '导致', '意味', '源于', '胜', '赢', '可', '能', '必须', '应该', '优于', '劣于', '取决']

function slideText(slide) {
  return [slide.action_title, slide.page_subtitle, ...(slide.core_points || [])]
    .filter(Boolean)
    .map(String)
    .join('  ')
}

function safeClassify(source, opts) {
  try {
    return classifySource(source, opts)
  } catch {
    return { source_tier: 'T3' }
  }
}

export function findBlacklistHits(text, blacklist = DEFAULT_BLACKLIST) {
  const value = String(text == null ? '' : text)
  return blacklist.filter(word => word && value.includes(word))
}

export function findPreciseNumbers(text) {
  const value = String(text == null ? '' : text)
  return value.match(PRECISE_NUMBER_RE) || []
}

export function hasSourcedRef(slide) {
  const refs = Array.isArray(slide.data_refs) ? slide.data_refs : []
  return refs.some(ref => ref && String(ref.source || ref.source_url || ref.url || '').trim())
}

export function bestTier(slide, opts = {}) {
  const refs = Array.isArray(slide.data_refs) ? slide.data_refs : []
  let best = null
  for (const ref of refs) {
    const source = String((ref && (ref.source || ref.source_url || ref.url)) || '').trim()
    if (!source) continue
    const tier = ref.source_tier || safeClassify(source, opts).source_tier
    const rank = tierRank(tier)
    if (best === null || rank < best.rank) best = { tier, rank }
  }
  return best
}

export function isTopicLikeTitle(title) {
  const value = String(title || '').trim()
  if (!value) return false
  if (/[，,：:；;。！!？?—-]/.test(value)) return false
  const cjkLen = (value.match(/[一-龥]/g) || []).length
  if (cjkLen > 6) return false
  return !PREDICATE_MARKERS.some(marker => value.includes(marker))
}

export function lintSlide(slide, opts = {}) {
  const blacklist = opts.blacklist || DEFAULT_BLACKLIST
  const page = slide.page_no != null ? slide.page_no : '?'
  const violations = []
  const warnings = []
  const text = slideText(slide)

  // 规则1 槽位存在性（可干净映射的 3 槽位；第4槽"含义建议"需上游 schema → Phase 2b）
  if (!String(slide.action_title || '').trim()) {
    violations.push(`page ${page}: 缺「行动标题」槽位`)
  }
  if (!(Array.isArray(slide.core_points) && slide.core_points.length)) {
    violations.push(`page ${page}: 缺「主证据」槽位（core_points 为空）`)
  }
  if (!(Array.isArray(slide.data_refs) && slide.data_refs.length)) {
    violations.push(`page ${page}: 缺「出处」槽位（data_refs 为空）`)
  }

  // 规则5 营销黑名单（硬违规）
  for (const word of findBlacklistHits(text, blacklist)) {
    violations.push(`page ${page}: 命中营销黑名单词「${word}」`)
  }

  // 规则4 精确数字必须可追溯（硬违规）+ A 级出处（警告 → Phase 2b 升级硬约束）
  const numbers = findPreciseNumbers(text)
  if (numbers.length) {
    if (!hasSourcedRef(slide)) {
      violations.push(`page ${page}: 出现精确数字「${numbers.join('、')}」但 data_ref 无任何出处`)
    } else {
      const best = bestTier(slide, opts)
      if (!best || best.rank > A_GRADE_MAX_RANK) {
        warnings.push(`page ${page}: 精确数字「${numbers.join('、')}」最佳出处仅 ${best ? best.tier : '无'}，建议补 A 级(T1/T2)来源`)
      }
    }
  }

  // 规则2 行动标题=结论（启发式 → 仅警告，硬判定交 LLM 关 / Phase 2b）
  const title = String(slide.action_title || '').trim()
  if (title && isTopicLikeTitle(title)) {
    warnings.push(`page ${page}: 行动标题「${title}」疑似话题而非结论，建议复核`)
  }

  return { page_no: slide.page_no, violations, warnings }
}

export function lintDeck(deck, opts = {}) {
  const slides = Array.isArray(deck && deck.slides) ? deck.slides : []
  const perSlide = slides.map(slide => lintSlide(slide, opts))
  return {
    violations: perSlide.flatMap(result => result.violations),
    warnings: perSlide.flatMap(result => result.warnings),
    perSlide,
  }
}

export function assertDeckDiscipline(deck, opts = {}) {
  const result = lintDeck(deck, opts)
  if (result.violations.length) {
    throw new Error(['内容纪律红线违规（失败必抛错，不静默兜底）：', ...result.violations.map(v => `  - ${v}`)].join('\n'))
  }
  return result
}
```

---

## Appendix B：`scripts/test-content-discipline.mjs`（最终完整版）

```js
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_BLACKLIST,
  assertDeckDiscipline,
  bestTier,
  findBlacklistHits,
  findPreciseNumbers,
  hasSourcedRef,
  isTopicLikeTitle,
  lintDeck,
  lintSlide,
} from './content-discipline.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ---- 规则5 黑名单 ----
assert.deepEqual(findBlacklistHits('我们要赋能客户、构建生态'), ['赋能', '构建生态'])
assert.deepEqual(findBlacklistHits('清晰的品牌定位与差异化主张'), [])
assert.deepEqual(findBlacklistHits('自定义词命中', ['自定义词']), ['自定义词'])
assert.ok(DEFAULT_BLACKLIST.includes('打造闭环'))

// ---- 规则4 精确数字识别 ----
assert.deepEqual(findPreciseNumbers('复购率达到 8.6%'), ['8.6%'])
assert.deepEqual(findPreciseNumbers('市场规模 30万 / 同比 2倍 / 客单 199元'), ['30万', '2倍', '199元'])
assert.deepEqual(findPreciseNumbers('2024年第3季度的 S03 页面 1080px'), [])
assert.deepEqual(findPreciseNumbers('千万不要忽视一倍的增长'), [])

// ---- 规则4 出处存在性 ----
assert.equal(hasSourcedRef({ data_refs: [{ source: 'inputs/x/summary.md' }] }), true)
assert.equal(hasSourcedRef({ data_refs: [{ source: '' }] }), false)
assert.equal(hasSourcedRef({ data_refs: [] }), false)
assert.equal(hasSourcedRef({}), false)

// ---- 规则4 出处分级（复用 source-tiers.mjs）----
assert.equal(bestTier({ data_refs: [{ source: 'inputs/demo/first-party/a.md' }] }, { slug: 'demo' }).tier, 'T1')
assert.equal(bestTier({ data_refs: [{ source: 'inputs/demo/summary.md' }] }).tier, 'T3')
assert.equal(
  bestTier({ data_refs: [{ source: 'inputs/demo/summary.md' }, { source: 'inputs/demo/first-party/a.md' }] }, { slug: 'demo' }).tier,
  'T1',
)
assert.equal(bestTier({ data_refs: [] }), null)

// ---- 规则2 标题启发式 ----
assert.equal(isTopicLikeTitle('客户行业卡'), true)
assert.equal(isTopicLikeTitle('竞品分析'), true)
assert.equal(isTopicLikeTitle('PPTAgent 应聚焦品牌策划赛道'), false)
assert.equal(isTopicLikeTitle('定价应低于行业均值，以换取渗透'), false)
assert.equal(isTopicLikeTitle(''), false)

// ---- lintSlide ----
const cleanSlide = {
  page_no: 1,
  action_title: 'PPTAgent 应聚焦品牌策划赛道，而非通用 PPT',
  core_points: ['行业边界清晰', '价值边界清晰'],
  data_refs: [{ value: 'x', source: 'inputs/demo/summary.md', type: 'client_input' }],
}
assert.deepEqual(lintSlide(cleanSlide).violations, [])

const badSlide = {
  page_no: 2,
  action_title: '',
  core_points: ['赋能用户，复购率 8.6%'],
  data_refs: [],
}
const badResult = lintSlide(badSlide)
assert.ok(badResult.violations.some(v => v.includes('缺「行动标题」')))
assert.ok(badResult.violations.some(v => v.includes('缺「出处」')))
assert.ok(badResult.violations.some(v => v.includes('赋能')))
assert.ok(badResult.violations.some(v => v.includes('8.6%') && v.includes('无任何出处')))

const t3NumberSlide = {
  page_no: 3,
  action_title: '市场仍在高速增长，应尽快卡位',
  core_points: ['年增速 30%'],
  data_refs: [{ value: '30%', source: 'inputs/demo/summary.md', type: 'client_input' }],
}
const t3Result = lintSlide(t3NumberSlide)
assert.deepEqual(t3Result.violations, [])
assert.ok(t3Result.warnings.some(w => w.includes('建议补 A 级')))

// ---- 整册聚合 + 断言闸门 ----
assert.equal(lintDeck({ slides: [cleanSlide, cleanSlide] }).violations.length, 0)
assert.ok(lintDeck({ slides: [badSlide] }).violations.length >= 3)
assert.throws(() => assertDeckDiscipline({ slides: [badSlide] }), /内容纪律红线违规/)
assert.doesNotThrow(() => assertDeckDiscipline({ slides: [cleanSlide] }))

// ---- 真实 80 页基线冒烟：不得抛错 ----
const realPath = path.join(REPO_ROOT, 'outputs/pptagent-blueprint/raw-output.json')
if (fs.existsSync(realPath)) {
  const realDeck = JSON.parse(fs.readFileSync(realPath, 'utf8'))
  const realResult = assertDeckDiscipline(realDeck, { slug: 'pptagent' })
  assert.equal(realResult.violations.length, 0)
  console.log(`   · 真实 80 页基线：0 违规，${realResult.warnings.length} 条警告`)
}

// ---- CLI：干净文件 exit 0 / 违规文件 exit 1 ----
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-'))
const okFile = path.join(tmp, 'ok.json')
const badFile = path.join(tmp, 'bad.json')
fs.writeFileSync(okFile, JSON.stringify({ slides: [cleanSlide] }))
fs.writeFileSync(badFile, JSON.stringify({ slides: [badSlide] }))
const cli = path.join(REPO_ROOT, 'scripts/check-content-discipline.mjs')
assert.equal(spawnSync('node', [cli, okFile], { encoding: 'utf8' }).status, 0, 'clean deck CLI 应 exit 0')
assert.equal(spawnSync('node', [cli, badFile], { encoding: 'utf8' }).status, 1, 'violation deck CLI 应 exit 1')
fs.rmSync(tmp, { recursive: true, force: true })

console.log('✅ content-discipline test passed')
```

---

## Appendix C：黑名单候选扩充清单（**需 Seven 显式批准后才进 DEFAULT_BLACKLIST**）

默认词表只含设计文档逐字点名的 6 词。以下为中文品牌营销常见空话候选，**不**默认启用（每个都是策略判断，由 Seven 勾选）：
`抓手`、`闭环`、`沉淀`、`心智`、`护城河`、`降维打击`、`颠覆`、`重新定义`、`无缝`、`一站式`、`全方位`、`行业领先`、`顶尖`、`最佳`、`第一`、`生态赋能`。
启用方式（任选其一，Phase 2b 决定）：①直接加进 `DEFAULT_BLACKLIST`；②通过 `lintSlide(slide, { blacklist })` 传入扩充表。
