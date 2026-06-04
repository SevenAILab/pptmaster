import assert from 'node:assert/strict'
import { enforceIncrementalCostGuard, extractJsonOrThrow, noFallbackSelfCheck } from './sub-agents/industry-analysis-deepresearch.mjs'

const parsed = extractJsonOrThrow({
  text: '```json\n{"sub_questions":["q1","q2","q3","q4","q5"]}\n```',
}, ['sub_questions'])
assert.equal(parsed.sub_questions.length, 5)

assert.throws(
  () => extractJsonOrThrow({ text: 'no json here' }, ['sub_questions']),
  /No JSON object found/,
)

const chunk = {
  chunk_id: 'p2-c1-market-scan',
  pages: [
    { page_no: 14 },
    { page_no: 15 },
  ],
}

const good = {
  chunk_takeaway: '影像配件行业的机会不是继续做 SKU 扩张，而是围绕创作者场景形成专业化工具生态入口。',
  chunk_insights: [
    { insight: 'i1', source_url: 'https://example.org/a' },
    { insight: 'i2', source_url: 'https://example.org/b' },
    { insight: 'i3', source_url: 'https://example.org/c' },
  ],
  thinking_log: [
    { step: 'plan', content: 'x'.repeat(101) },
    { step: 'search', content: 'x'.repeat(101) },
    { step: 'read', content: 'x'.repeat(101) },
    { step: 'synthesize', content: 'x'.repeat(101) },
    { step: 'write', content: 'x'.repeat(101) },
  ],
  slides: [
    {
      data_refs: [{ source: 'https://example.org/a' }],
    },
    {
      data_refs: [{ source: 'https://example.org/b' }],
    },
  ],
}

assert.doesNotThrow(() => noFallbackSelfCheck(good, chunk))

assert.throws(
  () => noFallbackSelfCheck({ ...good, chunk_takeaway: '本部分分析了行业趋势，并通过赋能与闭环打造行业增长新机会' }, chunk),
  /generic pattern/,
)

assert.throws(
  () => noFallbackSelfCheck({ ...good, thinking_log: good.thinking_log.slice(0, 4) }, chunk),
  /thinking_log/,
)

assert.throws(
  () => noFallbackSelfCheck({
    ...good,
    slides: good.slides.map(slide => ({ ...slide, data_refs: [{ source: 'inputs/smallrig/summary.md' }] })),
  }, chunk),
  /0 verifiable data_refs/,
)

assert.throws(
  () => noFallbackSelfCheck({
    ...good,
    slides: good.slides.map(slide => ({
      ...slide,
      data_refs: [{
        value: '90天内各平台用户复购率平均超过 30%',
        source: 'assets/_raw/cases/标杆案例/smallrig/page-037.md',
        source_tier: 'T1',
        type: 'first_party',
      }],
    })),
  }, chunk),
  /0 verifiable data_refs/,
)

assert.throws(
  () => noFallbackSelfCheck({
    ...good,
    slides: [
      {
        data_refs: [{
          value: '品牌营销咨询细分电商市场2019-2023年规模由25.12亿元增长至205.56亿元，CAGR为13.2%；预计2024-2028年由229.24亿元增长至351.05亿元，CAGR为11.2%。',
          source: 'https://example.org/a',
          type: 'industry_report',
        }],
      },
      {
        data_refs: [{ source: 'https://example.org/b' }],
      },
    ],
  }, chunk),
  /growth math/i,
)

await assert.doesNotReject(() => enforceIncrementalCostGuard('test-incremental-cost', [
  { estimated_cost_usd: 1.9 },
  { estimated_cost_usd: 0.19 },
], 1))

await assert.rejects(
  () => enforceIncrementalCostGuard('test-incremental-cost', [
    { estimated_cost_usd: 1.9 },
    { estimated_cost_usd: 0.19 },
  ], 0),
  /Cost guard violated: 2.09 > 2/,
)

console.log('✅ deepresearch retry/no-fallback test passed')
