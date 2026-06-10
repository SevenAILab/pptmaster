import assert from 'node:assert/strict'
import {
  buildCriticPrompt,
  buildRevisionPrompt,
  mergeRevisedSlides,
  parseCriticResponse,
  runCriticLoop,
} from './critic-deck.mjs'

const deck = {
  slides: [
    {
      page_no: 1,
      intent: 'i1',
      action_title: 'A1',
      core_points: ['p1'],
      evidence_kind: 'empirical',
      data_refs: [{ source: 'https://x.com' }],
    },
    {
      page_no: 2,
      intent: 'i2',
      action_title: 'A2',
      core_points: ['p2'],
      evidence_kind: 'hypothesis',
      validation_method: 'v',
    },
  ],
}
const brief = { strategicQuestion: '# 根问题\n如何定位？', formText: '{"name":"LUMA"}' }
const locksSummary = { slideCount: 2, duplicatePairs: [] }

const { system, user } = buildCriticPrompt({ deck, brief, locksSummary })
assert.match(system, /评审/)
assert.match(system, /论点|逻辑链/)
assert.match(system, /复述方法论|方法论复述/)
assert.match(system, /死板|套用/)
assert.match(system, /needs_framework/)
assert.match(system, /blocking/)
assert.match(system, /advisory/)
assert.match(system, /只输出 JSON/)
assert.match(user, /如何定位/)
assert.match(user, /A1/)

const parsed = parseCriticResponse(JSON.stringify({
  verdict: 'revise',
  pages: [
    { page_no: 1, verdict: 'pass', issues: [] },
    { page_no: 2, verdict: 'revise', issues: ['论证薄弱'], needs_framework: '需要人群任务视角框架' },
  ],
  overall_issues: ['章节间递进不足'],
}))
assert.equal(parsed.verdict, 'revise')
assert.equal(parsed.effectiveVerdict, 'revise')
assert.equal(parsed.pages.length, 2)
assert.equal(parsed.pages[1].needs_framework, '需要人群任务视角框架')
assert.equal(parsed.pages[1].issues[0].severity, 'blocking')
assert.throws(() => parseCriticResponse('不是 JSON'), /No JSON/)
assert.throws(() => parseCriticResponse('{"verdict":"maybe","pages":[]}'), /verdict/)
assert.throws(() => parseCriticResponse('{"verdict":"revise","pages":[{"page_no":99,"verdict":"revise"}]}', deck), /unknown page/)
assert.throws(() => parseCriticResponse('{"verdict":"revise","pages":[{"page_no":1,"verdict":"revise","issues":[{"text":"x","severity":"urgent"}]}]}', deck), /severity/)

const advisoryOnly = parseCriticResponse(JSON.stringify({
  verdict: 'revise',
  pages: [{ page_no: 1, verdict: 'revise', issues: [{ text: '证据可以更强', severity: 'advisory' }] }],
  overall_issues: [],
}), deck)
assert.equal(advisoryOnly.effectiveVerdict, 'pass')
assert.equal(advisoryOnly.pages[0].issues[0].severity, 'advisory')
assert.equal(advisoryOnly.pages[0].effectiveVerdict, 'pass')

const blockingOnly = parseCriticResponse(JSON.stringify({
  verdict: 'revise',
  pages: [{ page_no: 1, verdict: 'revise', issues: [{ text: '论点自相矛盾', severity: 'blocking' }] }],
  overall_issues: [],
}), deck)
assert.equal(blockingOnly.effectiveVerdict, 'revise')
assert.equal(blockingOnly.pages[0].effectiveVerdict, 'revise')

const legacyIssue = parseCriticResponse(JSON.stringify({
  verdict: 'revise',
  pages: [{ page_no: 1, verdict: 'revise', issues: ['论证薄弱'] }],
  overall_issues: [],
}), deck)
assert.equal(legacyIssue.pages[0].issues[0].severity, 'blocking')
assert.equal(legacyIssue.effectiveVerdict, 'revise')

const critique = {
  verdict: 'revise',
  pages: [
    { page_no: 1, verdict: 'pass', issues: [] },
    { page_no: 2, verdict: 'revise', issues: ['论证薄弱'], needs_framework: '人群任务视角' },
  ],
  overall_issues: ['递进不足'],
}
const extraConcepts = [{ slug: 'jtbd', name: 'JTBD', content: 'JTBD 正文……' }]
const rp = buildRevisionPrompt({ deck, brief, critique, extraConcepts })
assert.match(rp.system, /只输出.*需要修订的页|只重写/)
assert.match(rp.system, /\[框架: 名称\]/)
assert.match(rp.system, /blocks\[\]\.type 只能使用/)
assert.match(rp.user, /论证薄弱/)
assert.match(rp.user, /JTBD 正文/)
assert.ok(!rp.user.includes('"page_no": 1,\n      "verdict": "pass"'))
assert.match(rp.user, /递进不足/)

