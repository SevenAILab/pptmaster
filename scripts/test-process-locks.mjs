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

console.log('✅ process-locks: 5 locks and evidence rules passed')
