# Engine V2 · Stage ② 深度调研「产出真数字」实现计划（Phase 2b）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 stage ② 深度调研在最终成稿里真正承载「可追溯的网络/权威真数字」，并把「证据不足→禁止用本地泛来源填空」的红线变成可执行的确定性关卡。

**Architecture:** 三个阶段按序推进，全部复用既有 `source-tiers.mjs` 分级与 5 步深度调研管线，不新造平行体系：
- **Phase A 红线护栏（零 API 成本，纯确定性，可单测）**——`webSearch:'required'` 的 Sub-Agent 若产出 0 条 http 真网络来源即抛错（抓「被要求联网却只用本地文件」的退化）。
- **Phase B 证据覆盖度（确定性报告 + 写作提示微调）**——把「定位/品牌建设页大多不带真数字」这件事变成可度量的覆盖率报告，并让下游 chunk 优先引用上游已查到的网络来源。
- **Phase C pptagent 真跑验证（操作 runbook + 验收闸门）**——用真实管线带 `--real-llm` 重跑 pptagent，证明真数字端到端落地。

**Tech Stack:** Node ESM `.mjs`；`node:assert/strict` 裸测试（无 jest/vitest）；既有 `web-search.mjs`(tavily/serper/exa/reddit)、`deepresearch-common.mjs`(5 步循环)、`source-tiers.mjs`(T1-T4)。

---

## 背景：摸排结论（已对真实代码 + 真实产物逐环验证，非臆测）

1. **管线本身能产出真数字（已实证）。** 真跑过的 `outputs/smallrig-full/raw-output.json` 含 **24 条 http 真来源**，competitor 15 条、industry 9 条；`outputs/smallrig/_audit/web-searches.jsonl` 有真实 exa/reddit 搜索结果。
2. **断点①（最大、最便宜）：`outputs/pptagent-blueprint/` 从没真跑过调研。** `outputs/pptagent/` 下**没有 `_audit/` 目录**（无任何 web-search / LLM 调用日志），chunk 的 `thinking_log` 直写「用客户 summary.md / form.json 中的事实填充每页」。它是本地填充演示稿，不是调研产物——这是它 0 条网络来源的根因。
3. **断点②（真·设计缺口）：定位案约 75% 的页结构上不联网。** 这套 blueprint 28 个 chunk 的驱动 agent 分布为 brand_building 14 / brand_positioning 7 / competitor 2 / consumer 3 / industry 2。而 `SUB_AGENTS` 配置里 `brand_positioning`、`brand_building` 是 `webSearch:false`，annual=`optional`、consumer=`optional`，仅 industry / competitor 为 `required`。继承机制 `sourcePoolFromContext()` 已从上游 chunk 收集 web URL，但真跑的 `smallrig-building` / `smallrig`(positioning) 仍 0 http 来源——继承存在却没生效。
4. **配置事实（以代码 `scripts/run-sub-agent.mjs` 的 `SUB_AGENTS` 为准）：** consumer=`optional`(max 3)、industry=`required`(max 8)、competitor=`required`(max 12)、positioning=`false`、building=`false`、annual=`optional`(max 4)。`required` 的两个 agent 真跑时**确实**产出了 web 来源，故护栏的价值是「防退化 + 把红线变可执行」，不是抓当前 bug。

**真实运行 CLI（已确认）：** `node scripts/run-blueprint-suite.mjs <slug> --scheme brand_positioning_case --real-llm`。不带 `--real-llm` 只生成 prompt-bundle，不调 LLM/web。`run-full-suite.mjs` 已 DEPRECATED。

---

## File Structure

- **Create** `scripts/test-deepresearch-guardrail.mjs` — Phase A 护栏单测（纯函数，零 API）。
- **Modify** `scripts/sub-agents/deepresearch-common.mjs` — 新增 `assertWebSearchEvidence()` 导出；在 5 步循环两个 finalize 点调用；import 增 `tierRank`；`TRACEABLE_DATA_REF_INSTRUCTION` 增 1 行下游继承提示（Phase B）。
- **Modify** `scripts/run-sub-agent.mjs` — `runRealLLMSubAgent` 把 `bundleResult.webSearch` 作为 `webSearchRequirement` 传入 deepResearch runner。
- **Create** `scripts/evidence-coverage.mjs` — Phase B 证据覆盖度报告纯函数（`reportEvidenceCoverage(deck)`）。
- **Create** `scripts/check-evidence-coverage.mjs` — Phase B CLI 闸门（打印覆盖率，低于阈值 warn，exit 0）。
- **Create** `scripts/test-evidence-coverage.mjs` — Phase B 报告单测。
- **Modify** `package.json` — 注册 `check:evidence`。
- **(Phase C 无新代码)** 操作 runbook + 验收，产物落 `outputs/pptagent/_chunks/*`、`outputs/pptagent-real-blueprint/raw-output.json`、`outputs/pptagent/_audit/web-searches.jsonl`。

