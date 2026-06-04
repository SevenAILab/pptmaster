import assert from 'node:assert/strict'
import { contentCheck } from './content-check.mjs'
import { methodologyCheck } from './methodology-check.mjs'

const goodOutput = {
  agent_id: 'competitor_analysis',
  slides: [
    {
      page_no: 1,
      layout: 'S15',
      action_title: '三大竞品在专业深度价格带和场景覆盖上形成分化',
      core_points: ['竞品对比: 定位', '价格带', '目标人群', '差异化点'],
      data_refs: [{ value: 'Manfrotto positioning', source: 'https://example.com/manfrotto', type: 'quote' }],
      models_used: ['Competitor-Matrix'],
    },
    {
      page_no: 2,
      layout: 'S15',
      action_title: '知觉地图显示 SmallRig 的机会来自专业与开放生态之间的空白',
      core_points: ['知觉地图: 专业深度', 'Perceptual Map: 生态开放度', '空白象限: 专业开放生态'],
      data_refs: [],
      models_used: ['Perceptual-Map'],
    },
    {
      page_no: 3,
      layout: 'S08',
      action_title: 'SWOT 表明 SmallRig 应用全生态优势对冲同质化威胁',
      core_points: ['SWOT S: 全生态', 'W: 国内认知不足', 'O: 内容创作增长', 'T: 价格竞争'],
      data_refs: [],
      models_used: ['SWOT'],
    },
  ],
}

assert.equal(contentCheck(goodOutput).passed, true)
assert.equal(methodologyCheck(goodOutput).passed, true)

const badOutput = JSON.parse(JSON.stringify(goodOutput))
badOutput.slides = badOutput.slides.filter(slide => !slide.models_used.includes('Competitor-Matrix'))
assert.equal(methodologyCheck(badOutput).passed, false, 'methodology check should fail when competitor matrix is missing')

const badOutput2 = JSON.parse(JSON.stringify(goodOutput))
badOutput2.slides[0].action_title = '竞品分析介绍'
assert.equal(contentCheck(badOutput2).passed, false, 'content check should fail on topic-style title')

console.log('✅ competitor_analysis validators test passed')
