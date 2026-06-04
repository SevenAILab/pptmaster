import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  appendLLMAuditLog,
  estimateCost,
  hasKnownPricing,
  readLLMAuditLog,
} from './audit-log.mjs'
import { callClaude, DEFAULT_CLAUDE_MODEL } from './llm-clients/claude-client.mjs'

const slug = '_smoke'
const model = DEFAULT_CLAUDE_MODEL

await fs.rm(`outputs/${slug}`, { recursive: true, force: true })

const systemPrompt = 'You are a smoke-test endpoint. Return only strict JSON.'
const userPrompt = 'Return exactly one JSON object with keys ok=true and message="hello". No markdown.'
const start = Date.now()
const response = await callClaude(systemPrompt, userPrompt, {
  model,
  maxTokens: 128,
  temperature: 0,
})
const latencyMs = Date.now() - start
const usage = {
  input_tokens: Number(response.usage?.input_tokens || 0),
  output_tokens: Number(response.usage?.output_tokens || 0),
  cache_read_tokens: Number(response.usage?.cache_read_input_tokens || 0),
  cache_creation_tokens: Number(response.usage?.cache_creation_input_tokens || 0),
}

assert.ok(response.text.includes('hello'))
assert.ok(usage.input_tokens > 10)
assert.ok(usage.output_tokens > 0)

const estimatedCost = estimateCost(usage, response.model || model)
if (!hasKnownPricing(response.model || model) && !process.env.ANTHROPIC_MODEL_PRICING_INPUT) {
  console.warn(`Smoke test model ${response.model || model} uses fallback pricing; set ANTHROPIC_MODEL_PRICING_INPUT/OUTPUT for exact cost.`)
}
assert.ok(estimatedCost > 0)

await appendLLMAuditLog(slug, {
  timestamp: new Date().toISOString(),
  provider: response.provider || 'anthropic',
  model: response.model || model,
  input_tokens: usage.input_tokens,
  output_tokens: usage.output_tokens,
  cache_read_tokens: usage.cache_read_tokens,
  cache_creation_tokens: usage.cache_creation_tokens,
  latency_ms: latencyMs,
  estimated_cost_usd: estimatedCost,
  purpose: 'smoke-test',
})

const entries = await readLLMAuditLog(slug)
assert.equal(entries.length, 1)
assert.ok(['anthropic', 'openai-compatible'].includes(entries[0].provider))
assert.equal(entries[0].model, model)
assert.ok(entries[0].input_tokens > 10)
assert.ok(entries[0].output_tokens > 0)

console.log('✅ real LLM smoke test passed')
console.log(JSON.stringify(entries[0]))