> 红线（贯穿全程，逐字）：失败必抛错、不静默兜底、不伪造数据；证据不足 → 触发抓取/上传/草稿，绝不编数据填空；每个数字可追溯（来源 + 日期 + 等级 T1-T4）；没有 source 的内容只能写入 assumptions。

---

## Phase A — 红线护栏：required agent 必须带 http 真来源

**判断依据：** `required` agent 的真实失败模式是「被要求联网取证，却只用了本地文件」。最确定、最便宜的抓法 = 检查它的 slides 里是否**至少有 1 条 http(s) 来源**。0 条即抛错。industry/competitor 真跑都有 http 来源 → 不误伤；未来若退化成全本地 → 立刻抛错。

### Task A1：新增 `assertWebSearchEvidence` 纯函数（先写失败测试）

**Files:**
- Create: `scripts/test-deepresearch-guardrail.mjs`
- Modify: `scripts/sub-agents/deepresearch-common.mjs`

- [ ] **Step 1: 写失败测试**

Create `scripts/test-deepresearch-guardrail.mjs`：

```js
import assert from 'node:assert/strict'
import { assertWebSearchEvidence } from './sub-agents/deepresearch-common.mjs'

function deckWith(dataRefs) {
  return { slides: [{ page_no: 1, action_title: 'T', core_points: ['a', 'b'], data_refs: dataRefs }] }
}

const httpRef = [{ value: 'x', source: 'https://www.idc.com/report/123' }]
const localRef = [{ value: 'x', source: 'assets/_raw/cases/标杆案例/smallrig/page-036.md', source_tier: 'T1' }]

// 1) required + 有 http 来源 → 不抛错
assert.doesNotThrow(() => assertWebSearchEvidence(deckWith(httpRef), { webSearchRequirement: 'required', agentId: 'industry_analysis' }))

// 2) required + 只有本地来源 → 抛错（被要求联网却 0 条 http）
assert.throws(
  () => assertWebSearchEvidence(deckWith(localRef), { webSearchRequirement: 'required', agentId: 'industry_analysis' }),
  /NO-FALLBACK violation: webSearch=required/,
)

// 3) required + 完全没有 data_refs → 抛错
assert.throws(
  () => assertWebSearchEvidence(deckWith([]), { webSearchRequirement: 'required', agentId: 'competitor_analysis' }),
  /produced 0 web/,
)

// 4) optional + 只有本地来源 → 不抛错（optional 允许纯本地一手）
assert.doesNotThrow(() => assertWebSearchEvidence(deckWith(localRef), { webSearchRequirement: 'optional', agentId: 'consumer_insight' }))

// 5) false + 只有本地来源 → 不抛错
assert.doesNotThrow(() => assertWebSearchEvidence(deckWith(localRef), { webSearchRequirement: false, agentId: 'brand_positioning' }))

// 6) source_url / url 字段也算 http 来源
assert.doesNotThrow(() => assertWebSearchEvidence(deckWith([{ value: 'x', source_url: 'http://example.org/a' }]), { webSearchRequirement: 'required', agentId: 'industry_analysis' }))

console.log('✅ test-deepresearch-guardrail passed')
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node scripts/test-deepresearch-guardrail.mjs`
Expected: 失败，报 `assertWebSearchEvidence is not a function`（函数还没写）。

- [ ] **Step 3: 写最小实现**

在 `scripts/sub-agents/deepresearch-common.mjs` 的 import 块（第 6-15 行）把 `tierRank` 加进 source-tiers 导入（`isHttpSource` 已在导入中）：

