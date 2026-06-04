import assert from 'node:assert/strict'
import { callClaude } from './claude-client.mjs'
import { callOpenAI, callDeepSeek } from './openai-client.mjs'
import { callQwen } from './qwen-client.mjs'

async function assertMissingKey(fn, envKey) {
  const original = process.env[envKey]
  delete process.env[envKey]
  await assert.rejects(
    () => fn('system', 'user', { dryRun: false }),
    error => error.message.includes(envKey) && !error.message.includes('sk-'),
  )
  if (original !== undefined) process.env[envKey] = original
}

await assertMissingKey(callClaude, 'ANTHROPIC_API_KEY')
await assertMissingKey(callOpenAI, 'OPENAI_API_KEY')
await assertMissingKey(callQwen, 'DASHSCOPE_API_KEY')
await assertMissingKey(callDeepSeek, 'DEEPSEEK_API_KEY')

const dryRun = await callOpenAI('system prompt', 'user prompt', { dryRun: true, model: 'gpt-4o' })
assert.equal(dryRun.model, 'gpt-4o')
assert.equal(dryRun.text.includes('system prompt'), true)
assert.deepEqual(dryRun.usage, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 })

console.log('✅ llm-clients test passed')
