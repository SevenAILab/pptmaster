#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { assembleByBlueprint } from './assemble-by-blueprint.mjs'
import { renderDeck } from './render-deck.mjs'
import { flattenBlueprintChunks, loadBlueprintForScheme, runBlueprintSuite } from './run-blueprint-suite.mjs'

const clientSlug = 'test-blueprint-e2e-client'
const outputSlug = `${clientSlug}-blueprint`

await fs.rm(`inputs/${clientSlug}`, { recursive: true, force: true })
await fs.rm(`outputs/${clientSlug}`, { recursive: true, force: true })
await fs.rm(`outputs/${outputSlug}`, { recursive: true, force: true })
await fs.mkdir(`inputs/${clientSlug}`, { recursive: true })
await fs.writeFile(`inputs/${clientSlug}/form.json`, JSON.stringify({
  name: '蓝图端到端客户',
  industry: 'AI 品牌策划',
  stage: '0-1 启动',
  core_products: ['品牌策略 AI Agent'],
  target_audience: ['甲方品牌方', '市场部人员'],
  competitors: ['Gamma', 'WPS AI'],
  budget_level: 'MVP',
  tonality: '理性专业',
  render_style: 'swiss',
}, null, 2))
await fs.writeFile(`inputs/${clientSlug}/summary.md`, '蓝图端到端客户希望输出咨询级品牌定位案,重点验证真实案例结构和思考链字段。')

const suiteResult = await runBlueprintSuite(clientSlug, 'brand_positioning_case', { skipExisting: false })
assert.equal(suiteResult.prepared, 13)
assert.equal(suiteResult.failed, 0)

const { blueprint, blueprintPath } = await loadBlueprintForScheme('brand_positioning_case')
const chunks = flattenBlueprintChunks(blueprint, blueprintPath)
for (const chunk of chunks) {
  const slides = chunk.pages.map((page, index) => ({
    page_no: page.page_no,
    layout: page.recommended_layout,
    action_title: `${page.page_subtitle} 证明 PPTAgent 需要垂直品牌策划定位 ${index + 1}`,
    core_points: [
      'PPTAgent 避开通用 AI PPT 红海,聚焦品牌策划方案',
      'Seven 私有方法论资产构成垂直护城河',
    ],
    data_refs: [{ value: 'PPTAgent 客户摘要', source: `inputs/${clientSlug}/summary.md`, type: 'quote' }],
    models_used: [page.concept_for_this_page || chunk.allowed_concepts[0]],
    render_hints: { accent_color: index % 2 === 0 ? 'accent' : 'ink' },
  }))
  await fs.writeFile(`outputs/${clientSlug}/_chunks/${chunk.chunk_id}.json`, JSON.stringify({
    agent_id: chunk.driving_sub_agent,
    blueprint_chunk_id: chunk.chunk_id,
    chunk_takeaway: `${chunk.chunk_title} 指向 PPTAgent 的垂直品牌策划定位`,
    chunk_insights: [
      '通用 AI PPT 已是红海',
      '品牌策划全案需要方法论资产和案例结构',
      'HTML 横向翻页 PPT 是可链接分享的交付形态',
    ],
    thinking_log: [
      'Step 1: 读取客户 summary.md',
      'Step 2: 对照 blueprint chunk_insight_question',
      'Step 3: 生成可追溯的页面输出',
    ],
    client_profile: { name: 'PPTAgent', render_style: 'swiss' },
    slides,
    metadata: { blueprint_chunk_id: chunk.chunk_id, self_check_passed: true },
  }, null, 2))
}

const assembled = await assembleByBlueprint(clientSlug, 'brand_positioning_case', { outputSlug })
assert.equal(assembled.totalPages, 80)

const renderResult = await renderDeck(`outputs/${outputSlug}/raw-output.json`, `outputs/${outputSlug}/index.html`, { style: 'swiss' })
assert.equal(renderResult.slideCount, 80)
const html = await fs.readFile(`outputs/${outputSlug}/index.html`, 'utf8')
assert.ok(html.includes('PPTAgent'))
assert.ok(html.includes('<section class="slide'))
assert.ok(html.includes('id="deck"'))

await fs.rm(`inputs/${clientSlug}`, { recursive: true, force: true })
await fs.rm(`outputs/${clientSlug}`, { recursive: true, force: true })
await fs.rm(`outputs/${outputSlug}`, { recursive: true, force: true })

console.log('✅ blueprint end-to-end test passed')
