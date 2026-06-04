import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classifySlideEvidence,
  classifySlideJudgmentType,
  evaluateChunkAssumptions,
  MIN_SEARCHES_FOR_ASSUMPTION,
  ASSUMPTION_RATIO_CAP,
} from './assumption-policy.mjs'

test('有 T2 data_ref 的关键判断页 = evidenced', () => {
  const slide = {
    action_title: '应以开发者体验切入',
    core_points: ['核心论点'],
    data_refs: [{ source: 'https://example.com/report', source_tier: 'T2' }],
  }
  assert.equal(classifySlideEvidence(slide), 'evidenced')
  assert.equal(classifySlideJudgmentType(slide), 'prescriptive')
})

test('诚实标注且 basis+method 齐全的关键判断页 = hypothesis', () => {
  const slide = {
    action_title: '建议定位为开发者优先（待验证假设）',
    core_points: ['进入验证清单'],
    data_refs: [],
    evidence_status: 'hypothesis',
    hypothesis_basis: '基于同类开源项目的类比',
    validation_method: '需向客户索取真实装机/活跃数据',
  }
  assert.equal(classifySlideEvidence(slide), 'hypothesis')
  assert.equal(classifySlideJudgmentType(slide), 'prescriptive')
})

test('建议性判断页无来源又没标假设 = unsupported（红线违规）', () => {
  const slide = {
    action_title: '应抢占企业市场',
    core_points: ['立即发力高端'],
    data_refs: [],
  }
  assert.equal(classifySlideEvidence(slide), 'unsupported')
})

test('建议性判断有 T3 事实来源也可作为有据推演，不强制 T1/T2', () => {
  const slide = {
    action_title: '建议以开发者工作流作为定位验证方向',
    core_points: ['基于公开竞品与行业媒体证据做推演'],
    data_refs: [{ source: 'https://36kr.com/p/ai-tools', source_tier: 'T3' }],
  }
  assert.equal(classifySlideEvidence(slide), 'evidenced')
})

test('标了 hypothesis 但缺 validation_method = unsupported', () => {
  const slide = {
    action_title: '建议成为行业首选',
    core_points: [],
    data_refs: [],
    evidence_status: 'hypothesis',
    hypothesis_basis: '直觉',
    validation_method: '',
  }
  assert.equal(classifySlideEvidence(slide), 'unsupported')
})

test('纯描述页有真实来源 = descriptive', () => {
  const slide = {
    action_title: '行业背景概览',
    core_points: ['市场分三段'],
    data_refs: [{ source: 'https://example.com/report', source_tier: 'T3' }],
  }
  assert.equal(classifySlideEvidence(slide), 'descriptive')
  assert.equal(classifySlideJudgmentType(slide), 'descriptive')
})

test('纯描述事实无来源 = unsupported（无源事实红线）', () => {
  const slide = { page_no: 3, action_title: '行业背景概览', core_points: ['市场分三段'], data_refs: [] }
  assert.equal(classifySlideEvidence(slide), 'unsupported')
  const r = evaluateChunkAssumptions({ slides: [slide], metadata: {} })
  assert.equal(r.hardBlock, true)
  assert.match(r.blockReason, /描述性事实|真实来源|无源事实/)
})

test('显式标注 hypothesis 且 basis+method 齐全时，即使非行动标题也计入 hypothesis', () => {
  const slide = {
    action_title: 'Competitor-Matrix：六类 AI PPT 玩家差异仍集中在输入、编辑、视觉与价格',
    core_points: ['策略深度：多为待验证维度'],
    data_refs: [{ source: 'https://gamma.app/products/presentations', source_tier: 'T3' }],
    evidence_status: 'hypothesis',
    hypothesis_basis: '基于竞品能力证据的类比推理，不能直接证明本品的真实付费需求',
    validation_method: '需向目标用户/采购方访谈并索取真实需求与付费数据才能验证',
  }
  assert.equal(classifySlideEvidence(slide), 'hypothesis')
})

test('显式标注 hypothesis 但缺 basis/method → unsupported 硬闸', () => {
  const r = evaluateChunkAssumptions({
    slides: [{
      page_no: 22,
      action_title: 'Competitor-Matrix：六类 AI PPT 玩家差异仍集中在输入、编辑、视觉与价格',
      core_points: ['策略深度：多为待验证维度'],
      data_refs: [{ source: 'https://gamma.app/products/presentations', source_tier: 'T3' }],
      evidence_status: 'hypothesis',
      hypothesis_basis: '',
      validation_method: '',
    }],
    metadata: { total_searches: 10, web_search_used: true },
  })
  assert.equal(r.hardBlock, true)
  assert.match(r.blockReason, /basis|method|依据|验证方法|unsupported|未标注/i)
})

const evidencedSlide = {
  action_title: '应以开发者体验切入',
  data_refs: [{ source_tier: 'T2', source: 'https://a.com' }],
}
const honestHypo = {
  action_title: '建议定位为开发者优先（待验证）',
  data_refs: [],
  evidence_status: 'hypothesis',
  hypothesis_basis: '类比',
  validation_method: '索取真实数据',
}
const unsupported = { action_title: '应抢占企业市场', data_refs: [] }

test('有 unsupported 页 → hardBlock=true', () => {
  const r = evaluateChunkAssumptions(
    { slides: [unsupported], metadata: { total_searches: 9, web_search_used: true } },
  )
  assert.equal(r.hardBlock, true)
  assert.match(r.blockReason, /未标注|当事实|unsupported/i)
})

test('诚实假设不再因搜索次数不足机械 BLOCK', () => {
  const r = evaluateChunkAssumptions(
    { slides: [honestHypo], metadata: { total_searches: 1, web_search_used: true } },
  )
  assert.equal(r.hardBlock, false)
  assert.equal(r.hypothesisCount, 1)
})

test('诚实假设 + 高假设占比 → 不 BLOCK，只打 hypothesis_heavy 软标记', () => {
  const r = evaluateChunkAssumptions(
    { slides: [evidencedSlide, honestHypo], metadata: { total_searches: 5, web_search_used: true } },
  )
  assert.equal(r.hardBlock, false)
  assert.equal(r.keyJudgmentCount, 2)
  assert.equal(r.hypothesisCount, 1)
  assert.equal(r.assumptionRatio, 0.5)
  assert.equal(r.overflow, true)
  assert.equal(r.hypothesisHeavy, true)
  assert.equal(MIN_SEARCHES_FOR_ASSUMPTION, 3)
  assert.equal(ASSUMPTION_RATIO_CAP, 0.4)
})

test('全诚实假设且占比很高 → 不 BLOCK，进入 validation_checklist', () => {
  const r = evaluateChunkAssumptions({
    slides: [
      { ...honestHypo, page_no: 11, action_title: '建议验证专业 Agent 空位' },
      { ...honestHypo, page_no: 12, action_title: '建议验证成果计费叙事' },
    ],
    metadata: { total_searches: 0, web_search_used: false },
  })
  assert.equal(r.hardBlock, false)
  assert.equal(r.assumptionRatio, 1)
  assert.equal(r.hypothesisHeavy, true)
  assert.deepEqual(r.validationChecklist.map(item => item.page_no), [11, 12])
})

test('全是 evidenced → 占比 0、不溢出', () => {
  const r = evaluateChunkAssumptions(
    { slides: [evidencedSlide], metadata: { total_searches: 4, web_search_used: true } },
  )
  assert.equal(r.hardBlock, false)
  assert.equal(r.assumptionRatio, 0)
  assert.equal(r.overflow, false)
})
