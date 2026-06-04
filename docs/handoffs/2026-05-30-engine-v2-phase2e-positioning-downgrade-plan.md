# Engine V2 · Phase 2e — 定位证据「降级成诚实假设」而非硬抛错（Positioning Downgrade）

> **For agentic workers (Codex):** 这是 TDD 实施手册。**REQUIRED：每个 Task 先写失败测试 → 跑红 → 写最小实现 → 跑绿 → commit。** 不要跳测试、不要放松红线、不要伪造数据。改动是**纯增量**：新增一个降级 Pass 跑在既有护栏**前面**,既有护栏(tripwire)和它的全部既有测试**保持不变**。

**Goal:** 让 `competitor_analysis` 写手在「定位结论缺独立第三方需求证据」时,**把该页降级成诚实的待验证假设**(标 `evidence_status='hypothesis'` + 去行动词 + 补依据/验证方法),而不是硬抛错整章失败——这样证据天然薄的主体(如 PPTAgent)也能跑通,并自然汇入 Phase 2c 已建好的 `validation_checklist`,且绝不伪造事实。

**Architecture:** 新增一个**纯函数降级 Pass** `downgradePositioningSlides(slides, { sourcePool })`,在 `runWriteStep` 解析出 JSON 后、调用 `assertCompetitorPositioningEvidence` **之前**执行。降级 Pass 优先「补真证据」(从 sourcePool 取独立需求证据挂上去),补不到才「降级成假设」。既有的 `assertCompetitorPositioningEvidence` / `assertCompetitorRefsCoverNamedBrands` 作为**降级后的最终 tripwire 保留不变**——理论上降级后不再触发,但留作防御降级 Pass 自身有 bug。

**Tech Stack:** Node.js ESM,`node:test`,纯函数 + 既有 `deepresearch-common.mjs` 私有 helper 复用。

---

## §0 背景:为什么做这件事（真跑日志已确诊）

`outputs/_logs/pptagent-demo-competition.log` 末尾原文还原了 `p2-c2-competition-status` 的失败:

```
LLM attempt 1/3 failed for competitor.write: fetch failed
Write hard-guard attempt 1/2 failed: NO-FALLBACK violation: named competitor lacks page-level evidence on page 19: Canva
Write hard-guard attempt 2/2 failed: NO-FALLBACK violation: competitor positioning evidence gap on page 20; positioning claims require independent user/procurement/business-demand evidence instead of competitor-owned demand snippets (https://ai.wps.com/zh-CN/)
FAILED p2-c2-competition-status: ...（整章硬抛错）
```

**确诊结论(纠正了早前"搜不到竞品"的误判):** 大模型**确实**用了、也搜到了竞品(plan 带着 8 个已知竞品拆问题,主搜索成功,只有 2 条 reddit 社媒搜索 403)。真正卡死的是**写页阶段的证据闸门硬抛错**:

1. 第 19 页点名「Canva」却没附 Canva 来源 → `assertCompetitorRefsCoverNamedBrands` 抛错;
2. 第 20 页下定位结论却只引用 `wps.com`(竞品自家官网)→ `assertCompetitorPositioningEvidence` 抛错。

PPTAgent 是新开源项目,**独立第三方需求证据天然拿不到**,闸门一拿不到就枪毙整章 → 这正是当初空转 3 小时的根因。**Phase 2c 已建好「诚实假设」合法通道,但这个写页闸门跑在它前面、直接抛错,根本走不到那条路。** Phase 2e 就是把这条通道接到写页阶段。

**红线不变:** 降级成「待验证假设」是**反造假**(老实标注不确定),不是造假。只有「伪造来源 / 拿 GitHub 星星冒充付费需求」这类才是造假,仍走既有 tripwire。

---

## §1 文件结构

