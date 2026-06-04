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
    { page_no: 1, layout: 'S05', action_title: '第一页', core_points: ['a', 'b', 'c'], data_refs: [{ value: 'demo', source: 'inputs/demo/summary.md', type: 'client_input' }] },
    { page_no: 2, layout: 'S03', action_title: '第二页', core_points: ['c'], data_refs: [{ value: 'demo', source: 'inputs/demo/summary.md', type: 'client_input' }] },
    { page_no: 3, layout: 'S09', action_title: '第三页', core_points: ['Q1:一', 'Q2:二', 'Q3:三', 'Q4:四'], data_refs: [{ value: 'demo', source: 'inputs/demo/summary.md', type: 'client_input' }] },
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

// Phase 2a：含营销黑名单词的 deck 必须被出稿闸门拦截、不产出 HTML
const badInp = path.join(tmp, 'bad.json')
await fs.writeFile(badInp, JSON.stringify({
  client_profile: { name: 'x' },
  slides: [{ page_no: 1, layout: 'S03', action_title: '我们要赋能客户', core_points: ['x'], data_refs: [{ source: 'inputs/demo/summary.md' }] }],
}))
await assert.rejects(() => renderDeckS(badInp, path.join(tmp, 'bad.html')), /内容纪律红线违规/, '含黑名单词的 deck 应被渲染闸门拦截')

await fs.rm(tmp, { recursive: true, force: true })
console.log('✅ render-deck-s test passed')
