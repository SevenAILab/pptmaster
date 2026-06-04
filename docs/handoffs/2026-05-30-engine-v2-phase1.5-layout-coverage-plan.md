# Engine V2 Phase 1.5 版式覆盖修复 实现计划

> **执行方式（本项目工作流，覆盖通用模板）：** 本计划交 **Codex** 按任务逐条执行；每条任务用 `- [ ]` 勾选跟踪；执行完由 **Claude** 做独立 CP 复核；**Seven** 最终拍板。红线：失败必抛错、不静默兜底、不伪造数据；所有事实可追溯。**未经 Seven 明确要求不得 git commit**（下方各任务的 commit 步骤需 Seven 点头后才执行）。

**目标（一句话）：** 修掉 Phase 1 的派发漏洞，让真实 80 页方案从「100% 白板兜底」变成「按 SXX 命中合适版式、0 fallback」。

**架构（2-3 句）：** 真实数据每页只带 `layout=SXX`（无 `layout_designer.smart_layout`），而 Phase 1 的 `DISPATCH_S` 错误地用智能版式「名字」当键，导致全部掉进 fallback。本期把派发逐字对齐浏览版 `render-deck.mjs` 的 `SMART_LAYOUT_TO_SXX` + 按 SXX 派发，并新增**一个数据驱动的 `render-s-points.mjs`（3 种排布 stack/columns/grid）**覆盖 11 种 SXX。每页数据骨架统一为「动作标题 + 副标 + N 条要点（字符串）」，SXX 只决定这 N 条的视觉排布。

**技术栈：** Node.js ESM；纯 `node scripts/test-*.mjs` + `node:assert/strict`；无 jest/vitest。沿用现有 `.S` 固定 1080×608 自包含模板与 `render-utils-s.mjs` 工具函数。

---

## 背景事实（已逐项核实，供执行者无上下文也能动手）

**1. 真实数据形态**（`outputs/pptagent-blueprint/raw-output.json`，80 页）：
- 每页字段固定为：`page_no / layout / action_title / core_points / data_refs / models_used / page_intent / page_subtitle / render_hints / blueprint_page_no / part_no / part_title / chunk_id`。
- **80 页全部没有 `layout_designer` 字段。**
- `layout` 取值分布：`S22:8, S12:15, S05:27, S03:15, S13:11, S17:3, S09:1`。
- `core_points` **永远是字符串数组**（无嵌套对象、无表格），每页 2-4 条。0 页带 `table` 字段。
- `render_hints.accent_color` 取值为 `accent` 或 `ink`。
- 大量要点是「标签：正文」结构（如 `PART 1:为什么…`、`Q1:跑通样板`、`横轴:从页面效率到策略深度`、`行业边界:AI Agent / …`）。

**2. 漏洞根因**（`scripts/render-deck-s.mjs` 当前实现）：
```js
const DISPATCH_S = { statement, 'split-statement', table, 'matrix-2x2', 'matrix-3x3' }
function renderSlideS(slide) {
  const key = slide.layout_designer?.smart_layout || slide.layout   // 真实数据 = "S05"/"S03"…
  const renderer = DISPATCH_S[key] || renderSFallback               // SXX 不在键里 → 全 fallback
}
```

**3. 正确范式**（浏览版 `scripts/render-deck.mjs` line 47-66，本期逐字对齐）：
```js
export const SMART_LAYOUT_TO_SXX = {
  'hero-statement': 'S22', 'split-statement': 'S03', 'three-layers': 'S05',
  'matrix-2x2': 'S17', 'matrix-3x3': 'S15', 'flow-arrow': 'S09', timeline: 'S09',
  pyramid: 'S13', tree: 'S13', 'kpi-card': 'S22', 'framework-grid': 'S15',
  'brand-house-9-layer': 'S17', 'image-hero': 'S22',
}
// smartLayout = smart_layout || layout；layout = SMART_LAYOUT_TO_SXX[smartLayout] || slide.layout || 'S03'
// 浏览版 RENDERER_DISPATCH 覆盖 11 种 SXX：S03 S05 S09 S12 S13 S14 S15 S17 S19 S21 S22
```

