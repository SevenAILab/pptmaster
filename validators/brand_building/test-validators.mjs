import assert from 'node:assert/strict'
import { contentCheck } from './content-check.mjs'
import { methodologyCheck } from './methodology-check.mjs'

const goodOutput = {
  agent_id: 'brand_building',
  slides: [
    {
      page_no: 1,
      layout: 'S05',
      action_title: 'SmallRig 品牌屋用五层结构承接全球影像场景产品生态开创者定位',
      core_points: ['战略: 品牌定位', '心智: FREE YOUR DREAM', '论点: 功能利益与情感利益', '论据: 全生态全场景全兼容快制造', '落地: 产品系列'],
      data_refs: [{ value: '品牌屋', source: 'assets/_raw/cases/标杆案例/smallrig/page-124.md', type: 'quote' }],
      models_used: ['Brand-House'],
    },
    {
      page_no: 2,
      layout: 'S17',
      action_title: '产品屋必须保留四大产品系列各自支撑的价值层',
      core_points: ['产品屋: 相机支撑与稳定', '产品族: 储能解决方案', '产品系列: 手机支撑与稳定', '价值层: 灯光与控制系统'],
      data_refs: [],
      models_used: ['Product-House'],
    },
    {
      page_no: 3,
      layout: 'S19',
      action_title: 'FREE YOUR DREAM 和 Rig UP 分别承担品牌主张与产品口号',
      core_points: ['口号: FREE YOUR DREAM', 'Slogan: Rig UP', '主张: 自由创想', '语言钉: 让拍摄更自由'],
      data_refs: [],
      models_used: ['Slogan-7-Principles'],
    },
    {
      page_no: 4,
      layout: 'S21',
      action_title: '调性系统要把视觉锤和语言钉同时固定到创作自由',
      core_points: ['调性: 理性专业', '视觉锤: 影像场景生态', 'Visual Hammer: 创作装备', '语言钉: FREE YOUR DREAM'],
      data_refs: [],
      models_used: ['Visual-Hammer-Verbal-Nail'],
    },
  ],
}

assert.equal(contentCheck(goodOutput).passed, true)
assert.equal(methodologyCheck(goodOutput).passed, true)

const badOutput = JSON.parse(JSON.stringify(goodOutput))
badOutput.slides = badOutput.slides.filter(slide => !slide.models_used.includes('Brand-House'))
assert.equal(methodologyCheck(badOutput).passed, false, 'methodology check should fail when Brand-House is missing')

const badOutput2 = JSON.parse(JSON.stringify(goodOutput))
badOutput2.slides[0].action_title = '品牌屋介绍'
assert.equal(contentCheck(badOutput2).passed, false, 'content check should fail on topic-style title')

console.log('✅ brand_building validators test passed')