- **Modify:** `scripts/sub-agents/deepresearch-common.mjs`
  - 新增并 `export` 纯函数 `downgradePositioningSlides(slides, options)`(放在 `assertCompetitorPositioningEvidence` 定义附近,约第 808 行之前,以复用同文件内已有的私有 helper:`textFromSlide`、`refLooksLikeCompetitorEvidence`、`refLooksLikeIndependentDemandEvidence`、`refLooksLikeRepoPopularity`、`refLooksLikeCompetitorOwnedSource`、`refSource`、`competitorAliases`、`compactText`)。
  - 在 `runWriteStep`(约第 1255-1262 行)解析 JSON 后、`assertCompetitorPositioningEvidence` 调用前,插入一行降级 Pass。
- **Test:** `scripts/test-positioning-downgrade.mjs`(新建,纯函数单测 + runWriteStep 集成测)。
- **不改:** `assertCompetitorPositioningEvidence`、`assertCompetitorRefsCoverNamedBrands` 的函数体与 `scripts/test-deepresearch-guardrail.mjs` 的既有断言**全部保持不变**(它们直接测原始 tripwire,降级 Pass 不影响它们)。

---

## §2 降级 Pass 的行为契约（实现前先读懂）

`downgradePositioningSlides(slides, { sourcePool = [] })` 返回**新数组**(不可变,不改入参),逐页处理:

1. **非定位跃迁页**(`makesPositioningLeap` 为假)→ 原样返回。判定正则同既有:
   `/咨询级|品牌策划|策略工作流|专业工作流|策略生成|方案\s*AI\s*Agent|品牌策略\s*Agent|专业\s*Agent|空位|心智|占位|抢占/i`(作用于 `textFromSlide(slide)`)。
2. **定位跃迁页,且已有独立需求证据**(`refLooksLikeIndependentDemandEvidence` 命中任一 data_ref)→ 原样返回(已是 evidenced,无需降级)。
3. **定位跃迁页,缺独立需求证据 → 先尝试补真证据:** 若 `sourcePool` 里存在 `refLooksLikeIndependentDemandEvidence` 的项,取**第一条**追加进该页 `data_refs`(不改写 source,原样挂载),记为已补救 → 该页保持原状(现在有独立需求证据了)。这是 Phase 2c 评审最希望的结果:用真证据而非降级。
4. **定位跃迁页,缺独立需求证据,且 sourcePool 也没有可补的 → 降级成假设:**
   - 删掉 data_refs 里**纯 repo 热度**的项(`refLooksLikeRepoPopularity` 命中)——GitHub 星星不能留作需求/定位证据;但**保留**竞品产品来源(`refLooksLikeCompetitorEvidence`)。若删完后 data_refs 为空,则保留原 refs(交给下游 traceability tripwire,不在本 Pass 制造 0 来源)。
   - 去行动定论:对 `action_title` 和每条 `core_points`,把行动词 `应以|应该|应当|应\s|切入|抢占|占据|定位为|成为|主打|发力` 替换为中性表述。具体:`action_title` 末尾追加「(待验证假设,进入验证清单)」,并把命中行动词的整句结尾的行动词短语替换为「待验证」。最简稳妥实现见 Task 1 代码。
   - 注入假设标记文本,确保下游 `normalizeSlides` 能识别(它按 `/待验证|假设|需要验证|仍需验证|不能直接证明/` 判定):在 `core_points` 末尾追加两条(若尚不存在同义条目):
     - 依据条(供 `deriveHypothesisBasis` 提取,需含 `基于|类比|不能直接证明|证据|依据`):
       `基于竞品能力证据的类比推理,不能直接证明本品的真实付费需求`
     - 方法条(供 `deriveValidationMethod` 提取,需含 `需要|需向|索取|访谈|调研|才能验证`):
       `需向目标用户/采购方访谈并索取真实需求与付费数据才能验证`
   - 设字段:`evidence_status='hypothesis'`、`hypothesis_basis`(同依据条文案)、`validation_method`(同方法条文案)。