**4. 可复用工具与样式契约**：
- `scripts/renderers-s/render-utils-s.mjs`：`escapeHtml`、`titleBar(label, meta)`→`.TB`、`footer(slide)`→`.PF.PFR`、`nativeTableHtml(headers, rows)`→`.ntbl`。
- `scripts/renderers-s/render-s-table.mjs` 第 18 行已有冒号拆分先例：`value.search(/[:：]/)`（拆「维度：说明」两列）。本期把卡片用的拆分提取为共享 `splitLabel`。
- 模板 `templates/template-deck-S.html` 已含 `.card / .card-title / .card-body` 原语、`.TS h1`(24px) / `.TS .sub`(11px muted) / `.BA`(flex:1, overflow:hidden)。
- 字号规范（设计文档 §4③ 硬约束）：动作标题 22-26px / 卡片标题 ≥13px / 正文 11-12px / 硬地板 9px / 页脚 8.5px。反空心铁律：禁 inline 缩字；放不下减内容或拆页。

**5. SXX → .S 排布映射（本期落地）：**

| SXX | 浏览版语义 | .S 排布 variant | 现数据页数 |
|---|---|---|---|
| S03 | split-statement | columns | 15 |
| S05 | three-layers | stack | 27 |
| S09 | dot-matrix-statement | grid | 1 |
| S12 | manifesto | stack | 15 |
| S13 | three-forces | columns | 11 |
| S17 | system-diagram | columns（轴/象限标签退化为并列，**有标签、非伪造图表**） | 3 |
| S22 | image-hero | columns（无图数据，仅渲染要点，不伪造配图） | 8 |
| S14 | loop-form | stack | 0（未来预留） |
| S15 | matrix-fill | grid | 0（未来预留） |
| S19 | four-cards | grid | 0（未来预留） |
| S21 | tech-spec | table（→ 原生 PPT 表格） | 0（未来预留） |

**留存说明：** `render-s-statement.mjs` 及其测试本期**保留不动**（仍独立通过），但不再进入 SXX 派发（现数据无纯单陈述页）；后续可在专门的清理任务删除，避免本期引入额外回归面。

---

## 文件结构

- 修改 `scripts/renderers-s/render-utils-s.mjs`：新增 `splitLabel(point)` 导出。
- 新建 `scripts/renderers-s/test-split-label.mjs`：`splitLabel` 单测。
- 新建 `scripts/renderers-s/render-s-points.mjs`：数据驱动的 3-variant 要点渲染器。
- 新建 `scripts/renderers-s/test-render-s-points.mjs`：渲染器单测。
- 修改 `templates/template-deck-S.html`：追加 `.cols-row / .cols-stack / .cols-grid / [data-accent="ink"]` 样式（只增不删）。
- 修改 `scripts/test-template-deck-s.mjs`：追加三种容器类存在性断言。
- 修改 `scripts/render-deck-s.mjs`：用 `SMART_LAYOUT_TO_SXX` + `SXX_TO_S_RENDERER` 替换 `DISPATCH_S`。
- 修改 `scripts/test-render-deck-s.mjs`：改为带 `layout` 的输入并断言 SXX 派发、0 fallback。
- 修改 `scripts/renderers-s/render-s-fallback.mjs`：字段名修正 `subtitle→page_subtitle`、`section→part_title`（Task 5）。

---

## Task 1：splitLabel 标签拆分助手（DRY）

**Files:**
- Modify: `scripts/renderers-s/render-utils-s.mjs`
- Test: `scripts/renderers-s/test-split-label.mjs`（新建）

- [ ] **Step 1: 写失败测试**

