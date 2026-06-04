# Engine V2 · Phase 1 实现计划（④ 转可编辑 PPT + ③ 格式半边 `.S`）

> **For agentic workers:** REQUIRED SUB-SKILL: 本计划在本项目里由 **Codex 执行 + Claude 独立 CP 复核** 跑（见文末「执行交接」）。若改由 Claude 自己执行，则用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans。所有步骤用 checkbox（`- [ ]`）跟踪，逐个 Task 完成后做 CP 复核再进下一个。

**Goal:** 让现有引擎产出的方案能够「一键转成可编辑 PPT」——先把渲染输出升级为转换器认得的 `.S`（1080×608 固定尺寸、自包含、真文字、真表格）标准幻灯片，再接上外部 html2ppt 转换器，并用「失败必抛错 + 原生表格数不得少于设计真表格数」的护栏守住红线。

**Architecture:** 不改动现有「网页全屏浏览版」渲染链（`render-deck.mjs` + `renderers/`，它是 `vw/vh` 视口缩放的看片器）。**新增一条平行的 `.S` 导出链**：`render-deck-s.mjs` + `renderers-s/` + 自包含模板 `templates/template-deck-S.html`，消费与现有链**完全相同的整本方案 JSON**。转 PPT 由薄封装 `deck-to-pptx.mjs` **调用外部 html2ppt**（路径环境变量 `HTML2PPT_DIR` 可配，找不到就抛错），转换完读回转换器自己写的 `_转换报告.md` 校验表格完整性。

**Tech Stack:** Node.js ≥18，ES Modules（`.mjs`），零新依赖（转换器在外部工具目录里、用子进程调用）。测试沿用本仓库既有风格——纯 `node scripts/test-*.mjs` 脚本 + `node:assert/strict`，通过时打印 `✅ ... passed`。外部转换器：`@halobiron/dom-to-pptx ^1.2.2` + `playwright ^1.59.1` + `jszip ^3.10.1`（**装在外部工具目录，不进本仓库**）。

**红线（贯穿所有 Task，违反即不合格）：** 失败必抛错，禁止静默兜底、禁止伪造数据。没有来源的内容只能进 assumptions，不得伪装成事实。转换失败、丢表、找不到工具——一律抛错并以非零码退出。

---

## A. 与设计文档的两处细化（已经 Seven 在 2026-05-29 确认）

设计文档 `docs/handoffs/2026-05-29-engine-v2-4stage-design.md` 写于「读全代码之前」，读代码后发现两处措辞与代码现实不符，已向 Seven 确认按下面执行：

| 设计文档原措辞 | 代码现实 | 已确认的做法 | 理由 |
|---|---|---|---|
| ③：「直接改造 renderer 到 .S」 | 现有 11 个 renderer + swiss 模板是 `vw/vh` 视口缩放的**看片器**（`#deck{width:10000vw}` 横向胶片条、`.slide{width:100vw;height:100vh}`），为屏幕浏览写死 | **新增一套 `.S` 导出 renderer，不动现有浏览版** | 硬改会弄坏现在能用的浏览版；两种用途（屏幕浏览 vs 转 PPT）本就是不同输出目标，平行更安全 |
| ④：「把 html2ppt vendor 进 pptmaster」 | html2ppt 自带 playwright + 一个数百 MB 的 Chromium，已装好在 `~/Downloads/html2ppt-sales-tool-v26.1.1` | **调用外部工具（`HTML2PPT_DIR` 可配），不搬进 repo** | 现在是「先做引擎」阶段，自包含的好处要到「打包上线给陌生用户」才用得上；现在搬进来只会让 repo 变大、安装变慢 |

「renderer 直接输出 `.S`」这条设计意图仍然遵守——新 renderer **直接吐 `.S` HTML**，不存在「先渲染浏览版再 DOM 改写成 `.S`」的中间层。

---

## B. 转换器契约（已读源码核实，附文件:行号，禁止凭记忆改）

源码：`$HTML2PPT_DIR/99-runtime-do-not-edit/bin/html-to-pptx.js`（下称 `html-to-pptx.js`）。

| 事实 | 出处 | 对本计划的约束 |
|---|---|---|
| 幻灯片选择器优先级 `.S` > `.slide` > `.slides>*` > `[data-slide]` > `[data-page]`；`.S/.slide/[data-slide]` 加 25 分 | `html-to-pptx.js:159-190` | 我们显式传 `--selector ".S"`，输出页面容器必须是 `class="S"` |
| 幻灯片画布 9144000×5143500 EMU（=10in×5.625in，16:9） | `html-to-pptx.js:10-11` | `.S` 用 `1080px×608px`（同比例），`overflow:hidden` |
| `--out <dir>` 把文件**直接**写进该目录（`outDirProvided=true` 时不再嵌套子目录） | `html-to-pptx.js:65-67, 898-900` | 封装器传 `--out <我的目录>`，产物就在该目录里 |
| 选不到页面时 `throw new Error('Selector matched no elements: ...')` | `html-to-pptx.js:516, 523` | 渲染必须产出至少 1 个 `.S`，否则转换会抛错（这正是我们要的失败行为） |
| 任意错误经 `main().catch(...) → process.exit(1)` | `html-to-pptx.js:1011+` | 子进程**非零退出码 = 失败**，封装器据此抛错 |
| 真实 `<table>` → 原生可编辑 PPT 表格（XML `<a:tbl>`）；`div.table` 旧式 → 只能当独立形状编辑（告警） | `html-to-pptx.js:243-260, 446-451` | 表格内容必须用真 `<table>`，并标 `data-pptx-role="native-table"` |
| 转换报告写 `- Native PowerPoint tables: <N>`（N=各页 `<a:tbl>` 计数之和） | `html-to-pptx.js:617-648, 740` | 封装器解析这行，校验 `N ≥ HTML 里 <table> 数` |
| 产物文件名：`<base>_推荐可编辑版.pptx` / `_最大可编辑版.pptx` / `_原始保真版.pptx` / `_转换报告.md` / `_预检报告.md` / `_给售前看的结论.txt` | `html-to-pptx.js:902-907` | 封装器按后缀 `endsWith('_转换报告.md')`、`endsWith('_推荐可编辑版.pptx')` 定位，不依赖 `<base>` 拼接 |
| CLI：`node bin/html-to-pptx.js <input.html> --out <dir> --selector ".S" --no-open` | `html-to-pptx.js:31-45` | 这就是封装器要 spawn 的命令 |
| 依赖检查：缺 `node_modules/@halobiron/dom-to-pptx/dist/dom-to-pptx.bundle.js` 即报「缺少依赖」 | `convert-entry.js:145-147, 498` | 首次需在工具目录 `npm install && npm run setup:browser`（见 Task 9） |

