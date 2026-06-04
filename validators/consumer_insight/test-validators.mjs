import assert from 'node:assert/strict'
import { contentCheck } from './content-check.mjs'
import { methodologyCheck } from './methodology-check.mjs'

const goodOutput = {
  agent_id: 'consumer_insight',
  slides: [
    {
      page_no: 1,
      layout: 'S04',
      action_title: 'SmallRig 创作者是学历高收入高忠诚的三高人群',
      core_points: ['Who: 90% 大学毕业', 'Income: 平均收入更高', 'Loyalty: 90 天复购超过 30%'],
      data_refs: [{ value: '三高', source: 'assets/_raw/cases/标杆案例/smallrig/page-037.md', type: 'quote' }],
      models_used: ['Persona-5W2H'],
    },
    {
      page_no: 2,
      layout: 'S11',
      action_title: '用户旅程从触达到复购至少覆盖五个节点',
      core_points: ['触达', '兴趣', '评估', '购买', '复购'],
      data_refs: [],
      models_used: ['User-Journey'],
    },
    {
      page_no: 3,
      layout: 'S15',
      action_title: '核心 JTBD 同时覆盖功能任务情感任务和社交任务',
      core_points: ['功能任务: 稳定拍摄', '情感任务: 创作自由', '社交任务: 创作者圈层认同'],
      data_refs: [],
      models_used: ['JTBD'],
    },
    {
      page_no: 4,
      layout: 'S15',
      action_title: '痛点-收益矩阵展示创作者真实诉求',
      core_points: ['痛点: 适配不确定', '收益: 工作流可靠', '机会: 一体化影像解决方案'],
      data_refs: [],
      models_used: ['Pain-Gain-Map'],
    },
  ],
}

const cc = contentCheck(goodOutput)
assert.equal(cc.passed, true, `content check should pass: ${cc.errors?.join(',')}`)

const mc = methodologyCheck(goodOutput)
assert.equal(mc.passed, true, `methodology check should pass: ${mc.errors?.join(',')}`)

const badOutput = JSON.parse(JSON.stringify(goodOutput))
badOutput.slides[0].models_used = []
assert.equal(methodologyCheck(badOutput).passed, false, 'methodology check should fail when persona is missing')

const badOutput2 = JSON.parse(JSON.stringify(goodOutput))
badOutput2.slides[1].action_title = '用户旅程介绍'
assert.equal(contentCheck(badOutput2).passed, false, 'content check should fail on topic-style title')

console.log('✅ consumer_insight validators test passed')
