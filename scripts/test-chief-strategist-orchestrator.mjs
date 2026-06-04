#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  buildOrchestratorTaskPacket,
  buildOrchestratorTaskPackets,
  formatOrchestratorTaskPacket,
} from './chief-strategist-orchestrator.mjs'
import { ensureStrategicQuestion } from './strategic-question.mjs'
import { flattenBlueprintChunks, loadBlueprintForScheme } from './run-blueprint-suite.mjs'
import { prepareSubAgentBundle } from './run-sub-agent.mjs'

const clientSlug = 'test-chief-strategist-client'

await fs.rm(`inputs/${clientSlug}`, { recursive: true, force: true })
await fs.rm(`outputs/${clientSlug}`, { recursive: true, force: true })
await fs.mkdir(`inputs/${clientSlug}`, { recursive: true })
await fs.writeFile(`inputs/${clientSlug}/form.json`, JSON.stringify({
  name: '明澈',
  industry: '功能性护肤',
  stage: '重新定位',
  core_products: ['精华液', '面霜', '敏感肌护理套装'],
  target_audience: ['25-35 岁敏感肌女性'],
  competitors: ['薇诺娜', '理肤泉', '珂润'],
  tonality: '理性专业',
  render_style: 'swiss',
}, null, 2))
await fs.writeFile(`inputs/${clientSlug}/summary.md`, [
  '# 客户摘要: 明澈',
  '',
  '明澈是功能性护肤品牌,过去表达偏成分堆叠,缺少清晰定位。',
  '本次希望从敏感肌修护切入,建立更可信的专业品牌心智。',
].join('\n'))

const { path: strategicQuestionPath } = await ensureStrategicQuestion(clientSlug, 'brand_positioning_case', { force: true })
const strategicQuestion = await fs.readFile(strategicQuestionPath, 'utf8')
const form = JSON.parse(await fs.readFile(`inputs/${clientSlug}/form.json`, 'utf8'))
const summary = await fs.readFile(`inputs/${clientSlug}/summary.md`, 'utf8')
const { blueprint, blueprintPath } = await loadBlueprintForScheme('brand_positioning_case')
const chunks = flattenBlueprintChunks(blueprint, blueprintPath)
const consumerChunk = chunks.find(chunk => chunk.chunk_id === 'p2-c3-consumer-portraits')

const packet = buildOrchestratorTaskPacket({
  clientSlug,
  schemeType: 'brand_positioning_case',
  blueprint,
  blueprintPath,
  chunk: consumerChunk,
  form,
  summary,
  strategicQuestion,
  upstreamSummaries: [
    {
      chunk_id: 'p2-c2-competition-status',
      chunk_takeaway: '竞品都在讲医学背书,但没有把敏感肌日常护理讲成长期关系。',
      chunk_insights: ['专业背书拥挤', '日常护理关系仍有空位'],
    },
  ],
})

assert.equal(packet.schema_version, 'chief-strategist-task-packet/v1')
assert.equal(packet.orchestrator.role, 'chief_strategist')
assert.ok(packet.orchestrator.responsibilities.includes('需求澄清'))
assert.equal(packet.agent_id, 'consumer_insight')
assert.equal(packet.chunk_id, 'p2-c3-consumer-portraits')
assert.equal(packet.task.must_answer, consumerChunk.chunk_insight_question)
assert.equal(packet.context_layers.global_context.client_name, '明澈')
assert.equal(packet.context_layers.global_context.scheme_type, 'brand_positioning_case')
assert.ok(packet.context_layers.evidence_context.client_inputs.some(input => input.ref === `inputs/${clientSlug}/summary.md`))
assert.equal(packet.context_layers.blueprint_context.page_count, consumerChunk.pages.length)
assert.deepEqual(packet.context_layers.blueprint_context.allowed_concepts, consumerChunk.allowed_concepts)
assert.equal(packet.context_layers.working_memory.upstream_chunks[0].chunk_id, 'p2-c2-competition-status')
assert.ok(packet.output_contract.required_fields.includes('chunk_takeaway'))
assert.ok(packet.output_contract.handoff_back_to_orchestrator.includes('chunk_insights'))
assert.ok(packet.quality_gates.includes('blueprintCheck'))
assert.ok(packet.quality_gates.includes('assembleByBlueprint'))

const formatted = formatOrchestratorTaskPacket(packet)
assert.ok(formatted.includes('chief-strategist-task-packet/v1'))
assert.ok(formatted.includes('p2-c3-consumer-portraits'))
assert.ok(formatted.includes('25-35 岁敏感肌女性'))

const allPackets = buildOrchestratorTaskPackets({
  clientSlug,
  schemeType: 'brand_positioning_case',
  blueprint,
  blueprintPath,
  chunks,
  form,
  summary,
  strategicQuestion,
})
assert.equal(allPackets.length, 13)
assert.equal(allPackets[0].orchestration_index, 1)
assert.equal(allPackets.at(-1).orchestration_index, 13)

const bundleResult = await prepareSubAgentBundle('consumer_insight', clientSlug, {
  blueprintPath,
  chunkId: 'p2-c3-consumer-portraits',
  upstreamChunks: ['p2-c2-competition-status'],
})
const bundle = await fs.readFile(bundleResult.bundlePath, 'utf8')
assert.ok(bundle.includes('## Orchestrator Task Packet (auto-injected)'))
assert.ok(bundle.includes('"role": "chief_strategist"'))
assert.ok(bundle.includes('"chunk_id": "p2-c3-consumer-portraits"'))
assert.ok(bundle.includes('"working_memory"'))

await fs.rm(`inputs/${clientSlug}`, { recursive: true, force: true })
await fs.rm(`outputs/${clientSlug}`, { recursive: true, force: true })

console.log('✅ chief-strategist orchestrator test passed')
