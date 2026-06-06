import { TRACEABLE_DATA_REF_INSTRUCTION, compactWritePayload, runFiveStepDeepResearch } from './deepresearch-common.mjs'
import {
  appendMethodologyToSystem,
  buildBlueprintContextSnippet,
  injectBlueprintSnippetIntoContext,
} from './methodology-injection.mjs'

const PLAN_SYSTEM = '你是品牌策略的消费者洞察分析师。你必须先把消费者问题拆成可被真实 Web Search 验证的研究子问题。'
const READ_SYSTEM = '你是消费者研究员。你只从搜索结果中筛选有价值的人群事实、真实用户信号和可追溯来源。'
const SYNTHESIZE_SYSTEM = '你是咨询级消费者洞察策略师。你必须把事实压缩成人群分层、决策驱动力和定位可用洞察。'
const WRITE_SYSTEM = '你是咨询级品牌策略 PPT 作者。你只输出严格 JSON，页面必须符合 blueprint chunk pages。'

function planUser(context) {
  return [
    '请基于以下客户和蓝图 chunk，列出 5-8 个消费者研究子问题。',
    '要求:',
    '- 子问题必须围绕“客户的真实人群是谁 + 他们的真实痛点 vs 期望”。',
    '- 至少包含: 人群规模/分层、决策路径、触点偏好、真实痛点、价值期望。',
    '- 输出严格 JSON: {"sub_questions":["..."],"needs_ugc_search":true|false}。',
    JSON.stringify(context, null, 2),
  ].join('\n\n')
}

function fallbackQuestions(context) {
  const name = context.client_name || '客户品牌'
  const audience = context.target_audience || '目标用户'
  const industry = context.client_industry || '目标行业'
  const products = context.core_products || '核心产品'
  return [
    `${name} ${audience} 用户画像 购买动机`,
    `${name} ${products} 用户评价 痛点 工作流`,
    `${industry} ${audience} 决策路径 触点 偏好`,
    `${industry} 用户痛点 价值收益 预算 意愿`,
    `${name} reviews users pain points workflow`,
  ]
}

function readUser({ context, searchSummary, localEvidence = [] }) {
  return [
    '请从以下 web/UGC 搜索结果和 local_evidence 中筛选 8-12 条有价值消费者洞察。',
    '要求:',
    '- 标记每条 fact 的 type: first_party | industry_report | user_quote | ugc_signal | official_data。',
    '- 可从 local_evidence 抽取 fact；本地一手 fact 的 source/source_url 必须写原始文件路径，source_tier 写 T1。',
    '- 优先保留 T1 一手用户数据和 T2 权威信号；UGC 只能作辅证。',
    '- 不要凭空编造用户原话；搜索结果没有原话时，写成可追溯的用户信号。',
    '输出严格 JSON: {"facts":[{"statement":"...","source_url":"https://或本地路径","source_tier":"T1|T2|T3|T4","source_label":"...","type":"first_party|user_quote|ugc_signal|industry_report|official_data","confidence":"high|medium|low","supports":"..."}]}',
    JSON.stringify({ searchSummary, local_evidence: localEvidence, chunk_insight_question: context.chunk.chunk_insight_question }, null, 2),
  ].join('\n\n')
}

function synthesizeUser({ context, facts }) {
  return [
    '请基于 facts 产出 1 句 chunk_takeaway 和 3-4 条消费者洞察。',
    '洞察必须服务于“优先服务谁，为什么这群人比泛人群更能支撑定位”。',
    '必须覆盖: 人群分层、JTBD/决策驱动力、痛点-收益、触点或旅程。',
    'chunk_takeaway 必须具体，不得使用“本部分分析了/赋能/闭环/打造”。',
    '每条 insight 必须带 source_url。',
    '输出严格 JSON: {"chunk_takeaway":"...","chunk_insights":[{"insight":"...","source_url":"https://..."}]}',
    JSON.stringify({ facts, chunk_insight_question: context.chunk.chunk_insight_question }, null, 2),
  ].join('\n\n')
}

function writeUser({ context, facts, synthesize, chunkInsights }) {
  return [
    '请把消费者洞察转成 blueprint chunk 的 slide JSON。',
    '硬约束:',
    '- slides.length 必须等于 chunk.pages.length。',
    '- slides[i].page_no 必须等于 chunk.pages[i].page_no。',
    '- slides[i].layout 必须等于 chunk.pages[i].recommended_layout。',
    '- models_used 只能来自 chunk.allowed_concepts。',
    '- 方法论需覆盖 Persona-5W2H、JTBD、Pain-Gain-Map 或 Consumer-Lifecycle。',
    '- 页面文字必须出现画像/Persona 或 5W2H、JTBD/任务、痛点/Pain、收益/Gain 中的关键概念。',
    TRACEABLE_DATA_REF_INSTRUCTION,
    '输出严格 JSON: {"slides":[...]}',
    JSON.stringify(compactWritePayload({ context, facts, synthesize, chunkInsights }), null, 2),
  ].join('\n\n')
}

export async function buildConsumerDeepResearchConfig({ slug } = {}) {
  return {
    agentId: 'consumer_insight',
    purposePrefix: 'consumer',
    planSystem: await appendMethodologyToSystem(PLAN_SYSTEM, 'consumer_insight'),
    planUser: async context => planUser(injectBlueprintSnippetIntoContext(
      context,
      await buildBlueprintContextSnippet(slug || context.slug, 'consumer_insight'),
    )),
    fallbackQuestions,
    readSystem: READ_SYSTEM,
    readUser,
    readFocus: '人群画像、真实痛点、决策路径和触点偏好',
    synthesizeSystem: SYNTHESIZE_SYSTEM,
    synthesizeUser,
    writeSystem: WRITE_SYSTEM,
    writeUser,
    llmSteps: [
      'callClaude:consumer.plan',
      'callClaude:consumer.read',
      'callClaude:consumer.synthesize',
      'callClaude:consumer.write',
    ],
    searchSteps: [
      'tavilySearch via webSearch',
      'serperSearch via webSearch',
      'socialSearch via webSearch when needs_ugc_search=true',
    ],
    allowUgcSearch: true,
    socialSearchPlatform: 'reddit',
    socialQueries: ({ englishClientName, subQuestions }) => [
      `${englishClientName} user review`,
      `${englishClientName} customer pain points`,
      ...(subQuestions || []).slice(0, 1),
    ],
    maxSocialSearches: 2,
    minSearches: 5,
    maxQuestions: 8,
    minFacts: 3,
    writeSystem: await appendMethodologyToSystem(WRITE_SYSTEM, 'consumer_insight'),
    writeUser,
  }
}

export async function runConsumerDeepResearch(args = {}) {
  return runFiveStepDeepResearch(args, await buildConsumerDeepResearchConfig({ slug: args.slug }))
}
