import assert from 'node:assert/strict'
import {
  buildQuestionPrompt,
  buildReflectionPrompt,
  buildResearchPrompt,
  deriveResearchQuestionsLLM,
  gatherResearch,
  normalizeSearchHits,
  parseQuestionResponse,
  parseReflectionResponse,
  parseResearchResponse,
  researchQuestionWithReflection,
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

const angles = [
  'AI Agent / 品牌策划工具 的市场规模与最新数字',
  'PPTAgent 的主要替代方案与竞品定位',
  '独立品牌顾问 的核心任务与采购痛点',
]
const qp = buildQuestionPrompt({ brief, angles })
assert.match(qp.system, /3-5 个/)
assert.match(qp.system, /不要使用 site:/)
assert.match(qp.user, /PPTAgent/)
assert.match(qp.user, /市场规模与最新数字/)

assert.deepEqual(
  parseQuestionResponse('{"questions":["q1 市场?","q2 竞品?","q3 人群?"]}'),
  ['q1 市场?', 'q2 竞品?', 'q3 人群?'],
)
assert.throws(() => parseQuestionResponse('{"questions":["只有一个"]}'), /至少 2/)
assert.throws(() => parseQuestionResponse('没有 JSON'), /No JSON/)

const derived = await deriveResearchQuestionsLLM({
  brief,
  angles,
  callModel: async (qpSystem, qpUser) => {
    assert.match(qpSystem, /研究规划员/)
    assert.match(qpUser, /研究角度/)
    return '```json\n{"questions":["A 市场规模?","B 竞品定位?","C 人群痛点?"]}\n```'
  },
})
assert.equal(derived.length, 3)

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

const rfl = buildReflectionPrompt({
  question: '精品咖啡市场规模？',
  findings: [{ claim: '2025 年市场 1200 亿', source_url: 'https://a.com', confidence: 'high' }],
})
assert.match(rfl.system, /sufficient/)
assert.match(rfl.system, /next_queries/)
assert.match(rfl.system, /宁停勿过投|不要过度/)
assert.match(rfl.user, /精品咖啡市场规模/)
assert.match(rfl.user, /1200 亿/)

assert.deepEqual(
  parseReflectionResponse('{"sufficient":false,"gaps":["缺增速"],"next_queries":["精品咖啡 年增速 2025"]}'),
  { sufficient: false, gaps: ['缺增速'], next_queries: ['精品咖啡 年增速 2025'] },
)
assert.equal(parseReflectionResponse('{"sufficient":true,"gaps":[],"next_queries":[]}').sufficient, true)
assert.equal(parseReflectionResponse('{"sufficient":false,"gaps":[],"next_queries":["a","b","c"]}').next_queries.length, 2)
assert.throws(() => parseReflectionResponse('不是 JSON'), /No JSON/)
assert.throws(() => parseReflectionResponse('{"gaps":[]}'), /sufficient/)

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

const searchLog = []
const deepResult = await researchQuestionWithReflection({
  question: '市场规模?',
  maxRounds: 3,
  search: async query => {
    searchLog.push(query)
    return searchLog.length === 1
      ? { results: [{ url: 'https://a.com/1', title: 'A', snippet: '规模 1200 亿' }] }
      : { results: [{ url: 'https://b.com/2', title: 'B', snippet: '增速 12%' }, { url: 'https://c.com/3', title: 'C', snippet: '人群 3 亿' }] }
  },
  callModel: async (deepSystem, deepUser) => {
    if (deepSystem.includes('研究质量评估员')) {
      return searchLog.length === 1
        ? '{"sufficient":false,"gaps":["缺增速"],"next_queries":["市场 增速 2025"]}'
        : '{"sufficient":true,"gaps":[],"next_queries":[]}'
    }
    return deepUser.includes('增速')
      ? JSON.stringify({ findings: [
        { claim: '年增速 12%', evidence: '12%', source_url: 'https://b.com/2', confidence: 'high' },
        { claim: '消费人群 3 亿', evidence: '3 亿', source_url: 'https://c.com/3', confidence: 'med' },
      ] })
      : JSON.stringify({ findings: [{ claim: '市场 1200 亿', evidence: '1200 亿', source_url: 'https://a.com/1', confidence: 'high' }] })
  },
})
assert.equal(deepResult.rounds_used, 2)
assert.equal(deepResult.search_calls_used, 2)
assert.equal(deepResult.findings.length, 3)
assert.deepEqual(searchLog, ['市场规模?', '市场 增速 2025'])

const oneShot = await researchQuestionWithReflection({
  question: 'q',
  maxRounds: 3,
  search: async () => ({ results: [
    { url: 'https://a.com', snippet: 'x1' },
    { url: 'https://b.com', snippet: 'x2' },
    { url: 'https://c.com', snippet: 'x3' },
  ] }),
  callModel: async oneSystem => oneSystem.includes('研究质量评估员')
    ? '{"sufficient":true,"gaps":[],"next_queries":[]}'
    : JSON.stringify({ findings: [
      { claim: 'c1', evidence: 'e', source_url: 'https://a.com', confidence: 'high' },
      { claim: 'c2', evidence: 'e', source_url: 'https://b.com', confidence: 'high' },
      { claim: 'c3', evidence: 'e', source_url: 'https://c.com', confidence: 'high' },
    ] }),
})
assert.equal(oneShot.rounds_used, 1)

await assert.rejects(researchQuestionWithReflection({
  question: 'q',
  maxRounds: 2,
  search: async () => ({ results: [] }),
  callModel: async () => '{"findings":[]}',
}), /No search results/)

console.log('✅ research-worker: derive + normalize + tag + parse + gather passed')
