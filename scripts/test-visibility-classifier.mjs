import assert from 'node:assert/strict'
import { classifyVisibility, defaultVisibilityForKind } from '../core/visibility-classifier.mjs'

assert.equal(defaultVisibilityForKind('brand_definition'), 'external')
assert.equal(defaultVisibilityForKind('risk_check'), 'internal')

assert.equal(classifyVisibility({ kind: 'risk_check', text: '单店回本测算 毛利 35%' }).visibility, 'internal')
assert.equal(classifyVisibility({ kind: 'strategy_core', text: '品牌使命：让每个人都能构建自己的品牌' }).visibility, 'external')
assert.equal(classifyVisibility({ kind: 'proof_growth', text: '行业第一 领先' }).visibility, 'review')
assert.equal(classifyVisibility({
  kind: 'proof_growth',
  text: '行业第一 领先',
  evidence_refs: ['src-1'],
}).visibility, 'external')
assert.equal(classifyVisibility({ kind: 'personality_statement', text: '有责任感的创新者' }).visibility, 'external')
assert.equal(classifyVisibility({ kind: 'personality_playbook', text: '客服话术：不可说绝对化承诺' }).visibility, 'internal')
assert.throws(() => classifyVisibility({ kind: 'nope', text: 'x' }), /unknown module kind/i)

console.log('✅ visibility-classifier tests passed')
