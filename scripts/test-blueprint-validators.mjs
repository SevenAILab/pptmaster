#!/usr/bin/env node
import assert from 'node:assert/strict'
import { blueprintCheck } from '../validators/blueprint-check.mjs'
import { contentCheck as consumerContentCheck } from '../validators/consumer_insight/content-check.mjs'
import { contentCheck as industryContentCheck } from '../validators/industry_analysis/content-check.mjs'
import { contentCheck as competitorContentCheck } from '../validators/competitor_analysis/content-check.mjs'
import { contentCheck as positioningContentCheck } from '../validators/brand_positioning/content-check.mjs'
import { contentCheck as buildingContentCheck } from '../validators/brand_building/content-check.mjs'
import { contentCheck as annualContentCheck } from '../validators/annual_planning/content-check.mjs'

const blueprintChunk = {
  chunk_id: 'test-chunk',
  allowed_concepts: ['Persona-5W2H', 'JTBD', 'Marketing-Calendar', 'OKR', 'AARRR-Funnel'],
  self_check: { must_appear_keywords: ['消费者画像'] },
  pages: [
    { page_no: 1, recommended_layout: 'S13' },
    { page_no: 2, recommended_layout: 'S05' },
  ],
}

function makeOutput(overrides = {}) {
  return {
    agent_id: 'consumer_insight',
    blueprint_chunk_id: 'test-chunk',
    chunk_takeaway: '消费者画像应优先服务高频任务人群',
    chunk_insights: ['消费者画像显示主力人群更重视效率', '拓展人群需要教育'],
    thinking_log: ['Step 1: read strategic question', 'Step 2: inspect upstream', 'Step 3: verify with summary'],
    slides: [
      {
        page_no: 1,
        layout: 'S13',
        action_title: '消费者画像应先收窄主力人群',
        core_points: ['主力人群高频购买', '拓展人群需要教育'],
        data_refs: [{ value: '客户资料', source: 'inputs/demo/summary.md', type: 'quote' }],
        models_used: ['Persona-5W2H'],
      },
      {
        page_no: 2,
        layout: 'S05',
        action_title: '主力人群的购买任务是提高效率',
        core_points: ['功能任务明确', '情感任务明确'],
        data_refs: [{ value: '客户表单', source: 'inputs/demo/form.json', type: 'quote' }],
        models_used: ['JTBD'],
      },
    ],
    metadata: { blueprint_chunk_id: 'test-chunk' },
    ...overrides,
  }
}

const ok = blueprintCheck(makeOutput(), blueprintChunk)
assert.equal(ok.passed, true, JSON.stringify(ok.errors))

const wrongLength = blueprintCheck(makeOutput({ slides: makeOutput().slides.slice(0, 1) }), blueprintChunk)
assert.equal(wrongLength.passed, false)
assert.ok(wrongLength.errors.some(error => error.includes('slides.length')))

const wrongLayoutOutput = makeOutput()
wrongLayoutOutput.slides[0].layout = 'S22'
const wrongLayout = blueprintCheck(wrongLayoutOutput, blueprintChunk)
assert.equal(wrongLayout.passed, false)
assert.ok(wrongLayout.errors.some(error => error.includes('layout')))

const wrongModelOutput = makeOutput()
wrongModelOutput.slides[0].models_used = ['SWOT']
const wrongModel = blueprintCheck(wrongModelOutput, blueprintChunk)
assert.equal(wrongModel.passed, false)
assert.ok(wrongModel.errors.some(error => error.includes('not in allowed_concepts')))

const noThinking = makeOutput({ chunk_takeaway: '', chunk_insights: [], thinking_log: [] })
const noThinkingResult = blueprintCheck(noThinking, blueprintChunk)
assert.equal(noThinkingResult.passed, false)
assert.ok(noThinkingResult.errors.some(error => error.includes('chunk_takeaway')))
assert.ok(noThinkingResult.errors.some(error => error.includes('thinking_log')))

for (const check of [
  consumerContentCheck,
  industryContentCheck,
  competitorContentCheck,
  positioningContentCheck,
  buildingContentCheck,
]) {
  const result = check(makeOutput(), { blueprintChunk })
  assert.equal(result.passed, true, JSON.stringify(result.errors))
}

const annualOutput = makeOutput({
  slides: makeOutput().slides.map(slide => ({
    ...slide,
    core_points: ['Q1 起势 Q2 放大 Q3 转化 Q4 复盘', '年度 12 个月节奏含预算分配和 OKR/AARRR 复盘 KPI'],
    models_used: ['Marketing-Calendar', 'OKR', 'AARRR-Funnel'],
  })),
})
const annualResult = annualContentCheck(annualOutput, { blueprintChunk })
assert.equal(annualResult.passed, true, JSON.stringify(annualResult.errors))

console.log('✅ blueprint validators test passed')
