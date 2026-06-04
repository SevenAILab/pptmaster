#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { SMART_LAYOUT_TO_SXX, renderDeck } from './render-deck.mjs'

assert.deepEqual(Object.keys(SMART_LAYOUT_TO_SXX).sort(), [
  'brand-house-9-layer',
  'flow-arrow',
  'framework-grid',
  'hero-statement',
  'image-hero',
  'kpi-card',
  'matrix-2x2',
  'matrix-3x3',
  'pyramid',
  'split-statement',
  'three-layers',
  'timeline',
  'tree',
].sort())

assert.equal(SMART_LAYOUT_TO_SXX['hero-statement'], 'S22')
assert.equal(SMART_LAYOUT_TO_SXX['split-statement'], 'S03')
assert.equal(SMART_LAYOUT_TO_SXX['three-layers'], 'S05')
assert.equal(SMART_LAYOUT_TO_SXX['matrix-2x2'], 'S17')
assert.equal(SMART_LAYOUT_TO_SXX['matrix-3x3'], 'S15')
assert.equal(SMART_LAYOUT_TO_SXX['flow-arrow'], 'S09')
assert.equal(SMART_LAYOUT_TO_SXX.timeline, 'S09')
assert.equal(SMART_LAYOUT_TO_SXX.pyramid, 'S13')
assert.equal(SMART_LAYOUT_TO_SXX.tree, 'S13')
assert.equal(SMART_LAYOUT_TO_SXX['kpi-card'], 'S22')
assert.equal(SMART_LAYOUT_TO_SXX['framework-grid'], 'S15')
assert.equal(SMART_LAYOUT_TO_SXX['brand-house-9-layer'], 'S17')
assert.equal(SMART_LAYOUT_TO_SXX['image-hero'], 'S22')

const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pptagent-layout-render-'))
const inputPath = path.join(tmpDir, 'raw-output.json')
const outputPath = path.join(tmpDir, 'index.html')

await fs.writeFile(inputPath, JSON.stringify({
  client_profile: { name: 'Layout Test', render_style: 'swiss' },
  slides: [
    {
      page_no: 1,
      layout: 'S05',
      layout_original: 'S05',
      layout_designer: {
        page_no: 1,
        original_layout: 'S05',
        smart_layout: 'brand-house-9-layer',
        smart_layout_reason: '品牌屋专用结构。',
      },
      action_title: '品牌屋九层结构',
      core_points: ['使命: 成为创作者工作流伙伴', '价值: 稳定开放', '个性: 专业友好'],
      data_refs: [{ value: 'source', source: 'https://example.com/brand', type: 'quote' }],
    },
    {
      page_no: 2,
      layout: 'S03',
      layout_designer: {
        page_no: 2,
        original_layout: 'S03',
        smart_layout: 'unknown-smart-layout',
        smart_layout_reason: '未知 smart layout 应回退到原 S03。',
      },
      action_title: '未知布局保持可渲染',
      core_points: ['回退到原始 layout'],
      data_refs: [],
    },
  ],
}, null, 2))

await renderDeck(inputPath, outputPath, { style: 'swiss' })
const html = await fs.readFile(outputPath, 'utf8')

assert.ok(html.includes('data-layout="S17"'))
assert.ok(html.includes('S17 · System Diagram'))
assert.ok(html.includes('data-layout="S03"'))
assert.ok(!html.includes('unknown-smart-layout'))

await fs.rm(tmpDir, { recursive: true, force: true })

console.log('✅ layout render mapping test passed')
