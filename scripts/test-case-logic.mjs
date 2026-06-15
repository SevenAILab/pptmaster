import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCaseLogic } from './case-logic.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const positioning = loadCaseLogic({ root: REPO_ROOT, proposalType: 'positioning' })
assert.equal(positioning.proposalType, 'positioning')
assert.match(positioning.text, /推导链/)
assert.match(positioning.text, /只学.*推导|禁止套用/)
assert.ok(positioning.text.length > 800)
assert.match(loadCaseLogic({ root: REPO_ROOT, proposalType: 'upgrade' }).text, /SmallRig|升级/)
assert.throws(() => loadCaseLogic({ root: REPO_ROOT, proposalType: 'nope' }), /Unknown proposal type|map/)

console.log('✅ case-logic passed')
