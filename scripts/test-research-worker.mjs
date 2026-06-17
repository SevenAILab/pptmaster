import assert from 'node:assert/strict'
import {
  buildQuestionPrompt,
  buildReflectionPrompt,
  buildResearchPrompt,
  buildResearchQueryVariants,
  deriveResearchQuestionsLLM,
  gatherResearch,
  gatherResearchDeep,
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

const variants = buildResearchQueryVariants('LUMA Coffee 竞品 Manner M Stand 瑞幸 精品咖啡连锁 定位 差异化 价格 门店模型 会员体系', { retry: true })
assert.ok(variants.length >= 2)
assert.ok(variants.some(query => query.includes('competitor positioning') || query.length < 50))
const broadChineseVariants = buildResearchQueryVariants('一线城市年轻白领 精品咖啡 消费频次 客单价 预算 咖啡外卖 到店 行为数据 2024', { retry: true, maxVariants: 6 })
assert.ok(broadChineseVariants.some(query => /行业报告 数据|消费者调研/.test(query)))

const rfl = buildReflectionPrompt({
  question: '精品咖啡市场规模？',
  findings: [{ claim: '2025 年市场 1200 亿', source_url: 'https://a.com', confidence: 'high' }],
})
assert.match(rfl.system, /sufficient/)
assert.match(rfl.system, /next_queries/)
assert.match(rfl.system, /宁停勿过投|不要过度/)
assert.match(rfl.user, /精品咖啡市场规模/)
assert.match(rfl.user, /1200 亿/)

const rflStrong = buildReflectionPrompt({
  question: '精品咖啡市场规模？',
  findings: [],
  strongSourceHint: true,
})
assert.match(rflStrong.system, /咨询机构|行业协会|统计局|研究院|年报/)

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

const retryQueries = []
const zeroRetry = await researchQuestionWithReflection({
  question: 'zero result oversized essay question about creator workflow report evidence and market validation needs retry',
  maxRounds: 1,
  search: async query => {
    retryQueries.push(query)
    return retryQueries.length === 1
      ? { results: [] }
      : { results: [{ url: 'https://retry.example.com', title: 'Retry', snippet: 'retry result 42%' }] }
  },
  callModel: async () => JSON.stringify({
    findings: [{ claim: '重试查询找到 42% 证据', evidence: '42%', source_url: 'https://retry.example.com', confidence: 'med' }],
  }),
})
assert.equal(zeroRetry.findings.length, 1)
assert.ok(retryQueries.length > 1)
assert.equal(zeroRetry.search_calls_used, retryQueries.length)

const chineseRetryQueries = []
const chineseZeroRetry = await researchQuestionWithReflection({
  question: '一线城市年轻白领 咖啡消费频次 客单价 购买渠道 外带 自提 2024 调研数据',
  maxRounds: 1,
  search: async query => {
    chineseRetryQueries.push(query)
    return chineseRetryQueries.length === 1
      ? { results: [] }
      : { results: [{ url: 'https://report.iimedia.cn/repo199-0/46641.html', title: 'Retry', snippet: '咖啡消费 42%' }] }
  },
  callModel: async () => JSON.stringify({
    findings: [{ claim: '咖啡消费 42%', evidence: '42%', source_url: 'https://report.iimedia.cn/repo199-0/46641.html', confidence: 'med' }],
  }),
})
assert.equal(chineseZeroRetry.findings.length, 1)
assert.ok(chineseRetryQueries.length > 1)
assert.notEqual(chineseRetryQueries[1], chineseRetryQueries[0])

const deep = await gatherResearchDeep({
  questions: ['q1', 'q2'],
  maxRounds: 1,
  search: async () => ({ results: [{ url: 'https://www.gartner.com/r', title: 'G', snippet: 'AI budget +32%' }] }),
  callModel: async deepSystem => deepSystem.includes('研究质量评估员')
    ? '{"sufficient":true,"gaps":[],"next_queries":[]}'
    : JSON.stringify({ findings: [{ claim: 'AI 预算 +32%', evidence: '32%', source_url: 'https://www.gartner.com/r', confidence: 'high' }] }),
})
assert.ok(deep.findings.length >= 1)
assert.equal(deep.sources.length, 1)
assert.equal(deep.findings[0].source_id, 1)
assert.equal(deep.findings[0].source_tier, 'T2')
assert.ok(deep.search_calls_used >= 2)
assert.ok(Array.isArray(deep.per_question) && deep.per_question.length === 2)
assert.equal(deep.strong_source_followup, false)
assert.equal(deep.strong_source_sources, 1)
assert.equal(deep.strong_source_total_sources, 1)
assert.equal(deep.strong_source_ratio, 1)

const weakCalls = []
const weak = await gatherResearchDeep({
  questions: ['市场规模?'],
  maxRounds: 1,
  strongSourceMinRatio: 0.3,
  search: async query => {
    weakCalls.push(query)
    return { results: [{ url: 'https://www.sohu.com/a/1', snippet: '规模 100 亿' }] }
  },
  callModel: async weakSystem => weakSystem.includes('研究质量评估员')
    ? '{"sufficient":true,"gaps":[],"next_queries":[]}'
    : '{"findings":[{"claim":"规模 100 亿","evidence":"100 亿","source_url":"https://www.sohu.com/a/1","confidence":"med"}]}',
})
assert.ok(weakCalls.some(query => /报告|研究院|统计|白皮书/.test(query)), '弱来源时应追加定向强来源查询')
assert.equal(weak.strong_source_followup, true)
assert.equal(weak.strong_source_sources, 0)
assert.equal(weak.strong_source_total_sources, 1)
assert.equal(weak.strong_source_ratio, 0)

const followupErrors = []
const weakFollowupMiss = await gatherResearchDeep({
  questions: ['用户趋势?'],
  maxRounds: 1,
  strongSourceMinRatio: 0.3,
  search: async query => {
    if (/报告|研究院|统计|白皮书/.test(query)) return { results: [] }
    return { results: [{ url: 'https://www.sohu.com/a/2', snippet: '用户趋势 66%' }] }
  },
  callModel: async weakSystem => weakSystem.includes('研究质量评估员')
    ? '{"sufficient":true,"gaps":[],"next_queries":[]}'
    : '{"findings":[{"claim":"用户趋势 66%","evidence":"66%","source_url":"https://www.sohu.com/a/2","confidence":"med"}]}',
  onFollowupError: event => followupErrors.push(event),
})
assert.equal(weakFollowupMiss.findings.length, 1)
assert.equal(weakFollowupMiss.strong_source_followup, true)
assert.equal(weakFollowupMiss.per_question.some(item => item.followup_error), true)
assert.equal(followupErrors.length, 1)

const questionErrors = []
const partialDeep = await gatherResearchDeep({
  questions: ['可找到的问题', '不可抽取的问题'],
  maxRounds: 1,
  strongSourceMinRatio: 0,
  search: async query => ({ results: [{ url: `https://example.com/${encodeURIComponent(query)}`, snippet: `${query} 88%` }] }),
  callModel: async (_partialSystem, partialUser) => partialUser.includes('不可抽取的问题')
    ? '{"findings":[]}'
    : JSON.stringify({ findings: [{
      claim: '可找到的问题 88%',
      evidence: '88%',
      source_url: 'https://example.com/%E5%8F%AF%E6%89%BE%E5%88%B0%E7%9A%84%E9%97%AE%E9%A2%98',
      confidence: 'med',
    }] }),
  onQuestionError: event => questionErrors.push(event),
})
assert.equal(partialDeep.findings.length, 1)
assert.equal(partialDeep.per_question.some(item => item.question === '不可抽取的问题' && item.error), true)
assert.equal(questionErrors.length, 1)

console.log('✅ research-worker: derive + normalize + tag + parse + gather passed')