新建 `scripts/renderers-s/test-split-label.mjs`：
```js
import assert from 'node:assert/strict'
import { splitLabel } from './render-utils-s.mjs'

// 短前缀 + 冒号 → 拆成标签/正文（半角与全角冒号都支持）
assert.deepEqual(splitLabel('行业线:垂直仍有空位'), { label: '行业线', detail: '垂直仍有空位' })
assert.deepEqual(splitLabel('Q1：跑通样板'), { label: 'Q1', detail: '跑通样板' })
// 无冒号 → 整句作正文，标签为空
assert.deepEqual(splitLabel('通用工具正在抢心智'), { label: '', detail: '通用工具正在抢心智' })
// 冒号前过长（>14 字符）→ 不当标签，整句作正文
const long = '这是一段很长的描述性句子总共超过十四个字符:后面'
assert.equal(splitLabel(long).label, '')
// 冒号在句首（idx=0）→ 不产生空标签
assert.deepEqual(splitLabel('：开头冒号'), { label: '', detail: '：开头冒号' })
// 空 / 非字符串安全
assert.deepEqual(splitLabel(''), { label: '', detail: '' })
assert.deepEqual(splitLabel(null), { label: '', detail: '' })
console.log('✅ split-label test passed')
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node scripts/renderers-s/test-split-label.mjs`
Expected: FAIL（`splitLabel is not a function` / 未导出）。

- [ ] **Step 3: 最小实现**

在 `scripts/renderers-s/render-utils-s.mjs` 末尾追加：
```js
// 把 "标签：正文" 形式的要点拆成卡片标题+正文。
// 仅当冒号前缀较短(<=14 且非句首)才视为标签；否则整句作正文。
// 这是对既有文字的视觉重组，不编造任何内容（红线：不伪造）。
export function splitLabel(point) {
  const value = String(point == null ? '' : point).trim()
  const idx = value.search(/[:：]/)
  if (idx > 0 && idx <= 14) {
    const label = value.slice(0, idx).trim()
    const detail = value.slice(idx + 1).trim()
    if (label && detail) return { label, detail }
  }
  return { label: '', detail: value }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node scripts/renderers-s/test-split-label.mjs`
Expected: PASS（打印 `✅ split-label test passed`）。

- [ ] **Step 5: 提交（需 Seven 点头）**
```bash
git add scripts/renderers-s/render-utils-s.mjs scripts/renderers-s/test-split-label.mjs
git commit -m "feat(s): add splitLabel helper for card title/detail split"
```

---

## Task 2：render-s-points.mjs（3 种排布的数据驱动渲染器）

**Files:**
- Create: `scripts/renderers-s/render-s-points.mjs`
- Test: `scripts/renderers-s/test-render-s-points.mjs`（新建）

- [ ] **Step 1: 写失败测试**

新建 `scripts/renderers-s/test-render-s-points.mjs`：
```js
import assert from 'node:assert/strict'
import { renderSPoints } from './render-s-points.mjs'

// columns：冒号要点拆成卡片标题+正文；page_subtitle 作眉头；part_title 作 TB meta
const cols = renderSPoints({
  page_no: 5, layout: 'S03', action_title: '三条主张',
  page_subtitle: '行业窗口', part_title: 'PART 1',
  core_points: ['行业线:垂直仍有空位', '产品线:把策划产品化', '无冒号要点'],
  render_hints: { accent_color: 'accent' },
}, { variant: 'columns' })
assert.ok(cols.includes('<section class="S"'))
assert.ok(cols.includes('data-layout="columns"'))
assert.ok(cols.includes('data-accent="accent"'))
assert.ok(cols.includes('三条主张'))
assert.ok(cols.includes('行业窗口'), '应渲染 page_subtitle 眉头')
assert.ok(cols.includes('PART 1'), '应把 part_title 放进顶栏 meta')
assert.ok(cols.includes('行业线') && cols.includes('垂直仍有空位'), '应按冒号拆标题+正文')
assert.ok(cols.includes('cols-row'), 'columns 用 .cols-row 容器')
assert.ok((cols.match(/class="card"/g) || []).length === 3, '应渲染 3 张卡片')
assert.ok(cols.includes('>03<') && cols.includes('无冒号要点'), '无冒号要点用编号作标题')
assert.ok(!cols.includes('vw'), '不应出现浏览版单位')

// stack
const stack = renderSPoints({ page_no: 3, action_title: '三层', core_points: ['a', 'b', 'c'] }, { variant: 'stack' })
assert.ok(stack.includes('data-layout="stack"') && stack.includes('cols-stack'))

// grid + ink 强调色
const grid = renderSPoints({
  page_no: 63, action_title: '四象限',
  core_points: ['Q1:一', 'Q2:二', 'Q3:三', 'Q4:四'],
  render_hints: { accent_color: 'ink' },
}, { variant: 'grid' })
assert.ok(grid.includes('data-layout="grid"') && grid.includes('cols-grid'))
assert.ok(grid.includes('data-accent="ink"'))
assert.ok(grid.includes('Q1') && grid.includes('Q4'))

// 缺省 variant = columns；空 core_points 不抛错
const def = renderSPoints({ page_no: 1, action_title: '空页', core_points: [] })
assert.ok(def.includes('data-layout="columns"'))

console.log('✅ render-s-points test passed')
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node scripts/renderers-s/test-render-s-points.mjs`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现 render-s-points.mjs**

