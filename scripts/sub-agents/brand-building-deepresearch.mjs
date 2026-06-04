import { TRACEABLE_DATA_REF_INSTRUCTION, compactWritePayload, runThreeStepDeepResearch } from './deepresearch-common.mjs'

const PLAN_SYSTEM = '你是资深品牌建设与营销传播策略师。你必须先基于定位和上游真实 chunk 拆出传播策略问题。'
const SYNTHESIZE_SYSTEM = '你是咨询级品牌建设策略师。你必须把定位承诺综合成看点、燃点、焦点和触点框架。'
const WRITE_SYSTEM = '你是咨询级品牌策略 PPT 作者。你只输出严格 JSON，页面必须符合 blueprint chunk pages。'

function planUser(context) {
  return [
    '请基于客户资料、上游 chunk 摘要和当前 blueprint chunk，列出 3-5 个品牌建设/营销传播核心问题。',
    '要求:',
    '- 不联网，不凭空补行业事实，只使用上游真实 chunk、客户资料和当前客户 inputs/<slug>/first-party/** 一手证据。',
    '- 问题必须围绕“定位落地需要制造什么看点、燃点、触点和可传播资产”。',
    '- 输出严格 JSON: {"building_questions":["..."]}。',
    JSON.stringify(context, null, 2),
  ].join('\n\n')
}

function fallbackQuestions(context) {
  return [
    `${context.client_name || '客户品牌'} 的定位承诺应拆成哪些传播看点？`,
    '什么外部议题或内容 IP 能把定位从话术变成可讨论事件？',
    '焦点和触点如何服务品牌主张、产品承诺和用户行动的分工？',
  ]
}

function synthesizeUser({ context, planningQuestions, sourcePool }) {
  return [
    '请基于上游真实 chunks 和客户资料，产出 1 句 chunk_takeaway 和 3-4 条品牌建设洞察。',
    '要求:',
    '- 必须把定位承诺拆成看点、燃点、焦点、触点，不写泛推广清单。',
    '- 对当前客户必须尊重客户资料和上游 chunk 中已有品牌资产；资料没有写明的口号、IP、视觉锤只能标为待验证假设。',
    '- 每条 insight 必须带 source_url，source_url 只能从 source_pool 里选，优先 T1/T2。',
    '输出严格 JSON: {"chunk_takeaway":"...","chunk_insights":[{"insight":"...","source_url":"https://..."}]}',
    JSON.stringify({
      planningQuestions,
      chunk_insight_question: context.chunk.chunk_insight_question,
      upstreamChunksSummary: context.upstreamChunksSummary,
      availableChunks: context.availableChunks,
      localEvidence: context.localEvidence,
      source_pool: sourcePool,
    }, null, 2),
  ].join('\n\n')
}

function writeUser({ context, planningQuestions, synthesize, chunkInsights, sourcePool }) {
  return [
    '请把品牌建设策略转成 blueprint chunk 的 slide JSON。',
    '硬约束:',
    '- slides.length 必须等于 chunk.pages.length。',
    '- slides[i].page_no 必须等于 chunk.pages[i].page_no。',
    '- slides[i].layout 必须等于 chunk.pages[i].recommended_layout。',
    '- models_used 只能来自 chunk.allowed_concepts。',
    '- 方法论需覆盖 Marketing-Funnel、AIDA、Slogan-7-Principles 或 4P-Rhythm。',
    '- 页面文字必须出现营销传播、看点、燃点，并回扣定位承诺。',
    TRACEABLE_DATA_REF_INSTRUCTION,
    '输出严格 JSON: {"slides":[...]}',
    JSON.stringify(compactWritePayload({ context, planningQuestions, synthesize, chunkInsights, sourcePool }), null, 2),
  ].join('\n\n')
}

export async function runBuildingDeepResearch(args = {}) {
  return runThreeStepDeepResearch(args, {
    agentId: 'brand_building',
    purposePrefix: 'building',
    planQuestionsKey: 'building_questions',
    planSystem: PLAN_SYSTEM,
    planUser,
    fallbackQuestions,
    synthesizeSystem: SYNTHESIZE_SYSTEM,
    synthesizeUser,
    synthesizeTemperature: 0.5,
    writeSystem: WRITE_SYSTEM,
    writeUser,
    llmSteps: [
      'callClaude:building.plan',
      'callClaude:building.synthesize',
      'callClaude:building.write',
    ],
    searchSteps: [],
    writeTemperature: 0.4,
    minInsights: 3,
  })
}