5. **名字无出处的竞品 → 删名不抛错(并入本 Pass):** 对每个 `competitorAliases()` 条目 `[label, textPattern, sourcePattern]`,若该页文本命中竞品名但 data_refs 里没有对应来源(`textPattern`/`sourcePattern` 都不命中任何 ref 文本),则从 `action_title` 与 `core_points` 中**删除该竞品名 token**(用空串替换 `label`,再压缩多余空格)。删名对所有页生效,不限定位跃迁页。

**幂等性:** 对已降级(`evidence_status==='hypothesis'` 且含假设标记)的页再跑一次,不得重复追加 core_points、不得二次替换。实现时先检测「是否已含依据/方法条」再决定是否追加。

**与既有 tripwire 的关系:** 降级后调用 `assertCompetitorPositioningEvidence` 应**不再抛错**(行动词已去、已标假设、repo 热度已删、名字已删)。tripwire 保留,作为防御降级 Pass 漏判的最后一道。

---

## §3 实施任务（TDD,逐项 commit）

### Task 1: 纯函数 `downgradePositioningSlides` —— 缺独立需求证据时降级成假设

**Files:**
- Modify: `scripts/sub-agents/deepresearch-common.mjs`(新增并 export 函数)
- Test: `scripts/test-positioning-downgrade.mjs`(新建)

- [ ] **Step 1: 写失败测试**

新建 `scripts/test-positioning-downgrade.mjs`:

```js
import assert from 'node:assert/strict'
import { downgradePositioningSlides } from './sub-agents/deepresearch-common.mjs'

// A) 缺独立需求证据 + sourcePool 也没有 → 降级成 hypothesis,去行动词,补依据/方法
{
  const [slide] = downgradePositioningSlides([
    {
      page_no: 20,
      action_title: 'PPTAgent 应成为咨询级品牌策划方案 AI Agent',
      core_points: ['Gamma 强在通用生成', 'WPS 强在 Office 兼容'],
      data_refs: [
        { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
        { value: '100% Office-compatible', source: 'https://ai.wps.com/zh-CN/', type: 'product_matrix' },
      ],
    },
  ], { sourcePool: [] })

  assert.equal(slide.evidence_status, 'hypothesis')
  assert.ok(slide.hypothesis_basis, '应有 hypothesis_basis')
  assert.ok(slide.validation_method, '应有 validation_method')
  const text = [slide.action_title, ...slide.core_points].join(' ')
  assert.ok(/待验证|进入验证清单|假设/.test(text), '应出现假设标记')
  assert.ok(!/应成为|应以|应该|抢占|切入|定位为/.test(slide.action_title), `行动词应被去除: ${slide.action_title}`)
}

// B) 缺独立需求证据,但 sourcePool 有可补的真证据 → 挂上去,不降级(保持 evidenced)
{
  const [slide] = downgradePositioningSlides([
    {
      page_no: 20,
      action_title: 'PPTAgent 应成为咨询级品牌策划方案 AI Agent',
      core_points: ['Gamma 强在通用生成'],
      data_refs: [
        { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
      ],
    },
  ], {
    sourcePool: [
      { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
    ],
  })

  assert.notEqual(slide.evidence_status, 'hypothesis', '补到真证据后不应降级')
  assert.ok(
    slide.data_refs.some(r => /idc\.com/.test(String(r.source || ''))),
    '应把 sourcePool 的独立需求证据挂上 data_refs',
  )
}

// C) 已有独立需求证据 → 原样不动
{
  const input = [
    {
      page_no: 20,
      action_title: 'PPTAgent 专业 Agent 空位',
      core_points: ['竞品覆盖通用生成', '企业关注业务成果'],
      data_refs: [
        { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
        { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
      ],
    },
  ]
  const [slide] = downgradePositioningSlides(input, { sourcePool: [] })
  assert.notEqual(slide.evidence_status, 'hypothesis')
  assert.equal(slide.data_refs.length, 2, '不应改动 data_refs')
}

// D) 非定位跃迁页 → 原样不动
{
  const input = [{ page_no: 1, action_title: '市场背景概述', core_points: ['行业规模增长'], data_refs: [] }]
  const [slide] = downgradePositioningSlides(input, { sourcePool: [] })
  assert.deepEqual(slide, input[0])
}

console.log('✅ Task1 positioning-downgrade core passed')
```