新建 `scripts/renderers-s/render-s-points.mjs`：
```js
import { escapeHtml, footer, splitLabel, titleBar } from './render-utils-s.mjs'

const VARIANT_CLASS = { stack: 'cols-stack', columns: 'cols-row', grid: 'cols-grid' }

// 统一数据骨架：动作标题 + 副标(page_subtitle) + N 条要点(core_points 字符串)。
// SXX 只通过 variant 决定这 N 条要点的视觉排布（堆叠/分栏/网格）。
export function renderSPoints(slide, { variant = 'columns' } = {}) {
  const layout = VARIANT_CLASS[variant] ? variant : 'columns'
  const title = escapeHtml(slide.action_title || '')
  const eyebrow = escapeHtml(slide.page_subtitle || '')
  const meta = slide.part_title || ''
  const accent = slide.render_hints?.accent_color === 'ink' ? 'ink' : 'accent'
  const points = (slide.core_points || []).slice(0, 6)

  const cards = points.map((point, i) => {
    const { label, detail } = splitLabel(String(point))
    const head = escapeHtml(label || String(i + 1).padStart(2, '0'))
    return `<div class="card"><div class="card-title">${head}</div><div class="card-body">${escapeHtml(detail)}</div></div>`
  }).join('')

  return `<section class="S" data-page="${escapeHtml(String(slide.page_no || ''))}" data-layout="${layout}" data-accent="${accent}">
  ${titleBar('PPTAgent', meta)}
  <div class="TS"><h1>${title}</h1>${eyebrow ? `<div class="sub">${eyebrow}</div>` : ''}</div>
  <div class="BA"><div class="${VARIANT_CLASS[layout]}">${cards}</div></div>
  ${footer(slide)}
</section>`
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node scripts/renderers-s/test-render-s-points.mjs`
Expected: PASS（`✅ render-s-points test passed`）。

- [ ] **Step 5: 提交（需 Seven 点头）**
```bash
git add scripts/renderers-s/render-s-points.mjs scripts/renderers-s/test-render-s-points.mjs
git commit -m "feat(s): add data-driven render-s-points with stack/columns/grid variants"
```

---

## Task 3：模板追加 3 种容器样式

**Files:**
- Modify: `templates/template-deck-S.html`
- Test: `scripts/test-template-deck-s.mjs`

- [ ] **Step 1: 先在测试里加失败断言**

编辑 `scripts/test-template-deck-s.mjs`，在 `console.log('✅ template-deck-S test passed')` 这一行**之前**插入：
```js
assert.ok(tpl.includes('.cols-row{'), '缺少 columns 容器样式 .cols-row')
assert.ok(tpl.includes('.cols-stack{'), '缺少 stack 容器样式 .cols-stack')
assert.ok(tpl.includes('.cols-grid{'), '缺少 grid 容器样式 .cols-grid')
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node scripts/test-template-deck-s.mjs`
Expected: FAIL（缺少 `.cols-row{` 等）。

- [ ] **Step 3: 追加 CSS（只增不删）**

编辑 `templates/template-deck-S.html`，在 `.card-body{...}` 那一行之后、`</style>` 之前插入：
```css
.cols-row{display:flex;gap:12px;height:100%;align-items:stretch}
.cols-row>.card{flex:1 1 0;display:flex;flex-direction:column;min-width:0}
.cols-row .card-body{flex:1}
.cols-stack{display:flex;flex-direction:column;gap:10px;height:100%}
.cols-stack>.card{display:flex;flex-direction:column}
.cols-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;height:100%}
.cols-grid>.card{display:flex;flex-direction:column;min-width:0}
.S[data-accent="ink"] .card-title{color:var(--ink);background:#F3F4F6;border-bottom-color:var(--line)}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node scripts/test-template-deck-s.mjs`
Expected: PASS（`✅ template-deck-S test passed`）。

