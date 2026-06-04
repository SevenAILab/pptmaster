import { TRACEABLE_DATA_REF_INSTRUCTION, compactWritePayload, runThreeStepDeepResearch } from './deepresearch-common.mjs'

const PLAN_SYSTEM = '你是资深年度营销规划策略师。你必须先基于上游真实 chunk 判断年度规划要回答的问题，以及是否需要补充外部搜索。'
const READ_SYSTEM = '你是年度营销研究员。你只从搜索结果中筛选年度节点、渠道触点、内容平台和行业事件相关事实。'
const SYNTHESIZE_SYSTEM = '你是咨询级年度规划策略师。你必须把定位和传播资产综合成 Q1-Q4、触点、预算和复盘 KPI。'
const WRITE_SYSTEM = '你是咨询级品牌策略 PPT 作者。你只输出严格 JSON，页面必须符合 blueprint chunk pages。'

function planUser(context) {
  return [
    '请基于客户资料、上游 chunk 摘要和当前 blueprint chunk，列出 3-5 个年度规划核心问题，并判断是否需要外部搜索。',
    '要求:',
    '- 默认不联网，优先使用上游真实 chunk 和客户资料。',
    '- 如果当前 chunk 需要外部节日/行业事件/渠道时点校准，needs_search=true，并给出 sub_questions。',
    '- 问题必须围绕 Q1-Q4 节奏、触点组合、预算分配、KPI/复盘。',
    '- 输出严格 JSON: {"planning_questions":["..."],"needs_search":false,"sub_questions":["..."]}。',
    JSON.stringify(context, null, 2),
  ].join('\n\n')
}

function fallbackQuestions(context) {
  return [
    `${context.client_name || '客户品牌'} Q1 Q2 Q3 Q4 年度营销日历如何排布？`,
    '线上线下私域媒体触点如何对应 AARRR 漏斗？',
    '预算分配和 KPI 复盘如何证明年度规划不是活动清单？',
  ]
}

function readUser({ context, searchSummary, localEvidence = [] }) {
  return [
    '请从以下搜索结果和 local_evidence 中筛选 6-10 条年度规划可用事实。',
    '要求:',
    '- fact 必须服务于年度节点、渠道触点、内容平台、创作者营销或行业事件。',
    '- 可从 local_evidence 抽取 fact；本地一手 fact 的 source/source_url 必须写原始文件路径，source_tier 写 T1。',
    '- source_url 必须是可追溯来源：真实 https URL 或 local_evidence 中的本地路径。',
    '输出严格 JSON: {"facts":[{"statement":"...","source_url":"https://或本地路径","source_tier":"T1|T2|T3|T4","source_label":"...","type":"first_party|event_signal|channel_signal|platform_signal|official_data","confidence":"high|medium|low","supports":"..."}]}',
    JSON.stringify({ searchSummary, local_evidence: localEvidence, chunk_insight_question: context.chunk.chunk_insight_question }, null, 2),
  ].join('\n\n')
}

function synthesizeUser({ context, planningQuestions, facts, sourcePool }) {
  return [
    '请基于上游真实 chunks、客户资料和可选事实，产出 1 句 chunk_takeaway 和 3-4 条年度规划洞察。',
    '要求:',
    '- 必须覆盖 Q1/Q2/Q3/Q4 年度节奏、触点组合、预算分配、KPI/复盘。',
    '- 不写泛活动清单，每个季度必须有不同阶段任务。',
    '- chunk_takeaway 禁止出现这些词: 本部分分析了、赋能、闭环、打造。',
    `- chunk_takeaway 要写成具体取舍句: “${context.client_name || '客户品牌'} 应该把 X 预算/触点/季度任务放到 Y，而不是 Z”。`,
    '- 每条 insight 必须带 source_url，source_url 只能从 source_pool 里选，优先 T1/T2。',
    '输出严格 JSON: {"chunk_takeaway":"...","chunk_insights":[{"insight":"...","source_url":"https://..."}]}',
    JSON.stringify({
      planningQuestions,
      facts,
      chunk_insight_question: context.chunk.chunk_insight_question,
      upstreamChunksSummary: context.upstreamChunksSummary,
      availableChunks: context.availableChunks,
      localEvidence: context.localEvidence,
      source_pool: sourcePool,
    }, null, 2),
  ].join('\n\n')
}

function writeUser({ context, planningQuestions, facts, synthesize, chunkInsights, sourcePool }) {
  return [
    '请把年度规划策略转成 blueprint chunk 的 slide JSON。',
    '硬约束:',
    '- slides.length 必须等于 chunk.pages.length。',
    '- slides[i].page_no 必须等于 chunk.pages[i].page_no。',
    '- slides[i].layout 必须等于 chunk.pages[i].recommended_layout。',
    '- models_used 只能来自 chunk.allowed_concepts。',
    '- 方法论需覆盖 Marketing-Calendar、AARRR-Funnel、4P-Rhythm 或 Marketing-Funnel。',
    '- 页面文字必须出现 Q1、Q2、Q3、Q4、年度/日历、预算/分配、KPI/OKR/AARRR/复盘。',
    '- 如果本次只给了部分 pages，就只写这些 pages；每页 core_points 2-4 条，每条不超过 35 个汉字；每页 data_refs 1-2 条。',
    TRACEABLE_DATA_REF_INSTRUCTION,
    '输出严格 JSON: {"slides":[...]}',
    JSON.stringify(compactWritePayload({ context, planningQuestions, facts, synthesize, chunkInsights, sourcePool }), null, 2),
  ].join('\n\n')
}

export async function runAnnualDeepResearch(args = {}) {
  return runThreeStepDeepResearch(args, {
    agentId: 'annual_planning',
    purposePrefix: 'annual',
    planQuestionsKey: 'planning_questions',
    allowOptionalSearch: true,
    planSystem: PLAN_SYSTEM,
    planUser,
    fallbackQuestions,
    readSystem: READ_SYSTEM,
    readUser,
    readFocus: '年度节点、渠道触点、内容平台、预算和复盘信号',
    synthesizeSystem: SYNTHESIZE_SYSTEM,
    synthesizeUser,
    synthesizeTemperature: 0.4,
    writeSystem: WRITE_SYSTEM,
    writeUser,
    llmSteps: [
      'callClaude:annual.plan',
      'callClaude:annual.synthesize',
      'callClaude:annual.write',
      'callClaude:annual.read when needs_search',
    ],
    searchSteps: [
      'tavilySearch via webSearch when needs_search',
      'serperSearch via webSearch when needs_search',
    ],
    minInsights: 3,
    minSearches: 3,
    maxQuestions: 5,
    maxResultsPerQuery: 4,
    writeBatchSize: 4,
    writeBatchMaxTokens: 3200,
  })
}
