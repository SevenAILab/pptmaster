# Engine V2 · Phase 2c — 假设感知证据评审（Assumption-Aware Consulting Review）实施计划

> **For agentic workers (Codex):** 本文件是交给 Codex 的实施规格。用 TDD 逐任务执行，步骤用 `- [ ]` 勾选。每个任务先写失败测试 → 跑红 → 最小实现 → 跑绿 → 提交。**不要**在一次提交里塞多个任务。

**Goal:** 让 Consulting Review（评审 LLM）能区分「把没有来源的判断当事实/行动结论硬写」与「诚实标注为待验证假设并给出依据+验证方法」，从而让证据天然稀缺的主体（开源项目 / 早期公司）也能产出**诚实、全程标注**的方案，而不是被一刀切 BLOCK；同时严守红线（没来源只能进假设，绝不编造事实）。

**Architecture:** 在评审层之外新增一个纯函数策略模块 `scripts/assumption-policy.mjs`（确定性、可单测），负责三件事：①逐页把证据状态分类为 evidenced / hypothesis / unsupported；②反偷懒检查（假设必须建立在「真的搜过仍找不到 T1/T2」之上）；③统计假设占比并在超阈值时生成验证清单。`consulting-review.mjs` 调用这些纯函数做**确定性硬闸**（在打分之前），并改写 Q4 评分细则使其对诚实假设公平打分。`assemble-by-blueprint.mjs` 聚合全卷假设、在卷首/卷尾挂「待验证假设清单」页、给整卷打 `pending_validation` 标记——但即便假设超标也照常出整卷。

**Tech Stack:** Node.js ESM（`.mjs`），`node:test` / `node:assert`，复用 `scripts/source-tiers.mjs` 的 `classifySource` / `isHttpSource`。

---

## 背景与必须遵守的红线（不可删改）

- **红线：** 失败必抛错、不静默兜底、不伪造数据;证据不足→触发抓取/上传/草稿,绝不编数据填空;每个数字可追溯(来源+日期+等级T1-T4);借鉴的开源模板里的"示例假数字"严禁进入产出;所有事实必须可追溯;没有 source 的内容只能写入 assumptions,不得伪装成事实。
- **本次设计如何与红线一致：** 我们**不放松**「没来源不能当事实」这条；我们只是给「诚实标注的假设」一条合法通道。一个判断要么有 T1/T2 证据（事实），要么被明确标注为待验证假设（带依据 + 验证方法）。**第三种情况——没来源却写成事实/行动结论——依旧是红线违规，确定性硬 BLOCK。**
- **为什么要改：** Codex 连续 3 小时、20+ 个 `fix(stage2)` 提交仍 BLOCK，根因是**改错了层**：它在打磨 deepresearch「写手」的假设标注，而 BLOCK 来自 Consulting Review「评委」，评委根本不懂「假设」概念，只要关键判断缺 T1/T2 就把 data_credibility 打到 BLOCK。开源项目（如 PPTAgent）天然拿不到竞品/需求的一手数据，于是陷入死循环。本计划修评委这一层。
- **Seven 的两个决策（必须落地）：**
  1. **「改设计支持开源/早期主体」** —— 评委要假设感知，让诚实的证据稀缺主体能过。
  2. **「出案但全程标注假设 + 附验证清单」** —— 当假设占比超阈值时，**不 BLOCK、不假 PASS**，照常出整卷，但把假设页标「待验证」并在卷首/卷尾附「需要补哪些证据」的验证清单。

---

## 数据契约（写手 → 评委 → 组装 三层共用）

每个 slide 在 `chunkOutput.slides[]` 中**新增**结构化字段（不破坏现有字段）：

```jsonc
{
  "page_no": 3,
  "action_title": "……",
  "core_points": ["……"],
  "data_refs": [{ "source": "https://…", "source_tier": "T2", "date": "2026-05-12" }],

  // 新增：证据状态。三选一。
  "evidence_status": "evidenced",   // "evidenced" | "hypothesis"
  // 仅当 evidence_status === "hypothesis" 时必填，且两者都必须非空：
  "hypothesis_basis": "基于 X 的类比推理 / 行业常识 / 上游 chunk 的间接信号",
  "validation_method": "需要向客户索取 Y 数据 / 需要做 Z 调研 / 需要访谈 N 人"
}
```

