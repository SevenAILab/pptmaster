#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { assembleByBlueprint } from './assemble-by-blueprint.mjs'
import { flattenBlueprintChunks, loadBlueprintForScheme } from './run-blueprint-suite.mjs'

const clientSlug = 'test-assumption-assemble-client'
const outputSlug = `${clientSlug}-deck`
const runId = 'assumption-assemble-run'

await fs.rm(`outputs/${clientSlug}`, { recursive: true, force: true })
await fs.rm(`outputs/${outputSlug}`, { recursive: true, force: true })
await fs.mkdir(`outputs/${clientSlug}/_chunks`, { recursive: true })

const { blueprint, blueprintPath } = await loadBlueprintForScheme('brand_positioning_case')
const chunks = flattenBlueprintChunks(blueprint, blueprintPath)
const hypothesisChunk = chunks.find(chunk => chunk.pages.length > 1) || chunks[0]

for (const chunk of chunks) {
  const slides = chunk.pages.map((page, index) => {
    const baseSlide = {
      page_no: page.page_no,
      layout: page.recommended_layout,
      action_title: `${page.page_subtitle} mock action title ${index + 1}`,
      core_points: ['mock point 1', 'mock point 2'],
      data_refs: [{ value: 'mock source', source: 'https://example.com/mock', source_tier: 'T2', type: 'quote' }],
      models_used: [page.concept_for_this_page || chunk.allowed_concepts[0]],
    }
    if (chunk.chunk_id === hypothesisChunk.chunk_id && index === 1) {
      return {
        ...baseSlide,
        action_title: 'Competitor-Matrix：六类 AI PPT 玩家差异仍集中在输入、编辑、视觉与价格',
        core_points: ['基于同类开源项目的类比推理', '需要访谈品牌市场部用户才能验证'],
        data_refs: [{ value: '公开网页信号', source: 'https://example.com/weak', source_tier: 'T3', type: 'external_signal' }],
        evidence_status: 'hypothesis',
        hypothesis_basis: '基于同类开源项目的类比推理',
        validation_method: '需要访谈品牌市场部用户才能验证',
      }
    }
    return baseSlide
  })
  await fs.writeFile(`outputs/${clientSlug}/_chunks/${chunk.chunk_id}.json`, JSON.stringify({
    agent_id: chunk.driving_sub_agent,
    blueprint_chunk_id: chunk.chunk_id,
    chunk_takeaway: `${chunk.chunk_title} takeaway`,
    chunk_insights: ['insight 1', 'insight 2'],
    thinking_log: ['step 1', 'step 2', 'step 3'],
    slides,
    metadata: {
      blueprint_chunk_id: chunk.chunk_id,
      run_id: runId,
      generated_at: '2026-05-30T08:00:00.000Z',
      consulting_review: { verdict: 'PASS', data_credibility_score: 8 },
    },
  }, null, 2))
}

try {
  const result = await assembleByBlueprint(clientSlug, 'brand_positioning_case', { outputSlug, requireRunId: runId })
  const hypothesisSlides = result.merged.slides.filter(slide => slide.evidence_status === 'hypothesis')

  assert.equal(result.merged.metadata.pending_validation, true)
  assert.ok(Array.isArray(result.merged.metadata.validation_checklist))
  assert.equal(result.merged.metadata.validation_checklist.length, hypothesisSlides.length)
  assert.deepEqual(
    Object.keys(result.merged.metadata.validation_checklist[0]).sort(),
    ['chunk_id', 'claim', 'hypothesis_basis', 'page_no', 'validation_method'].sort(),
  )
  assert.equal(result.merged.metadata.validation_checklist[0].chunk_id, hypothesisChunk.chunk_id)
  assert.equal(result.merged.metadata.validation_checklist[0].claim, 'Competitor-Matrix：六类 AI PPT 玩家差异仍集中在输入、编辑、视觉与价格')
  assert.equal(result.merged.metadata.validation_checklist[0].validation_method, '需要访谈品牌市场部用户才能验证')
  assert.equal(hypothesisSlides[0].pending_validation, true)
  assert.equal(result.merged.metadata.assumption_summary.hypothesis_pages, 1)
  assert.ok(result.merged.metadata.assumption_summary.total_key_pages >= 1)
} finally {
  await fs.rm(`outputs/${clientSlug}`, { recursive: true, force: true })
  await fs.rm(`outputs/${outputSlug}`, { recursive: true, force: true })
}

console.log('✅ assemble-by-blueprint assumption test passed')