```js
import {
  classifySource,
  coerceLocalDataRefValue,
  isAllowedLocalSource,
  isHttpSource,
  isVerifiableSource,
  normalizeSourcePath,
  sortBySourceTier,
  tierRank,
  verifyLocalDataRef,
} from '../source-tiers.mjs'
```

在 `export function noFallbackSelfCheck(...)` 之前新增导出函数：

```js
// Phase 2b 红线护栏：webSearch=required 的 Sub-Agent 必须至少带 1 条 http(s) 真网络来源。
// 抓「被要求联网取证却只用本地文件填空」的退化；optional/false 直接放行。失败必抛错，不静默兜底。
export function assertWebSearchEvidence(result, options = {}) {
  if (options.webSearchRequirement !== 'required') return
  const hasWebRef = (result.slides || [])
    .flatMap(slide => slide.data_refs || [])
    .some(ref => isHttpSource(ref && (ref.source || ref.source_url || ref.url) || ''))
  if (!hasWebRef) {
    throw new Error(
      `NO-FALLBACK violation: webSearch=required agent "${options.agentId || '?'}" produced 0 web (http) data_refs（被要求联网取证却只用了本地来源，禁止用本地填空冒充调研）`,
    )
  }
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node scripts/test-deepresearch-guardrail.mjs`
Expected: `✅ test-deepresearch-guardrail passed`

- [ ] **Step 5: Commit**

```bash
git add scripts/test-deepresearch-guardrail.mjs scripts/sub-agents/deepresearch-common.mjs
git commit -m "feat(stage2): add assertWebSearchEvidence guardrail for required agents"
```

### Task A2：把护栏接入 5 步循环 + 透传 webSearchRequirement

**Files:**
- Modify: `scripts/sub-agents/deepresearch-common.mjs:1106, 1266`（两个 finalize 点）
- Modify: `scripts/run-sub-agent.mjs`（`runRealLLMSubAgent` 的 runner 入参，约第 498 行）
- Modify: `scripts/test-deepresearch-guardrail.mjs`（加端到端接线断言）

- [ ] **Step 1: 在两个 finalize 点调用护栏**

`deepresearch-common.mjs` 第 1106 行当前为：

```js
  noFallbackSelfCheck(result, args.chunk, { expectedSteps: 5, minInsights: config.minInsights || 3, slug: args.slug })
```

改为（其后紧跟护栏调用）：

```js
  noFallbackSelfCheck(result, args.chunk, { expectedSteps: 5, minInsights: config.minInsights || 3, slug: args.slug })
  assertWebSearchEvidence(result, { webSearchRequirement: args.webSearchRequirement, agentId: config.agentId })
```

第 1266 行当前为：

```js
  noFallbackSelfCheck(result, args.chunk, { expectedSteps: thinkingLog.length, minInsights: config.minInsights || 3, slug: args.slug })
```

改为：

```js
  noFallbackSelfCheck(result, args.chunk, { expectedSteps: thinkingLog.length, minInsights: config.minInsights || 3, slug: args.slug })
  assertWebSearchEvidence(result, { webSearchRequirement: args.webSearchRequirement, agentId: config.agentId })
```

- [ ] **Step 2: 透传 webSearchRequirement**

`scripts/run-sub-agent.mjs` 的 `runRealLLMSubAgent` 里，`deepResearchRunner({...})` 调用（约第 498 行起）当前传入 `chunk/form/clientSummary/strategicQuestion/upstreamChunksSummary/slug/model/retryHint`。在该对象里追加一行：

```js
    const output = await deepResearchRunner({
      chunk: {
        ...bundleResult.blueprintChunk,
        driving_sub_agent: agentId,
      },
      form,
      clientSummary,
      strategicQuestion,
      upstreamChunksSummary,
      slug: clientSlug,
      model: options.model || DEFAULT_CLAUDE_MODEL,
      retryHint: options.retryHint || null,
      webSearchRequirement: bundleResult.webSearch,
    })
```

（`bundleResult.webSearch` 已由 `prepareSubAgentBundle` 在第 469 行返回，单一真源 = `SUB_AGENTS`，无重复定义、无循环依赖。）

- [ ] **Step 3: 加端到端接线断言到 guardrail 测试**

