import assert from 'node:assert/strict'
import { buildBatchContext, slugifyConcept } from './build-golden.mjs'

assert.equal(slugifyConcept('Business-Model-Canvas'), 'business-model-canvas')
assert.equal(slugifyConcept('SWOT'), 'swot')
assert.equal(slugifyConcept('Persona-5W2H'), 'persona-5w2h')
assert.equal(slugifyConcept('4A-Funnel'), '4a-funnel')

const swotContext = await buildBatchContext('SWOT')

assert.match(swotContext, /^# Batch context for: SWOT/m)
assert.match(swotContext, /^Category: model/m)
assert.match(swotContext, /^Aliases: SWOT 分析, SWOT分析, 态势分析, 优劣机威/m)
assert.match(swotContext, /^Total occurrences: 78/m)
assert.match(swotContext, /^## Top 10 occurrences \(by quality\)/m)
assert.equal((swotContext.match(/^### \d+\. /gm) || []).length, 10)
assert.ok(swotContext.includes('assets/_raw/'), 'Context should include source paths')
assert.ok(swotContext.includes('> '), 'Context should include quoted excerpts')

await assert.rejects(
  () => buildBatchContext('Not-A-Concept'),
  /Concept Not-A-Concept not in candidates/
)

console.log('✅ build-golden test passed')
