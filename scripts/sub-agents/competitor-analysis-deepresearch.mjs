import { TRACEABLE_DATA_REF_INSTRUCTION, compactWritePayload, runFiveStepDeepResearch } from './deepresearch-common.mjs'
import {
  appendMethodologyToSystem,
  buildBlueprintContextSnippet,
  injectBlueprintSnippetIntoContext,
} from './methodology-injection.mjs'

const PLAN_SYSTEM = '你是品牌策略的竞品分析专家。你必须先把竞争问题拆成可被真实 Web Search 验证的研究子问题。'
const READ_SYSTEM = '你是严谨竞品研究员。你只从搜索结果中筛选竞品产品、定价、渠道、主张、口碑和动态事实。'
const SYNTHESIZE_SYSTEM = '你是咨询级竞争策略师。你必须把竞品事实压缩成竞品矩阵、心智地图和差异化空缺。'
const WRITE_SYSTEM = '你是咨询级品牌策略 PPT 作者。你只输出严格 JSON，页面必须符合 blueprint chunk pages。'

function planUser(context) {
  const competitorText = context.competitors || '客户已知竞品 / 主要替代方案'
  return [
    '请基于以下客户和蓝图 chunk，列出 6-8 个竞品研究子问题。',
    '要求:',
    `- 子问题必须围绕“主要竞品的真实策略 + ${context.client_name || '客户品牌'} 可以抢的差异化点”。`,
    '- 至少包含: 头部竞品产品矩阵、定价/价格带、渠道、营销主张、用户口碑、2025 近期动态。',
    '- 还必须搜索“目标用户/采购场景/业务成果/付费意愿”证据；没有这类证据时，不得把竞品功能差异直接写成心智空位。',
    `- 必须覆盖客户已知竞品: ${competitorText}。`,
    '- 输出严格 JSON: {"sub_questions":["..."],"needs_ugc_search":true|false}。',
    JSON.stringify(context, null, 2),
  ].join('\n\n')
}

function fallbackQuestions(context) {
  const name = context.client_name || '客户品牌'
  const competitors = context.competitors || '主要替代方案'
  const industry = context.client_industry || '目标行业'
  const products = context.core_products || '核心产品'
  return [
    `${name} competitors ${competitors} comparison strategy`,
    `${competitors} ${industry} positioning pricing model 2025`,
    `${competitors} ${products} product matrix feature comparison`,
    `${competitors} user review positioning pain points`,
    `${industry} ${name} target users procurement business outcome demand`,
    `${industry} competitor landscape ${name} differentiation`,
    `${name} ${competitors} competitor matrix positioning`,
  ]
}

function readUser({ context, searchSummary, localEvidence = [] }) {
  return [
    '请从以下搜索结果和 local_evidence 中筛选 10-16 条竞品事实。',
    '要求:',
    '- 每个核心竞品尽量至少保留 2 条事实；不要写死非当前客户竞品。',
    '- fact 必须覆盖 product_matrix / pricing / channel / marketing_claim / user_reputation / recent_move / procurement_signal / demand_signal / business_outcome 中至少一种。',
    '- 如果事实能证明目标用户、采购场景、付费/预算、业务成果或需求痛点，type 必须标成 procurement_signal、demand_signal、business_outcome 或 user_reputation。',
    '- 可从 local_evidence 抽取 fact；本地一手 fact 的 source/source_url 必须写原始文件路径，source_tier 写 T1。',
    '- source_url 必须是可追溯来源：真实 https URL 或 local_evidence 中的本地路径。',
    '输出严格 JSON: {"facts":[{"statement":"...","source_url":"https://或本地路径","source_tier":"T1|T2|T3|T4","source_label":"...","type":"first_party|product_matrix|pricing|channel|marketing_claim|user_reputation|recent_move|procurement_signal|demand_signal|business_outcome|official_data","confidence":"high|medium|low","supports":"..."}]}',
    JSON.stringify({ searchSummary, local_evidence: localEvidence, chunk_insight_question: context.chunk.chunk_insight_question }, null, 2),
  ].join('\n\n')
}

