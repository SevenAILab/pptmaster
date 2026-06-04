#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { assembleByBlueprint, assertChunkPageCount } from './assemble-by-blueprint.mjs'
import { flattenBlueprintChunks, loadBlueprintForScheme } from './run-blueprint-suite.mjs'

const clientSlug = 'test-blueprint-assemble-client'
const outputSlug = `${clientSlug}-deck`

await fs.rm(`outputs/${clientSlug}`, { recursive: true, force: true })
await fs.rm(`outputs/${outputSlug}`, { recursive: true, force: true })
await fs.mkdir(`outputs/${clientSlug}/_chunks`, { recursive: true })

const { blueprint, blueprintPath } = await loadBlueprintForScheme('brand_positioning_case')
const chunks = flattenBlueprintChunks(blueprint, blueprintPath)
const runId = 'assemble-gate-run'

for (const chunk of chunks) {
  const slides = chunk.pages.map((page, index) => ({
    page_no: page.page_no,
    layout: page.recommended_layout,
    action_title: `${page.page_subtitle} mock action title ${index + 1}`,
    core_points: ['mock point 1', 'mock point 2'],
    data_refs: [{ value: 'mock source', source: 'https://example.com/mock', type: 'quote' }],
    models_used: [page.concept_for_this_page || chunk.allowed_concepts[0]],
  }))
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

assert.throws(
  () => assertChunkPageCount({ slides: [] }, chunks[0]),
  /blueprint expects/,
)

await assert.rejects(
  () => assembleByBlueprint(clientSlug, 'brand_positioning_case', { outputSlug, requireRunId: 'wrong-run' }),
  /run_id/,
)

const blockedChunk = chunks[0]
const blockedPath = `outputs/${clientSlug}/_chunks/${blockedChunk.chunk_id}.json`
const blockedOutput = JSON.parse(await fs.readFile(blockedPath, 'utf8'))
blockedOutput.metadata.consulting_review.verdict = 'BLOCK'
await fs.writeFile(blockedPath, JSON.stringify(blockedOutput, null, 2))
await assert.rejects(
  () => assembleByBlueprint(clientSlug, 'brand_positioning_case', { outputSlug, requireRunId: runId }),
  /Consulting Review BLOCK/,
)
blockedOutput.metadata.consulting_review.verdict = 'PASS'
await fs.writeFile(blockedPath, JSON.stringify(blockedOutput, null, 2))

const caseRefOutput = JSON.parse(await fs.readFile(blockedPath, 'utf8'))
caseRefOutput.slides[0].data_refs = [{ value: 'case', source: 'assets/_raw/cases/标杆案例/smallrig/page-124.md' }]
await fs.writeFile(blockedPath, JSON.stringify(caseRefOutput, null, 2))
await assert.rejects(
  () => assembleByBlueprint(clientSlug, 'brand_positioning_case', { outputSlug, requireRunId: runId }),
  /case library/,
)
blockedOutput.slides = blockedOutput.slides.map(slide => ({ ...slide, data_refs: [{ value: 'web', source: 'https://example.com/restored' }] }))
await fs.writeFile(blockedPath, JSON.stringify(blockedOutput, null, 2))

const requiredChunk = chunks.find(chunk => chunk.driving_sub_agent === 'competitor_analysis' || chunk.driving_sub_agent === 'industry_analysis')
const requiredPath = `outputs/${clientSlug}/_chunks/${requiredChunk.chunk_id}.json`
const requiredOutput = JSON.parse(await fs.readFile(requiredPath, 'utf8'))
requiredOutput.slides = requiredOutput.slides.map(slide => ({ ...slide, data_refs: [{ value: 'local', source: `inputs/${clientSlug}/first-party/a.md` }] }))
await fs.writeFile(requiredPath, JSON.stringify(requiredOutput, null, 2))
await assert.rejects(
  () => assembleByBlueprint(clientSlug, 'brand_positioning_case', { outputSlug, requireRunId: runId }),
  /required web evidence/,
)
requiredOutput.slides = requiredOutput.slides.map(slide => ({ ...slide, data_refs: [{ value: 'web', source: 'https://example.com/required' }] }))
await fs.writeFile(requiredPath, JSON.stringify(requiredOutput, null, 2))

const result = await assembleByBlueprint(clientSlug, 'brand_positioning_case', { outputSlug, requireRunId: runId })
assert.equal(result.totalPages, 80)
assert.equal(result.merged.blueprint_id, 'brand-positioning-deck-v1')
assert.deepEqual(result.merged.slides.map(slide => slide.page_no), Array.from({ length: 80 }, (_, index) => index + 1))
assert.equal(result.merged.slides[0].blueprint_page_no, 1)
assert.equal(result.merged.slides[0].chunk_id, 'p1-c1-brief-and-status')
assert.equal(result.merged.slides[79].blueprint_page_no, 80)
assert.ok(result.merged.metadata.chunk_takeaways['p3-c1-positioning-statement'])
assert.equal(result.merged.metadata.run_id, runId)
assert.ok(await fs.stat(`outputs/${outputSlug}/raw-output.json`))

await fs.rm(`outputs/${clientSlug}`, { recursive: true, force: true })
await fs.rm(`outputs/${outputSlug}`, { recursive: true, force: true })

console.log('✅ blueprint-assemble test passed')
