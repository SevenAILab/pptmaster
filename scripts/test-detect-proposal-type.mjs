import assert from 'node:assert/strict'
import { buildTypePrompt, detectProposalType, parseProposalType } from './detect-proposal-type.mjs'

assert.equal(await detectProposalType({
  brief: { form: { proposal_type: 'building' } },
  callModel: async () => 'positioning',
}), 'building')

const { system, user } = buildTypePrompt({
  brief: {
    formText: '{"name":"LUMA","stage":"区域扩张期"}',
    strategicQuestion: '应占据什么差异化定位',
  },
})
assert.match(system, /positioning.*building.*upgrade/s)
assert.match(user, /LUMA/)
assert.equal(parseProposalType('positioning'), 'positioning')
assert.equal(parseProposalType('这是一个 upgrade 方案'), 'upgrade')
assert.throws(() => parseProposalType('无关词'), /Cannot determine proposal_type/)
assert.equal(await detectProposalType({
  brief: { form: {}, formText: '{}', strategicQuestion: '从A升级到B' },
  callModel: async () => 'upgrade',
}), 'upgrade')

console.log('✅ detect-proposal-type passed')