---

## C. File Structure（本期要碰的全部文件）

**新建（`.S` 导出链）：**
- `templates/template-deck-S.html` — 自包含 `.S` 版式模板（固定 1080×608、系统字体无外链、含 `<!-- SLIDES_HERE -->` 注入标记）。**真实文件，不是软链接。**
- `scripts/renderers-s/render-utils-s.mjs` — `.S` 公共工具：`escapeHtml` / `titleBar` / `footer` / `nativeTableHtml`（吐真 `<table data-pptx-role="native-table">`）。
- `scripts/renderers-s/render-s-fallback.mjs` — 通用兜底 `.S` renderer（任何 slide 都能产出合法 `.S`，保证端到端先跑通）。
- `scripts/renderers-s/render-s-statement.mjs` — 命名版式：编号陈述（最常用）。
- `scripts/renderers-s/render-s-table.mjs` — 命名版式：对比/矩阵表（走真 `<table>`，验证原生表格护栏）。
- `scripts/render-deck-s.mjs` — `.S` 渲染入口：`renderDeckS(inputJson, outputHtml)` + CLI。
- `scripts/deck-to-pptx.mjs` — 转换封装：定位工具、跑转换、校验护栏；`deckToPptx({...})` + 纯函数 helpers + CLI。

**新建（测试）：**
- `scripts/test-template-deck-s.mjs`
- `scripts/renderers-s/test-render-utils-s.mjs`
- `scripts/renderers-s/test-render-s-fallback.mjs`
- `scripts/renderers-s/test-render-s-statement.mjs`
- `scripts/renderers-s/test-render-s-table.mjs`
- `scripts/test-render-deck-s.mjs`
- `scripts/test-deck-to-pptx.mjs`（纯 helpers）
- `scripts/test-deck-to-pptx-runner.mjs`（注入假 runner 测编排，不触发真 playwright）

**修改：**
- `package.json` — `scripts` 增加 `deck:s` 与 `deck:pptx`（不加 dependencies）。

**不碰：** 现有 `render-deck.mjs`、`renderers/`、`templates/template-swiss.html`、所有 sub-agent / blueprint / web-search 链路。

---

## Phase 1 Tasks

### Task 1: `.S` 自包含导出模板

**Files:**
- Create: `templates/template-deck-S.html`
- Test: `scripts/test-template-deck-s.mjs`

- [ ] **Step 1: 写失败测试**

`scripts/test-template-deck-s.mjs`：
```js
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tpl = await fs.readFile(path.join(ROOT, 'templates/template-deck-S.html'), 'utf8')

assert.ok(tpl.includes('.S{'), '缺少 .S 容器定义')
assert.ok(tpl.includes('width:1080px'), '缺少 1080px 宽度')
assert.ok(tpl.includes('height:608px'), '缺少 608px 高度')
assert.ok(tpl.includes('<!-- SLIDES_HERE -->'), '缺少注入标记')
assert.ok(!tpl.includes('100vw'), '不应包含浏览版的 100vw（必须固定 px）')
assert.ok(!tpl.includes('10000vw'), '不应包含浏览版的胶片条 10000vw')
assert.ok(!tpl.includes('fonts.googleapis.com'), '不应外链字体（必须自包含、可离线转换）')
console.log('✅ template-deck-S test passed')
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node scripts/test-template-deck-s.mjs`
Expected: FAIL — `ENOENT: no such file ... template-deck-S.html`

- [ ] **Step 3: 写模板**

`templates/template-deck-S.html`：
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>[必填] 替换为 PPT 标题 · Deck</title>
<style>
/* ===== Engine V2 .S 导出版式系统（自包含 / 固定 1080×608 / 无外链字体） =====
   字号规范（来自设计文档 §4③，硬约束）：
   动作标题 22–26px / 卡片标题 ≥13px(硬下限) / 正文 11–12px / 硬地板 9px / 页脚 8.5px(唯一例外)
   反空心铁律：禁止用缩小字号塞内容；放不下就减内容或拆页，不要 inline 改小字号。 */
