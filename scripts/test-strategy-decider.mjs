import assert from 'node:assert/strict'
import { createBrandContent } from '../core/content-model.mjs'
import { deriveStrategyDirections, lockChosenDirection } from './strategy-decider.mjs'

const analysisCards = {
  byType: {
    industry: { cards: [{ id: 'ind-1', claim: '品类增速 30%', source_tier: 'T2' }] },
    competitor: { cards: [{ id: 'comp-1', claim: '头部主打便捷，无人做品质', source_tier: 'T2' }] },
    user: { cards: [{ id: 'usr-1', claim: '用户为品质愿付溢价', source_tier: 'T1' }] },
    self: { cards: [{ id: 'self-1', claim: '自有 DTC 运营', source_tier: 'T1' }] },
  },
}

const callModel = async (system, user) => {
  assert.match(system, /恰好 3 个战略方向/)
  assert.match(user, /comp-1/)
  return JSON.stringify({
    directions: [
      {
        id: 'd1',
        positioning: '品质便捷',
        tension: '用户要品质但市场只给便捷',
        mission: 'm1',
        vision: 'v1',
        proposition: 'p1',
        niche_basis: '品质与便捷之间的生态位',
        evidence_refs: ['comp-1', 'usr-1'],
      },
      {
        id: 'd2',
        positioning: '社群品牌',
        tension: '用户要归属但品类只讲交易',
        mission: 'm2',
        vision: 'v2',
        proposition: 'p2',
        niche_basis: '用户社群资产',
        evidence_refs: ['usr-1'],
      },
      {
        id: 'd3',
        positioning: '效率品牌',
        tension: '增长快但服务链路不稳',
        mission: 'm3',
        vision: 'v3',
        proposition: 'p3',
        niche_basis: '运营资产',
        evidence_refs: ['ind-1', 'self-1'],
      },
    ],
  })
}

const { directions } = await deriveStrategyDirections({ analysisCards, brief: {}, callModel })
assert.equal(directions.length, 3)
assert.equal(directions[0].id, 'd1')
assert.ok(directions[0].tension)
assert.deepEqual(directions[0].evidence_refs, ['comp-1', 'usr-1'])

let content = createBrandContent({ brand_slug: 'd', brand_type: 'new_consumer_full' })
content = lockChosenDirection(content, directions, 'd1')
assert.equal(content.strategic_spine.locked, true)
assert.equal(content.strategic_spine.chosen_direction_id, 'd1')
assert.equal(content.strategic_spine.positioning_statement, '品质便捷')
assert.throws(() => lockChosenDirection(content, directions, 'd2'), /already locked/i)

await assert.rejects(deriveStrategyDirections({
  analysisCards,
  brief: {},
  callModel: async () => JSON.stringify({ directions: [{ id: 'x' }] }),
}), /3 个|direction/i)

await assert.rejects(deriveStrategyDirections({
  analysisCards,
  brief: {},
  callModel: async () => JSON.stringify({ directions: [
    { id: 'd1', positioning: 'x', tension: 't', mission: 'm', vision: 'v', proposition: 'p', niche_basis: 'n', evidence_refs: ['missing'] },
    { id: 'd2', positioning: 'x', tension: 't', mission: 'm', vision: 'v', proposition: 'p', niche_basis: 'n', evidence_refs: ['usr-1'] },
    { id: 'd3', positioning: 'x', tension: 't', mission: 'm', vision: 'v', proposition: 'p', niche_basis: 'n', evidence_refs: ['ind-1'] },
  ] }),
}), /unknown evidence_ref/i)

console.log('✅ strategy-decider tests passed')