- [ ] **Step 5: 提交（需 Seven 点头）**
```bash
git add templates/template-deck-S.html scripts/test-template-deck-s.mjs
git commit -m "feat(s): add cols-row/stack/grid + ink accent styles to .S template"
```

---

## Task 4：render-deck-s.mjs 改为 SXX 派发（核心修复）

**Files:**
- Modify: `scripts/render-deck-s.mjs`
- Test: `scripts/test-render-deck-s.mjs`

- [ ] **Step 1: 改写测试为带 layout 的输入 + 派发断言**

把 `scripts/test-render-deck-s.mjs` 整体替换为：
```js
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { renderDeckS } from './render-deck-s.mjs'

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pptagent-s-'))
const inp = path.join(tmp, 'in.json')
const out = path.join(tmp, 'deck.html')

await fs.writeFile(inp, JSON.stringify({
  client_profile: { name: '测试客户' },
  slides: [
    { page_no: 1, layout: 'S05', action_title: '第一页', core_points: ['a', 'b', 'c'] },
    { page_no: 2, layout: 'S03', action_title: '第二页', core_points: ['c'] },
    { page_no: 3, layout: 'S09', action_title: '第三页', core_points: ['Q1:一', 'Q2:二', 'Q3:三', 'Q4:四'] },
  ],
}))

await renderDeckS(inp, out)
const html = await fs.readFile(out, 'utf8')

assert.equal((html.match(/<section class="S"/g) || []).length, 3, '应渲染 3 个 .S 页面')
assert.ok(html.includes('width:1080px'), '应内联 .S 模板')
assert.ok(html.includes('第一页') && html.includes('第二页') && html.includes('第三页'))
assert.ok(!html.includes('100vw'), '不应出现浏览版单位')
assert.ok(!html.includes('fonts.googleapis.com'), '应自包含')
assert.ok(!html.includes('<!-- SLIDES_HERE -->'), '注入标记应被替换')
assert.ok(!html.includes('[必填]'), '占位标题应被替换')
// 核心修复点：已知 SXX 命中正确排布、不再 fallback
assert.ok(html.includes('data-layout="stack"'), 'S05 应派发到 stack')
assert.ok(html.includes('data-layout="columns"'), 'S03 应派发到 columns')
assert.ok(html.includes('data-layout="grid"'), 'S09 应派发到 grid')
assert.ok(!html.includes('data-layout="fallback"'), '已知 SXX 不应再走 fallback')

await fs.rm(tmp, { recursive: true, force: true })
console.log('✅ render-deck-s test passed')
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node scripts/test-render-deck-s.mjs`
Expected: FAIL（当前 `DISPATCH_S` 用名字作键，S05/S03/S09 全落 `data-layout="fallback"`）。

- [ ] **Step 3: 替换派发逻辑**