:root{
  --paper:#ffffff; --ink:#111827; --muted:#6B7280; --line:#E5E7EB;
  --accent:#002FA7; --accent-bg:#EEF2FF; --accent-line:#C7D2FE;
  --ok:#059669; --warn:#D97706; --risk:#DC2626;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC","Helvetica Neue",Arial,sans-serif;background:#E5E7EB;color:var(--ink);line-height:1.45}
.S{width:1080px;height:608px;margin:24px auto;background:var(--paper);position:relative;overflow:hidden;display:flex;flex-direction:column;print-color-adjust:exact;-webkit-print-color-adjust:exact}
.TB{height:32px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 32px;flex-shrink:0}
.TB .logo{font-size:11px;font-weight:900;letter-spacing:.04em}
.TB .meta{font-size:9px;color:rgba(255,255,255,.7)}
.TS{padding:14px 40px 10px;border-bottom:1px solid var(--line);flex-shrink:0}
.TS h1{font-size:24px;line-height:1.2;color:var(--ink);font-weight:900}
.TS .sub{margin-top:4px;font-size:11px;color:var(--muted)}
.BA{flex:1;padding:16px 40px 30px;overflow:hidden;font-size:12px;color:#374151}
.PF{position:absolute;bottom:8px;height:16px;font-size:8.5px;color:#9CA3AF;display:flex;align-items:center}
.PF.PFR{right:40px}.PF.PFL{left:40px}
.points{list-style:none}
.points li{padding:8px 0;border-top:1px solid var(--line);font-size:12px}
.points li:first-child{border-top:0}
.statement-points{list-style:none;display:flex;flex-direction:column;gap:6px}
.statement-points li{display:grid;grid-template-columns:40px 1fr;gap:12px;align-items:start;padding:10px 0;border-top:1px solid var(--line)}
.statement-points li:first-child{border-top:0}
.statement-points .num{font-size:13px;font-weight:900;color:var(--accent)}
.statement-points .txt{font-size:12px;line-height:1.5}
.ntbl{width:100%;border-collapse:collapse;font-size:11px}
.ntbl th,.ntbl td{border:1px solid var(--line);padding:6px 9px;text-align:left;vertical-align:top}
.ntbl th{background:var(--accent-bg);color:var(--accent);font-weight:900;font-size:12px}
.card{border:1px solid var(--line);border-radius:6px;overflow:hidden}
.card-title{padding:7px 9px;background:var(--accent-bg);color:var(--accent);font-size:13px;font-weight:900;border-bottom:1px solid var(--accent-line)}
.card-body{padding:8px 9px;font-size:12px;color:#374151}
</style>
</head>
<body>
<!-- SLIDES_HERE -->
</body>
</html>
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node scripts/test-template-deck-s.mjs`
Expected: PASS — `✅ template-deck-S test passed`

- [ ] **Step 5: 提交**

```bash
git add templates/template-deck-S.html scripts/test-template-deck-s.mjs
git commit -m "feat(engine-v2): add self-contained .S export template (1080x608)"
```

---

### Task 2: `.S` 公共渲染工具（含真表格）

**Files:**
- Create: `scripts/renderers-s/render-utils-s.mjs`
- Test: `scripts/renderers-s/test-render-utils-s.mjs`

- [ ] **Step 1: 写失败测试**

`scripts/renderers-s/test-render-utils-s.mjs`：
```js
import assert from 'node:assert/strict'
import { escapeHtml, nativeTableHtml, footer, titleBar } from './render-utils-s.mjs'

assert.equal(escapeHtml('<a>&"'), '&lt;a&gt;&amp;&quot;')

const t = nativeTableHtml(['维度', '说明'], [['定位', '高端'], ['人群', 'Z世代']])
assert.ok(t.includes('<table'), '应为真实 <table>')
assert.ok(t.includes('data-pptx-role="native-table"'), '应标记 native-table 角色')
assert.ok(t.includes('<th>维度</th>'))
assert.ok(t.includes('<td>高端</td>'))
assert.ok(t.includes('<td>Z世代</td>'))

assert.ok(footer({ page_no: 7 }).includes('7'), '页脚应含页码')
assert.ok(titleBar('PPTAgent', '品牌定位').includes('PPTAgent'))
console.log('✅ render-utils-s test passed')
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node scripts/renderers-s/test-render-utils-s.mjs`
Expected: FAIL — `Cannot find module ... render-utils-s.mjs`

- [ ] **Step 3: 写实现**

`scripts/renderers-s/render-utils-s.mjs`：
```js
export function escapeHtml(value) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function titleBar(label = 'PPTAgent', meta = '') {
  return `<div class="TB"><span class="logo">${escapeHtml(label)}</span><span class="meta">${escapeHtml(meta)}</span></div>`
}

export function footer(slide) {
  const page = escapeHtml(String(slide?.page_no || ''))
  return `<div class="PF PFR">${page}</div>`
}

// 真实 <table>：转换器会把它变成可编辑的原生 PPT 表格（XML <a:tbl>）。
export function nativeTableHtml(headers = [], rows = []) {
  const thead = `<tr>${headers.map(h => `<th>${escapeHtml(String(h))}</th>`).join('')}</tr>`
  const tbody = rows
    .map(r => `<tr>${(r || []).map(c => `<td>${escapeHtml(String(c))}</td>`).join('')}</tr>`)
    .join('')
  return `<table data-pptx-role="native-table" class="ntbl"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node scripts/renderers-s/test-render-utils-s.mjs`
Expected: PASS — `✅ render-utils-s test passed`

- [ ] **Step 5: 提交**

```bash
git add scripts/renderers-s/render-utils-s.mjs scripts/renderers-s/test-render-utils-s.mjs
git commit -m "feat(engine-v2): add .S render utils with native-table helper"
```

---

### Task 3: `.S` 通用兜底 renderer

**Files:**
- Create: `scripts/renderers-s/render-s-fallback.mjs`
- Test: `scripts/renderers-s/test-render-s-fallback.mjs`

- [ ] **Step 1: 写失败测试**

`scripts/renderers-s/test-render-s-fallback.mjs`：
```js
import assert from 'node:assert/strict'
import { renderSFallback } from './render-s-fallback.mjs'

const html = renderSFallback({ page_no: 2, action_title: '测试标题', core_points: ['一', '二'] })
assert.ok(html.includes('<section class="S"'), '应为 .S 容器')
assert.ok(html.includes('data-page="2"'))
assert.ok(html.includes('测试标题'))
assert.ok(html.includes('一') && html.includes('二'))
assert.ok(!html.includes('vw'), '.S 不应使用 vw 单位')
console.log('✅ render-s-fallback test passed')
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node scripts/renderers-s/test-render-s-fallback.mjs`
Expected: FAIL — `Cannot find module ... render-s-fallback.mjs`

- [ ] **Step 3: 写实现**

`scripts/renderers-s/render-s-fallback.mjs`：
```js
import { escapeHtml, titleBar, footer } from './render-utils-s.mjs'

export function renderSFallback(slide) {
  const title = escapeHtml(slide.action_title || '')
  const sub = escapeHtml(slide.subtitle || '')
  const points = (slide.core_points || [])
    .map(p => `<li>${escapeHtml(String(p))}</li>`)
    .join('')
  return `<section class="S" data-page="${escapeHtml(String(slide.page_no || ''))}" data-layout="fallback">
  ${titleBar('PPTAgent', escapeHtml(slide.section || ''))}
  <div class="TS"><h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div>
  <div class="BA"><ul class="points">${points}</ul></div>
  ${footer(slide)}
</section>`
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node scripts/renderers-s/test-render-s-fallback.mjs`
Expected: PASS — `✅ render-s-fallback test passed`

- [ ] **Step 5: 提交**

```bash
git add scripts/renderers-s/render-s-fallback.mjs scripts/renderers-s/test-render-s-fallback.mjs
git commit -m "feat(engine-v2): add universal .S fallback renderer"
```

---

### Task 4: `.S` 渲染入口 `render-deck-s.mjs`（→ 产出合法 `.S` HTML）

**Files:**
- Create: `scripts/render-deck-s.mjs`
- Test: `scripts/test-render-deck-s.mjs`

- [ ] **Step 1: 写失败测试**

`scripts/test-render-deck-s.mjs`：
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
    { page_no: 1, action_title: '第一页', core_points: ['a', 'b'] },
    { page_no: 2, action_title: '第二页', core_points: ['c'] },
  ],
}))

await renderDeckS(inp, out)
const html = await fs.readFile(out, 'utf8')

assert.equal((html.match(/<section class="S"/g) || []).length, 2, '应渲染 2 个 .S 页面')
assert.ok(html.includes('width:1080px'), '应内联 .S 模板')
assert.ok(html.includes('第一页') && html.includes('第二页'))
assert.ok(!html.includes('100vw'), '不应出现浏览版单位')
assert.ok(!html.includes('fonts.googleapis.com'), '应自包含')
assert.ok(!html.includes('<!-- SLIDES_HERE -->'), '注入标记应被替换')
assert.ok(!html.includes('[必填]'), '占位标题应被替换')

await fs.rm(tmp, { recursive: true, force: true })
console.log('✅ render-deck-s test passed')
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node scripts/test-render-deck-s.mjs`
Expected: FAIL — `Cannot find module ... render-deck-s.mjs`

- [ ] **Step 3: 写实现**

`scripts/render-deck-s.mjs`（本任务里 dispatch 表先为空，全部走 fallback；命名版式在 Task 7/8 接入）：
```js
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderSFallback } from './renderers-s/render-s-fallback.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TEMPLATE = 'templates/template-deck-S.html'

