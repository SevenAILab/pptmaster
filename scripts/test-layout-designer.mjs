#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  ALLOWED_SMART_LAYOUTS,
  applyLayoutDecisions,
  normalizeLayoutDesignerResponse,
  runLayoutDesigner,
} from './sub-agents/layout-designer.mjs'

assert.equal(ALLOWED_SMART_LAYOUTS.length, 13)
for (const layout of [
  'hero-statement',
  'split-statement',
  'three-layers',
  'matrix-2x2',
  'matrix-3x3',
  'flow-arrow',
  'timeline',
  'pyramid',
  'tree',
  'kpi-card',
  'framework-grid',
  'brand-house-9-layer',
  'image-hero',
]) {
  assert.ok(ALLOWED_SMART_LAYOUTS.includes(layout), `missing smart layout ${layout}`)
}

const chunkOutput = {
  agent_id: 'brand_positioning',
  blueprint_chunk_id: 'p3-c1-positioning-statement',
  chunk_takeaway: 'SmallRig 应把专业硬件优势翻译成创作者工作流效率。',
  chunk_insights: [
    { insight: '用户需要稳定搭建。', source_url: 'https://example.com/a' },
    { insight: '竞品心智分散。', source_url: 'https://example.com/b' },
  ],
  thinking_log: [
    { step: 'plan', content: '原始 chunk plan' },
    { step: 'synthesize', content: '原始 chunk synthesize' },
    { step: 'write', content: '原始 chunk write' },
  ],
  slides: [
    {
      page_no: 41,
      layout: 'S22',
      action_title: 'SmallRig 要抢占创作者工作流效率',
      core_points: ['不是泛专业配件', '而是开放工具生态', '突出一条判断'],
      data_refs: [{ value: 'source', source: 'https://example.com/a', type: 'quote' }],
    },
    {
      page_no: 42,
      layout: 'S05',
      action_title: 'RTB 来自三类支撑',
      core_points: ['硬件稳定', '生态开放', '创作者共创'],
      data_refs: [{ value: 'source', source: 'https://example.com/b', type: 'quote' }],
    },
    {
      page_no: 43,
      layout: 'S03',
      action_title: '品牌屋需要九层结构收束',
      core_points: ['使命', '价值', '个性', '证据'],
      data_refs: [{ value: 'source', source: 'https://example.com/c', type: 'quote' }],
    },
  ],
}

const responseJson = {
  thinking_log: [
    { step: 'read_content', content: '先判断 chunk_takeaway 是单一定位判断，需让第一页承担大字结论，而不是继续沿用图片页默认结构。' },
    { step: 'classify_slide_intent', content: '再逐页区分定位主张、RTB 三层支撑和品牌屋收束，三页的视觉任务不同。' },
    { step: 'choose_layouts', content: '最后为每页选择不同 smart_layout，并保留 blueprint 原布局作为 fallback hint。' },
  ],
  layout_decisions: [
    {
      page_no: 41,
      original_layout: 'S22',
      smart_layout: 'hero-statement',
      smart_layout_reason: '本页只有一个定位主张，应使用大字判断承接 takeaway。',
      layout_variant_hints: {
        title_position: 'top-left',
        accent_data: '工作流效率',
        secondary_data_format: 'muted',
        diagram_type: 'hero-statement',
      },
    },
    {
      page_no: 42,
      original_layout: 'S05',
      smart_layout: 'three-layers',
      smart_layout_reason: '本页是三类 RTB 并列，三层结构比散点陈述更清晰。',
      layout_variant_hints: {
        title_position: 'top-center',
        accent_data: '',
        secondary_data_format: 'small',
        diagram_type: 'three-layers',
      },
    },
    {
      page_no: 43,
      original_layout: 'S03',
      smart_layout: 'brand-house-9-layer',
      smart_layout_reason: '本页明确是品牌屋收束，需要九层结构提示后续 renderer。',
      layout_variant_hints: {
        title_position: 'bottom-left',
        accent_data: '9-layer',
        secondary_data_format: 'italic',
        diagram_type: 'brand-house-9-layer',
      },
    },
  ],
}

const normalized = normalizeLayoutDesignerResponse(responseJson, chunkOutput)
assert.equal(normalized.layout_decisions.length, 3)
assert.equal(normalized.thinking_log.length, 3)
assert.equal(normalized.layout_decisions[0].original_layout, 'S22')

const decorated = applyLayoutDecisions(chunkOutput, normalized)
assert.notEqual(decorated, chunkOutput)
assert.equal(decorated.layout_designer.layout_decisions.length, 3)
assert.equal(decorated.layout_designer.thinking_log.length, 3)
assert.equal(decorated.slides[0].layout, 'hero-statement')
assert.equal(decorated.slides[0].layout_original, 'S22')
assert.equal(decorated.slides[2].layout_designer.smart_layout, 'brand-house-9-layer')
assert.equal(chunkOutput.slides[0].layout, 'S22')

assert.throws(
  () => normalizeLayoutDesignerResponse({
    thinking_log: responseJson.thinking_log,
    layout_decisions: responseJson.layout_decisions.map((decision, index) => ({
      ...decision,
      smart_layout: index === 0 ? 'made-up-layout' : decision.smart_layout,
    })),
  }, chunkOutput),
  /Unsupported smart_layout/,
)

assert.throws(
  () => normalizeLayoutDesignerResponse({
    thinking_log: [{ step: 'only', content: 'too short' }],
    layout_decisions: responseJson.layout_decisions,
  }, chunkOutput),
  /thinking_log/,
)

const calls = []
const result = await runLayoutDesigner({
  chunkOutput,
  slug: 'layout-designer-test',
  callStep: async (system, user, opts) => {
    calls.push({ system, user, opts })
    return {
      text: JSON.stringify(responseJson),
      usage: { input_tokens: 10, output_tokens: 20 },
      model: 'fake-layout-model',
      provider: 'fake',
    }
  },
  appendAuditLog: async () => {},
})

assert.equal(calls.length, 1)
assert.ok(calls[0].system.includes('slide layout designer'))
assert.ok(calls[0].user.includes('brand-house-9-layer'))
assert.equal(result.layout_decisions.length, 3)

console.log('✅ layout-designer test passed')
