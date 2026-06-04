import assert from 'node:assert/strict'
import { scanContent, summarizeFindings } from './audit-claude-specific.mjs'

const clean = scanContent('只输出严格 JSON,不要输出 Markdown 解释。')
assert.equal(clean.length, 0)

const dirty = scanContent('不要使用 <thinking> 或 Claude Code artifacts。')
assert.equal(dirty.length, 3)
assert.deepEqual(dirty.map(item => item.pattern), ['thinking 标签', 'artifacts 概念', 'Claude Code 特定引用'])

const summary = summarizeFindings([
  { file: 'prompts/a/system.md', findings: dirty },
])
assert.equal(summary.totalFilesWithFindings, 1)
assert.equal(summary.totalFindingKinds, 3)
assert.equal(summary.totalMatches, 3)

console.log('✅ audit-claude-specific test passed')
