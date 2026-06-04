import { TRACEABLE_DATA_REF_INSTRUCTION, compactWritePayload, runThreeStepDeepResearch } from './deepresearch-common.mjs'

const PLAN_SYSTEM = '你是资深品牌定位策略师。你必须先基于上游真实 chunk 拆出定位需要回答的核心策略问题。'
const SYNTHESIZE_SYSTEM = '你是咨询级品牌定位策略师。你必须把上游真实洞察综合成定位三角、心智第一联想和 RTB 体系。'
const WRITE_SYSTEM = '你是咨询级品牌策略 PPT 作者。你只输出严格 JSON，页面必须符合 blueprint chunk pages。'

function planUser(context) {
  return [
    '请基于客户资料、上游 chunk 摘要和当前 blueprint chunk，列出 3-5 个定位核心问题。',
    '要求:',
    '- 不联网，不凭空补行业事实，只使用上游真实 chunk 和客户资料。',
    '- 问题必须围绕“抢哪个第一联想、目标是谁、品类框架是什么、RTB 是什么、反方是谁”。',
    '- 输出严格 JSON: {"positioning_questions":["..."]}。',
    JSON.stringify(context, null, 2),
  ].join('\n\n')
}

function fallbackQuestions(context) {
  return [
    `${context.client_name || '客户品牌'} 最应该抢占哪个心智第一联想？`,
    '目标人群、品类框架、利益点和 RTB 如何压成一句定位？',
    '如何避免只写漂亮口号，而让定位承接行业、竞品和消费者证据？',
  ]
}

function synthesizeUser({ context, planningQuestions, sourcePool }) {
  return [
    '请基于上游真实 chunks 和客户资料，产出 1 句 chunk_takeaway 和 3-4 条定位洞察。',
    '要求:',
    '- 必须引用上游 chunk_id 或明确说明来自哪个上游 takeaway。',
    '- 必须形成定位三角: target / frame of reference / benefit / RTB。',
    '- 必须提出心智第一联想，且说明为什么不是泛“专业配件”。',
    '- 每条 insight 必须带 source_url，source_url 只能从 source_pool 里选，优先 T1/T2。',
    '输出严格 JSON: {"chunk_takeaway":"...","chunk_insights":[{"insight":"...","source_url":"https://..."}]}',
    JSON.stringify({
      planningQuestions,
      chunk_insight_question: context.chunk.chunk_insight_question,
      upstreamChunksSummary: context.upstreamChunksSummary,
      availableChunks: context.availableChunks,
      source_pool: sourcePool,
    }, null, 2),
  ].join('\n\n')
}

function writeUser({ context, planningQuestions, synthesize, chunkInsights, sourcePool }) {
  return [
    '请把定位策略转成 blueprint chunk 的 slide JSON。',
    '硬约束:',
    '- slides.length 必须等于 chunk.pages.length。',
    '- slides[i].page_no 必须等于 chunk.pages[i].page_no。',
    '- slides[i].layout 必须等于 chunk.pages[i].recommended_layout。',
    '- models_used 只能来自 chunk.allowed_concepts。',
    '- 方法论需覆盖 STP、Brand-Positioning-Triangle、Aaker-Brand-Personality 或 Slogan-7-Principles。',
    '- 页面文字必须出现品牌定位/定位主张、RTB/理由/支撑、心智第一联想。',
    TRACEABLE_DATA_REF_INSTRUCTION,
    '输出严格 JSON: {"slides":[...]}',
    JSON.stringify(compactWritePayload({ context, planningQuestions, synthesize, chunkInsights, sourcePool }), null, 2),
  ].join('\n\n')
}

export async function runPositioningDeepResearch(args = {}) {
  return runThreeStepDeepResearch(args, {
    agentId: 'brand_positioning',
    purposePrefix: 'positioning',
    planQuestionsKey: 'positioning_questions',
    planSystem: PLAN_SYSTEM,
    planUser,
    fallbackQuestions,
    synthesizeSystem: SYNTHESIZE_SYSTEM,
    synthesizeUser,
    writeSystem: WRITE_SYSTEM,
    writeUser,
    llmSteps: [
      'callClaude:positioning.plan',
      'callClaude:positioning.synthesize',
      'callClaude:positioning.write',
    ],
    searchSteps: [],
    minInsights: 3,
  })
}