把 `scripts/render-deck-s.mjs` 顶部 import 段到 `renderSlideS` 函数（第 1-24 行）整体替换为：
```js
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderSFallback } from './renderers-s/render-s-fallback.mjs'
import { renderSPoints } from './renderers-s/render-s-points.mjs'
import { renderSTable } from './renderers-s/render-s-table.mjs'
import { escapeHtml } from './renderers-s/render-utils-s.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TEMPLATE = 'templates/template-deck-S.html'

// 与浏览版 scripts/render-deck.mjs 逐字对齐，避免两条链路漂移。
export const SMART_LAYOUT_TO_SXX = {
  'hero-statement': 'S22',
  'split-statement': 'S03',
  'three-layers': 'S05',
  'matrix-2x2': 'S17',
  'matrix-3x3': 'S15',
  'flow-arrow': 'S09',
  timeline: 'S09',
  pyramid: 'S13',
  tree: 'S13',
  'kpi-card': 'S22',
  'framework-grid': 'S15',
  'brand-house-9-layer': 'S17',
  'image-hero': 'S22',
}

// 每个 SXX 绑定一种 .S 排布；真实数据 7 种全覆盖，另 4 种为未来 deck 预留。
const points = variant => slide => renderSPoints(slide, { variant })
export const SXX_TO_S_RENDERER = {
  S03: points('columns'),
  S05: points('stack'),
  S09: points('grid'),
  S12: points('stack'),
  S13: points('columns'),
  S14: points('stack'),
  S15: points('grid'),
  S17: points('columns'),
  S19: points('grid'),
  S21: slide => renderSTable(slide),
  S22: points('columns'),
}

function renderSlideS(slide) {
  const smartLayout = slide.layout_designer?.smart_layout || slide.layout
  const sxx = SMART_LAYOUT_TO_SXX[smartLayout] || slide.layout || 'S03'
  const renderer = SXX_TO_S_RENDERER[sxx]
  if (renderer) return renderer(slide)
  if (slide.table) return renderSTable(slide)
  return renderSFallback(slide)
}
```
（`renderDeckS` 与 `cliMain` 以下保持原样不动。注意：原 `renderSStatement` 的 import 一并移除——它不再进入派发。）

- [ ] **Step 4: 跑测试确认通过**

Run: `node scripts/test-render-deck-s.mjs`
Expected: PASS（`✅ render-deck-s test passed`）。

- [ ] **Step 5: 提交（需 Seven 点头）**
```bash
git add scripts/render-deck-s.mjs scripts/test-render-deck-s.mjs
git commit -m "fix(s): dispatch by SXX (align with viewer SMART_LAYOUT_TO_SXX) — kill 100% fallback"
```

---

## Task 5：修正 fallback 的字段名（顺手补漏）

**Files:**
- Modify: `scripts/renderers-s/render-s-fallback.mjs`
- Test: `scripts/renderers-s/test-render-s-fallback.mjs`

- [ ] **Step 1: 先读测试确认无冲突**

Run: `node scripts/renderers-s/test-render-s-fallback.mjs`（确认当前通过）
并打开 `scripts/renderers-s/test-render-s-fallback.mjs` 确认它**没有**断言「`subtitle`/`section` 字段一定不出现」。若有冲突，停下来报 Seven，不擅自改测试语义。

- [ ] **Step 2: 改字段名**

编辑 `scripts/renderers-s/render-s-fallback.mjs`：
- 把 `const sub = escapeHtml(slide.subtitle || '')` 改为 `const sub = escapeHtml(slide.page_subtitle || '')`
- 把 `${titleBar('PPTAgent', slide.section || '')}` 改为 `${titleBar('PPTAgent', slide.part_title || '')}`

- [ ] **Step 3: 跑测试确认通过**

Run: `node scripts/renderers-s/test-render-s-fallback.mjs`
Expected: PASS。

- [ ] **Step 4: 提交（需 Seven 点头）**
```bash
git add scripts/renderers-s/render-s-fallback.mjs
git commit -m "fix(s): fallback reads real fields page_subtitle/part_title"
```

---

## Task 6：真实 80 页端到端验收 + 全量回归

**Files:** 无新增；这是验收任务。

- [ ] **Step 1: 重渲染真实方案**

Run: `node scripts/render-deck-s.mjs outputs/pptagent-blueprint/raw-output.json output/demo/deck.html`
Expected: 打印 `[render-s] 80 个 .S 页面 -> output/demo/deck.html`。

- [ ] **Step 2: 断言 0 fallback + 看排布分布**

Run:
```bash
echo "fallback 页数（必须为 0）:" && grep -o 'data-layout="fallback"' output/demo/deck.html | wc -l
echo "各排布分布:" && grep -o 'data-layout="[a-z]*"' output/demo/deck.html | sort | uniq -c
```
Expected: fallback = **0**；stack/columns/grid 合计 = 80（对照映射：stack=S05+S12=42、columns=S03+S13+S17+S22=37、grid=S09=1）。

- [ ] **Step 3: 全量测试回归（11 个 + package.json）**

