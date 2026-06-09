import assert from 'node:assert/strict'
import {
  buildResearchPrompt,
  deriveResearchQuestions,
  gatherResearch,
  normalizeSearchHits,
  parseResearchResponse,
  tagSources,
} from './research-worker.mjs'

const brief = {
  slug: 'pptagent-phase3-validation',
  form: {
    name: 'PPTAgent',
    industry: 'AI Agent / 品牌策划工具',
    target_audience: ['独立品牌顾问', '小型咨询团队'],
  },
}

const qs = deriveResearchQuestions(brief)
assert.equal(qs.length, 3)
assert.ok(qs.some(q => /PPTAgent/.test(q)))
assert.ok(qs.some(q => /AI Agent|品牌策划工具/.test(q)))
assert.ok(qs.some(q => /独立品牌顾问|小型咨询团队/.test(q)))

assert.deepEqual(
  normalizeSearchHits({
    results: [
      { link: 'https://example.com/a', title: 'A', snippet: 'alpha' },
      { url: 'https://example.com/b', content: 'beta' },
      { source: 'https://example.com/c', description: 'gamma' },
    ],
  }),
  [
    { url: 'https://example.com/a', title: 'A', content: 'alpha' },
    { url: 'https://example.com/b', title: '', content: 'beta' },
    { url: 'https://example.com/c', title: '', content: 'gamma' },
  ],
)
assert.deepEqual(normalizeSearchHits([{ url: '', title: 'bad', snippet: 'x' }]), [])

const tagged = tagSources([
  {
    claim: 'B2B 内容营销团队 2025 年计划增加 AI 工具预算 32%',
    evidence: '32% plan to increase AI tooling budget',
    source_url: 'https://www.gartner.com/en/marketing/research/report.pdf',
    confidence: 'high',
  },
  {
    claim: '同源第二条',
    evidence: 'same source',
    source_url: 'https://www.gartner.com/en/marketing/research/report.pdf',
    confidence: 'med',
  },
  {
    claim: '缺 URL 应被丢弃',
    evidence: 'no url',
    confidence: 'low',
  },
])
assert.equal(tagged.sources.length, 1)
assert.equal(tagged.findings.length, 2)
assert.equal(tagged.findings[0].source_id, 1)
assert.equal(tagged.findings[1].source_id, 1)
assert.equal(tagged.sources[0].source_tier, 'T2')
assert.equal(tagged.findings[0].source_tier, 'T2')
assert.throws(() => tagSources([{ claim: 'no url' }]), /No traceable research findings/)

const { system, user } = buildResearchPrompt(['市场规模?'], [
  { url: 'https://www.gartner.com/report', title: 'Gartner report', content: 'AI tooling budget increased 32% in 2025.' },
])
assert.match(system, /source_url/)
assert.match(system, /精确数字/)
assert.match(user, /AI tooling budget increased 32%/)

const parsed = parseResearchResponse('```json\n{"findings":[{"claim":"a","evidence":"b","source_url":"https://www.gartner.com/report","confidence":"high"}]}\n```')
assert.equal(parsed.findings.length, 1)
assert.throws(() => parseResearchResponse('无 JSON'), /No JSON object/)

const gathered = await gatherResearch({
  questions: ['AI 工具预算?'],
  search: async q => {
    assert.equal(q, 'AI 工具预算?')
    return {
      results: [{ url: 'https://www.gartner.com/report', title: 'Gartner report', snippet: 'AI tooling budget increased 32% in 2025.' }],
    }
  },
  callModel: async (stubSystem, stubUser) => {
    assert.match(stubSystem, /真实出处/)
    assert.match(stubUser, /AI tooling budget increased 32%/)
    return JSON.stringify({
      findings: [{
        claim: 'AI 工具预算 2025 年增加 32%',
        evidence: 'AI tooling budget increased 32% in 2025.',
        source_url: 'https://www.gartner.com/report',
        confidence: 'high',
      }],
    })
  },
})
assert.equal(gathered.findings.length, 1)
assert.equal(gathered.findings[0].source_tier, 'T2')
assert.equal(gathered.sources[0].url, 'https://www.gartner.com/report')

console.log('✅ research-worker: derive + normalize + tag + parse + gather passed')
