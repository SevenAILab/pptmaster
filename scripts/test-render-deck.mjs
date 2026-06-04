import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { renderDeck } from './render-deck.mjs'

const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pptagent-render-'))
const inputPath = path.join(tmpDir, 'fake-positioning.json')
const outputPath = path.join(tmpDir, 'index.html')

await fs.writeFile(inputPath, JSON.stringify({
  agent_id: 'brand_positioning',
  client_profile: { name: '测试客户', render_style: 'swiss' },
  slides: [
    {
      page_no: 1,
      layout: 'S03',
      action_title: '测试 Action Title',
      core_points: ['p1', 'p2', 'p3'],
      data_refs: [{ value: '100%', source: '测试来源', type: 'stat' }],
      models_used: ['STP'],
    },
    {
      page_no: 2,
      layout: 'S99',
      action_title: '测试 fallback Action Title',
      core_points: ['p1', 'p2', 'p3'],
      data_refs: [],
      models_used: ['Fallback-Model'],
    },
  ],
}, null, 2))

await renderDeck(inputPath, outputPath, { style: 'swiss' })
const html = await fs.readFile(outputPath, 'utf8')

assert.ok(html.includes('data-layout="S03"'))
assert.ok(html.includes('data-page="1"'))
assert.ok(html.includes('测试 Action Title'))
assert.ok(html.includes('cover-split'))
assert.ok(html.includes('fallback render'))
assert.ok(html.includes('100%'))
assert.ok(!html.includes('STP'))
assert.ok(!html.includes('Fallback-Model'))
assert.ok(!html.includes('<!-- SLIDES_HERE'))
const htmlWithoutComments = html.replace(/<!--[\s\S]*?-->/g, '')
assert.equal((htmlWithoutComments.match(/<section\b[^>]*class="[^"]*\bslide\b/g) || []).length, 2)
assert.ok(!html.includes('[必填] 中文主标题'))

await fs.rm(tmpDir, { recursive: true, force: true })
console.log('✅ render-deck test passed')
