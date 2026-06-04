import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}

for (const rel of [
  'adapters/cursor/README.md',
  'adapters/cursor/.cursorrules',
  'adapters/cursor/example-brand-positioning.py',
  'adapters/cline/README.md',
  'adapters/cline/.clinerules',
  'adapters/cline/example-brand-positioning.md',
  'adapters/openai-api/README.md',
  'adapters/openai-api/example.py',
  'adapters/openai-api/requirements.txt',
  'adapters/anthropic-api/README.md',
  'adapters/anthropic-api/example.py',
  'adapters/anthropic-api/requirements.txt',
  'adapters/qwen-api/README.md',
  'adapters/qwen-api/example.py',
  'adapters/qwen-api/requirements.txt',
]) {
  assert.ok(fs.existsSync(path.join(root, rel)), `${rel} should exist`)
}

const cursorRules = read('adapters/cursor/.cursorrules')
assert.ok(cursorRules.includes('prompts/brand_positioning/system.md'))
assert.ok(cursorRules.includes('validators/brand_positioning/content-check.mjs'))
assert.ok(cursorRules.includes('P0-2'))

const clineRules = read('adapters/cline/.clinerules')
assert.ok(clineRules.includes('Sub-Agent ④'))
assert.ok(clineRules.includes('outputs/{client_slug}-positioning/raw-output.json'))

for (const rel of [
  'adapters/openai-api/example.py',
  'adapters/anthropic-api/example.py',
  'adapters/qwen-api/example.py',
]) {
  const example = read(rel)
  assert.ok(example.includes('prompts/brand_positioning/system.md'), `${rel} should read Sub-Agent ④ system prompt`)
  assert.ok(example.includes('concept-application-matrix.json'), `${rel} should load matrix`)
  assert.ok(example.includes('raw-output.json'), `${rel} should save raw output`)
}

console.log('✅ adapters test passed')
