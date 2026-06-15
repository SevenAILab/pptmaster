import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ANALYSIS_TYPES,
  buildAnalysisPrompt,
  parseAnalysisCards,
  runAnalysisPass,
} from './analysis-pass.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const brief = {
  slug: 'luma',
  formText: '{"name":"LUMA","industry":"精品咖啡"}',
  summary: 'LUMA 有 12 家店。',
  strategicQuestion: '应占据什么定位？',
}
const researchBrief = {
  findings: [{ claim: '精品咖啡增速放缓', source_id: 1, source_url: 'https://example.com/report', source_tier: 'T2' }],
  sources: [{ id: 1, url: 'https://example.com/report', source_tier: 'T2', type: 'report' }],
}

const prompt = buildAnalysisPrompt('industry', {
  brief,
  researchBrief,
  guidance: '## industry-analysis 方法论指引',
})
assert.match(prompt.system, /industry-analysis/)
assert.match(prompt.system, /契约 A/)
assert.match(prompt.system, /implication/)
assert.match(prompt.user, /精品咖啡增速放缓/)

const parsed = parseAnalysisCards('industry', JSON.stringify({
  cards: [{
    id: 'custom-01',
    claim: '精品咖啡增长从开店转向复购',
    evidence: '行业增速放缓',
    source: 'https://example.com/report',
    source_tier: 'T2',
    implication: 'LUMA 应证明复购价值',
    confidence: 'high',
  }],
}))
assert.equal(parsed.analysis_type, 'industry')
assert.equal(parsed.cards[0].id, 'custom-01')

let seenTypes = []
const result = await runAnalysisPass({
  brief,
  researchBrief,
  root: REPO_ROOT,
  types: ANALYSIS_TYPES,
  callModel: async (system, user) => {
    const type = ANALYSIS_TYPES.find(item => system.includes(`analysis_type 必须是 ${item}`))
    seenTypes.push(type)
    return JSON.stringify({
      analysis_type: type,
      cards: [{
        id: `${type.slice(0, 4)}-01`,
        claim: `${type} 判断`,
        evidence: 'e',
        source: 'https://example.com/report',
        source_tier: 'T2',
        implication: `${type} 所以应该行动`,
        confidence: 'high',
      }],
    })
  },
})
assert.deepEqual(seenTypes.sort(), ANALYSIS_TYPES.slice().sort())
assert.equal(result.cards.length, 4)
assert.equal(result.byType.industry.cards.length, 1)
assert.equal(result.cards[0].analysis_type, 'industry')

await assert.rejects(runAnalysisPass({
  brief,
  researchBrief,
  root: REPO_ROOT,
  types: ['competitor'],
  callModel: async () => JSON.stringify({
    analysis_type: 'competitor',
    cards: [{
      id: 'comp-01',
      claim: '竞品开店快',
      evidence: 'e',
      source: 'https://example.com/report',
      source_tier: 'T2',
      implication: '',
      confidence: 'high',
    }],
  }),
}), /分析卡质量门未通过|implication/)

console.log('✅ analysis-pass: prompts + python card gate + merge passed')