- 写手缺省写 `"evidence_status": "evidenced"`。只有当这一页的关键判断拿不到 T1/T2 时，写手才必须改成 `"hypothesis"` 并补 `hypothesis_basis` + `validation_method`。
- 评委据此判定：`hypothesis` 但缺 basis 或 method → 视为 `unsupported`（红线违规）。
- **关键判断页（key-judgment slide）** 的定义（确定性）：`action_title` 或任一 `core_points` 命中行动/结论动词正则 `/应该|应当|应以|建议|切入|抢占|占据|定位为|成为|主打|发力|将会|预计|领先|首选|唯一/`。非关键判断页（纯描述/背景/目录）不参与证据分类与假设占比计算。

---

## 常量（集中在 `assumption-policy.mjs` 顶部导出）

```js
export const MIN_SEARCHES_FOR_ASSUMPTION = 3   // 假设必须建立在 ≥3 次真实搜索之上
export const ASSUMPTION_RATIO_CAP = 0.4         // 关键判断页中假设占比 > 40% → 触发整卷待验证 + 验证清单
export const KEY_JUDGMENT_RE = /应该|应当|应以|建议|切入|抢占|占据|定位为|成为|主打|发力|将会|预计|领先|首选|唯一/
```

---

## 文件结构

- **Create** `scripts/assumption-policy.mjs` — 纯函数策略模块（无 I/O、无 LLM）。
- **Create** `scripts/test-assumption-policy.mjs` — 单元测试。
- **Modify** `scripts/consulting-review.mjs` — 引入策略模块做确定性硬闸 + 改写 Q4 细则 + 新 `deriveConsultingVerdict`。
- **Modify** `scripts/test-consulting-review.mjs`（若不存在则 Create）— 评委层集成测试。
- **Modify** `scripts/sub-agents/deepresearch-common.mjs` — 写手输出结构化 `evidence_status` / `hypothesis_basis` / `validation_method`（**契约级要求**，见 Task 4；该文件 Codex 正在并发编辑，按契约接入即可，不要照搬行号）。
- **Modify** `scripts/assemble-by-blueprint.mjs` — 聚合假设、挂验证清单页、打 `pending_validation` 标记。
- **Modify** `scripts/test-assemble-by-blueprint.mjs`（若不存在则 Create）— 组装层测试。

---

## Task 1：纯函数策略模块——逐页证据分类

**Files:**
- Create: `scripts/assumption-policy.mjs`
- Test: `scripts/test-assumption-policy.mjs`

- [ ] **Step 1: 写失败测试**

```js
// scripts/test-assumption-policy.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { classifySlideEvidence } from './assumption-policy.mjs'

test('有 T2 data_ref 的关键判断页 = evidenced', () => {
  const slide = {
    action_title: '应以开发者体验切入',
    core_points: ['核心论点'],
    data_refs: [{ source: 'https://example.com/report', source_tier: 'T2' }],
  }
  assert.equal(classifySlideEvidence(slide), 'evidenced')
})

test('诚实标注且 basis+method 齐全的关键判断页 = hypothesis', () => {
  const slide = {
    action_title: '建议定位为开发者优先（待验证假设）',
    core_points: ['进入验证清单'],
    data_refs: [],
    evidence_status: 'hypothesis',
    hypothesis_basis: '基于同类开源项目的类比',
    validation_method: '需向客户索取真实装机/活跃数据',
  }
  assert.equal(classifySlideEvidence(slide), 'hypothesis')
})

test('关键判断页无 T1/T2 又没标假设 = unsupported（红线违规）', () => {
  const slide = {
    action_title: '应抢占企业市场',
    core_points: ['立即发力高端'],
    data_refs: [{ source: 'https://forum.example/post', source_tier: 'T4' }],
  }
  assert.equal(classifySlideEvidence(slide), 'unsupported')
})

test('标了 hypothesis 但缺 validation_method = unsupported', () => {
  const slide = {
    action_title: '建议成为行业首选',
    core_points: [],
    data_refs: [],
    evidence_status: 'hypothesis',
    hypothesis_basis: '直觉',
    validation_method: '',
  }
  assert.equal(classifySlideEvidence(slide), 'unsupported')
})

test('非关键判断页（纯描述）= descriptive，不参与证据闸', () => {
  const slide = { action_title: '行业背景概览', core_points: ['市场分三段'], data_refs: [] }
  assert.equal(classifySlideEvidence(slide), 'descriptive')
})
```

