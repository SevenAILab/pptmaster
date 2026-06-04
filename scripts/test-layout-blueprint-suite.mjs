#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { flattenBlueprintChunks, loadBlueprintForScheme, runBlueprintSuite } from './run-blueprint-suite.mjs'

const clientSlug = 'test-layout-suite-client'

await fs.rm(`inputs/${clientSlug}`, { recursive: true, force: true })
await fs.rm(`outputs/${clientSlug}`, { recursive: true, force: true })
await fs.mkdir(`inputs/${clientSlug}`, { recursive: true })
await fs.mkdir(`outputs/${clientSlug}/_chunks`, { recursive: true })
await fs.writeFile(`inputs/${clientSlug}/form.json`, JSON.stringify({
  name: 'Layout Suite Test',
  industry: 'AI 品牌策划',
  core_products: ['PPTAgent'],
  target_audience: ['品牌方'],
}, null, 2))
await fs.writeFile(`inputs/${clientSlug}/summary.md`, 'Layout Suite Test summary.')

const { blueprint, blueprintPath } = await loadBlueprintForScheme('brand_positioning_case')
const firstChunk = flattenBlueprintChunks(blueprint, blueprintPath)[0]

await fs.writeFile(`outputs/${clientSlug}/_chunks/${firstChunk.chunk_id}.json`, JSON.stringify({
  agent_id: firstChunk.driving_sub_agent,
  blueprint_chunk_id: firstChunk.chunk_id,
  chunk_takeaway: 'Layout Designer 应基于真实 chunk 输出选择更合适的页面结构。',
  chunk_insights: [{ insight: '第一页适合大字判断。', source_url: 'https://example.com/layout' }],
  thinking_log: [
    { step: 'plan', content: '已有 chunk 思考。' },
    { step: 'synthesize', content: '已有 chunk 综合。' },
    { step: 'write', content: '已有 chunk 写作。' },
  ],
  slides: firstChunk.pages.map(page => ({
    page_no: page.page_no,
    layout: page.recommended_layout,
    action_title: `${page.page_subtitle} layout test`,
    core_points: ['单一判断', '多元论据', '结构提示'],
    data_refs: [{ value: 'source', source: 'https://example.com/layout', type: 'quote' }],
    models_used: [page.concept_for_this_page || firstChunk.allowed_concepts[0]],
  })),
  metadata: { blueprint_chunk_id: firstChunk.chunk_id },
}, null, 2))

const result = await runBlueprintSuite(clientSlug, 'brand_positioning_case', {
  onlyChunk: firstChunk.chunk_id,
  withLayoutDesigner: true,
  layoutDesignerRunner: async ({ chunkOutput, slug }) => {
    assert.equal(slug, clientSlug)
    return {
      thinking_log: [
        { step: 'read_content', content: '读取 chunk 内容后识别页面意图。' },
        { step: 'classify_slide_intent', content: '把页面分成大字判断、论据和结构页。' },
        { step: 'choose_layouts', content: '为每页选择 smart layout。' },
      ],
      layout_decisions: chunkOutput.slides.map((slide, index) => ({
        page_no: slide.page_no,
        original_layout: slide.layout,
        smart_layout: index % 2 === 0 ? 'hero-statement' : 'split-statement',
        smart_layout_reason: `基于 ${slide.action_title} 选择更合适的 smart layout。`,
        layout_variant_hints: {
          title_position: 'top-left',
          accent_data: '',
          secondary_data_format: 'small',
          diagram_type: index % 2 === 0 ? 'hero-statement' : 'split-statement',
        },
      })),
    }
  },
})

assert.equal(result.layoutDesigned, 1)
assert.equal(result.failed, 0)
assert.equal(result.results[0].status, 'layout_designed')

const updated = JSON.parse(await fs.readFile(`outputs/${clientSlug}/_chunks/${firstChunk.chunk_id}.json`, 'utf8'))
assert.equal(updated.layout_designer.agent_id, 'layout_designer')
assert.equal(updated.layout_designer.thinking_log.length, 3)
assert.equal(updated.slides[0].layout_original, firstChunk.pages[0].recommended_layout)
assert.equal(updated.slides[0].layout, 'hero-statement')
assert.equal(updated.metadata.layout_designer_applied, true)

await fs.rm(`inputs/${clientSlug}`, { recursive: true, force: true })
await fs.rm(`outputs/${clientSlug}`, { recursive: true, force: true })

console.log('✅ layout blueprint suite test passed')
