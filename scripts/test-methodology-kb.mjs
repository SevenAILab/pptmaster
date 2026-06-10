import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildConceptSelectionPrompt,
  buildQuerySelectionPrompt,
  loadConceptBodies,
  loadConceptIndex,
  parseConceptDoc,
  parseConceptSelection,
  selectConcepts,
  selectConceptsForQuery,
} from './methodology-kb.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const doc = [
  '---',
  'name: 4A-Funnel',
  'category: methodology',
  '---',
  '',
  '# 4A Funnel · 4A 行为漏斗',
  '',
  '## 定义',
  '',
  '4A-Funnel 是行为漏斗。',
  '',
].join('\n')
const parsedDoc = parseConceptDoc(doc)
assert.equal(parsedDoc.name, '4A-Funnel')
assert.match(parsedDoc.definition, /行为漏斗/)
assert.throws(() => parseConceptDoc('既无 name 也无标题'), /missing name/i)

const index = loadConceptIndex({ root: REPO_ROOT })
assert.ok(index.length >= 50, `golden 概念应 >= 50，实际 ${index.length}`)
assert.ok(index.every(item => item.slug && item.name && item.file))
assert.ok(!index.some(item => item.slug === 'INDEX'))
assert.ok(index.some(item => item.slug === 'jtbd'))

const brief = {
  formText: '{"industry":"精品咖啡"}',
  strategicQuestion: '如何在低价连锁与独立店之间定位？',
}
const { system, user } = buildConceptSelectionPrompt({ brief, index, max: 4 })
assert.match(system, /最多选 4/)
assert.match(system, /只输出 JSON/)
assert.match(user, /精品咖啡/)
assert.ok(user.includes(index[0].slug))

assert.deepEqual(
  parseConceptSelection('{"selected":[{"slug":"jtbd","why":"x"},{"slug":"jtbd","why":"dup"}]}', index, { max: 4 }),
  ['jtbd'],
)
assert.throws(() => parseConceptSelection('{"selected":[{"slug":"not-a-real-slug"}]}', index), /Unknown concept slugs/)
assert.throws(() => parseConceptSelection('{"selected":[]}', index), /no valid slugs/i)
assert.throws(() => parseConceptSelection('没有 JSON', index), /No JSON/)

const slugs = await selectConcepts({
  brief,
  index,
  max: 4,
  callModel: async () => '```json\n{"selected":[{"slug":"jtbd","why":"主框架"}]}\n```',
})
assert.deepEqual(slugs, ['jtbd'])
const bodies = loadConceptBodies({ slugs: ['jtbd'], root: REPO_ROOT, maxCharsPerConcept: 500 })
assert.equal(bodies[0].slug, 'jtbd')
assert.ok(bodies[0].name.length > 0)
assert.ok(bodies[0].content.length <= 500)
assert.ok(!bodies[0].content.startsWith('---'))
assert.throws(() => loadConceptBodies({ slugs: ['nope-xyz'], root: REPO_ROOT }), /missing/i)

const qsp = buildQuerySelectionPrompt({ query: '这页缺少人群任务视角的论证', index, max: 2 })
assert.match(qsp.system, /最多选 2/)
assert.match(qsp.user, /人群任务视角/)
assert.ok(qsp.user.includes(index[0].slug))
const pulled = await selectConceptsForQuery({
  query: '缺少人群任务视角',
  index,
  max: 2,
  callModel: async () => '{"selected":[{"slug":"jtbd","why":"补任务视角"}]}',
})
assert.deepEqual(pulled, ['jtbd'])

console.log('✅ methodology-kb: parse + index + select + bodies passed')