- [ ] **Step 2: 跑红**

Run: `node --test scripts/test-assumption-policy.mjs`
Expected: FAIL（`classifySlideEvidence is not a function`）

- [ ] **Step 3: 最小实现**

```js
// scripts/assumption-policy.mjs
import { classifySource } from './source-tiers.mjs'

export const MIN_SEARCHES_FOR_ASSUMPTION = 3
export const ASSUMPTION_RATIO_CAP = 0.4
export const KEY_JUDGMENT_RE = /应该|应当|应以|建议|切入|抢占|占据|定位为|成为|主打|发力|将会|预计|领先|首选|唯一/

function isKeyJudgmentSlide(slide) {
  const text = [slide.action_title || '', ...(slide.core_points || [])].join(' ')
  return KEY_JUDGMENT_RE.test(text)
}

function hasStrongEvidence(slide) {
  return (slide.data_refs || []).some(ref => {
    // 先信已声明的 source_tier；其次用 classifySource 推断。
    const declared = String(ref.source_tier || '').toUpperCase()
    if (declared === 'T1' || declared === 'T2') return true
    // ⚠️ classifySource 返回的是对象 { source_tier, ... }，不是裸字符串。
    const inferred = classifySource(ref.source || ref.source_url || ref.url || '')
    const tier = String(inferred?.source_tier || '').toUpperCase()
    return tier === 'T1' || tier === 'T2'
  })
}

// 返回 'evidenced' | 'hypothesis' | 'unsupported' | 'descriptive'
export function classifySlideEvidence(slide) {
  if (!isKeyJudgmentSlide(slide)) return 'descriptive'
  if (hasStrongEvidence(slide)) return 'evidenced'
  if (
    slide.evidence_status === 'hypothesis' &&
    String(slide.hypothesis_basis || '').trim() &&
    String(slide.validation_method || '').trim()
  ) {
    return 'hypothesis'
  }
  return 'unsupported'
}
```

> 注意（已核对真实实现）：`scripts/source-tiers.mjs` 的 `classifySource(source, opts)` 返回**对象** `{ source_tier, source_label, type, tier_inferred }`，不是裸字符串——所以上面取的是 `.source_tier`。空来源/未验证本地来源默认 `T3`；本地一手资料要判成 `T1` 需要传 `opts`（slug / 允许的本地根目录），评委层未必有这些上下文，因此 `hasStrongEvidence` **优先采信 data_ref 上已声明的 `source_tier` 字段**，classifySource 仅作 http 来源的兜底推断。**不要**放松「只有 T1/T2 才算强证据」这条。

- [ ] **Step 4: 跑绿**

Run: `node --test scripts/test-assumption-policy.mjs`
Expected: PASS（5 个用例全绿）

- [ ] **Step 5: 提交**

```bash
git add scripts/assumption-policy.mjs scripts/test-assumption-policy.mjs
git commit -m "feat(review): add deterministic slide evidence classifier"
```

---

## Task 2：反偷懒搜索闸 + 假设占比统计

**Files:**
- Modify: `scripts/assumption-policy.mjs`
- Test: `scripts/test-assumption-policy.mjs`

- [ ] **Step 1: 追加失败测试**

