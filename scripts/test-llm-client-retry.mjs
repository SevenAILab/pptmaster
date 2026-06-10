import assert from 'node:assert/strict'
import { isTransientLLMError, withTransientLLMRetry } from './llm-clients/claude-client.mjs'

assert.equal(isTransientLLMError(new Error('OpenAI-compatible chat completion failed: 524 <!DOCTYPE html>')), true)
assert.equal(isTransientLLMError(new TypeError('fetch failed', { cause: { code: 'UND_ERR_SOCKET' } })), true)
assert.equal(isTransientLLMError(new Error('Research response JSON must contain findings[]')), false)

let attempts = 0
const value = await withTransientLLMRetry(async () => {
  attempts += 1
  if (attempts < 3) throw new Error('OpenAI-compatible chat completion failed: 524 timeout')
  return 'ok'
}, { maxAttempts: 3, baseDelayMs: 0 })

assert.equal(value, 'ok')
assert.equal(attempts, 3)

let nonTransientAttempts = 0
await assert.rejects(withTransientLLMRetry(async () => {
  nonTransientAttempts += 1
  throw new Error('No JSON object in response')
}, { maxAttempts: 3, baseDelayMs: 0 }), /No JSON/)
assert.equal(nonTransientAttempts, 1)

console.log('✅ llm-client retry: transient retry + non-transient fail-fast passed')
