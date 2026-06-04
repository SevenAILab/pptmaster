#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  buildConsultingReviewPrompt,
  normalizeConsultingReviewResponse,
  runConsultingReview,
  summarizeSuiteReview,
} from './consulting-review.mjs'

const blueprintChunk = {
  chunk_id: 'p3-c1-positioning-statement',
  chunk_title: '定位语句',
  expected_insights_count: 2,
  page_count_min: 2,
  page_count_max: 6,
  pages: [
    { page_no: 40, page_subtitle: 'PART 3', page_intent: '章节转场', recommended_layout: 'S12' },
    { page_no: 41, page_subtitle: '定位语句', page_intent: '定位主张', recommended_layout: 'S22' },
  ],
}

const chunkOutput = {
  agent_id: 'brand_positioning',
  blueprint_chunk_id: 'p3-c1-positioning-statement',
  chunk_takeaway: 'PPTAgent 应被定义为品牌策划方案 Agent,而不是通用 AI PPT 工具',
  chunk_insights: [
    { insight: '竞品解决演示生成效率,但没有回答品牌定位判断', source_url: 'https://example.com/competitor' },
    { insight: 'Seven 方法论资产让产品有专业可信来源', source_url: 'https://example.com/methodology' },
  ],
  thinking_log: [
    { step: 'plan', content: '规划定位问题。' },
    { step: 'synthesize', content: '综合上游证据。' },
    { step: 'write', content: '写出页面。' },
  ],
  slides: [
    {
      page_no: 40,
      layout: 'hero-statement',
      action_title: '分析已经指向一个更窄但更强的新品类',
      core_points: ['承接: 从红海工具回到品牌策划任务', '结论: 定位必须让专业判断前置'],
      data_refs: [{ value: '竞品信号', source: 'https://example.com/competitor', type: 'quote' }],
    },
    {
      page_no: 41,
      layout: 'split-statement',
      action_title: 'PPTAgent 是面向品牌策划场景的咨询级方案 Agent',
      core_points: ['目标用户: 甲方品牌方 / 市场部人员', '可信证据: Seven 私有方法论资产'],
      data_refs: [{
        value: '方法论信号',
        source: 'https://example.com/methodology',
        source_tier: 'T3',
        source_label: '公开方法论来源',
        type: 'methodology_signal',
      }],
    },
  ],
}

const prompt = buildConsultingReviewPrompt(chunkOutput, blueprintChunk)
assert.ok(prompt.includes('5 年甲方品牌总监'))
assert.ok(prompt.includes('insight_depth_score'))
assert.ok(prompt.includes('https://example.com/competitor'))
assert.ok(prompt.includes('source_tier'))
assert.ok(prompt.includes('assets/_raw/cases/** 只能作方法论范例'))

const normalized = normalizeConsultingReviewResponse({
  insight_depth_score: 8,
  consulting_tone_score: 7,
  page_efficiency_score: 6,
  data_credibility_score: 8,
  key_weakness: '第 40 页可以更快进入定位判断。',
  must_fix_pages: [40, 999],
  deletable_pages: [],
  verdict: 'retry',
}, chunkOutput)
assert.equal(normalized.verdict, 'PASS')
assert.equal(normalized.llm_verdict, 'RETRY')
assert.equal(normalized.verdict_consistency_note, 'LLM verdict RETRY adjusted to rubric verdict PASS')
assert.deepEqual(normalized.must_fix_pages, [40])

assert.throws(
  () => normalizeConsultingReviewResponse({
    insight_depth_score: 11,
    consulting_tone_score: 7,
    page_efficiency_score: 6,
    data_credibility_score: 8,
    key_weakness: 'bad score',
    must_fix_pages: [],
    deletable_pages: [],
    verdict: 'PASS',
  }, chunkOutput),
  /insight_depth_score/,
)

const llmAuditEntries = []
const reviewAuditEntries = []
const review = await runConsultingReview(chunkOutput, 'consulting-review-test', {
  blueprintChunk,
  model: 'fake-review-model',
  callStep: async (system, user, opts) => {
    assert.ok(system.includes('brand director'))
    assert.ok(user.includes('data_credibility_score'))
    assert.equal(opts.model, 'fake-review-model')
    return {
      text: JSON.stringify({
        insight_depth_score: 8,
        consulting_tone_score: 8,
        page_efficiency_score: 7,
        data_credibility_score: 9,
        key_weakness: '第 40 页需要更明确转场角色。',
        must_fix_pages: [40],
        deletable_pages: [],
        verdict: 'RETRY',
      }),
      usage: { input_tokens: 100, output_tokens: 80 },
      model: 'fake-review-model',
      provider: 'fake',
    }
  },
  appendLLMAuditLog: async (slug, entry) => {
    llmAuditEntries.push({ slug, entry })
  },
  appendReviewAuditLog: async (slug, entry) => {
    reviewAuditEntries.push({ slug, entry })
  },
})