```js
import {
  evaluateChunkAssumptions,
  MIN_SEARCHES_FOR_ASSUMPTION,
  ASSUMPTION_RATIO_CAP,
} from './assumption-policy.mjs'

const evidencedSlide = {
  action_title: '应以开发者体验切入',
  data_refs: [{ source_tier: 'T2', source: 'https://a.com' }],
}
const honestHypo = {
  action_title: '建议定位为开发者优先（待验证）',
  data_refs: [],
  evidence_status: 'hypothesis',
  hypothesis_basis: '类比',
  validation_method: '索取真实数据',
}
const unsupported = { action_title: '应抢占企业市场', data_refs: [] }

test('有 unsupported 页 → hardBlock=true', () => {
  const r = evaluateChunkAssumptions(
    { slides: [unsupported], metadata: { total_searches: 9, web_search_used: true } },
  )
  assert.equal(r.hardBlock, true)
  assert.match(r.blockReason, /未标注|当事实|unsupported/i)
})

test('诚实假设但没搜够 → 偷懒硬 BLOCK', () => {
  const r = evaluateChunkAssumptions(
    { slides: [honestHypo], metadata: { total_searches: 1, web_search_used: true } },
  )
  assert.equal(r.hardBlock, true)
  assert.match(r.blockReason, /搜索|search|偷懒/i)
})

test('诚实假设 + 搜够了 → 不 BLOCK，计入占比', () => {
  const r = evaluateChunkAssumptions(
    { slides: [evidencedSlide, honestHypo], metadata: { total_searches: 5, web_search_used: true } },
  )
  assert.equal(r.hardBlock, false)
  assert.equal(r.keyJudgmentCount, 2)
  assert.equal(r.hypothesisCount, 1)
  assert.equal(r.assumptionRatio, 0.5)
  assert.equal(r.overflow, true) // 0.5 > 0.4
})

test('全是 evidenced → 占比 0、不溢出', () => {
  const r = evaluateChunkAssumptions(
    { slides: [evidencedSlide], metadata: { total_searches: 4, web_search_used: true } },
  )
  assert.equal(r.hardBlock, false)
  assert.equal(r.assumptionRatio, 0)
  assert.equal(r.overflow, false)
})
```

- [ ] **Step 2: 跑红**

Run: `node --test scripts/test-assumption-policy.mjs`
Expected: FAIL（`evaluateChunkAssumptions is not a function`）

- [ ] **Step 3: 实现**

```js
// 追加到 scripts/assumption-policy.mjs
export function evaluateChunkAssumptions(chunkOutput, options = {}) {
  const minSearches = options.minSearches ?? MIN_SEARCHES_FOR_ASSUMPTION
  const cap = options.cap ?? ASSUMPTION_RATIO_CAP
  const slides = chunkOutput.slides || []
  const meta = chunkOutput.metadata || {}

  const statuses = slides.map(classifySlideEvidence)
  const keyJudgmentCount = statuses.filter(s => s !== 'descriptive').length
  const hypothesisCount = statuses.filter(s => s === 'hypothesis').length
  const unsupportedSlides = slides.filter((_, i) => statuses[i] === 'unsupported')

  // 红线硬闸 1：把没来源的判断当事实/行动结论写。
  if (unsupportedSlides.length > 0) {
    const pages = unsupportedSlides.map(s => s.page_no).filter(Boolean)
    return {
      hardBlock: true,
      blockReason: `第 ${pages.join(',') || '?'} 页关键判断缺 T1/T2 证据，且未标注为待验证假设——把未经证实的判断当事实写，违反红线。`,
      keyJudgmentCount, hypothesisCount, assumptionRatio: 0, overflow: false,
    }
  }

  // 反偷懒硬闸 2：有假设却没真搜过，等于用「假设」逃避取证。
  if (hypothesisCount > 0) {
    const searched = Number(meta.total_searches || 0)
    const usedWeb = meta.web_search_used === true
    if (!usedWeb || searched < minSearches) {
      return {
        hardBlock: true,
        blockReason: `本 chunk 含 ${hypothesisCount} 条待验证假设，但仅检索 ${searched} 次 / web_search_used=${usedWeb}；假设必须建立在「真的搜过(≥${minSearches}次)仍拿不到 T1/T2」之上，否则视为偷懒。`,
        keyJudgmentCount, hypothesisCount, assumptionRatio: 0, overflow: false,
      }
    }
  }

  const assumptionRatio = keyJudgmentCount === 0
    ? 0
    : Number((hypothesisCount / keyJudgmentCount).toFixed(4))

  return {
    hardBlock: false,
    blockReason: '',
    keyJudgmentCount,
    hypothesisCount,
    assumptionRatio,
    overflow: assumptionRatio > cap,
  }
}
```

