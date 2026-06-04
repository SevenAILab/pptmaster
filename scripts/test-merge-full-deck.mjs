import assert from 'node:assert/strict'
import { buildMergedDeck, SUITE_SECTIONS } from './merge-full-deck.mjs'

const outputs = Object.fromEntries(SUITE_SECTIONS.map(section => [
  section.suffix,
  {
    agent_id: `agent_${section.suffix}`,
    slides: [
      {
        page_no: 9,
        layout: 'S03',
        action_title: `${section.suffix} 测试页`,
        core_points: ['p1', 'p2'],
        data_refs: [],
        models_used: ['Test-Model'],
      },
    ],
  },
]))

const merged = buildMergedDeck('测试客户', outputs, { generatedAt: '2026-05-27' })

assert.equal(merged.agent_id, 'full_suite')
assert.equal(merged.slides.length, 14)
assert.equal(merged.metadata.total_pages, 14)
assert.equal(merged.slides[0].layout, 'S22')
assert.equal(merged.slides.at(-1).layout, 'S03')
assert.deepEqual(merged.slides.map(slide => slide.page_no), Array.from({ length: 14 }, (_, index) => index + 1))
assert.equal(merged.slides.filter(slide => slide.models_used.includes('幕封')).length, 6)
assert.ok(merged.metadata.generated_from.includes('outputs/测试客户/raw-output.json'))
assert.ok(merged.metadata.generated_from.includes('outputs/测试客户-annual/raw-output.json'))

console.log('✅ merge-full-deck test passed')
