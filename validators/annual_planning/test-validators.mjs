import assert from 'node:assert/strict'
import { contentCheck } from './content-check.mjs'
import { methodologyCheck } from './methodology-check.mjs'

const goodOutput = {
  agent_id: 'annual_planning',
  slides: [
    {
      page_no: 1,
      layout: 'S11',
      action_title: '年度规划用 OKR 把品牌自由主张转成四个季度战役',
      core_points: ['Objective: 提升创作者心智占有', 'KR1: 核心人群认知提升', 'KR2: 内容互动提升'],
      data_refs: [{ value: 'OKR 年度目标', source: 'assumption: annual planning demo', type: 'assumption' }],
      models_used: ['OKR'],
    },
    {
      page_no: 2,
      layout: 'S02',
      action_title: '营销日历必须覆盖 12 个月并形成 Q1 到 Q4 节奏',
      core_points: ['Q1 春季摄影季', 'Q2 暑假 Vlog 季', 'Q3 共创活动季', 'Q4 双 11 转化季'],
      data_refs: [],
      models_used: ['Marketing-Calendar', '4P-Rhythm'],
    },
    {
      page_no: 3,
      layout: 'S20',
      action_title: '预算分配应按产品渠道传播三类投入控制产出效率',
      core_points: ['产品内容 35%', '渠道投放 40%', '共创活动 15%', '复盘优化 10%'],
      data_refs: [],
      models_used: ['Budget-Allocation', '4P-Rhythm'],
    },
    {
      page_no: 4,
      layout: 'S20',
      action_title: 'AARRR 漏斗把获客激活留存推荐转成复盘 KPI',
      core_points: ['Acquisition 获取', 'Activation 激活', 'Retention 留存', 'Referral 推荐'],
      data_refs: [],
      models_used: ['AARRR-Funnel'],
    },
  ],
}

assert.equal(contentCheck(goodOutput).passed, true)
assert.equal(methodologyCheck(goodOutput).passed, true)

const badOutput = JSON.parse(JSON.stringify(goodOutput))
badOutput.slides[0].action_title = '年度规划介绍'
assert.equal(contentCheck(badOutput).passed, false, 'content check should fail on topic-style title')

const badOutput2 = JSON.parse(JSON.stringify(goodOutput))
badOutput2.slides = badOutput2.slides.filter(slide => !slide.models_used.includes('AARRR-Funnel'))
assert.equal(methodologyCheck(badOutput2).passed, false, 'methodology check should fail when AARRR-Funnel is missing')

const badOutput3 = JSON.parse(JSON.stringify(goodOutput))
badOutput3.slides[1].core_points = ['Q1 春季摄影季', 'Q2 暑假 Vlog 季']
assert.equal(contentCheck(badOutput3).passed, false, 'content check should fail without Q3/Q4 quarterly coverage')

console.log('✅ annual_planning validators test passed')
