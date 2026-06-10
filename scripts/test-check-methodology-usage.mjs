import assert from 'node:assert/strict'
import { checkMethodologyUsage } from './check-methodology-usage.mjs'

const deck = {
  slides: [
    { page_no: 1, intent: '[框架: JTBD] 用任务视角重排卖点', action_title: 'A', core_points: ['x'] },
    { page_no: 2, intent: '无框架页', action_title: 'B', core_points: ['[框架: 定位三角] 顾客心智锚点应是……'] },
    { page_no: 3, intent: '普通页', action_title: 'C', core_points: ['y'] },
  ],
}
const ok = checkMethodologyUsage(deck, { minPages: 2 })
assert.equal(ok.ok, true)
assert.equal(ok.usedPageCount, 2)
assert.equal(ok.totalPages, 3)
assert.deepEqual([...ok.frameworks].sort(), ['JTBD', '定位三角'])

const fail = checkMethodologyUsage({ slides: deck.slides.slice(2) }, { minPages: 2 })
assert.equal(fail.ok, false)
assert.ok(fail.violations[0].includes('少于'))

console.log('✅ check-methodology-usage passed')