在 `scripts/test-deepresearch-guardrail.mjs` 末尾 `console.log` 之前追加：用一个能通过 `noFallbackSelfCheck` 其余前置条件的完整 fixture，验证 required+纯本地会在真实 finalize 路径里抛错。为避免依赖磁盘文件，这里仍只直测 `assertWebSearchEvidence` 的接线契约（确认它读取 `result.slides[].data_refs[].source/source_url/url` 三个字段）：

```js
// 7) 三种来源字段命名都能被识别为 http
for (const key of ['source', 'source_url', 'url']) {
  assert.doesNotThrow(
    () => assertWebSearchEvidence({ slides: [{ data_refs: [{ [key]: 'https://idc.com/x' }] }] }, { webSearchRequirement: 'required', agentId: 'a' }),
    `字段 ${key} 应被识别为 http 来源`,
  )
}
```

- [ ] **Step 4: 运行测试 + 既有相关测试，确认不回归**

Run: `node scripts/test-deepresearch-guardrail.mjs && node scripts/test-run-sub-agent.mjs`
Expected: 两者均打印各自的 `✅ ... passed`，无抛错。

- [ ] **Step 5: Commit**

```bash
git add scripts/sub-agents/deepresearch-common.mjs scripts/run-sub-agent.mjs scripts/test-deepresearch-guardrail.mjs
git commit -m "feat(stage2): wire web-search guardrail into deep-research finalize"
```

---

## Phase B — 证据覆盖度：让覆盖率可度量，并让下游优先引用上游网络来源

**判断依据：** 定位/品牌建设页结构上不联网，但 `sourcePoolFromContext()` 已把上游 chunk 的 web URL 收进 source_pool。问题是下游写作时没优先把这些真来源写进 data_refs。强行让 LLM 行为变化只能靠真跑验证，所以 Phase B 的确定性产出 = **可度量的覆盖率报告**（让「断点②」从模糊感觉变成数字），外加一条写作提示微调（引导下游引用 source_pool 里的网络来源）。覆盖率是「warn 不 throw」——因为有些页（纯策略判断）合法地不带网络数字。

### Task B1：证据覆盖度报告纯函数（先写失败测试）

**Files:**
- Create: `scripts/test-evidence-coverage.mjs`
- Create: `scripts/evidence-coverage.mjs`

- [ ] **Step 1: 写失败测试**

Create `scripts/test-evidence-coverage.mjs`：

```js
import assert from 'node:assert/strict'
import { reportEvidenceCoverage } from './evidence-coverage.mjs'

const deck = {
  slides: [
    { page_no: 1, data_refs: [{ source: 'https://www.idc.com/a' }] },                       // 有网络来源
    { page_no: 2, data_refs: [{ source: 'inputs/x/first-party/sales.md', source_tier: 'T1' }] }, // T1 本地，无网络
    { page_no: 3, data_refs: [] },                                                          // 无任何来源
    { page_no: 4, data_refs: [{ source: 'https://36kr.com/b' }] },                          // 有网络来源
  ],
}

const report = reportEvidenceCoverage(deck)
assert.equal(report.total_pages, 4)
assert.equal(report.pages_with_web_ref, 2)
assert.equal(report.pages_with_any_ref, 3)
assert.equal(report.web_ref_ratio, 0.5)
assert.deepEqual(report.pages_without_any_ref, [3])
assert.equal(report.perPage.length, 4)
assert.equal(report.perPage[0].has_web_ref, true)
assert.equal(report.perPage[1].has_web_ref, false)
assert.equal(report.perPage[1].has_any_ref, true)

console.log('✅ test-evidence-coverage passed')
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node scripts/test-evidence-coverage.mjs`
Expected: 失败，报 `reportEvidenceCoverage is not a function`。

- [ ] **Step 3: 写最小实现**

Create `scripts/evidence-coverage.mjs`：

