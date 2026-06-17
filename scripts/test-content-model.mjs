import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  addModule,
  createBrandContent,
  externalModules,
  internalModules,
  lockSpine,
  readContent,
  validateBrandContent,
  writeContent,
} from '../core/content-model.mjs'

let content = createBrandContent({ brand_slug: 'demo', brand_type: 'new_consumer_full' })

assert.equal(content.meta.brand_slug, 'demo')
assert.equal(content.meta.brand_type, 'new_consumer_full')
assert.equal(content.meta.document_type, 'brand_manual')
assert.equal(content.strategic_spine.locked, false)
assert.deepEqual(content.meta.output_types_selected, [])
assert.equal(content.tonality.source, 'qa')
assert.deepEqual(content.modules, [])

content = addModule(content, {
  id: 'pos-1',
  kind: 'brand_definition',
  visibility: 'external',
  content: { positioning: 'x' },
  depth_level: 'L3',
})
content = addModule(content, {
  id: 'risk-1',
  kind: 'risk_check',
  visibility: 'internal',
  content: { risks: [] },
  depth_level: 'L3',
})

assert.equal(externalModules(content).length, 1)
assert.equal(internalModules(content).length, 1)
assert.equal(content.modules.length, 2)
assert.throws(() => addModule(content, {
  id: 'risk-1',
  kind: 'risk_check',
  visibility: 'internal',
  content: {},
}), /duplicate module id/i)
assert.throws(() => addModule(content, {
  id: 'bad',
  kind: 'unknown_kind',
  visibility: 'external',
  content: {},
}), /invalid module kind/i)
assert.throws(() => validateBrandContent({ meta: {} }), /required|invalid/i)

const locked = lockSpine(content, {
  chosen_direction_id: 'd1',
  positioning_statement: '品质便捷',
  mission: 'm',
  vision: 'v',
  proposition: 'p',
})
assert.equal(locked.strategic_spine.locked, true)
assert.equal(locked.strategic_spine.chosen_direction_id, 'd1')
assert.equal(content.strategic_spine.locked, false)

const validation = validateBrandContent(locked)
assert.equal(validation.valid, true, JSON.stringify(validation.errors))

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pptmaster-content-model-'))
try {
  const filePath = path.join(tmp, 'content.json')
  await writeContent(filePath, locked)
  const roundTripped = await readContent(filePath)
  assert.deepEqual(roundTripped, locked)
} finally {
  await fs.rm(tmp, { recursive: true, force: true })
}

console.log('✅ content-model tests passed')