function synthesizeUser({ context, facts }) {
  return [
    '请基于 facts 产出 1 句 chunk_takeaway 和 3-4 条竞争洞察。',
    '洞察必须服务于“竞争心智里还有哪个可占空位，且不是竞品已牢牢占住的”。',
    `必须覆盖: 竞品流派、差异化空缺、${context.client_name || '客户品牌'} 该避开的同质化战场。`,
    '- 如果要提出“品牌策划 / 策略工作流 / 专业 Agent / 心智空位”结论，必须同时引用竞品能力证据和目标用户/采购/业务成果证据。',
    '- 如果只有竞品官网功能证据，没有用户需求或采购证据，只能写“待验证假设”，不能写成已证明空位。',
    'chunk_takeaway 必须具体，不得使用“本部分分析了/赋能/闭环/打造”。',
    '每条 insight 必须带 source_url。',
    '输出严格 JSON: {"chunk_takeaway":"...","chunk_insights":[{"insight":"...","source_url":"https://..."}]}',
    JSON.stringify({ facts, chunk_insight_question: context.chunk.chunk_insight_question }, null, 2),
  ].join('\n\n')
}

function pageNosByConcept(context, conceptPattern) {
  return (context.chunk.pages || [])
    .filter(page => conceptPattern.test(String(page.concept_for_this_page || page.page_intent || page.page_subtitle || '')))
    .map(page => page.page_no)
}

function formatPageRange(pageNos = []) {
  const sorted = [...new Set(pageNos)].sort((a, b) => a - b)
  if (sorted.length === 0) return ''
  if (sorted.length === 1) return `Page ${sorted[0]}`
  const isContiguous = sorted.every((pageNo, index) => index === 0 || pageNo === sorted[index - 1] + 1)
  return isContiguous ? `Page ${sorted[0]}-${sorted[sorted.length - 1]}` : `Page ${sorted.join('/')}`
}

function pageRoleInstructions(context) {
  const pages = context.chunk.pages || []
  const pageNos = pages.map(page => page.page_no).filter(pageNo => pageNo != null)
  const matrixPages = pageNosByConcept(context, /Competitor-Matrix/i)
  const perceptualPages = pageNosByConcept(context, /Perceptual-Map/i)
  const summaryPages = pages
    .filter(page => /小结|summary|SWOT/i.test(String(page.page_intent || page.page_subtitle || page.concept_for_this_page || '')))
    .map(page => page.page_no)
  const matrixPage = matrixPages.includes(22) ? 22 : (matrixPages.at(-1) || pageNos.at(-3))
  const perceptualPage = perceptualPages[0] || pageNos.at(-2)
  const summaryPage = summaryPages.at(-1) || pageNos.at(-1)
  const factPages = pageNos.filter(pageNo => ![matrixPage, perceptualPage, summaryPage].includes(pageNo))

  return [
    factPages.length
      ? `- ${formatPageRange(factPages)} 只能输出竞争流派和玩家事实：头部/挑战者/替代方案分层、公开主张、产品能力、价格或渠道；不得提前写“PPTAgent 抢空位/心智/专业 Agent”结论。`
      : '',
    matrixPage
      ? `- Page ${matrixPage} 只能输出 Competitor-Matrix：比较 Gamma/WPS/Canva/AiPPT/ChatPPT/Beautiful.ai 在输入方式、编辑兼容、视觉生态、价格/免费、策略深度上的差异；不得把 page ${matrixPage} 写成“PPTAgent 抢空位/心智/专业 Agent”结论页。`
      : '',
    perceptualPage
      ? `- Page ${perceptualPage} 才输出 Perceptual-Map：如果指出空位，必须同时引用竞品能力来源 + 独立需求证据；无独立需求证据时只写“待验证假设”。`
      : '',
    summaryPage
      ? `- Page ${summaryPage} 输出 SWOT/竞争小结：必须写“已证明 / 未证明 / 下一步验证动作 / 风险边界”，不要重复 page ${matrixPage || '?'} / ${perceptualPage || '?'} 的空位标题；如果缺客户一手或付费案例，必须明示“付费案例仍待验证”。`
      : '',
  ].filter(Boolean)
}

