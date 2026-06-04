import assert from 'node:assert/strict'
import { contentCheck } from './content-check.mjs'
import { methodologyCheck } from './methodology-check.mjs'

const goodOutput = {
  agent_id: 'industry_analysis',
  slides: [
    {
      page_no: 1,
      layout: 'S06',
      action_title: '行业大盘 KPI 显示影像配件进入场景化增长期',
      core_points: ['市场规模: 有 source URL', '增速 CAGR: 有 source URL', '玩家: 头部公司分化'],
      data_refs: [{ value: 'market size', source: 'https://example.com/report', type: 'stat' }],
      models_used: ['Industry-Lifecycle'],
    },
    {
      page_no: 2,
      layout: 'S17',
      action_title: 'PESTEL 六维共同推动影像创作工具需求变化',
      core_points: ['政治政策', '经济增速', '社会内容创作', '技术影像 AI', '环境责任', '法律合规'],
      data_refs: [{ value: 'PESTEL', source: 'https://example.com/pestel', type: 'quote' }],
      models_used: ['PESTEL'],
    },
    {
      page_no: 3,
      layout: 'S17',
      action_title: 'Porter 五力显示现有竞争和替代威胁同时增强',
      core_points: ['现有竞争', '潜在进入者', '替代品', '供应商议价', '购买者议价'],
      data_refs: [],
      models_used: ['Porter-5-Forces'],
    },
    {
      page_no: 4,
      layout: 'S18',
      action_title: '三大趋势构成影像配件行业 Why Now',
      core_points: ['趋势一: 拍摄轻量化', '趋势二: 社交媒体兴起', '趋势三: 影像技术发展'],
      data_refs: [{ value: '趋势', source: 'https://example.com/trends', type: 'quote' }],
      models_used: ['S-Curve'],
    },
  ],
}

assert.equal(contentCheck(goodOutput).passed, true)
assert.equal(methodologyCheck(goodOutput).passed, true)

const badOutput = JSON.parse(JSON.stringify(goodOutput))
badOutput.slides = badOutput.slides.filter(slide => !slide.models_used.includes('PESTEL'))
assert.equal(methodologyCheck(badOutput).passed, false, 'methodology check should fail when PESTEL is missing')

const badOutput2 = JSON.parse(JSON.stringify(goodOutput))
badOutput2.slides[0].action_title = '行业背景介绍'
assert.equal(contentCheck(badOutput2).passed, false, 'content check should fail on topic-style title')

console.log('✅ industry_analysis validators test passed')
