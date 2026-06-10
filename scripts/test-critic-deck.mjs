import assert from 'node:assert/strict'
import {
  buildCriticPrompt,
  buildRevisionPrompt,
  mergeRevisedSlides,
  parseCriticResponse,
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
assert.equal(parsed.pages.length, 2)
assert.equal(parsed.pages[1].needs_framework, '需要人群任务视角框架')
assert.throws(() => parseCriticResponse('不是 JSON'), /No JSON/)
assert.throws(() => parseCriticResponse('{"verdict":"maybe","pages":[]}'), /verdict/)
assert.throws(() => parseCriticResponse('{"verdict":"revise","pages":[{"page_no":99,"verdict":"revise"}]}', deck), /unknown page/)

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
assert.match(rp.user, /论证薄弱/)
assert.match(rp.user, /JTBD 正文/)
assert.ok(!rp.user.includes('"page_no": 1,\n      "verdict": "pass"'))
assert.match(rp.user, /递进不足/)

const merged = mergeRevisedSlides(deck, [{
  page_no: 2,
  intent: 'i2v2',
  action_title: 'A2v2',
  core_points: ['新论证'],
}], critique)
assert.equal(merged.slides[1].action_title, 'A2v2')
assert.equal(merged.slides[0].action_title, 'A1')
assert.throws(() => mergeRevisedSlides(deck, [{ page_no: 99, action_title: 'X' }], critique), /unknown page/)
assert.throws(() => mergeRevisedSlides(deck, [], critique), /missing revised/)

console.log('✅ critic-deck: prompt + parse passed')
