import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALLOWED_BLOCK_TYPES, validateProcessLocks } from './process-locks.mjs'
import { classifySource, isHttpSource } from './source-tiers.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function readJson(filePath) {
  return JSON.parse(readText(filePath))
}

function asArray(value) {
  if (Array.isArray(value)) return value
  if (value === null || value === undefined || value === '') return []
  return [String(value)]
}

function normalizeString(value) {
  return String(value ?? '').trim()
}

export function buildBriefFromInputs({ root = REPO_ROOT, slug, inputRoot } = {}) {
  if (!slug) throw new Error('buildBriefFromInputs requires slug')
  const baseInputRoot = inputRoot || path.join(root, 'inputs')
  const inputDir = path.join(baseInputRoot, slug)
  const formPath = path.join(inputDir, 'form.json')
  const summaryPath = path.join(inputDir, 'summary.md')
  const strategicQuestionPath = path.join(inputDir, 'strategic-question.md')
  for (const filePath of [formPath, summaryPath, strategicQuestionPath]) {
    if (!fs.existsSync(filePath)) throw new Error(`Missing required input file: ${filePath}`)
  }
  const form = readJson(formPath)
  return {
    slug,
    inputDir,
    formPath,
    summaryPath,
    strategicQuestionPath,
    form,
    formText: JSON.stringify(form, null, 2),
    summary: readText(summaryPath),
    strategicQuestion: readText(strategicQuestionPath),
  }
}

export function buildGenerationPrompt(brief, options = {}) {
  const minPages = Number(options.minPages ?? 5)
  const maxPages = Number(options.maxPages ?? 8)
  const exactPages = options.pages ? Number(options.pages) : null
  const pageRequirement = exactPages
    ? `生成 ${exactPages} 页（P2 过程锁允许 ${minPages}-${maxPages} 页，本次真实验固定取下限以减少重复）。`
    : `生成 ${minPages}-${maxPages} 页。`
  const allowed = ALLOWED_BLOCK_TYPES.join(', ')
  const researchBrief = options.researchBrief
  const researchSection = formatResearchBrief(researchBrief)
  const hasResearch = Boolean(researchSection)
  const system = [
    '你是 PPTAgent 的资深品牌策略主笔，目标是生成一份少而精的非锁页小闭环 deck。',
    `只输出 JSON，不要 Markdown，不要解释。${pageRequirement}`,
    '每页都必须推进一个新判断，并明确回扣 strategic-question.md 的根问题。',
    '不要把 80 页 blueprint 的章节机械压缩；请用顾问判断取舍，只保留最能证明定位的主线。',
    '输出 schema 固定为 {"slides":[...]}。每页字段必须包含：page_no, intent, action_title, layout, core_points, data_refs, evidence_kind, validation_method, blocks。',
    `blocks[].type 只能使用：${allowed}。`,
    '证据规则：每页必须有可追溯 data_refs；若资料不足，必须 evidence_kind:"hypothesis" 并给出 validation_method。不能只因为有 core_points 就当作证据成熟。',
    'evidence_kind 只能是 empirical、deductive、hypothesis。',
    '可执行动作：每页至少一个 core_points 或 blocks 项必须包含具体动作；5 页里至少 4 页要包含数字/比例/量化锚点和时间窗口（如 3 个月内、Q1、第 1 周）。避免只停留在战略话术。',
    hasResearch
      ? '外部证据：至少 2 页引用研究简报中的外部 T1/T2 真实来源，在页面文本中写出对应精确数字，并在 data_refs 写入真实来源 URL、source_tier、type。'
      : '外部证据：若使用公开来源，data_refs 必须写真实来源 URL、source_tier、type；无来源的判断显式标为假设。',
    '每页 core_points 最多 3 条，blocks 最多 2 个；不要输出 thinking_log、分析过程或额外字段。',
    'layout 使用现有 smart layout 名称，例如 split-statement、framework-grid、timeline、pyramid、matrix-2x2、hero-statement。',
    'action_title 必须是完整判断句，不要只写页面主题。',
  ].join('\n')
  const user = [
    `input slug: ${brief.slug}`,
    '',
    '## form.json',
    brief.formText,
    '',
    '## summary.md',
    brief.summary,
    '',
    '## strategic-question.md',
    brief.strategicQuestion,
    researchSection,
    '',
    '## 生成要求',
    `- ${pageRequirement}`,
    '- 每页都必须回扣根问题，说明它如何证明 PPTAgent 不是“做得更快的 PPT 工具”，而是“品牌策划方案 Agent”。',
    '- 优先使用同源输入中的事实：客户资料、Seven 方法论资产、6 个品牌策略 Sub-Agent、HTML 横向翻页 PPT、竞品资料来源。',
    '- data_refs.source 可以引用 inputs/<slug>/summary.md、inputs/<slug>/form.json、inputs/<slug>/strategic-question.md 或摘要中列出的公开 URL。',
    hasResearch
      ? '- 有外部研究发现支撑的页必须优先引用研究简报的真实 URL；引用研究发现时不要只写 source_id，data_refs.source 必须是完整 URL。'
      : '- 若引用公开来源，data_refs.source 必须是完整 URL。',
    '- 若是建议性判断但缺真实证据，明确标 hypothesis，并写后续验证方法。',
  ].join('\n')
  return { system, user }
}

