import assert from 'node:assert/strict'
import { buildOutlinePrompt, parseOutline, validateOutline } from './outline-fullcase.mjs'

const brief = {
  formText: '{"name":"LUMA","industry":"精品咖啡"}',
  summary: '12 家店...',
  strategicQuestion: '# 根问题\n如何差异化定位？',
}
const requiredConclusions = [
  { id: 'root_answer', label: '根问题的明确回答' },
  { id: 'positioning_statement', label: '定位陈述' },
]
const { system, user } = buildOutlinePrompt(brief, {
  requiredConclusions,
  minPages: 20,
  maxPages: 30,
  methodology: { concepts: [{ slug: 'jtbd', name: 'JTBD', content: 'JTBD...' }] },
  researchBrief: {
    findings: [{ claim: '市场年增 12%', source_id: 1, source_url: 'https://x.com' }],
    sources: [{ id: 1, url: 'https://x.com' }],
  },
})
assert.match(system, /20-30 页/)
assert.match(system, /4-8 章/)
assert.match(system, /covers/)
assert.match(system, /每章第 1 页.*章首|章首页/)
assert.match(system, /只输出 JSON/)
assert.match(user, /精品咖啡/)
assert.match(user, /root_answer/)
assert.match(user, /市场年增 12%/)
assert.match(user, /JTBD/)

const withGuidance = buildOutlinePrompt(brief, {
  requiredConclusions,
  minPages: 20,
  maxPages: 30,
  skillGuidance: '## proposal-narrative 方法论指引\nSCQA 开场；坚持一页一观点。',
})
assert.match(withGuidance.system, /proposal-narrative 方法论指引/)
assert.match(withGuidance.system, /一页一观点/)
assert.ok(!buildOutlinePrompt(brief, { requiredConclusions, minPages: 20, maxPages: 30 }).system.includes('方法论指引'))

const good = {
  narrative: '从行业变局到定位结论再到落地',
  chapters: [
    { chapter_no: 1, title: '诊断', goal: 'g1', pages_budget: 6, key_questions: ['q'], covers: ['root_answer'] },
    { chapter_no: 2, title: '定位', goal: 'g2', pages_budget: 7, key_questions: ['q'], covers: ['positioning_statement'] },
    { chapter_no: 3, title: '配称', goal: 'g3', pages_budget: 6, key_questions: ['q'], covers: [] },
    { chapter_no: 4, title: '落地', goal: 'g4', pages_budget: 5, key_questions: ['q'], covers: [] },
  ],
}
const parsed = parseOutline(JSON.stringify(good))
assert.equal(parsed.chapters.length, 4)
assert.throws(() => parseOutline('{"narrative":"x"}'), /chapters/)

assert.deepEqual(validateOutline(parsed, { requiredConclusions, minPages: 20, maxPages: 30 }).violations, [])
const over = { ...good, chapters: good.chapters.map(ch => ({ ...ch, pages_budget: 10 })) }
assert.ok(validateOutline(parseOutline(JSON.stringify(over)), { requiredConclusions, minPages: 20, maxPages: 30 })
  .violations.some(v => v.includes('总页数')))
const uncovered = { ...good, chapters: good.chapters.map(ch => ({ ...ch, covers: [] })) }
assert.ok(validateOutline(parseOutline(JSON.stringify(uncovered)), { requiredConclusions, minPages: 20, maxPages: 30 })
  .violations.some(v => v.includes('root_answer')))
const few = { ...good, chapters: good.chapters.slice(0, 2) }
assert.ok(validateOutline(parseOutline(JSON.stringify(few)), { requiredConclusions, minPages: 10, maxPages: 30 })
  .violations.some(v => v.includes('章数')))
const unknown = { ...good, chapters: [{ ...good.chapters[0], covers: ['nope'] }, ...good.chapters.slice(1)] }
assert.ok(validateOutline(parseOutline(JSON.stringify(unknown)), { requiredConclusions, minPages: 20, maxPages: 30 })
  .violations.some(v => v.includes('未知结论 id')))

console.log('✅ outline-fullcase: prompt + parse + validate passed')
