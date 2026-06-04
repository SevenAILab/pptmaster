import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  appendLLMAuditLog,
  appendWebSearchAuditLog,
  estimateCost,
  hasKnownPricing,
  readLLMAuditLog,
  readWebSearchAuditLog,
  summarizeLLMUsage,
} from './audit-log.mjs'

const slug = '_audit-test'

await fs.rm(`outputs/${slug}`, { recursive: true, force: true })

await appendLLMAuditLog(slug, {
  timestamp: '2026-05-28T00:00:00.000Z',
  provider: 'anthropic',
  model: 'claude-sonnet-4-5-20250929',
  input_tokens: 1000,
  output_tokens: 500,
  cache_read_tokens: 0,
  cache_creation_tokens: 0,
  latency_ms: 1200,
  estimated_cost_usd: estimateCost({ input_tokens: 1000, output_tokens: 500 }, 'claude-sonnet-4-5-20250929'),
  purpose: 'test.one',
})

await appendLLMAuditLog(slug, {
  timestamp: '2026-05-28T00:00:01.000Z',
  provider: 'anthropic',
  model: 'claude-sonnet-4-5-20250929',
  input_tokens: 2000,
  output_tokens: 250,
  cache_read_tokens: 25,
  cache_creation_tokens: 10,
  latency_ms: 1800,
  estimated_cost_usd: estimateCost({ input_tokens: 2000, output_tokens: 250 }, 'claude-sonnet-4-5-20250929'),
  purpose: 'test.two',
})

const entries = await readLLMAuditLog(slug)
assert.equal(entries.length, 2)
assert.equal(entries[0].model, 'claude-sonnet-4-5-20250929')
assert.equal(entries[1].cache_read_tokens, 25)

const sonnetCost = estimateCost({ input_tokens: 1000, output_tokens: 500 }, 'claude-sonnet-4-5-20250929')
assert.equal(sonnetCost, 0.0105)
assert.equal(hasKnownPricing('claude-sonnet-4-5-20250929'), true)
assert.equal(hasKnownPricing('unknown-model'), false)
assert.equal(estimateCost({ input_tokens: 1000, output_tokens: 500 }, 'unknown-model'), 0.00525)

const originalInputPrice = process.env.ANTHROPIC_MODEL_PRICING_INPUT
const originalOutputPrice = process.env.ANTHROPIC_MODEL_PRICING_OUTPUT
process.env.ANTHROPIC_MODEL_PRICING_INPUT = '1'
process.env.ANTHROPIC_MODEL_PRICING_OUTPUT = '2'
assert.equal(estimateCost({ input_tokens: 1000, output_tokens: 500 }, 'env-priced-model'), 0.002)
if (originalInputPrice === undefined) delete process.env.ANTHROPIC_MODEL_PRICING_INPUT
else process.env.ANTHROPIC_MODEL_PRICING_INPUT = originalInputPrice
if (originalOutputPrice === undefined) delete process.env.ANTHROPIC_MODEL_PRICING_OUTPUT
else process.env.ANTHROPIC_MODEL_PRICING_OUTPUT = originalOutputPrice

const summary = summarizeLLMUsage(entries)
assert.deepEqual(summary, {
  total_calls: 2,
  total_input_tokens: 3000,
  total_output_tokens: 750,
  total_cost_usd: 0.02025,
  by_purpose: {
    'test.one': 1,
    'test.two': 1,
  },
  avg_latency_ms: 1500,
})

await appendWebSearchAuditLog(slug, {
  timestamp: '2026-05-28T00:00:02.000Z',
  provider: 'tavily',
  query: 'smallrig camera accessories market 2025',
  result_count: 1,
  results: [{ url: 'https://example.org/report', title: 'Report', snippet: 'Snippet' }],
  latency_ms: 300,
})

const searches = await readWebSearchAuditLog(slug)
assert.equal(searches.length, 1)
assert.equal(searches[0].results[0].url, 'https://example.org/report')

await fs.rm(`outputs/${slug}`, { recursive: true, force: true })
console.log('✅ audit-log test passed')