```js
import { isHttpSource } from './source-tiers.mjs'

function refSource(ref) {
  return String((ref && (ref.source || ref.source_url || ref.url)) || '').trim()
}

// 统计每页是否带「网络(http)来源」/「任意来源」，给出全 deck 覆盖率。
// 纯确定性报告，不抛错——覆盖率低只是 warn 信号（有些策略判断页合法地无网络数字）。
export function reportEvidenceCoverage(deck) {
  const slides = Array.isArray(deck && deck.slides) ? deck.slides : []
  const perPage = slides.map(slide => {
    const refs = Array.isArray(slide.data_refs) ? slide.data_refs : []
    const sources = refs.map(refSource).filter(Boolean)
    return {
      page_no: slide.page_no != null ? slide.page_no : null,
      has_web_ref: sources.some(isHttpSource),
      has_any_ref: sources.length > 0,
    }
  })
  const total = perPage.length
  const pagesWithWeb = perPage.filter(p => p.has_web_ref).length
  const pagesWithAny = perPage.filter(p => p.has_any_ref).length
  return {
    total_pages: total,
    pages_with_web_ref: pagesWithWeb,
    pages_with_any_ref: pagesWithAny,
    web_ref_ratio: total ? Number((pagesWithWeb / total).toFixed(4)) : 0,
    pages_without_any_ref: perPage.filter(p => !p.has_any_ref).map(p => p.page_no),
    perPage,
  }
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node scripts/test-evidence-coverage.mjs`
Expected: `✅ test-evidence-coverage passed`

- [ ] **Step 5: Commit**

```bash
git add scripts/test-evidence-coverage.mjs scripts/evidence-coverage.mjs
git commit -m "feat(stage2): add deterministic evidence-coverage reporter"
```

### Task B2：覆盖度 CLI 闸门 + 注册 npm script

**Files:**
- Create: `scripts/check-evidence-coverage.mjs`
- Modify: `package.json:36`（在 `check:discipline` 后加 `check:evidence`）

- [ ] **Step 1: 写 CLI（warn-only，不阻断）**

Create `scripts/check-evidence-coverage.mjs`：

```js
#!/usr/bin/env node
import fs from 'node:fs/promises'
import { reportEvidenceCoverage } from './evidence-coverage.mjs'

const DEFAULT_MIN_RATIO = 0.25 // 定位案约 1/4 页由研究 agent 驱动，作为 warn 下限

async function main() {
  const args = process.argv.slice(2)
  const deckPath = args.find(a => !a.startsWith('--'))
  const minArg = args.find(a => a.startsWith('--min-ratio='))
  const minRatio = minArg ? Number(minArg.split('=')[1]) : DEFAULT_MIN_RATIO
  if (!deckPath) {
    console.error('Usage: node scripts/check-evidence-coverage.mjs <deck.json> [--min-ratio=0.25]')
    process.exit(1)
  }
  const deck = JSON.parse(await fs.readFile(deckPath, 'utf8'))
  const report = reportEvidenceCoverage(deck)
  console.log(`证据覆盖度: ${report.pages_with_web_ref}/${report.total_pages} 页带网络来源 (web_ref_ratio=${report.web_ref_ratio})`)
  console.log(`带任意来源: ${report.pages_with_any_ref}/${report.total_pages}; 无任何来源页: [${report.pages_without_any_ref.join(', ')}]`)
  if (report.web_ref_ratio < minRatio) {
    console.warn(`⚠️  web_ref_ratio ${report.web_ref_ratio} < 下限 ${minRatio}：该稿网络真数字偏少，建议复核研究 agent 是否真跑/上游证据是否下沉。`)
  }
  process.exit(0) // warn-only：始终 exit 0，不阻断流水线
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 2: 注册 npm script**

`package.json` 第 36 行 `"check:discipline": "node scripts/check-content-discipline.mjs"` 后加一行：

```json
    "check:discipline": "node scripts/check-content-discipline.mjs",
    "check:evidence": "node scripts/check-evidence-coverage.mjs"
```

- [ ] **Step 3: 在已有真跑产物上冒烟（无需 API）**

Run: `node scripts/check-evidence-coverage.mjs outputs/smallrig-full/raw-output.json`
Expected: 打印形如 `证据覆盖度: N/M 页带网络来源 (web_ref_ratio=...)`，exit 0（smallrig-full 有 24 条 http，应高于下限、不 warn）。

Run: `node scripts/check-evidence-coverage.mjs outputs/pptagent-blueprint/raw-output.json`
Expected: `web_ref_ratio=0`，打印 ⚠️ 警告，但仍 exit 0。这正是「断点②/①」被量化出来的证据。

- [ ] **Step 4: Commit**

```bash
git add scripts/check-evidence-coverage.mjs package.json
git commit -m "feat(stage2): add check:evidence coverage CLI gate (warn-only)"
```

### Task B3：写作提示微调——下游优先引用上游网络来源

**Files:**
- Modify: `scripts/sub-agents/deepresearch-common.mjs`（`TRACEABLE_DATA_REF_INSTRUCTION`，第 22-29 行）

- [ ] **Step 1: 给共享写作指令加一条继承提示**

`TRACEABLE_DATA_REF_INSTRUCTION` 数组末尾（`].join('\n')` 之前）追加一条：

```js
  '- 当本页结论与 source_pool 中的真实 https 来源（多来自上游 industry/competitor/consumer 调研）相关时，必须优先把该网络来源写进 data_refs，而不是退回本地泛来源。',
