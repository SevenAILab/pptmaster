import assert from 'node:assert/strict'
import { flattenSkeleton } from './deck-skeleton.mjs'
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
  minPages: 8,
  maxPages: 12,
  methodology: { concepts: [{ slug: 'jtbd', name: 'JTBD', content: 'JTBD...' }] },
  researchBrief: {
    findings: [{ claim: '市场年增 12%', source_id: 1, source_url: 'https://x.com' }],
    sources: [{ id: 1, url: 'https://x.com' }],
  },
  caseLogic: '## 案例推导逻辑参考\n只学推导链，不抄模板。',
})
assert.match(system, /8-12 页/)
assert.match(system, /封面/)
assert.match(system, /目录/)
assert.match(system, /brief_opening/)
assert.match(system, /过渡/)
assert.match(system, /一页一观点/)
assert.match(system, /conclusion/)
assert.match(system, /cover.*toc.*brief_opening.*sections.*conclusion/s)
assert.match(system, /只输出契约 B JSON/)
assert.match(system, /案例推导逻辑/)
assert.match(user, /精品咖啡/)
assert.match(user, /root_answer/)
assert.match(user, /市场年增 12%/)
assert.match(user, /JTBD/)

const withGuidance = buildOutlinePrompt(brief, {
  requiredConclusions,
  minPages: 8,
  maxPages: 12,
  skillGuidance: '## proposal-narrative 方法论指引\nSCQA 开场；坚持一页一观点。',
})
assert.match(withGuidance.system, /proposal-narrative 方法论指引/)
assert.match(withGuidance.system, /一页一观点/)
assert.ok(!buildOutlinePrompt(brief, { requiredConclusions, minPages: 8, maxPages: 12 }).system.includes('方法论指引'))

const good = {
  cover: { title: 'LUMA 品牌定位方案', subtitle: '2026' },
  toc: ['第1章 诊断', '第2章 定位'],
  brief_opening: {
    situation: 'LUMA 已有 12 家店',
    complication: '增长放缓且认知模糊',
    question: 'LUMA 应如何差异化定位',
  },
  sections: [
    {
      section_no: 1,
      title: '诊断',
      transition_question: '增长真问题在哪？',
      covers: ['root_answer'],
      pages: [{
        governing_thought: '增长正从开店红利切到复购红利',
        points: ['门店增速放缓'],
        evidence_refs: ['ind-01'],
        layout_hint: 'metric',
      }],
      closing_judgment: '必须重新定位撬动复购',
    },
    {
      section_no: 2,
      title: '定位',
      transition_question: 'LUMA 应占据哪个空位？',
      covers: ['positioning_statement'],
      pages: [{
        governing_thought: 'LUMA 应占据日常可及的专业精品',
        points: ['竞品两端留下中间带'],
        evidence_refs: ['comp-01'],
        layout_hint: 'comparison',
      }],
      closing_judgment: '定位锚点已立',
    },
  ],
  conclusion: {
    governing_thought: '日常可及的专业精品是 LUMA 最可执行的定位',
    action_items: ['统一门店表达', '重构会员复购机制'],
  },
}
const parsed = parseOutline(JSON.stringify(good))
assert.equal(parsed.sections.length, 2)
assert.throws(() => parseOutline('{"narrative":"x"}'), /sections|缺/)

assert.deepEqual(validateOutline(parsed, { requiredConclusions, minPages: 2, maxPages: 8 }).violations, [])
assert.ok(flattenSkeleton(parsed).some(slide => slide.page_kind === 'section_intro'))

const over = JSON.parse(JSON.stringify(good))
over.sections[0].pages.push(
  { governing_thought: '第一条新增判断必须单独成页', points: ['x'], evidence_refs: ['a'] },
  { governing_thought: '第二条新增判断必须单独成页', points: ['x'], evidence_refs: ['b'] },
  { governing_thought: '第三条新增判断必须单独成页', points: ['x'], evidence_refs: ['c'] },
  { governing_thought: '第四条新增判断必须单独成页', points: ['x'], evidence_refs: ['d'] },
)
assert.ok(validateOutline(parseOutline(JSON.stringify(over)), { requiredConclusions, minPages: 1, maxPages: 3 })
  .violations.some(v => v.includes('内容页数')))

const uncovered = JSON.parse(JSON.stringify(good))
uncovered.sections[0].covers = []
assert.ok(validateOutline(parseOutline(JSON.stringify(uncovered)), { requiredConclusions, minPages: 1, maxPages: 12 })
  .violations.some(v => v.includes('root_answer')))

console.log('✅ outline-fullcase: prompt + parse + validate passed')