assert.equal(review.verdict, 'PASS')
assert.equal(review.llm_verdict, 'RETRY')
assert.equal(llmAuditEntries.length, 1)
assert.equal(llmAuditEntries[0].entry.purpose, 'consulting-review.p3-c1-positioning-statement')
assert.equal(reviewAuditEntries.length, 1)
assert.equal(reviewAuditEntries[0].entry.chunk_id, 'p3-c1-positioning-statement')

await assert.rejects(
  () => runConsultingReview({
    blueprint_chunk_id: 'c1',
    slides: [{ page_no: 1, action_title: '应抢占企业市场', core_points: [], data_refs: [] }],
    metadata: { total_searches: 9, web_search_used: true },
  }, 'consulting-review-test', {
    callStep: async () => ({
      text: JSON.stringify({
        insight_depth_score: 9,
        consulting_tone_score: 9,
        page_efficiency_score: 9,
        data_credibility_score: 9,
        key_weakness: 'x',
        verdict: 'PASS',
      }),
      usage: {},
      provider: 'test',
      model: 'test',
    }),
    appendLLMAuditLog: async () => {},
    appendReviewAuditLog: async () => {},
  }),
  /红线|unsupported|当事实/i,
)

const assumptionReviewEntries = []
const assumptionReview = await runConsultingReview({
  blueprint_chunk_id: 'c2',
  slides: [
    { page_no: 1, action_title: '应以开发者体验切入', data_refs: [{ source_tier: 'T2', source: 'https://a.com' }] },
    {
      page_no: 2,
      action_title: '建议定位为开发者优先（待验证）',
      data_refs: [],
      evidence_status: 'hypothesis',
      hypothesis_basis: '类比',
      validation_method: '索取数据',
    },
  ],
  metadata: { total_searches: 6, web_search_used: true },
}, 'consulting-review-test', {
  callStep: async () => ({
    text: JSON.stringify({
      insight_depth_score: 8,
      consulting_tone_score: 8,
      page_efficiency_score: 7,
      data_credibility_score: 7,
      key_weakness: 'x',
      verdict: 'PASS',
    }),
    usage: {},
    provider: 'test',
    model: 'test',
  }),
  appendLLMAuditLog: async () => {},
  appendReviewAuditLog: async (slug, entry) => {
    assumptionReviewEntries.push({ slug, entry })
  },
})
assert.equal(assumptionReview.verdict, 'PASS')
assert.equal(assumptionReview.assumption_ratio, 0.5)
assert.equal(assumptionReview.assumption_overflow, true)
assert.equal(assumptionReview.hypothesis_heavy, true)
assert.equal(assumptionReview.key_judgment_count, 2)
assert.equal(assumptionReview.hypothesis_count, 1)
assert.equal(assumptionReviewEntries[0].entry.assumption_ratio, 0.5)

const downgradedBlockReviewEntries = []
const downgradedBlock = await runConsultingReview(chunkOutput, 'consulting-review-test', {
    callStep: async () => ({
      text: JSON.stringify({
        insight_depth_score: 2,
        consulting_tone_score: 2,
        page_efficiency_score: 2,
        data_credibility_score: 1,
        key_weakness: '来源像本地假来源。',
        must_fix_pages: [40, 41],
        deletable_pages: [40],
        verdict: 'BLOCK',
      }),
      usage: { input_tokens: 10, output_tokens: 10 },
      model: 'fake-review-model',
      provider: 'fake',
    }),
    appendLLMAuditLog: async () => {},
    appendReviewAuditLog: async (slug, entry) => {
      downgradedBlockReviewEntries.push({ slug, entry })
    },
  })
assert.equal(downgradedBlock.llm_verdict, 'BLOCK')
assert.equal(downgradedBlock.verdict, 'RETRY')
assert.match(downgradedBlock.verdict_consistency_note, /downgraded to RETRY/i)
assert.equal(downgradedBlockReviewEntries[0].entry.verdict, 'RETRY')

const summary = summarizeSuiteReview([
  { chunk_id: 'a', verdict: 'PASS', insight_depth_score: 8, consulting_tone_score: 8, page_efficiency_score: 7, data_credibility_score: 9 },
  { chunk_id: 'b', verdict: 'RETRY', insight_depth_score: 6, consulting_tone_score: 6, page_efficiency_score: 6, data_credibility_score: 7 },
])
assert.equal(summary.passed, false)
assert.deepEqual(summary.retry_chunks, ['b'])
assert.equal(summary.avg_data_credibility_score, 8)

console.log('✅ consulting-review test passed')
