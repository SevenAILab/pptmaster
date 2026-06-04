import assert from 'node:assert/strict'
import { calculateDelta, evaluateOutput, parseModelList, renderReport } from './cross-model-validate.mjs'

const validJson = JSON.stringify({
  slides: [
    { action_title: '定位结论', models_used: ['STP'], core_points: ['p1', 'p2'], data_refs: [{ source: 'page-124' }] },
  ],
  metadata: { self_check_passed: true },
})
assert.equal(evaluateOutput(validJson).score, 100)
assert.equal(evaluateOutput('not json').score, 0)
assert.equal(calculateDelta([80, 100, 90]), 20)
assert.deepEqual(parseModelList('claude,gpt-4o,qwen,deepseek'), ['claude', 'gpt-4o', 'qwen', 'deepseek'])

const report = renderReport({
  matrix: {
    brand_positioning: {
      claude: { score: 100, passed: true },
      'gpt-4o': { score: 90, passed: true },
    },
  },
  models: [{ key: 'claude', name: 'claude-sonnet-4.5' }, { key: 'gpt-4o', name: 'gpt-4o' }],
  generatedAt: '2026-05-27T00:00:00.000Z',
})

assert.ok(report.includes('Model Agnostic Validation Report'))
assert.ok(report.includes('brand_positioning'))
assert.ok(report.includes('10.0%'))

console.log('✅ cross-model-validate test passed')
