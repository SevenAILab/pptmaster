import assert from 'node:assert/strict'
import {
  ALLOWED_BLOCK_TYPES,
  assertProcessLocks,
  validateProcessLocks,
} from './process-locks.mjs'

const goodSlide = pageNo => ({
  page_no: pageNo,
  intent: `回答根问题的第 ${pageNo} 个判断`,
  action_title: `第 ${pageNo} 页应推进不同判断`,
  layout: 'split-statement',
  core_points: [`第 ${pageNo} 页核心论据`, `第 ${pageNo} 页行动含义`],
  data_refs: [{ source: `inputs/demo/summary.md#p${pageNo}`, type: 'client_input', source_tier: 'T1' }],
  evidence_kind: 'empirical',
  validation_method: '',
  blocks: [{ type: 'bullet_list', title: `证据 ${pageNo}`, items: ['a', 'b'] }],
})

const goodDeck = () => ({
  slides: Array.from({ length: 6 }, (_, index) => goodSlide(index + 1)),
})

let result = validateProcessLocks(goodDeck())
assert.equal(result.ok, true)
assert.deepEqual(result.violations, [])
assert.equal(result.summary.slideCount, 6)
assert.equal(result.summary.allowedBlockTypes.length, ALLOWED_BLOCK_TYPES.length)
assert.doesNotThrow(() => assertProcessLocks(goodDeck()))

result = validateProcessLocks({ slides: Array.from({ length: 9 }, (_, index) => goodSlide(index + 1)) })
assert.equal(result.ok, false)
assert.match(result.violations.join('\n'), /页数必须在 5-8 页/)

const missing = goodDeck()
delete missing.slides[0].intent
missing.slides[1].action_title = ''
result = validateProcessLocks(missing)
assert.equal(result.ok, false)
assert.match(result.violations.join('\n'), /page 1: 缺 intent/)
assert.match(result.violations.join('\n'), /page 2: 缺 action_title/)

const repeated = goodDeck()
repeated.slides[1].action_title = repeated.slides[0].action_title
repeated.slides[1].core_points = [...repeated.slides[0].core_points]
result = validateProcessLocks(repeated)
assert.equal(result.ok, false)
assert.match(result.violations.join('\n'), /跨页重复/)

const unknownBlock = goodDeck()
unknownBlock.slides[0].blocks = [{ type: 'mystery_block', text: 'x' }]
result = validateProcessLocks(unknownBlock)
assert.equal(result.ok, false)
assert.match(result.violations.join('\n'), /未知 block type/)

const noEvidence = goodDeck()
noEvidence.slides[0].data_refs = []
noEvidence.slides[0].evidence_kind = 'deductive'
noEvidence.slides[0].validation_method = ''
result = validateProcessLocks(noEvidence)
assert.equal(result.ok, false)
assert.match(result.violations.join('\n'), /缺可追溯 data_refs/)

const hypothesis = goodDeck()
hypothesis.slides[0].data_refs = []
hypothesis.slides[0].evidence_kind = 'hypothesis'
hypothesis.slides[0].validation_method = '用 5 个目标用户访谈验证该判断'
result = validateProcessLocks(hypothesis)
assert.equal(result.ok, true)

const weakHypothesis = goodDeck()
weakHypothesis.slides[0].data_refs = []
weakHypothesis.slides[0].evidence_kind = 'hypothesis'
weakHypothesis.slides[0].validation_method = ''
result = validateProcessLocks(weakHypothesis)
assert.equal(result.ok, false)
assert.match(result.violations.join('\n'), /hypothesis 必须给 validation_method/)

assert.throws(() => assertProcessLocks(noEvidence), /过程锁未通过/)

const mixedKindDeck = {
  slides: [
    { page_no: 1, page_kind: 'cover', action_title: 'LUMA 品牌定位方案' },
    { page_no: 2, page_kind: 'toc', action_title: '目录' },
    {
      page_no: 3,
      page_kind: 'content',
      intent: '回答根问题的一个判断',
      action_title: '增长正从开店红利切到复购红利',
      layout: 'split-statement',
      core_points: ['复购决定增长'],
      data_refs: [{ source: 'inputs/demo/summary.md', type: 'client_input', source_tier: 'T1' }],
      evidence_kind: 'deductive',
      validation_method: '',
      blocks: [{ type: 'callout', text: 'x' }],
    },
    { page_no: 4, page_kind: 'closing', action_title: '必须重新定位撬动复购' },
  ],
}
result = validateProcessLocks(mixedKindDeck, { minPages: 1, maxPages: 8 })
assert.equal(result.ok, true, result.violations.join('\n'))
assert.equal(result.summary.contentSlideCount, 1)
assert.ok(!result.violations.some(violation => violation.includes('page 1')))
assert.ok(!result.violations.some(violation => violation.includes('page 2')))

const badContent = {
  slides: [{
    page_no: 1,
    page_kind: 'content',
    intent: 'i',
    action_title: '内容页仍然必须有证据',
    core_points: ['x'],
    evidence_kind: 'empirical',
    blocks: [{ type: 'callout', text: 'x' }],
  }],
}
result = validateProcessLocks(badContent, { minPages: 1, maxPages: 8 })
assert.equal(result.ok, false)
assert.match(result.violations.join('\n'), /data_refs/)

const unknownKind = { slides: [{ page_no: 1, page_kind: 'splash', action_title: 'x' }] }
result = validateProcessLocks(unknownKind, { minPages: 1, maxPages: 8 })
assert.equal(result.ok, false)
assert.match(result.violations.join('\n'), /未知 page_kind/)

console.log('✅ process-locks: 5 locks and evidence rules passed')