- [ ] **Step 4: 跑绿**

Run: `node --test scripts/test-assumption-policy.mjs`
Expected: PASS（全部用例）

- [ ] **Step 5: 提交**

```bash
git add scripts/assumption-policy.mjs scripts/test-assumption-policy.mjs
git commit -m "feat(review): add anti-laziness search gate and assumption ratio"
```

---

## Task 3：评委接入确定性硬闸 + 改写 Q4 细则 + 新 verdict

**Files:**
- Modify: `scripts/consulting-review.mjs`
- Test: `scripts/test-consulting-review.mjs`（不存在则 Create）

### 3a：在 `normalizeConsultingReviewResponse` / `runConsultingReview` 之前插入确定性硬闸

- [ ] **Step 1: 写失败测试**（用注入的假 `callStep`，不打真 LLM）

```js
// scripts/test-consulting-review.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { runConsultingReview } from './consulting-review.mjs'

const noop = async () => {}
function fakeLLM(scoreJson) {
  return async () => ({ text: JSON.stringify(scoreJson), usage: {}, provider: 'test', model: 'test' })
}

test('unsupported 页 → 确定性 BLOCK，即使 LLM 想给高分', async () => {
  const chunk = {
    blueprint_chunk_id: 'c1',
    slides: [{ page_no: 1, action_title: '应抢占企业市场', core_points: [], data_refs: [] }],
    metadata: { total_searches: 9, web_search_used: true },
  }
  await assert.rejects(
    () => runConsultingReview(chunk, 'slugx', {
      callStep: fakeLLM({ insight_depth_score: 9, consulting_tone_score: 9, page_efficiency_score: 9, data_credibility_score: 9, key_weakness: 'x', verdict: 'PASS' }),
      appendLLMAuditLog: noop, appendReviewAuditLog: noop,
    }),
    /红线|unsupported|当事实/i,
  )
})

test('诚实假设 + 搜够了 + 分数达标 → PASS，并带 assumption 元信息', async () => {
  const chunk = {
    blueprint_chunk_id: 'c2',
    slides: [
      { page_no: 1, action_title: '应以开发者体验切入', data_refs: [{ source_tier: 'T2', source: 'https://a.com' }] },
      { page_no: 2, action_title: '建议定位为开发者优先（待验证）', data_refs: [], evidence_status: 'hypothesis', hypothesis_basis: '类比', validation_method: '索取数据' },
    ],
    metadata: { total_searches: 6, web_search_used: true },
  }
  const entry = await runConsultingReview(chunk, 'slugx', {
    callStep: fakeLLM({ insight_depth_score: 8, consulting_tone_score: 8, page_efficiency_score: 7, data_credibility_score: 7, key_weakness: 'x', verdict: 'PASS' }),
    appendLLMAuditLog: noop, appendReviewAuditLog: noop,
  })
  assert.equal(entry.verdict, 'PASS')
  assert.equal(entry.assumption_ratio, 0.5)
  assert.equal(entry.assumption_overflow, true)
})
```

- [ ] **Step 2: 跑红** — `node --test scripts/test-consulting-review.mjs` → FAIL

- [ ] **Step 3: 实现** — 在 `consulting-review.mjs` 顶部 import，并在 `runConsultingReview` 内、打分归一化之后插入硬闸；把统计塞进 `entry`：