运行:`node scripts/test-positioning-downgrade.mjs`
期望:**FAIL**(`downgradePositioningSlides is not a function` / 未导出)。

- [ ] **Step 2: 跑红确认**

Run: `node scripts/test-positioning-downgrade.mjs`
Expected: FAIL（import 报错或断言失败）

- [ ] **Step 3: 写最小实现**

在 `scripts/sub-agents/deepresearch-common.mjs` 中,`assertCompetitorPositioningEvidence` 定义(约第 808 行)**之前**插入:

```js
const POSITIONING_LEAP_RE = /咨询级|品牌策划|策略工作流|专业工作流|策略生成|方案\s*AI\s*Agent|品牌策略\s*Agent|专业\s*Agent|空位|心智|占位|抢占/i
const ACTION_VERB_RE = /应以|应当|应该|应成为|应\s|切入|抢占|占据|定位为|成为|主打|发力/g
const HYP_BASIS_TEXT = '基于竞品能力证据的类比推理，不能直接证明本品的真实付费需求'
const HYP_METHOD_TEXT = '需向目标用户/采购方访谈并索取真实需求与付费数据才能验证'

function stripActionVerbs(text = '') {
  return String(text).replace(ACTION_VERB_RE, '待验证').replace(/\s{2,}/g, ' ').trim()
}

function stripUnsupportedCompetitorNames(slide) {
  const refsText = (slide.data_refs || [])
    .map(ref => [ref.value, ref.statement, ref.title, ref.source, ref.source_url].join(' '))
    .join(' ')
  let actionTitle = slide.action_title || ''
  let corePoints = [...(slide.core_points || [])]
  for (const [label, textPattern, sourcePattern] of competitorAliases()) {
    const named = textPattern.test([actionTitle, ...corePoints].join(' '))
    if (!named) continue
    const hasRef = textPattern.test(refsText) || sourcePattern.test(refsText)
    if (hasRef) continue
    const labelRe = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    actionTitle = actionTitle.replace(labelRe, '').replace(/\s{2,}/g, ' ').replace(/[、，,]\s*(?=[、，,。])/g, '').trim()
    corePoints = corePoints.map(p =>
      (typeof p === 'string' ? p : JSON.stringify(p)).replace(labelRe, '').replace(/\s{2,}/g, ' ').trim(),
    )
  }
  return { ...slide, action_title: actionTitle, core_points: corePoints }
}

export function downgradePositioningSlides(slides = [], options = {}) {
  const sourcePool = options.sourcePool || []
  const availableIndependentDemand = sourcePool.filter(refLooksLikeIndependentDemandEvidence)

  return (slides || []).map(rawSlide => {
    // 先删无出处的竞品名（对所有页生效）
    const slide = stripUnsupportedCompetitorNames(rawSlide)

    const text = textFromSlide(slide)
    const makesPositioningLeap = POSITIONING_LEAP_RE.test(text)
    if (!makesPositioningLeap) return slide

    const refs = slide.data_refs || []
    const hasIndependentDemand = refs.some(refLooksLikeIndependentDemandEvidence)
    if (hasIndependentDemand) return slide

    // 先尝试用 sourcePool 补真证据
    if (availableIndependentDemand.length > 0) {
      return { ...slide, data_refs: [...refs, availableIndependentDemand[0]] }
    }

    // 补不到 → 降级成诚实假设
    const keptRefs = refs.filter(ref => !refLooksLikeRepoPopularity(ref))
    const dataRefs = keptRefs.length > 0 ? keptRefs : refs

    const alreadyDowngraded = /待验证假设/.test(slide.action_title || '')
    const actionTitle = alreadyDowngraded
      ? slide.action_title
      : `${stripActionVerbs(slide.action_title)}（待验证假设，进入验证清单）`

    const corePoints = (slide.core_points || []).map(p =>
      stripActionVerbs(typeof p === 'string' ? p : JSON.stringify(p)),
    )
    const joined = corePoints.join(' ')
    if (!/基于|类比|不能直接证明|证据|依据/.test(joined)) corePoints.push(HYP_BASIS_TEXT)
    if (!/需要|需向|索取|访谈|调研|才能验证/.test(joined)) corePoints.push(HYP_METHOD_TEXT)

    return {
      ...slide,
      action_title: actionTitle,
      core_points: corePoints,
      data_refs: dataRefs,
      evidence_status: 'hypothesis',
      hypothesis_basis: HYP_BASIS_TEXT,
      validation_method: HYP_METHOD_TEXT,
    }
  })
}
```

