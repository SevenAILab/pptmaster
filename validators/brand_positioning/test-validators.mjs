import assert from 'node:assert/strict'
import { contentCheck } from './content-check.mjs'
import { methodologyCheck } from './methodology-check.mjs'

const goodOutput = {
  agent_id: 'brand_positioning',
  slides: [
    {
      page_no: 1,
      layout: 'S03',
      action_title: '从配件供应商升级为全球摄影师创作工具平台',
      core_points: ['p1', 'p2', 'p3'],
      data_refs: [{ value: '75%', source: '招股书', type: 'stat' }],
      models_used: ['STP'],
    },
    {
      page_no: 2,
      layout: 'S13',
      action_title: '品牌定位三角: 工具品牌 × 社群运营 × 创作赋能',
      core_points: ['Target', 'Frame', 'Benefit+RTB'],
      data_refs: [],
      models_used: ['Brand-Positioning-Triangle'],
    },
    {
      page_no: 3,
      layout: 'S17',
      action_title: '商业模式画布: 共创循环驱动开放生态',
      core_points: ['活动', '价值', '关系'],
      data_refs: [],
      models_used: ['Business-Model-Canvas'],
    },
    {
      page_no: 4,
      layout: 'S22',
      action_title: '品牌人格: 真诚 + 能力的工具大师',
      core_points: ['真诚: 与创作者站一起', '能力: 工程级精度', '坚毅: 持续升级'],
      data_refs: [],
      models_used: ['Aaker-Brand-Personality'],
    },
  ],
}

const cc = contentCheck(goodOutput)
assert.equal(cc.passed, true, `content check should pass: ${cc.errors?.join(',')}`)

const mc = methodologyCheck(goodOutput)
assert.equal(mc.passed, true, `methodology check should pass: ${mc.errors?.join(',')}`)

const badOutput = JSON.parse(JSON.stringify(goodOutput))
badOutput.slides[0].action_title = '品牌定位介绍'
const cc2 = contentCheck(badOutput)
assert.equal(cc2.passed, false, 'content check should fail on topic-style title')

const badOutput2 = JSON.parse(JSON.stringify(goodOutput))
badOutput2.slides = badOutput2.slides.filter(slide => !slide.models_used.includes('Business-Model-Canvas'))
const mc2 = methodologyCheck(badOutput2)
assert.equal(mc2.passed, false, 'methodology check should fail when BMC is missing')

console.log('✅ brand_positioning validators test passed')