```js
import { evaluateChunkAssumptions } from './assumption-policy.mjs'
```

在 `runConsultingReview` 里，构造 `entry` 之前加：

```js
  const assumption = evaluateChunkAssumptions(chunkOutput)
  if (assumption.hardBlock) {
    const error = new Error(`Consulting Review BLOCKED chunk ${chunkOutput.blueprint_chunk_id || ''}: ${assumption.blockReason}`)
    error.consultingReview = {
      chunk_id: chunkOutput.blueprint_chunk_id || '',
      timestamp: new Date().toISOString(),
      verdict: 'BLOCK',
      key_weakness: assumption.blockReason,
      assumption_ratio: assumption.assumptionRatio,
      assumption_overflow: assumption.overflow,
      hard_block: true,
    }
    await appendReviewAuditLog(slug, error.consultingReview)
    throw error
  }
```

然后把 `assumption_ratio` / `assumption_overflow` / `key_judgment_count` / `hypothesis_count` 合并进既有 `entry`：

```js
  const entry = {
    chunk_id: chunkOutput.blueprint_chunk_id || '',
    timestamp: new Date().toISOString(),
    assumption_ratio: assumption.assumptionRatio,
    assumption_overflow: assumption.overflow,
    key_judgment_count: assumption.keyJudgmentCount,
    hypothesis_count: assumption.hypothesisCount,
    ...review,
  }
```

> 顺序要点：硬闸在「打分 LLM 调用之后、构造/抛 BLOCK 之前」。这样：(a) unsupported / 偷懒 → 确定性 BLOCK，**不被 LLM 的高分覆盖**；(b) 诚实假设不再因 data_credibility 被 LLM 打低而 BLOCK——因为它已通过硬闸，剩下的 `verdictFromScores` 仍按均分走，但 Q4 细则（3b）会指导 LLM 对诚实假设公平打分。

### 3b：改写 Q4 细则，让 LLM 对「诚实假设」公平打分

- [ ] **Step 4: 编辑 `buildConsultingReviewPrompt` 的 Q4 段落**，替换为假设感知版（保留 T1-T4 概念）：

```
'Q4 data_credibility_score: data_refs 的来源是否可信, 且未把未经证实的判断当事实?',
'- 关键区分: 一个关键判断只有两种合法形态——(A)有 T1/T2 证据的事实; (B)被明确标注 evidence_status=hypothesis 且给出 hypothesis_basis + validation_method 的待验证假设。第三种「没来源却写成事实/行动结论」是红线违规。',
'- 8+: 关键判断要么由当前客户 inputs/<slug>/first-party/** 一手 / T2 权威二手支撑; 要么诚实标注为待验证假设(带依据+验证方法)。assets/_raw/cases/** 只能作方法论范例。',
'- 5-7: 多数有 T2/T3 或诚实假设标注, 个别依据偏弱。',
'- 3-4: 假设虽多但仍诚实标注; 或 T3/T4 为主、关键判断缺 T1/T2 但未伪装成事实。',
'- 1-2: 出现把未经证实判断当事实写、假来源、不可访问、无 source、或 inputs/<slug>/summary.md 当数据。',
'注意: 诚实标注的待验证假设不应被当作低可信度而打到 BLOCK; 真正该重罚的是「把没来源的判断当事实/行动结论」。该违规已由确定性硬闸拦截, 你只需正常打分。',
```

- [ ] **Step 5: 跑绿 + 跑全量评委测试**