const merged = mergeRevisedSlides(deck, [{
  page_no: 2,
  intent: 'i2v2',
  action_title: 'A2v2',
  core_points: ['新论证'],
  blocks: [{ type: 'callout', text: '新内容' }],
}], critique)
assert.equal(merged.slides[1].action_title, 'A2v2')
assert.equal(merged.slides[0].action_title, 'A1')
assert.deepEqual(merged.slides[1].content_blocks, [{ type: 'callout', text: '新内容' }])
assert.throws(() => mergeRevisedSlides(deck, [{ page_no: 99, action_title: 'X' }], critique), /unknown page/)
assert.throws(() => mergeRevisedSlides(deck, [], critique), /missing revised/)

const calls = []
const stubResponses = [
  JSON.stringify({
    verdict: 'revise',
    pages: [
      { page_no: 1, verdict: 'pass', issues: [] },
      { page_no: 2, verdict: 'revise', issues: ['弱'], needs_framework: '任务视角' },
    ],
    overall_issues: [],
  }),
  '{"selected":[{"slug":"jtbd","why":"补任务视角"}]}',
  JSON.stringify({
    slides: [{
      page_no: 2,
      intent: '[框架: JTBD] 修订后',
      action_title: '修订后判断',
      layout: 'split-statement',
      core_points: ['[框架: JTBD] 新论证'],
      data_refs: [{ source: 'inputs/x/summary.md', type: 'client_input', source_tier: 'T1' }],
      evidence_kind: 'deductive',
      validation_method: '访谈验证',
      blocks: [{ type: 'callout', text: 'x' }],
    }],
  }),
  JSON.stringify({ verdict: 'pass', pages: [], overall_issues: [] }),
]
const loopDeck = {
  slides: deck.slides.map(slide => ({
    ...slide,
    layout: 'split-statement',
    data_refs: [{ source: 'inputs/x/summary.md', type: 'client_input', source_tier: 'T1' }],
    evidence_kind: 'deductive',
    validation_method: '访谈验证',
    blocks: [{ type: 'callout', text: 'x' }],
  })),
}
const index = [{ slug: 'jtbd', name: 'JTBD', definition: '任务视角', file: 'assets/_compiled/concepts-golden/jtbd.md' }]
const result = await runCriticLoop({
  deck: loopDeck,
  brief: { ...brief, slug: 'x', form: { name: 'LUMA' } },
  index,
  loadBodies: slugs => slugs.map(slug => ({ slug, name: 'JTBD', content: 'JTBD 正文' })),
  callModel: async (cSystem, cUser) => {
    calls.push(cSystem.slice(0, 12))
    return stubResponses.shift()
  },
  maxRounds: 2,
  processLockOptions: { minPages: 1, maxPages: 8 },
})
assert.equal(result.finalVerdict, 'pass')
assert.equal(result.rounds.length, 2)
assert.deepEqual(result.rounds[0].pulledSlugs, ['jtbd'])
assert.match(result.deck.slides[1].action_title, /修订后判断/)
assert.equal(calls.length, 4)

const advisoryCalls = []
const advisoryLoop = await runCriticLoop({
  deck: loopDeck,
  brief: { ...brief, slug: 'x', form: { name: 'LUMA' } },
  index,
  loadBodies: () => {
    throw new Error('advisory-only critique should not pull frameworks')
  },
  callModel: async (cSystem) => {
    advisoryCalls.push(cSystem)
    return JSON.stringify({
      verdict: 'revise',
      pages: [
        { page_no: 1, verdict: 'revise', issues: [{ text: '证据可以更强', severity: 'advisory' }] },
      ],
      overall_issues: [],
    })
  },
  maxRounds: 2,
  processLockOptions: { minPages: 1, maxPages: 8 },
})
assert.equal(advisoryLoop.finalVerdict, 'pass')
assert.equal(advisoryLoop.rounds.length, 1)
assert.equal(advisoryLoop.rounds[0].revised, false)
assert.equal(advisoryCalls.length, 1)

const finalAuditResponses = [
  JSON.stringify({
    verdict: 'revise',
    pages: [
      { page_no: 1, verdict: 'revise', issues: [{ text: '重复', severity: 'blocking' }] },
    ],
    overall_issues: [],
  }),
  JSON.stringify({
    slides: [{
      page_no: 1,
      intent: '修订后',
      action_title: '修订后判断',
      layout: 'split-statement',
      core_points: ['新论证'],
      data_refs: [{ source: 'inputs/x/summary.md', type: 'client_input', source_tier: 'T1' }],
      evidence_kind: 'deductive',
      validation_method: '访谈验证',
      blocks: [{ type: 'callout', text: 'x' }],
    }],
  }),
  JSON.stringify({ verdict: 'pass', pages: [], overall_issues: [] }),
]
const finalAudited = await runCriticLoop({
  deck: loopDeck,
  brief: { ...brief, slug: 'x', form: { name: 'LUMA' } },
  index,
  loadBodies: () => [],
  callModel: async () => finalAuditResponses.shift(),
  maxRounds: 1,
  processLockOptions: { minPages: 1, maxPages: 8 },
})
assert.equal(finalAudited.finalVerdict, 'pass')
assert.equal(finalAudited.rounds.length, 2)
assert.equal(finalAudited.rounds[1].finalAudit, true)
assert.equal(finalAudited.rounds[1].revised, false)

console.log('✅ critic-deck: prompt + parse passed')