function formatResearchBrief(researchBrief) {
  const findings = Array.isArray(researchBrief?.findings) ? researchBrief.findings : []
  if (findings.length === 0) return ''
  const sources = Array.isArray(researchBrief?.sources) ? researchBrief.sources : []
  const findingLines = findings.map(finding => [
    `- ${finding.claim}`,
    finding.evidence ? `证据：${finding.evidence}` : '',
    `来源[${finding.source_id ?? '?'}] ${finding.source_tier || ''} ${finding.source_url || finding.source || ''}`,
    finding.confidence ? `confidence=${finding.confidence}` : '',
  ].filter(Boolean).join('；'))
  const sourceLines = sources.map(source =>
    `[${source.id}] ${source.url} (${source.source_tier || 'T3'} / ${source.type || 'media'})`,
  )
  return [
    '',
    '## 已核实的外部研究发现',
    ...findingLines,
    '',
    '## 研究来源',
    ...sourceLines,
  ].join('\n')
}

function extractJsonObject(text) {
  const value = String(text || '')
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = fenced ? fenced[1] : value
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object in generated deck response: ${value.slice(0, 200)}`)
  }
  return raw.slice(start, end + 1)
}

export function parseGeneratedDeck(text) {
  const parsed = JSON.parse(extractJsonObject(text))
  if (!Array.isArray(parsed?.slides)) {
    throw new Error('Generated deck JSON must contain slides[]')
  }
  return parsed
}

function normalizeRef(ref) {
  if (typeof ref === 'string') {
    const source = normalizeString(ref)
    if (!source) return null
    return { source, type: 'unknown', source_tier: 'T3' }
  }
  const source = normalizeString(ref?.source || ref?.source_url || ref?.url)
  if (!source) return null
  const httpSource = isHttpSource(source)
  const inferred = httpSource ? classifySource(source) : {}
  return {
    ...ref,
    source,
    source_tier: httpSource ? inferred.source_tier : (normalizeString(ref?.source_tier) || 'T3'),
    source_label: httpSource ? inferred.source_label : normalizeString(ref?.source_label),
    type: httpSource ? inferred.type : (normalizeString(ref?.type) || 'client_input'),
    model_source_tier: httpSource && normalizeString(ref?.source_tier) ? normalizeString(ref.source_tier) : undefined,
    model_source_type: httpSource && normalizeString(ref?.type) ? normalizeString(ref.type) : undefined,
  }
}

function normalizeBlock(block) {
  if (typeof block === 'string') {
    return { type: 'callout', text: block }
  }
  return {
    ...block,
    type: normalizeString(block?.type) || 'callout',
  }
}

function fallbackBlocks(slide) {
  return [{
    type: 'bullet_list',
    title: '核心判断',
    items: asArray(slide.core_points).map(normalizeString).filter(Boolean),
  }]
}

export function normalizeGeneratedDeck(deck, { brief, generationMode = 'model' } = {}) {
  if (!Array.isArray(deck?.slides)) {
    throw new Error('normalizeGeneratedDeck requires deck.slides[]')
  }
  const form = brief?.form || {}
  const slides = deck.slides.map((slide, index) => {
    const pageNo = Number(slide?.page_no || index + 1)
    const corePoints = asArray(slide?.core_points).map(normalizeString).filter(Boolean)
    const blocks = (Array.isArray(slide?.blocks) && slide.blocks.length ? slide.blocks : fallbackBlocks({ ...slide, core_points: corePoints }))
      .map(normalizeBlock)
    const dataRefs = asArray(slide?.data_refs).map(normalizeRef).filter(Boolean)
    const intent = normalizeString(slide?.intent || slide?.page_intent)
    return {
      page_no: pageNo,
      intent,
      page_intent: intent,
      page_subtitle: normalizeString(slide?.page_subtitle) || `NONLOCKED ${pageNo}`,
      action_title: normalizeString(slide?.action_title),
      layout: normalizeString(slide?.layout) || 'split-statement',
      core_points: corePoints,
      data_refs: dataRefs,
      evidence_kind: normalizeString(slide?.evidence_kind),
      validation_method: normalizeString(slide?.validation_method),
      blocks,
      content_blocks: blocks,
    }
  })

  return {
    client_profile: {
      name: form.name || deck.client_profile?.name || 'PPTAgent',
      industry: form.industry || deck.client_profile?.industry || '',
      target_audience: form.target_audience || deck.client_profile?.target_audience || [],
      render_style: form.render_style || deck.client_profile?.render_style || 'swiss',
    },
    metadata: {
      ...deck.metadata,
      generated_by: 'generate-nonlocked-deck',
      generation_mode: generationMode,
      input_slug: brief?.slug || deck.metadata?.input_slug || '',
      strategic_question: brief?.strategicQuestion || '',
      schema: 'nonlocked-deck-v1',
    },
    slides,
  }
}

export function buildDryRunDeck(brief) {
  const source = `inputs/${brief.slug}/summary.md`
  const rootQuestion = brief.strategicQuestion
    .split('\n')
    .find(line => line.includes('根问题')) || '回扣根问题'
  const titles = [
    '新品类锚点应落在“品牌策划方案 Agent”，避免滑回通用演示工具',
    '首批客群应锁定高频提案顾问与小型咨询团队，先吃最痛任务',
    '可信理由来自 Sub-Agent 分工、Seven 方法论资产和真实案例库组合',
    'HTML 横向翻页只是交付外壳，销售话术要强调策略判断与可提案结果',
    '上线验证要追踪用户能否复述品类名、使用场景和替代对象',
  ]
  const pointSets = [
    ['竞争参照从 presentation creation 上移到品牌策略交付。', '第一心智必须能区隔 Gamma/WPS/AiPPT/ChatPPT。'],
    ['顾问与小团队拥有更高频、更明确的方案生产压力。', '泛甲方市场部可作为第二阶段扩展人群。'],
    ['方法论资产决定判断质量，Sub-Agent 分工决定生产稳定性。', '案例库提供从框架到表达的可信样例。'],
    ['页面形态服务于提案体验，不应遮蔽策略价值。', '对外表达应少讲自动排版，多讲可被客户讨论的结论。'],
    ['用访谈检查“品牌策划方案 Agent”是否被准确复述。', '用转化页 A/B 测试替代对象表述是否降低误解。'],
  ]
  return {
    slides: titles.map((title, index) => ({
      page_no: index + 1,
      intent: `${rootQuestion}：第 ${index + 1} 个证明点`,
      action_title: title,
      layout: ['split-statement', 'framework-grid', 'matrix-2x2', 'timeline', 'hero-statement'][index],
      core_points: pointSets[index],
      data_refs: [{ source, type: 'client_input', source_tier: 'T1' }],
      evidence_kind: 'deductive',
      validation_method: '用目标用户访谈验证该判断是否能被复述',
      blocks: [{ type: 'bullet_list', title: '证明点', items: ['主张', '理由', '验证'] }],
    })),
  }
}

export async function generateDeck({ brief, callModel, options = {} } = {}) {
  if (!brief) throw new Error('generateDeck requires brief')
  const { system, user } = buildGenerationPrompt(brief, options)
  let rawText
  if (options.dryRun) {
    rawText = JSON.stringify(buildDryRunDeck(brief), null, 2)
  } else {
    if (typeof callModel !== 'function') throw new Error('generateDeck requires callModel unless options.dryRun=true')
    const response = await callModel(system, user, options)
    rawText = typeof response === 'string' ? response : response?.text
  }
  const parsed = parseGeneratedDeck(rawText)
  const deck = normalizeGeneratedDeck(parsed, { brief, generationMode: options.dryRun ? 'dry-run' : 'model' })
  const locks = validateProcessLocks(deck, options.processLocks || {})
  return {
    deck,
    locks,
    rawText,
    prompt: { system, user },
  }
}