Run: `node --test scripts/test-consulting-review.mjs`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add scripts/consulting-review.mjs scripts/test-consulting-review.mjs
git commit -m "feat(review): assumption-aware deterministic gate and Q4 rubric"
```

---

## Task 4：写手输出结构化假设字段（契约级）

**Files:**
- Modify: `scripts/sub-agents/deepresearch-common.mjs`

> ⚠️ 该文件 Codex 正在并发高频编辑。**只按契约接入，不要照搬行号**。现有逻辑（约 776 行 `markedAsAssumption` 正则、1182-1196 行 `hypothesisActionHint`）已经能识别 prose 里的「待验证/假设」。本任务只是把这个隐式信号**显式化**为结构化字段。

**契约要求：** 写手产出每个 slide 时：
- 默认 `evidence_status: 'evidenced'`。
- 当这一页的关键判断没有 T1/T2 data_refs、且现有 `markedAsAssumption` 逻辑判定它是待验证假设时：设 `evidence_status: 'hypothesis'`，并填 `hypothesis_basis`（这页假设的推理依据，非空）与 `validation_method`（要补什么证据才能坐实，非空）。
- 已有的「把行动动词改写成『进入验证清单』」逻辑保留——它和结构化字段并行，不冲突。

- [ ] **Step 1: 写/扩测试**（用 `scripts/test-deepresearch-guardrail.mjs` 既有夹具，或新增小用例）：构造一个「关键判断 + 无 T1/T2 + prose 含『待验证』」的 write 输出，断言归一化后 `slide.evidence_status === 'hypothesis'` 且 `hypothesis_basis`/`validation_method` 非空。
- [ ] **Step 2: 跑红**
- [ ] **Step 3: 在写手归一化 slide 的位置接入**（找到现有 `markedAsAssumption` 分支，附带 set 结构化字段；basis 可取该页 reasoning/thinking 摘要，method 可取现有 retry hint 文案「需要……才能验证」）。**不要**伪造 basis/method——若写手拿不到真实依据，应继续走现有的 retry/抛错路径，而不是塞空字符串（空字符串会被 Task 1 判为 `unsupported` → 硬 BLOCK，正确行为）。
- [ ] **Step 4: 跑绿** — `node --test scripts/test-deepresearch-guardrail.mjs`
- [ ] **Step 5: 提交** — `git commit -m "feat(stage2): emit structured evidence_status on slides"`

---

## Task 5：组装层——聚合假设、挂验证清单页、打整卷待验证标记

**Files:**
- Modify: `scripts/assemble-by-blueprint.mjs`
- Test: `scripts/test-assemble-by-blueprint.mjs`（不存在则 Create）

- [ ] **Step 1: 写失败测试** — 构造两个 chunk 输出（一个含 hypothesis 页），跑 `assembleByBlueprint`（用 `skipCountAssert` 或最小 blueprint stub），断言：
  - `merged.metadata.pending_validation === true`（存在任一 hypothesis 页时）。
  - `merged.metadata.validation_checklist` 是数组，每项含 `{ page_no, chunk_id, claim, validation_method }`。
  - 合并后的 slides 里 hypothesis 页带 `pending_validation: true` 标记（供渲染层打「待验证」角标）。

- [ ] **Step 2: 跑红**

- [ ] **Step 3: 实现** — 在 `assembleByBlueprint` 合并 slides 后、写 `merged` 前加：

```js
// MVP 只需 classifySlideEvidence；buildValidationChecklist 是可选 Step，实现了才一并 import
// （ESM 里 import 一个未导出的名字会在加载时直接抛错，别提前写进来）。
import { classifySlideEvidence } from './assumption-policy.mjs'
```

```js
  const hypothesisSlides = mergedSlides.filter(s => classifySlideEvidence(s) === 'hypothesis')
  const validationChecklist = hypothesisSlides.map(s => ({
    page_no: s.page_no,
    chunk_id: s.chunk_id,
    claim: s.action_title || '',
    hypothesis_basis: s.hypothesis_basis || '',
    validation_method: s.validation_method || '',
  }))
  for (const s of hypothesisSlides) s.pending_validation = true
```

并在 `merged.metadata` 里加：

```js
      pending_validation: hypothesisSlides.length > 0,
      validation_checklist: validationChecklist,
      assumption_summary: {
        hypothesis_pages: hypothesisSlides.length,
        total_key_pages: mergedSlides.filter(s => classifySlideEvidence(s) !== 'descriptive').length,
      },
