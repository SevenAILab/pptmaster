import assert from 'node:assert/strict'
import {
  aggregateSemanticAudit,
  assertAuditCoversDeck,
  buildAuditPrompt,
  parseAuditResponse,
  semanticAudit,
} from './deck-semantic-audit.mjs'

const deck = {
  slides: [
    { page_no: 1, action_title: '从 AI PPT 工具升级为品牌策划方案 Agent', core_points: ['定位主张'] },
    { page_no: 2, action_title: '同上：还是品牌策划方案 Agent', core_points: ['再说一遍'] },
  ],
}
const { system, user } = buildAuditPrompt(deck)
assert.match(system, /实证|演绎|重复|JSON/)
assert.match(user, /页 1:/)
assert.match(user, /从 AI PPT 工具升级为品牌策划方案 Agent/)
assert.match(user, /页 2:/)

const fenced = '分析如下：\n```json\n[{"page_no":1,"restates_page":null,"is_new_insight":true,"evidence_kind":"empirical"}]\n```\n完。'
const parsed = parseAuditResponse(fenced)
assert.equal(parsed.length, 1)
assert.equal(parsed[0].page_no, 1)
assert.equal(parsed[0].evidence_kind, 'empirical')
assert.equal(parseAuditResponse('[{"page_no":2,"restates_page":1,"is_new_insight":false,"evidence_kind":"deductive"}]')[0].restates_page, 1)
assert.throws(() => parseAuditResponse('模型没给JSON'), /No JSON array/)
assert.throws(() => parseAuditResponse('[{"page_no":1,"restates_page":null,"is_new_insight":true,"evidence_kind":"vibes"}]'), /Invalid evidence_kind/)

const perPage = [
  { page_no: 1, restates_page: null, is_new_insight: true, evidence_kind: 'empirical' },
  { page_no: 2, restates_page: 1, is_new_insight: false, evidence_kind: 'deductive' },
  { page_no: 3, restates_page: 1, is_new_insight: false, evidence_kind: 'hypothesis' },
  { page_no: 4, restates_page: null, is_new_insight: true, evidence_kind: 'deductive' },
]
const agg = aggregateSemanticAudit(perPage)
assert.equal(agg.pages, 4)
assert.equal(agg.semanticRepetitionRate, 0.5)
assert.equal(agg.newInsightRate, 0.5)
assert.equal(agg.empiricalRatio, 0.25)
assert.equal(agg.deductiveRate, 0.5)
assert.equal(agg.hypothesisRate, 0.25)
assert.deepEqual(agg.restatementPairs, [{ page: 2, restates: 1 }, { page: 3, restates: 1 }])

assert.doesNotThrow(() => assertAuditCoversDeck(deck, [
  { page_no: 1, restates_page: null, is_new_insight: true, evidence_kind: 'empirical' },
  { page_no: 2, restates_page: 1, is_new_insight: false, evidence_kind: 'deductive' },
]))
assert.throws(() => assertAuditCoversDeck(deck, [
  { page_no: 1, restates_page: null, is_new_insight: true, evidence_kind: 'empirical' },
]), /Semantic audit page count mismatch/)
assert.throws(() => assertAuditCoversDeck(deck, [
  { page_no: 1, restates_page: null, is_new_insight: true, evidence_kind: 'empirical' },
  { page_no: 3, restates_page: null, is_new_insight: true, evidence_kind: 'empirical' },
]), /Semantic audit page mismatch/)

const stub = async (stubSystem, stubUser) => {
  assert.match(stubSystem, /JSON/)
  assert.match(stubUser, /页 2:/)
  return '```json\n[{"page_no":1,"restates_page":null,"is_new_insight":true,"evidence_kind":"empirical"},' +
    '{"page_no":2,"restates_page":1,"is_new_insight":false,"evidence_kind":"deductive"}]\n```'
}
const res = await semanticAudit(deck, { callModel: stub })
assert.equal(res.semanticRepetitionRate, 0.5)
assert.equal(res.empiricalRatio, 0.5)
assert.equal(res.perPage.length, 2)

console.log('✅ deck-semantic-audit: buildPrompt + parse + aggregate + semanticAudit passed')