// 命名 .S 版式在 Task 7/8 接入；现在全部走兜底。
const DISPATCH_S = {}

function renderSlideS(slide) {
  const key = slide.layout_designer?.smart_layout || slide.layout
  const renderer = DISPATCH_S[key] || renderSFallback
  return renderer(slide)
}

export async function renderDeckS(inputJson, outputHtml) {
  const data = JSON.parse(await fs.readFile(inputJson, 'utf8'))
  const template = await fs.readFile(path.join(REPO_ROOT, TEMPLATE), 'utf8')
  if (!template.includes('<!-- SLIDES_HERE -->')) {
    throw new Error('模板缺少 <!-- SLIDES_HERE --> 注入标记')
  }
  const slides = data.slides || []
  if (slides.length === 0) {
    throw new Error('方案 JSON 没有 slides，无法渲染（红线：失败必抛错，不产空 deck）')
  }
  const slidesHtml = slides.map(renderSlideS).join('\n\n')
  const clientName = data.client_profile?.name || data.metadata?.client_name || '品牌定位案'
  const html = template
    .replace('<!-- SLIDES_HERE -->', slidesHtml)
    .replace(/\[必填\][^<]*/g, `${clientName} · 品牌定位案`)
  await fs.mkdir(path.dirname(outputHtml), { recursive: true })
  await fs.writeFile(outputHtml, html)
  return { slideCount: slides.length, outputHtml }
}