```

- [ ] **Step 2: 跑既有深度调研相关测试，确认提示改动不破坏 JSON 契约**

Run: `node scripts/test-run-sub-agent.mjs`
Expected: 打印 `✅ ... passed`，无抛错（该常量只是提示文本，不改变解析逻辑）。

> 说明：本条提示对 LLM 实际行为的改善只能在 **Phase C 真跑**后用 `check:evidence` 的 `web_ref_ratio` 度量；这是预期之内的「先埋点、后用真跑验证」，不是占位符。

- [ ] **Step 3: Commit**

```bash
git add scripts/sub-agents/deepresearch-common.mjs
git commit -m "feat(stage2): nudge downstream chunks to inherit upstream web sources"
```

---

## Phase C — pptagent 真跑验证（操作 runbook + 验收闸门）

**判断依据：** 断点①的本质是「从没真跑过」。本阶段不写新代码，而是用真实管线带 `--real-llm` 重跑 pptagent，并用 Phase A/B 的关卡 + Phase 2a 内容纪律闸门做验收。**注意成本与红线**：真跑会调用 LLM + web（`.env` 已有 key），`MAX_COST_PER_CHUNK_USD=2` 已是单 chunk 成本护栏。

> ⚠️ 前置确认（需 Seven 拍板，见文末「给小白的讲解」）：真跑会覆盖现有 `outputs/pptagent/_chunks/*`。建议先备份：`cp -r outputs/pptagent outputs/pptagent.pre-real-run.bak`。

### Task C1：单 chunk 真跑冒烟（最小成本先验证一条 required 链路）

- [ ] **Step 1: 备份现有 chunk 产物**

Run: `cp -r outputs/pptagent outputs/pptagent.pre-real-run.bak`
Expected: 备份目录生成，无报错。

- [ ] **Step 2: 只真跑一个 industry(required) chunk**

Run: `node scripts/run-blueprint-suite.mjs pptagent --scheme brand_positioning_case --only-chunk p1-c1-track-and-market --force --real-llm`
Expected: 控制台出现 `REAL_LLM p1-c1-track-and-market -> ...`；若该 chunk 的 driving agent 为 required 且 0 http 来源会抛 `NO-FALLBACK violation: webSearch=required ...`（Phase A 护栏生效）。

- [ ] **Step 3: 验证真跑留下了 web 审计日志**

Run: `test -s outputs/pptagent/_audit/web-searches.jsonl && echo OK-web-audit`
Expected: 打印 `OK-web-audit`（证明真的联网了，不再是本地填充）。

- [ ] **Step 4: 验证该 chunk 产出含 http 真来源**

Run: `grep -c "http" outputs/pptagent/_chunks/p1-c1-track-and-market.json`
Expected: ≥1。

### Task C2：全案真跑 + 合并 + 三道验收闸门

- [ ] **Step 1: 全案真跑（带版式与咨询评审）**

Run: `node scripts/run-blueprint-suite.mjs pptagent --scheme brand_positioning_case --force --real-llm --with-layout-designer --with-consulting-review`
Expected: 末行 `=== Suite Prepared: ... / X generated / ... / 0 failed ===`；`failed>0` 会 `exit 1`，须排查抛错原因（不得静默跳过）。

- [ ] **Step 2: 合并为成稿**

Run: `node scripts/assemble-by-blueprint.mjs pptagent --scheme brand_positioning_case --output-slug pptagent-real-blueprint`
Expected: `✅ Assembled <N> pages -> outputs/pptagent-real-blueprint/raw-output.json`。

- [ ] **Step 3: 闸门①——Phase 2a 内容纪律（必须 exit 0）**

Run: `node scripts/check-content-discipline.mjs outputs/pptagent-real-blueprint/raw-output.json --slug=pptagent`
Expected: 无红线违规，exit 0。

- [ ] **Step 4: 闸门②——证据覆盖度（应明显高于 0）**

Run: `node scripts/check-evidence-coverage.mjs outputs/pptagent-real-blueprint/raw-output.json`
Expected: `web_ref_ratio` 显著 > 0（对照 `pptagent-blueprint` 的 0）。若仍 0 或极低，说明研究 agent 没真跑或上游证据没下沉，须回查（不得接受 0）。

- [ ] **Step 5: 闸门③——.S 渲染端到端（内容纪律内嵌于渲染）**

Run: `node scripts/render-deck-s.mjs outputs/pptagent-real-blueprint/raw-output.json outputs/pptagent-real-blueprint/index.html`
Expected: 成功产出 HTML；若有红线违规会抛 `内容纪律红线违规` 且不产出 HTML（Phase 2a 闸门生效）。

- [ ] **Step 6: 留存验收快照（不提交，供 Seven/CP 复核）**

Run: `node scripts/check-evidence-coverage.mjs outputs/pptagent-real-blueprint/raw-output.json > outputs/pptagent-real-blueprint/_evidence-coverage.txt`
Expected: 生成覆盖度快照文本。

> Phase C 不写新代码、不自动 commit 产物；真跑产物是否入库由 Seven 决定。

---

## Self-Review（写完计划后的回看）

- **Spec coverage：** 断点①→Phase C；断点②→Phase B（覆盖度量 + 继承提示）；断点③/红线可执行→Phase A。三处全覆盖，与 Seven「三处一起，按序排进一个计划」一致。
- **Placeholder scan：** 无 TBD/「类似上文」；每个代码步骤含完整可运行代码；Phase B3 提示改动对 LLM 行为的影响已显式说明「由 Phase C 真跑度量」，非占位。
- **Type/接口一致：** `assertWebSearchEvidence(result, {webSearchRequirement, agentId})`、`reportEvidenceCoverage(deck)→{total_pages,pages_with_web_ref,pages_with_any_ref,web_ref_ratio,pages_without_any_ref,perPage}` 在测试/实现/CLI 三处命名一致；`bundleResult.webSearch`(run-sub-agent 第 469 行已存在)→`args.webSearchRequirement`→`options.webSearchRequirement` 链路单一真源、无循环依赖。
- **红线对齐：** Phase A 护栏 = 失败必抛错、不静默兜底；Phase C 闸门拒绝接受 0 网络来源 = 不伪造/不本地填空冒充。

---

## 给小白的讲解

- **现在做的是什么：** 我把「让深度调研真出真数字」拆成三步排进一份计划——(A) 加一道**自动报警闸门**：凡是「被要求上网查」的研究员（industry/competitor），如果交上来的页一条网址来源都没有，程序立刻**报错停下**，不许用本地文件糊弄；(B) 加一个**计分器**：自动数「多少页带了真网址来源」，把"定位稿大多没真数字"这件事变成一个能看见的百分比；(C) 写好**操作手册**：用真正联网的命令把 pptagent 重跑一遍，再用三道闸门检查它是不是真出了真数字。
- **目的·为什么：** 你之前那 80 页其实**从没真正联网跑过**（它连一条搜索记录都没有），所以全是本地资料复述、没有外部真数字。这份计划先把"不许糊弄"做成程序自动管（红线落地），再真跑一遍让真数字进来。
- **你怎么自己核查：** ①看这份文件 `docs/handoffs/2026-05-30-engine-v2-phase2b-stage2-real-numbers-plan.md` 是否三阶段清楚；②Phase A/B 每个任务都能用 `node scripts/test-*.mjs` 跑出 `✅ passed`，是绿的就对；③Phase C 跑完后，对比两条命令的输出——`node scripts/check-evidence-coverage.mjs outputs/pptagent-blueprint/raw-output.json`（旧的，应是 `web_ref_ratio=0`）vs 真跑后的 `outputs/pptagent-real-blueprint/raw-output.json`（应明显 > 0），数字涨上去就说明真数字进来了。