- [ ] **Step 4: 跑绿**

Run: `node scripts/test-positioning-downgrade.mjs`
Expected: PASS（打印 `✅ Task1 positioning-downgrade core passed`）

- [ ] **Step 5: commit**

```bash
git add scripts/sub-agents/deepresearch-common.mjs scripts/test-positioning-downgrade.mjs
git commit -m "$(cat <<'EOF'
feat(engine-v2): add positioning downgrade pass to convert unsupported claims into honest hypotheses

Phase 2e: downgradePositioningSlides rewrites competitor positioning leaps that
lack independent demand evidence into labeled validation hypotheses (strip action
verbs, set evidence_status=hypothesis, add basis+method) and strips uncited
competitor names — instead of hard-throwing. Prefers attaching real evidence from
sourcePool before downgrading.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 幂等性 + 删名分支测试

**Files:**
- Test: `scripts/test-positioning-downgrade.mjs`(追加)

- [ ] **Step 1: 追加失败测试**

在 `console.log('✅ Task1 ...')` 之前追加:

```js
// E) 幂等：对已降级页再跑一次，不得重复追加 core_points
{
  const once = downgradePositioningSlides([
    {
      page_no: 20,
      action_title: 'PPTAgent 应成为咨询级品牌策划方案 AI Agent',
      core_points: ['Gamma 强在通用生成'],
      data_refs: [{ value: 'x', source: 'https://gamma.app/products/presentations', type: 'product_matrix' }],
    },
  ], { sourcePool: [] })
  const twice = downgradePositioningSlides(once, { sourcePool: [] })
  assert.equal(twice[0].core_points.length, once[0].core_points.length, '幂等：不得重复追加')
  assert.equal(twice[0].evidence_status, 'hypothesis')
}