async function cliMain() {
  const [inputJson, outputHtml] = process.argv.slice(2).filter(a => !a.startsWith('--'))
  if (!inputJson || !outputHtml) {
    console.error('Usage: node scripts/render-deck-s.mjs <input.json> <output.html>')
    process.exit(1)
  }
  const r = await renderDeckS(inputJson, outputHtml)
  console.log(`[render-s] ${r.slideCount} 个 .S 页面 -> ${outputHtml}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => { console.error(error); process.exit(1) })
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node scripts/test-render-deck-s.mjs`
Expected: PASS — `✅ render-deck-s test passed`

- [ ] **Step 5: 提交**

```bash
git add scripts/render-deck-s.mjs scripts/test-render-deck-s.mjs
git commit -m "feat(engine-v2): add .S deck renderer entry (produces valid .S HTML)"
```

---

### Task 5: 转换封装纯函数 helpers（护栏的可单测内核）

**Files:**
- Create: `scripts/deck-to-pptx.mjs`（本任务只放纯函数；编排在 Task 6 追加）
- Test: `scripts/test-deck-to-pptx.mjs`

- [ ] **Step 1: 写失败测试**

`scripts/test-deck-to-pptx.mjs`：
```js
import assert from 'node:assert/strict'
import {
  countDesignTables,
  parseNativeTableCount,
  assertConversionIntegrity,
  resolveTool,
} from './deck-to-pptx.mjs'

// 数 HTML 里的真表格
assert.equal(countDesignTables('<table><tr></tr></table> <table >'), 2)
assert.equal(countDesignTables('<div>no tables</div>'), 0)

// 解析转换报告里的原生表格数
assert.equal(parseNativeTableCount('x\n- Native PowerPoint tables: 5\ny'), 5)
assert.throws(() => parseNativeTableCount('no count here'), /Native PowerPoint tables/)

// 护栏：合格 / 退出码非零 / 丢表 三种判定
assert.ok(assertConversionIntegrity({ exitCode: 0, designTables: 2, nativeTables: 3 }))
assert.throws(() => assertConversionIntegrity({ exitCode: 1, designTables: 0, nativeTables: 0 }), /退出码 1/)
assert.throws(() => assertConversionIntegrity({ exitCode: 0, designTables: 3, nativeTables: 1 }), /丢表/)

// 工具找不到必须抛错（红线）
assert.throws(() => resolveTool({ HTML2PPT_DIR: '/no/such/tool/dir' }), /未找到 html2ppt/)
console.log('✅ deck-to-pptx helpers test passed')
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node scripts/test-deck-to-pptx.mjs`
Expected: FAIL — `Cannot find module ... deck-to-pptx.mjs`

- [ ] **Step 3: 写实现（仅纯函数）**

`scripts/deck-to-pptx.mjs`：
```js
import fs from 'node:fs'
import path from 'node:path'

export const DEFAULT_HTML2PPT_DIR = '/Users/seven/Downloads/html2ppt-sales-tool-v26.1.1'

// 定位外部转换器入口；找不到就抛错（红线：不静默兜底）。
export function resolveTool(env = process.env) {
  const dir = env.HTML2PPT_DIR || DEFAULT_HTML2PPT_DIR
  const entry = path.join(dir, '99-runtime-do-not-edit', 'bin', 'html-to-pptx.js')
  if (!fs.existsSync(entry)) {
    throw new Error(`未找到 html2ppt 转换器: ${entry}。请设置环境变量 HTML2PPT_DIR 指向工具目录。`)
  }
  return entry
}

// HTML 里的真 <table> 数 = 期望的原生 PPT 表格数。
export function countDesignTables(html) {
  return (html.match(/<table[\s>]/g) || []).length
}

// 从转换器写的 *_转换报告.md 里解析原生表格数；缺这行就抛错（无法校验=不合格）。
export function parseNativeTableCount(reportMarkdown) {
  const m = reportMarkdown.match(/Native PowerPoint tables:\s*(\d+)/)
  if (!m) throw new Error('转换报告缺少 "Native PowerPoint tables" 统计，无法校验表格完整性')
  return Number(m[1])
}

// 在输出目录里按后缀找转换报告；找不到=转换未完成=抛错。
export function findReportFile(outDir) {
  const files = fs.readdirSync(outDir)
  const report = files.find(f => f.endsWith('_转换报告.md'))
  if (!report) throw new Error(`输出目录未找到 *_转换报告.md：${outDir}（转换可能未完成）`)
  return path.join(outDir, report)
}

// 唯一的合格判定：退出码必须为 0，原生表格数不得少于设计真表格数。
export function assertConversionIntegrity({ exitCode, designTables, nativeTables }) {
  if (exitCode !== 0) {
    throw new Error(`html2ppt 转换失败，退出码 ${exitCode}（红线：失败必抛错，不静默兜底）`)
  }
  if (nativeTables < designTables) {
    throw new Error(`原生表格数(${nativeTables}) < 设计真表格数(${designTables})，疑似丢表，转换不合格（红线：不接受降级产物）`)
  }
  return true
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node scripts/test-deck-to-pptx.mjs`
Expected: PASS — `✅ deck-to-pptx helpers test passed`

- [ ] **Step 5: 提交**

```bash
git add scripts/deck-to-pptx.mjs scripts/test-deck-to-pptx.mjs
git commit -m "feat(engine-v2): add deck-to-pptx guardrail helpers (fail-loud, no fallback)"
```

---

### Task 6: 转换封装编排 + `package.json` 脚本（→ 端到端跑通）

**Files:**
- Modify: `scripts/deck-to-pptx.mjs`（在文件末尾追加编排与 CLI）
- Modify: `package.json:30-31`（`scripts` 块内新增两行）
- Test: `scripts/test-deck-to-pptx-runner.mjs`

- [ ] **Step 1: 写失败测试**

`scripts/test-deck-to-pptx-runner.mjs`（注入假 runner，**不触发真 playwright**）：
```js
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { deckToPptx } from './deck-to-pptx.mjs'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pptagent-conv-'))

// 造一个假的工具树，让 resolveTool 通过
const toolDir = path.join(tmp, 'tool')
fs.mkdirSync(path.join(toolDir, '99-runtime-do-not-edit', 'bin'), { recursive: true })
fs.writeFileSync(path.join(toolDir, '99-runtime-do-not-edit', 'bin', 'html-to-pptx.js'), '// fake')
const env = { HTML2PPT_DIR: toolDir }

const htmlPath = path.join(tmp, 'deck.html')
fs.writeFileSync(htmlPath, '<section class="S"><table data-pptx-role="native-table"></table></section>')

// PASS：原生表格 2 ≥ 设计表格 1
const outA = path.join(tmp, 'outA')
function runnerPass(entry, html, outDir) {
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'deck_转换报告.md'), '- Native PowerPoint tables: 2\n')
  fs.writeFileSync(path.join(outDir, 'deck_推荐可编辑版.pptx'), 'PK')
  return 0
}
const resA = deckToPptx({ htmlPath, outDir: outA, runner: runnerPass, env })
assert.equal(resA.designTables, 1)
assert.equal(resA.nativeTables, 2)
assert.ok(resA.recommended.endsWith('_推荐可编辑版.pptx'))

// FAIL：退出码非零
const outB = path.join(tmp, 'outB')
assert.throws(() => deckToPptx({ htmlPath, outDir: outB, runner: () => 1, env }), /退出码 1/)

// FAIL：丢表（原生 0 < 设计 1）
const outC = path.join(tmp, 'outC')
function runnerLoseTable(entry, html, outDir) {
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'deck_转换报告.md'), '- Native PowerPoint tables: 0\n')
  return 0
}
assert.throws(() => deckToPptx({ htmlPath, outDir: outC, runner: runnerLoseTable, env }), /丢表/)

fs.rmSync(tmp, { recursive: true, force: true })
console.log('✅ deck-to-pptx runner test passed')
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node scripts/test-deck-to-pptx-runner.mjs`
Expected: FAIL — `deckToPptx is not a function`（导出尚不存在）

- [ ] **Step 3: 追加编排到 `scripts/deck-to-pptx.mjs` 末尾**

在 Task 5 写好的文件**末尾追加**（先补两个 import，再加编排 + CLI）：
```js
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// 默认 runner：真子进程调用外部转换器，显式锁定 --selector ".S"。
function defaultRunner(entry, htmlPath, outDir) {
  const res = spawnSync(
    process.execPath,
    [entry, htmlPath, '--out', outDir, '--selector', '.S', '--no-open'],
    { stdio: 'inherit' },
  )
  return typeof res.status === 'number' ? res.status : 1
}

// 渲染好的 .S HTML -> 可编辑 PPTX；护栏校验后返回产物路径。
// runner / env 可注入，便于单测（不触发真 playwright）。
export function deckToPptx({ htmlPath, outDir, runner = defaultRunner, env = process.env }) {
  const entry = resolveTool(env)
  fs.mkdirSync(outDir, { recursive: true })
  const html = fs.readFileSync(htmlPath, 'utf8')
  const designTables = countDesignTables(html)

  const exitCode = runner(entry, htmlPath, outDir)
  let nativeTables = 0
  let reportPath = null
  if (exitCode === 0) {
    reportPath = findReportFile(outDir)
    nativeTables = parseNativeTableCount(fs.readFileSync(reportPath, 'utf8'))
  }
  assertConversionIntegrity({ exitCode, designTables, nativeTables })

  const files = fs.readdirSync(outDir)
  const recommended = files.find(f => f.endsWith('_推荐可编辑版.pptx'))
  return {
    recommended: recommended ? path.join(outDir, recommended) : null,
    report: reportPath,
    designTables,
    nativeTables,
  }
}

function cliMain() {
  const [htmlPath, outDir] = process.argv.slice(2).filter(a => !a.startsWith('--'))
  if (!htmlPath || !outDir) {
    console.error('Usage: node scripts/deck-to-pptx.mjs <deck.html> <outDir>')
    process.exit(1)
  }
  const r = deckToPptx({ htmlPath: path.resolve(htmlPath), outDir: path.resolve(outDir) })
  console.log(`[deck:pptx] 设计真表格=${r.designTables} 原生PPT表格=${r.nativeTables}`)
  console.log(`[deck:pptx] 推荐可编辑版: ${r.recommended}`)
  console.log(`[deck:pptx] 转换报告: ${r.report}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    cliMain()
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
```

- [ ] **Step 4: 改 `package.json` 的 `scripts` 块**

在 `package.json` 现有 `"prelaunch:check": ...` 这一行**之后**、`scripts` 块闭合 `}` 之前，新增两行（注意上一行补逗号）：
```json
    "prelaunch:check": "node scripts/prelaunch-readiness.mjs",
    "deck:s": "node scripts/render-deck-s.mjs",
    "deck:pptx": "node scripts/deck-to-pptx.mjs"
```

- [ ] **Step 5: 跑测试确认通过**

Run: `node scripts/test-deck-to-pptx-runner.mjs`
Expected: PASS — `✅ deck-to-pptx runner test passed`

校验 package.json 合法：
Run: `node -e "require('./package.json')"`
Expected: 无输出、退出码 0（JSON 合法）

- [ ] **Step 6: 提交**

```bash
git add scripts/deck-to-pptx.mjs scripts/test-deck-to-pptx-runner.mjs package.json
git commit -m "feat(engine-v2): wire deck-to-pptx orchestration + deck:s/deck:pptx scripts"
```

---

### Task 7: 命名版式 — 编号陈述（fidelity）

**Files:**
- Create: `scripts/renderers-s/render-s-statement.mjs`
- Modify: `scripts/render-deck-s.mjs`（接入 dispatch）
- Test: `scripts/renderers-s/test-render-s-statement.mjs`

- [ ] **Step 1: 写失败测试**

`scripts/renderers-s/test-render-s-statement.mjs`：
```js
import assert from 'node:assert/strict'
import { renderSStatement } from './render-s-statement.mjs'

const html = renderSStatement({ page_no: 3, action_title: '三条主张', core_points: ['第一', '第二', '第三'] })
assert.ok(html.includes('<section class="S"'))
assert.ok(html.includes('data-layout="statement"'))
assert.ok(html.includes('三条主张'))
assert.ok(html.includes('01') && html.includes('02') && html.includes('03'), '应有编号')
assert.ok(html.includes('第一') && html.includes('第三'))
assert.ok(!html.includes('vw'))
console.log('✅ render-s-statement test passed')
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node scripts/renderers-s/test-render-s-statement.mjs`
Expected: FAIL — `Cannot find module ... render-s-statement.mjs`

- [ ] **Step 3: 写实现**

`scripts/renderers-s/render-s-statement.mjs`：
```js
import { escapeHtml, titleBar, footer } from './render-utils-s.mjs'

export function renderSStatement(slide) {
  const title = escapeHtml(slide.action_title || '')
  const points = (slide.core_points || [])
    .slice(0, 5)
    .map((p, i) => `<li><span class="num">${String(i + 1).padStart(2, '0')}</span><span class="txt">${escapeHtml(String(p))}</span></li>`)
    .join('')
  return `<section class="S" data-page="${escapeHtml(String(slide.page_no || ''))}" data-layout="statement">
  ${titleBar('PPTAgent', escapeHtml(slide.section || ''))}
  <div class="TS"><h1>${title}</h1></div>
  <div class="BA"><ul class="statement-points">${points}</ul></div>
  ${footer(slide)}
</section>`
}
```

- [ ] **Step 4: 接入 dispatch（改 `scripts/render-deck-s.mjs`）**

把顶部 import 区改为加上 statement，并把 `DISPATCH_S` 改为：
```js
import { renderSFallback } from './renderers-s/render-s-fallback.mjs'
import { renderSStatement } from './renderers-s/render-s-statement.mjs'
```
```js
const DISPATCH_S = {
  statement: renderSStatement,
  'split-statement': renderSStatement,
}
```

- [ ] **Step 5: 跑测试确认通过 + 回归**

Run: `node scripts/renderers-s/test-render-s-statement.mjs && node scripts/test-render-deck-s.mjs`
Expected: 两个都 PASS（`✅ render-s-statement test passed` + `✅ render-deck-s test passed`）

- [ ] **Step 6: 提交**

```bash
git add scripts/renderers-s/render-s-statement.mjs scripts/renderers-s/test-render-s-statement.mjs scripts/render-deck-s.mjs
git commit -m "feat(engine-v2): add .S statement layout + wire dispatch"
```

---

### Task 8: 命名版式 — 对比/矩阵表（真原生表格，验证护栏）

**Files:**
- Create: `scripts/renderers-s/render-s-table.mjs`
- Modify: `scripts/render-deck-s.mjs`（接入 dispatch）
- Test: `scripts/renderers-s/test-render-s-table.mjs`

- [ ] **Step 1: 写失败测试**

`scripts/renderers-s/test-render-s-table.mjs`：
```js
import assert from 'node:assert/strict'
import { renderSTable } from './render-s-table.mjs'

// 显式表格数据
const a = renderSTable({
  page_no: 4,
  action_title: '竞品对比',
  table: { headers: ['品牌', '定位', '价格带'], rows: [['A', '高端', '¥¥¥'], ['B', '性价比', '¥']] },
})
assert.ok(a.includes('<section class="S"'))
assert.ok(a.includes('data-layout="table"'))
assert.ok(a.includes('<table'), '应为真 <table>')
assert.ok(a.includes('data-pptx-role="native-table"'))
assert.ok(a.includes('<th>品牌</th>') && a.includes('<td>高端</td>'))

// 无 table 字段时，从 core_points 的 "维度：说明" 兜底成两列表
const b = renderSTable({ page_no: 5, action_title: '要点', core_points: ['定位：高端', '人群：Z世代'] })
assert.ok(b.includes('<table'))
assert.ok(b.includes('<td>定位</td>') && b.includes('<td>高端</td>'))
console.log('✅ render-s-table test passed')
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node scripts/renderers-s/test-render-s-table.mjs`
Expected: FAIL — `Cannot find module ... render-s-table.mjs`

- [ ] **Step 3: 写实现**

`scripts/renderers-s/render-s-table.mjs`：
```js
import { escapeHtml, titleBar, footer, nativeTableHtml } from './render-utils-s.mjs'

export function renderSTable(slide) {
  const title = escapeHtml(slide.action_title || '')
  const t = slide.table
  let headers
  let rows
  if (t && Array.isArray(t.headers) && Array.isArray(t.rows)) {
    headers = t.headers
    rows = t.rows
  } else {
    // 兜底：把 "维度：说明" 形式的要点拆成两列表（不编造内容，仅拆分既有文本）
    headers = ['维度', '说明']
    rows = (slide.core_points || []).map(p => {
      const s = String(p)
      const idx = s.search(/[:：]/)
      return idx >= 0 ? [s.slice(0, idx).trim(), s.slice(idx + 1).trim()] : ['', s]
    })
  }
  return `<section class="S" data-page="${escapeHtml(String(slide.page_no || ''))}" data-layout="table">
  ${titleBar('PPTAgent', escapeHtml(slide.section || ''))}
  <div class="TS"><h1>${title}</h1></div>
  <div class="BA">${nativeTableHtml(headers, rows)}</div>
  ${footer(slide)}
</section>`
}
```

- [ ] **Step 4: 接入 dispatch（改 `scripts/render-deck-s.mjs`）**

import 区追加，并扩展 `DISPATCH_S`：
```js
import { renderSTable } from './renderers-s/render-s-table.mjs'
```
```js
const DISPATCH_S = {
  statement: renderSStatement,
  'split-statement': renderSStatement,
  table: renderSTable,
  'matrix-2x2': renderSTable,
  'matrix-3x3': renderSTable,
}
```

- [ ] **Step 5: 跑测试确认通过 + 回归**

Run: `node scripts/renderers-s/test-render-s-table.mjs && node scripts/test-render-deck-s.mjs`
Expected: 两个都 PASS

- [ ] **Step 6: 提交**

```bash
git add scripts/renderers-s/render-s-table.mjs scripts/renderers-s/test-render-s-table.mjs scripts/render-deck-s.mjs
git commit -m "feat(engine-v2): add .S native-table layout + wire dispatch"
```

---

### Task 9: 端到端真转换 + CP 复核（人工验证，非自动单测）

> 真转换要跑 playwright + Chromium，耗时分钟级，不进自动单测；由 Codex 执行、Claude CP 复核。

- [ ] **Step 1: 首次准备外部转换器（仅第一次）**

```bash
cd "${HTML2PPT_DIR:-/Users/seven/Downloads/html2ppt-sales-tool-v26.1.1}/99-runtime-do-not-edit"
npm install
npm run setup:browser
```
Expected: `node_modules/@halobiron/dom-to-pptx/dist/dom-to-pptx.bundle.js` 存在；Chromium 下载完成。

- [ ] **Step 2: 用一份真实方案 JSON 渲染 `.S` HTML**

用「当前已经能喂给 `node scripts/render-deck.mjs` 的那份整本方案 JSON」（两条链 JSON 结构完全一致），替换下面的 `<方案.json>`：
```bash
node scripts/render-deck-s.mjs <方案.json> output/demo/deck.html
```
Expected: 打印 `[render-s] N 个 .S 页面 -> output/demo/deck.html`

- [ ] **Step 3: 转可编辑 PPT**

```bash
node scripts/deck-to-pptx.mjs output/demo/deck.html output/demo/pptx
```
Expected: 打印 `推荐可编辑版: .../demo/pptx/deck_推荐可编辑版.pptx` + `转换报告: .../deck_转换报告.md`；命令退出码 0。

- [ ] **Step 4: 验证红线（失败必抛错）—— 故意喂坏输入**

```bash
node scripts/deck-to-pptx.mjs output/demo/deck.html output/demo/pptx-bad ; echo "exit=$?"
HTML2PPT_DIR=/no/such/dir node scripts/deck-to-pptx.mjs output/demo/deck.html output/demo/pptx-x ; echo "exit=$?"
```
Expected：第二条必须打印 `未找到 html2ppt 转换器` 且 `exit=1`（证明找不到工具会抛错、非零退出，不静默兜底）。

- [ ] **Step 5: CP 复核清单（Claude 独立核查，逐条勾）**

- [ ] `_推荐可编辑版.pptx` 能在 PowerPoint / Keynote 打开且不报错
- [ ] 随机抽 3 页，双击标题/正文能**直接改字**（是真文字，不是图片）
- [ ] 含表格的页，表格是**可点选行列的原生表格**（不是一张图片）
- [ ] `_转换报告.md` 里 `Native PowerPoint tables` 的数字 **≥** `deck.html` 里 `<table` 出现次数（命令：`grep -c '<table' output/demo/deck.html`）
- [ ] 每页 16:9、内容无溢出/截断（`overflow:hidden` 不应裁掉关键内容；若裁了，说明该页内容超量，应在 Phase 2 拆页，**不是**靠缩小字号——反空心铁律）
- [ ] Step 4 的红线验证通过（找不到工具/转换失败 → 非零退出 + 中文报错）

- [ ] **Step 6: 写 CP 复核记录并提交**

把上面结果记到 `docs/handoffs/2026-05-29-engine-v2-phase1-cp-note.md`（通过/不通过 + 截图或 PPT 路径），然后：
```bash
git add docs/handoffs/2026-05-29-engine-v2-phase1-cp-note.md
git commit -m "docs(engine-v2): phase 1 end-to-end CP note"
```

---

## Phase 1 Self-Review（写计划者自检）

**1. 规格覆盖**（对照设计文档 §3/§4③半边B/§4④）：
- ④ 转可编辑 PPT：Task 5/6/9 覆盖（调用转换器 + 三版本产物 + 失败必报错 + 原生表格数≥设计真表格数）。✅
- ③ 格式半边（`.S`/1080×608/自包含/真文字/真表格/字号规范/反空心）：Task 1（模板+字号规范+反空心注释）、Task 2（真表格）、Task 3/4/7/8（`.S` renderer，真文字、无 `vw`）。✅
- 设计文档「7 优先版式」未在本期全做：本期只做 fallback + statement + table 三种（够端到端跑通且覆盖真表格）。其余命名版式列入下方 Phase 1 后续可选 fidelity，**不阻塞** Phase 1 验收。已标注，非占位。✅

**2. 占位扫描**：全计划无 TBD/TODO/「类似上文」；每个写代码的步骤都给了完整代码与确切命令/预期输出。✅

**3. 类型/命名一致性**（跨 Task 核对）：
- `renderSFallback` / `renderSStatement` / `renderSTable`：定义（Task 3/7/8）与 import/dispatch（Task 4/7/8）一致。✅
- `renderDeckS(inputJson, outputHtml)`：定义与测试（Task 4）、Task 9 CLI 用法一致。✅
- `deckToPptx({ htmlPath, outDir, runner, env })`、`resolveTool(env)`、`countDesignTables`、`parseNativeTableCount`、`findReportFile`、`assertConversionIntegrity`：Task 5 定义、Task 6 编排、两个测试用法一致。✅
- `nativeTableHtml(headers, rows)`：Task 2 定义、Task 8 调用一致。✅
- 模板注入标记 `<!-- SLIDES_HERE -->`：模板（Task 1）与 `renderDeckS`（Task 4）一致。✅
- 选择器 `.S`、报告行 `Native PowerPoint tables:`、产物后缀 `_推荐可编辑版.pptx`/`_转换报告.md`：均来自 §B 已核实的源码行号。✅

---

## Phases 2-4 Roadmap（路线图，后续各自展开为详细计划）

> 顺序与依赖：Phase 1 把「能转 PPT」打通后，Phase 2/3/4 依次往**内容质量**和**入口**上游推进。每一期都独立可验收。

### Phase 2 — ③ 咨询纪律半边（成稿质量）
- **目标**：每页强制 4 槽位结构（行动标题 / 主证据 / 含义 / 出处·置信度），缺槽位**报错**不出页。
- **要点**：框架优先级 SCR/SCQA > 金字塔 > 2×2 > Before-After > MECE；A/B/C 量化；中文营销语气黑名单（禁「赋能 / 打造闭环 / 构建生态 / 标志着 / 里程碑 / 业内认为」）；反空心（超量拆页，不缩字）。
- **落点**：扩展现有 `scripts/consulting-review.mjs`（已存在）做「渲染前内容门禁」；新增黑名单词表 + 4 槽位校验器。产物：不合格内容在渲染前被拦下并报清单。

### Phase 3 — ② 引用护栏（事实可追溯）
- **目标**：句尾引用纪律 `[来源id·日期·T级]`；独立一遍 CitationAgent 校对；4 列证据台账；重规划红线（可信度 < 60% 或 矛盾 > 30% 触发重规划）。
- **落点**：扩展 `scripts/web-search.mjs` + `scripts/source-tiers.mjs`（已存在 T1/T2/T3/T4 分级）；新增引用校对 pass + 证据台账产物。守红线：无 source 的内容只能进 assumptions。

### Phase 4 — ① 入口追问（把模糊需求问清楚）
- **目标**：5 个品牌维度打分（主体 / 人群 / 竞争 / 目标 / 证据，各 0-2）；成熟度 🔴1-3 / 🟡4-6 / 🟢7-8 / ✅9-10；**硬阈值：证据维=0 → 不出确认稿、Capped、触发「抓取/上传/草稿」三选一**；router（有冲突先拆 > 高分快速 > 某维=0补该维 > 证据=0走证据补缺）；追问母模板（本轮理解 + P0[为什么问+ABC] + P1 + 速答行）；节奏护栏（每轮 1-3 个 P0 + 0-2 个 P1，最多 3 轮）。
- **落点**：新增入口追问模块，产物 `form.json` + `summary.md`，再喂给现有 `scripts/strategic-question.mjs` → blueprint 链路。

---

## 给小白的讲解（本计划在做什么）

- **现在做的是什么**：这是给 Codex 的「Phase 1 施工图」。Phase 1 只干两件事——①把方案的「网页页面」改造成「标准幻灯片」（每页固定 1080×608、文字是真文字、表格是真表格）；②接上你电脑里那个现成工具，把这些标准幻灯片**一键变成可编辑的 PPT**。
- **目的·为什么**：你现在的方案是「网页全屏浏览版」，看着行，但导不出能改的 PPT。客户/老板要的是能在 PowerPoint 里直接改字、改表的 .pptx。这一步把「好看的网页」变成「能交付、能二次编辑的 PPT」，是整条产品线最先该打通的一环（最快见到端到端价值、风险最低）。
- **关键安全阀（你的红线）**：计划里写死了——转换一旦失败、或表格在转换中丢了、或找不到工具，程序**必须当场报错并停下**，绝不偷偷给你一个看着像、其实缺东西的假成品。
- **你怎么自己核查**（不用懂代码）：等 Codex 做完，你只要做一件事——**打开它生成的那个 `_推荐可编辑版.pptx`**：能打开、双击标题能直接改字、表格能点中单元格（不是一张图），就说明成了。再看一眼 `_转换报告.md` 里「Native PowerPoint tables」的数字别比你页面里的表格少。计划 Task 9 把这几条列成了勾选清单。

---

## 执行交接（本项目方式）

本项目的既定分工是 **Codex 执行 + Claude 独立 CP 复核 + Seven 拍板**。建议：

1. **把本计划交给 Codex**，让它**逐个 Task** 跑（每个 Task 内部就是「写失败测试 → 看它失败 → 写实现 → 看它通过 → 提交」）。
2. **每完成一个 Task，Claude 做一次独立 CP 复核**（核对它真的写了那些文件、测试真的过、没偷偷兜底），再放行下一个 Task。
3. Task 9 是人工端到端验收，由 Claude 出 CP 记录、Seven 拍板。

如果你更想让我（Claude）**自己来执行**这份计划而不是 Codex，我就改用 superpowers:subagent-driven-development（每个 Task 派一个干净子代理 + 两段式复核）或 superpowers:executing-plans（本会话内分批执行 + 检查点）。

**你想怎么推进 Phase 1？**（A）交给 Codex、我每个 Task 做 CP 复核；（B）我自己用 subagent 逐 Task 执行；（C）先别执行，你想再改改计划。
