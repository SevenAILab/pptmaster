import assert from 'node:assert/strict'
import fs from 'node:fs'
import { parseArgs } from './run-sub-agent.mjs'
import { dataRefsHtml, modelsHtml } from './renderers/render-utils.mjs'

const skill = fs.readFileSync('SKILL.md', 'utf8')
assert.ok(skill.includes('6 个 Sub-Agent'), 'SKILL.md should describe all 6 Sub-Agent capabilities')
assert.ok(skill.includes('brand_building'), 'SKILL.md should document brand_building')
assert.ok(skill.includes('Chief Strategist Orchestrator'), 'SKILL.md should describe the chief strategist architecture')
assert.ok(skill.includes('blueprint:suite'), 'SKILL.md should document blueprint suite flow')
assert.ok(!skill.includes('Phase 1 Week 2 仅支持 Sub-Agent ④'), 'SKILL.md should not expose stale Week 2 copy')
assert.ok(!skill.includes('node scripts/run-full-suite.mjs {client_slug}'), 'SKILL.md should not recommend legacy run-full-suite as default')

const positioningPrompt = fs.readFileSync('prompts/brand_positioning/system.md', 'utf8')
for (const text of [
  '提案叙事结构',
  '行业 / 竞争 / 消费者 / 自身诊断',
  '诊断 -> 研究 -> 定位 -> RTB -> 落地',
  '不要把每页都写成一个大结论加三个小点',
]) {
  assert.ok(positioningPrompt.includes(text), `brand_positioning prompt should include ${text}`)
}

const buildingPrompt = fs.readFileSync('prompts/brand_building/system.md', 'utf8')
for (const text of [
  '提案叙事结构',
  '定位之下的产品 / 渠道 / 营销 / 服务配称',
  '不要把每页都写成一个大结论加三个小点',
]) {
  assert.ok(buildingPrompt.includes(text), `brand_building prompt should include ${text}`)
}

const parsedEquals = parseArgs(['brand_building', 'demo', '--output-suffix=building', '--validate'])
assert.deepEqual(parsedEquals, {
  agentId: 'brand_building',
  clientSlug: 'demo',
  validateOnly: true,
  outputSuffix: 'building',
  blueprintPath: undefined,
  chunkId: undefined,
  upstreamChunks: [],
})

const parsedSpace = parseArgs(['brand_building', 'demo', '--output-suffix', 'building', '--validate'])
assert.deepEqual(parsedSpace, parsedEquals)

const escapeHtml = value => String(value || '')
const noisySlide = {
  data_refs: [
    { value: '影像内容创作者; 实现更多创作可能', source: 'assets/_raw/cases/标杆案例/smallrig/page-124.md' },
  ],
  models_used: ['Brand-Story-Hero-Journey', 'Product-House'],
}
assert.equal(dataRefsHtml(noisySlide, escapeHtml), '', 'data refs should be hidden by default in rendered slides')
assert.equal(modelsHtml(noisySlide, escapeHtml), '', 'methodology tags should be hidden by default in rendered slides')
assert.ok(dataRefsHtml(noisySlide, escapeHtml, { visible: true }).includes('page-124.md'))
assert.ok(modelsHtml(noisySlide, escapeHtml, { visible: true }).includes('Product-House'))

console.log('✅ launch-readiness test passed')