```

> `buildValidationChecklist` 可选：若想在卷首/卷尾插一页真正的「待验证假设清单」slide（而非仅 metadata），在 `assumption-policy.mjs` 里加一个纯函数生成该 slide 对象（layout 用现有清单类 layout），并在 mergedSlides 头部 unshift。先做 metadata + 逐页标记（MVP），清单页可作为 Task 5 的可选 Step。**渲染层（render-deck.mjs）读 `pending_validation` 打角标**留作下一阶段，不在本计划内。

- [ ] **Step 4: 跑绿** — `node --test scripts/test-assemble-by-blueprint.mjs`

- [ ] **Step 5: 提交** — `git commit -m "feat(assemble): attach validation checklist for pending-validation deck"`

---

## Task 6：端到端冒烟（不烧大量 token）

- [ ] **Step 1:** 用一个**已有的** chunk 输出夹具（或最小手写 JSON）跑 `node scripts/consulting-review.mjs <chunk-output.json>`，确认：诚实假设 chunk 不再无脑 BLOCK；unsupported chunk 仍 BLOCK。
- [ ] **Step 2:** 全量单测：`node --test scripts/test-assumption-policy.mjs scripts/test-consulting-review.mjs scripts/test-assemble-by-blueprint.mjs scripts/test-deepresearch-guardrail.mjs`，全绿。
- [ ] **Step 3:** （由 Seven 触发的真 LLM 跑 **不在本计划**，避免烧 token；real-run 前记得 `unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL` 绕过 env 遮蔽。）

---

## Self-Review（写完计划后自查）

- **红线覆盖：** unsupported（没来源当事实）→ 确定性硬 BLOCK ✅；偷懒（没搜就假设）→ 硬 BLOCK ✅；诚实假设 → 合法通道 ✅；空 basis/method → 退回 unsupported ✅。
- **Seven 决策覆盖：** ①假设感知评委（Task 1-3）✅；②出案+标注+验证清单（Task 5）✅。
- **类型一致：** `evidence_status` / `hypothesis_basis` / `validation_method` 在写手(Task4)、评委(Task1-3)、组装(Task5) 三处命名一致 ✅。
- **占位符扫描：** 无 TODO/TBD；每个代码步骤给了可运行代码 ✅。
- **并发风险：** Task 4 针对 Codex 正在编辑的 deepresearch-common.mjs，已降级为契约级（不锁行号）✅。

---

## 给小白的讲解

- **现在做的是什么：** 我写了一份给 Codex 执行的「改造说明书」。核心是改造那个给方案打分的"评委AI"——让它学会区分两种情况：① 你拍脑袋瞎写当成事实（要打回去），② 你诚实地说"这是我的假设，还没证据，需要后续验证"（这是允许的）。
- **目的·为什么：** 你的项目里有些主体（比如开源软件、刚成立的早期公司）在网上**根本查不到**竞品、需求这类一手数据。旧评委不懂"假设"，只要查不到证据就一律打回，结果 Codex 跑了 3 小时、改了 20 多次都过不了关——它一直在修错的地方。新设计给"诚实的假设"开一条合法路：查不到就老实标"待验证"，并附上"要补哪些证据"的清单，方案照样能出，但绝不把没根据的话当成事实——这条红线一点没松。还加了一道"反偷懒"闸：你必须真的搜过（≥3次）还查不到，才允许写假设，不能用"假设"两个字偷懒逃避取证。
- **你怎么自己核查：** ① 文件已写到 `docs/handoffs/2026-05-30-engine-v2-phase2c-assumption-aware-evidence-plan.md`，你可以打开看「给小白的讲解」和开头的 Goal 是否就是你要的。② 等 Codex 执行后，让它跑 `node --test scripts/test-assumption-policy.mjs` 等测试，**全绿**说明逻辑对；拿一个"诚实标注假设"的例子过评委**不再被 BLOCK**，拿一个"瞎写当事实"的例子**仍被 BLOCK**，就证明改对了。③ **重要：现在请你先去 Codex.app 把那个跑了 3 小时还在死循环的任务停掉**（我没法替你停），再把这份说明书交给 Codex 重新开工。