function writeUser({ context, facts, synthesize, chunkInsights, sourcePool = [] }) {
  return [
    '请把竞争洞察转成 blueprint chunk 的 slide JSON。',
    '硬约束:',
    '- slides.length 必须等于 chunk.pages.length。',
    '- slides[i].page_no 必须等于 chunk.pages[i].page_no。',
    '- slides[i].layout 必须等于 chunk.pages[i].recommended_layout。',
    '- models_used 只能来自 chunk.allowed_concepts。',
    '- 方法论需覆盖 Competitor-Matrix、Perceptual-Map、SWOT；如用 Porter-5-Forces 也必须来自 allowed_concepts。',
    `- 页面文字必须至少出现两个具体竞品名，优先客户已知竞品: ${context.competitors || '主要替代方案'}。`,
    `- 必须明确 ${context.client_name || '客户品牌'} 应避开的同质化战场和可验证的差异化方向；证据不足时只能写“待验证假设”或“进入验证清单”。`,
    '- 任何“品牌策划 / 策略工作流 / 专业 Agent / 心智空位”结论的 data_refs 必须至少包含 1 条竞品能力来源 + 1 条用户/采购/业务成果来源；没有后者则必须写成“待验证假设”。',
    '- 用户/采购/业务成果来源必须是独立需求证据（如 IDC/咨询报告/行业报告/客户一手资料），不能只用 Gamma/WPS/Canva 等竞品官网的 use cases 冒充需求证据。',
    ...pageRoleInstructions(context),
    '- 任何页面点名某个竞品（Gamma/WPS/Canva/AiPPT/ChatPPT/Beautiful.ai/Office Copilot），该页 data_refs 必须有对应竞品的官网/产品页/公开页面；没有引用就不要点名。',
    '- 矩阵页如要同时点名多个竞品，data_refs 必须覆盖每个被点名竞品；引用预算不够时，优先删掉缺来源的竞品名，而不是保留无证据名单。',
    '- GitHub stars/forks/repo 只能证明技术关注度，不能作为用户需求、心智占位、付费意愿或可抢空位证据。',
    '- 只要页面写了“待验证 / 仍需验证 / 付费案例仍待验证”，就不得同时写“应以 / 应该 / 切入 / 抢占 / 定位为 / 成为”等行动定论；只能写“进入验证清单 / 下一步验证”。',
    '- 为控制真实 API 时延，每页 core_points 2-4 条，每条不超过 35 个汉字；每页 data_refs 1-2 条。',
    TRACEABLE_DATA_REF_INSTRUCTION,
    '输出严格 JSON: {"slides":[...]}',
    JSON.stringify(compactWritePayload({ context, facts, synthesize, chunkInsights, sourcePool }), null, 2),
  ].join('\n\n')
}

export async function buildCompetitorDeepResearchConfig({ slug } = {}) {
  return {
    agentId: 'competitor_analysis',
    purposePrefix: 'competitor',
    planSystem: await appendMethodologyToSystem(PLAN_SYSTEM, 'competitor_analysis'),
    planUser: async context => planUser(injectBlueprintSnippetIntoContext(
      context,
      await buildBlueprintContextSnippet(slug || context.slug, 'competitor_analysis'),
    )),
    fallbackQuestions,
    readSystem: READ_SYSTEM,
    readUser,
    readFocus: '竞品产品矩阵、渠道、主张、近期动态和差异化空缺',
    synthesizeSystem: SYNTHESIZE_SYSTEM,
    synthesizeUser,
    llmSteps: [
      'callClaude:competitor.plan',
      'callClaude:competitor.read',
      'callClaude:competitor.synthesize',
      'callClaude:competitor.write',
    ],
    searchSteps: [
      'tavilySearch via webSearch',
      'serperSearch via webSearch',
      'socialSearch via webSearch when needs_ugc_search=true',
    ],
    allowUgcSearch: true,
    socialSearchPlatform: 'reddit',
    socialQueries: ({ englishClientName, subQuestions }) => [
      `${englishClientName} competitors comparison review`,
      `${englishClientName} user review competitors`,
      ...(subQuestions || []).slice(0, 1),
    ],
    maxSocialSearches: 2,
    minSearches: 6,
    maxQuestions: 8,
    minFacts: 3,
    writeMaxTokens: 3600,
    writeSystem: await appendMethodologyToSystem(WRITE_SYSTEM, 'competitor_analysis'),
    writeUser,
  }
}

export async function runCompetitorDeepResearch(args = {}) {
  return runFiveStepDeepResearch(args, await buildCompetitorDeepResearchConfig({ slug: args.slug }))
}