Run（逐条应全 PASS）：
```bash
node scripts/test-template-deck-s.mjs
node scripts/renderers-s/test-render-utils-s.mjs
node scripts/renderers-s/test-split-label.mjs
node scripts/renderers-s/test-render-s-fallback.mjs
node scripts/renderers-s/test-render-s-points.mjs
node scripts/renderers-s/test-render-s-statement.mjs
node scripts/renderers-s/test-render-s-table.mjs
node scripts/test-render-deck-s.mjs
node scripts/test-deck-to-pptx.mjs
node scripts/test-deck-to-pptx-runner.mjs
node scripts/test-render-deck.mjs
node scripts/renderers/test-renderers.mjs
node scripts/test-blueprint-assemble.mjs
node -e "require('./package.json')"
```

- [ ] **Step 4: 转 PPTX 仍可跑通（不回归 Phase 1 能力）**

Run: `node scripts/deck-to-pptx.mjs output/demo/deck.html output/demo/pptx`
Expected: 退出码 0；打印 `设计真表格=0 原生PPT表格=0`（本数据无表格，符合预期）；`output/demo/pptx/deck_推荐可编辑版.pptx` 生成。

- [ ] **Step 5: 交 Claude 做 CP 复核**

CP 清单：
- [ ] 真实 80 页 fallback = 0，排布分布与映射一致
- [ ] 14 项测试 + package.json 全绿
- [ ] PPTX 转换退出码 0、产物存在
- [ ] 抽查 deck.html 任一 S05 页：确为 `data-layout="stack"`，要点按冒号拆成卡片标题/正文，眉头(page_subtitle)与顶栏(part_title)正确
- [ ] 红线复跑：`HTML2PPT_DIR=/no/such/dir node scripts/deck-to-pptx.mjs output/demo/deck.html /tmp/x` → 退出码 1 + 中文报错

- [ ] **Step 6: 人工 UI 复核（Seven 或 Claude 打开本地 PPTX）**
- [ ] PowerPoint / Keynote 能打开不报错
- [ ] 随机 3 页双击标题/正文能直接改字
- [ ] 每页 16:9、关键内容无裁切（尤其 columns 4 卡、grid 2×2 不溢出）

---

## 自检（写完计划回看）

- **覆盖：** 漏洞根因（派发键错）→ Task 4 修；版式缺失 → Task 2/3 补；字段丢失 → Task 5 修；真实数据 0 fallback 验收 → Task 6。无遗漏。
- **占位扫描：** 无 TBD/TODO；每个改代码的 Step 都给了完整代码与确切命令。
- **类型/命名一致：** `splitLabel`（Task 1）↔ render-s-points 使用（Task 2）一致；`VARIANT_CLASS` 的 `cols-row/cols-stack/cols-grid`（Task 2）↔ 模板 CSS（Task 3）↔ 测试断言（Task 3/4）一致；`SXX_TO_S_RENDERER` 的 variant 值 ∈ {stack,columns,grid} 与 `VARIANT_CLASS` 键一致。
- **红线：** 未改任何「失败必抛错」逻辑；`splitLabel` 仅重组既有文字、不伪造；表格路径(`renderSTable`/原生 `<a:tbl>`)保留。

---

## 给小白的讲解

- **现在做的是什么：** 给"把方案排版成 PPT"的程序补上"看菜下饭"的能力。
- **目的·为什么：** 上一版我犯了个错——程序认版式时对的"暗号"写错了，结果 80 页全被当成"不认识"，统统排成了最朴素的白板块（能编辑，但没有三层结构、三力对比、四象限这些咨询味的版式）。这一版把暗号改对（直接照搬老的浏览版用的同一套暗号表），再准备 3 种排版样式（竖着堆 / 并排分栏 / 田字格），让每一页都能对上一种好看的排版。
- **你怎么自己核查：** 等 Codex 按这份计划做完，你只看 Task 6 的一行结果——"fallback 页数（必须为 0）"。如果是 0，说明 80 页全都用上了正经版式；再让我或你把生成的 PPTX 在 Keynote 里打开，随手双击几页看能不能改字、是不是 16:9 不裁切。这份计划还没动任何代码，只是"施工图"，你过目没问题我再交给 Codex 开工。
