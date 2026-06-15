import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { STAGE_SKILLS, loadSkillGuidance } from './skill-injector.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

assert.deepEqual(STAGE_SKILLS.outline, {
  skill: 'proposal-narrative',
  refs: ['scqa-pyramid', 'deck-structure', 'writing-discipline'],
})
assert.deepEqual(STAGE_SKILLS.draft, {
  skill: 'proposal-narrative',
  refs: ['dual-axis', 'page-craft', 'writing-discipline'],
})
assert.deepEqual(STAGE_SKILLS.design, {
  skill: 'deck-design-system',
  refs: ['design-tokens-and-themes', 'layout-system', 'anti-ai-slop', 'visual-qa'],
})

const guidance = loadSkillGuidance({ root: REPO_ROOT, stage: 'outline' })
assert.equal(guidance.skill, 'proposal-narrative')
assert.deepEqual(guidance.refs, STAGE_SKILLS.outline.refs)
assert.match(guidance.text, /proposal-narrative 方法论指引/)
assert.match(guidance.text, /SCQA/i)
assert.match(guidance.text, /一页一观点|结构件/)
assert.equal(guidance.loaded.length, 3)
assert.ok(guidance.loaded.every(item => item.ref && item.chars > 0))

const limited = loadSkillGuidance({
  root: REPO_ROOT,
  stage: 'outline',
  refsOverride: ['scqa-pyramid'],
  maxCharsPerRef: 80,
})
assert.equal(limited.loaded.length, 1)
assert.ok(limited.loaded[0].chars <= 80)

assert.throws(() => loadSkillGuidance({ root: REPO_ROOT, stage: 'nope' }), /Unknown stage/)
assert.throws(() => loadSkillGuidance({ root: REPO_ROOT, stage: 'outline', refsOverride: ['nonexistent'] }), /missing/i)
assert.throws(() => loadSkillGuidance({ stage: 'outline' }), /requires root/)

console.log('✅ skill-injector: stage map + load guidance passed')