// F) 点名竞品但无来源 → 删名，不抛错
{
  const [slide] = downgradePositioningSlides([
    {
      page_no: 19,
      action_title: '竞品矩阵：Gamma、Canva 的能力差异（抢占策略空位）',
      core_points: ['Gamma 覆盖通用生成', 'Canva 强在模板生态'],
      data_refs: [{ value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' }],
    },
  ], { sourcePool: [] })
  const text = [slide.action_title, ...slide.core_points].join(' ')
  assert.ok(!/Canva/.test(text), `无来源的 Canva 应被删除: ${text}`)
  assert.ok(/Gamma/.test(text), '有来源的 Gamma 应保留')
}
```

- [ ] **Step 2: 跑红**

Run: `node scripts/test-positioning-downgrade.mjs`
Expected: 若实现正确,E/F 可能直接 PASS;若 FAIL,按提示修正 `downgradePositioningSlides`(常见:删名正则未处理顿号分隔、或幂等检测缺失)。

- [ ] **Step 3: 修实现至绿**(仅在 Step 2 失败时改 `stripUnsupportedCompetitorNames` / 幂等检测)

- [ ] **Step 4: 跑绿**

Run: `node scripts/test-positioning-downgrade.mjs`
Expected: PASS

- [ ] **Step 5: commit**

```bash
git add scripts/sub-agents/deepresearch-common.mjs scripts/test-positioning-downgrade.mjs
git commit -m "$(cat <<'EOF'
test(engine-v2): cover idempotency and uncited-competitor-name stripping for positioning downgrade

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 接线 —— 在 `runWriteStep` 的 assert 之前跑降级 Pass

**Files:**
- Modify: `scripts/sub-agents/deepresearch-common.mjs`(`runWriteStep` 约第 1255-1262 行)
- Test: `scripts/test-positioning-downgrade.mjs`(追加集成测,用 stub callStep,不烧 token)

- [ ] **Step 1: 追加失败的集成测试**

在 `console.log('✅ Task1 ...')` 之前追加(注意:`runWriteStep` 未导出,本测试通过**源码静态断言**验证接线,避免改动导出面):

```js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = fs.readFileSync(path.join(REPO_ROOT, 'scripts/sub-agents/deepresearch-common.mjs'), 'utf8')

// G) runWriteStep 必须在 assertCompetitorPositioningEvidence 之前调用降级 Pass
const writeStepBody = src.slice(src.indexOf('async function runWriteStep'), src.indexOf('async function runBatchedWriteStep'))
const downgradeIdx = writeStepBody.indexOf('downgradePositioningSlides')
const assertIdx = writeStepBody.indexOf('assertCompetitorPositioningEvidence')
assert.ok(downgradeIdx !== -1, 'runWriteStep 必须调用 downgradePositioningSlides')
assert.ok(assertIdx !== -1, 'runWriteStep 仍应保留 assertCompetitorPositioningEvidence tripwire')
assert.ok(downgradeIdx < assertIdx, '降级 Pass 必须在 assert tripwire 之前执行')
```

- [ ] **Step 2: 跑红**

Run: `node scripts/test-positioning-downgrade.mjs`
Expected: FAIL（`runWriteStep 必须调用 downgradePositioningSlides`）

- [ ] **Step 3: 接线实现**

在 `scripts/sub-agents/deepresearch-common.mjs` 的 `runWriteStep` 中,把(约第 1256-1261 行):

```js
      const parsed = extractJsonOrThrow(writeResponse, ['slides'])
      if (config.agentId === 'competitor_analysis') {
        assertCompetitorPositioningEvidence(parsed, {
          sourcePool: writeInput.sourcePool || writeInput.baseWriteInput?.sourcePool || [],
        })
      }
      return parsed
```

改为:

```js
      const parsed = extractJsonOrThrow(writeResponse, ['slides'])
      if (config.agentId === 'competitor_analysis') {
        const sourcePool = writeInput.sourcePool || writeInput.baseWriteInput?.sourcePool || []
        // Phase 2e: 先降级（补真证据或标成诚实假设），再让 tripwire 兜底
        parsed.slides = downgradePositioningSlides(parsed.slides, { sourcePool })
        assertCompetitorPositioningEvidence(parsed, { sourcePool })
      }
      return parsed
```

- [ ] **Step 4: 跑绿**

Run: `node scripts/test-positioning-downgrade.mjs`
Expected: PASS

- [ ] **Step 5: commit**

```bash
git add scripts/sub-agents/deepresearch-common.mjs scripts/test-positioning-downgrade.mjs
git commit -m "$(cat <<'EOF'
feat(engine-v2): wire positioning downgrade before competitor evidence tripwire in runWriteStep

Phase 2e: runWriteStep now downgrades unsupported positioning slides into honest
hypotheses before asserting the competitor evidence tripwire, so evidence-scarce
subjects no longer hard-fail the whole chunk.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 回归 —— 既有护栏测试 + 全套单测保持绿

**Files:** 无新增,仅运行既有测试。

- [ ] **Step 1: 既有护栏测试必须仍全绿(证明 tripwire 行为未被破坏)**

Run: `node scripts/test-deepresearch-guardrail.mjs`
Expected: PASS（`✅ test-deepresearch-guardrail passed`）—— 既有 throw 断言不变,因为它们直接调 `assertCompetitorPositioningEvidence`,不经过降级 Pass。

- [ ] **Step 2: Phase 2c 假设策略测试仍绿**

Run: `node scripts/test-assumption-policy.mjs`
Expected: PASS

- [ ] **Step 3: 跑项目既有测试集(确认零回归)**

Run: 项目约定的测试命令(逐个 `node scripts/test-*.mjs`,或既有聚合脚本)。
Expected: 与改动前相同的通过/失败集合。**已知 3 个 pre-existing 失败**(`test-blueprint-demo-cases`、`test-launch-readiness`、`test-skill-entrypoint`)**不是本次回归**——只需确认没有**新增**失败。若出现新增失败,**停下按 §5 上报**,不要硬磨。

- [ ] **Step 4: commit(若有需要的话,通常无改动)**

无代码改动则跳过。

---

## §4 验收清单（CP-2e,Codex 自检 + 交 Claude 复核）

- [ ] **A.** `node scripts/test-positioning-downgrade.mjs` 全绿(A–G 全部断言)。
- [ ] **B.** `node scripts/test-deepresearch-guardrail.mjs` 仍全绿(tripwire 未被破坏)。
- [ ] **C.** `node scripts/test-assumption-policy.mjs` 仍全绿。
- [ ] **D.** 无**新增**测试失败(对比 baseline 的 3 个 pre-existing 失败)。
- [ ] **E.** 代码审查:`downgradePositioningSlides` 是纯函数(不改入参、无副作用、不发网络/不读盘)。
- [ ] **F.** 红线复核:降级**没有**伪造来源——它只删(repo 热度/无出处竞品名)、补(从真实 sourcePool 挑)、改写文字标成假设;`hypothesis_basis`/`validation_method` 是诚实的"还需验证什么",不是编的事实。
- [ ] **G.**(可选,需 Seven 批准烧 token)真跑 `p2-c2-competition-status` 单 chunk,确认不再硬抛错、产出含 `evidence_status:'hypothesis'` 的页,并能通过 Phase 2c 评审进入 `validation_checklist`。

---

## §5 失败时上报格式（给 Seven/Claude）

若任一 Task 卡住或出现**新增**测试失败,**不要自行连续硬磨**:
1. 失败在哪个 Task / 哪条断言(A–G)。
2. 失败信息原文 + 相关代码片段。
3. 是降级 Pass 逻辑问题,还是 tripwire 行为变了,还是接线顺序问题。
4. 不放松红线、不伪造数据,交回判断。

---

## 给小白的讲解

- **现在做的是什么:** 我写了一份"修复说明书"(Phase 2e),交给 Codex 照着改代码。改的是 PPT 引擎里"写页那一关"的一道闸门。
- **目的·为什么:** 上次真跑确诊了——引擎其实**用了**大模型、也**搜到了**竞品(我之前说"搜不到"是看错了日志,已纠正)。真正卡死的是:写到"PPTAgent 应该抢占某个定位"这种结论页时,闸门要求必须有"独立第三方说真有人愿意为它买单"的证据;可 PPTAgent 是个新东西,这种证据网上根本没有,闸门一拿不到就**把整章枪毙**——这就是当初空转 3 小时的真凶。这份说明书让闸门改成:拿不到硬证据时,不再枪毙,而是**老老实实把这页标成"待验证假设",写清楚"凭什么这么猜"和"以后怎么验证"**,然后顺着我们早就修好的"诚实假设通道"汇进方案末尾的"待验证清单"。这完全符合你的红线——**老实承认"还没证实"是反造假,不是造假**;只有"拿 GitHub 点赞数冒充有人付费"那种才是造假,那种仍然会被拦下。
- **你怎么自己核查:** ① 说明书在 `docs/handoffs/2026-05-30-engine-v2-phase2e-positioning-downgrade-plan.md`,开头 Goal 和这段讲解能看懂就对了。② Codex 改完后,§4 验收清单里 A/B/C 三条都是一句命令,跑出来打印 `✅` 就说明改对了、而且没把旧功能弄坏。③ 真正能"看到成品"的是 §4 的 G 条——等你点头烧一点点钱,真跑一章,就能看到原来被枪毙的页,现在变成一页诚实的"待验证假设"留在方案里,而不是整章失败。
