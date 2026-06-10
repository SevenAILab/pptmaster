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
  const methodologySection = formatMethodologySection(options.methodology)
  const system = [
    '你是资深品牌策略主笔，目标是生成一份少而精的非锁页小闭环 deck。',
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
    methodologySection
      ? `方法论运用：至少 ${Math.max(2, Math.ceil((exactPages || minPages) / 3))} 页必须显式运用所给框架，运用页须在 intent 或某条 core_points 中以 "[框架: 名称]" 格式标注；框架必须落到该客户的具体判断，禁止任何一页复述框架定义本身。`
      : '',
    '每页 core_points 最多 3 条，blocks 最多 2 个；不要输出 thinking_log、分析过程或额外字段。',
    'layout 使用现有 smart layout 名称，例如 split-statement、framework-grid、timeline、pyramid、matrix-2x2、hero-statement。',
    'action_title 必须是完整判断句，不要只写页面主题。',
  ].filter(Boolean).join('\n')
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
    methodologySection,
    '',
    '## 生成要求',
    `- ${pageRequirement}`,
    '- 每页都必须回扣 strategic-question.md 的根问题，每页推进一个针对该客户的新判断。',
    '- 优先使用同源输入中的事实：客户表单、资料摘要与已核实研究发现。',
    '- data_refs.source 可以引用 inputs/<slug>/summary.md、inputs/<slug>/form.json、inputs/<slug>/strategic-question.md 或摘要中列出的公开 URL。',
    hasResearch
      ? '- 有外部研究发现支撑的页必须优先引用研究简报的真实 URL；引用研究发现时不要只写 source_id，data_refs.source 必须是完整 URL。'
      : '- 若引用公开来源，data_refs.source 必须是完整 URL。',
    '- 若是建议性判断但缺真实证据，明确标 hypothesis，并写后续验证方法。',
  ].join('\n')
  return { system, user }
}

function formatMethodologySection(methodology) {
  const concepts = Array.isArray(methodology?.concepts) ? methodology.concepts : []
  if (concepts.length === 0) return ''
  const blocks = concepts.map(concept => `### [框架: ${concept.name}]\n${concept.content}`)
  const casePattern = methodology?.casePattern
  return [
    '',
    '## Seven 方法论框架（本案必须运用）',
    ...blocks,
    ...(casePattern ? ['', '## 范例 pattern（学结构与推导方式，不抄内容）', casePattern.content] : []),
  ].join('\n')
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
  const form = brief.form || {}
  const name = normalizeString(form.name) || '客户品牌'
  const industry = normalizeString(form.industry) || '所在行业'
  const audienceList = asArray(form.target_audience).map(normalizeString).filter(Boolean)
  const audience = audienceList[0] || '目标人群'
  const source = `inputs/${brief.slug}/summary.md`
  const rootQuestion = brief.strategicQuestion
    .split('\n')
    .find(line => line.includes('根问题')) || '回扣根问题'
  const titles = [
    `${name} 的品类锚点应重新定义，避免落入 ${industry} 的同质化竞争`,
    `首批客群应锁定 ${audience}，优先解决其最高频最痛的任务`,
    `${name} 的可信理由应来自现有资产与可验证的差异化证据`,
    '交付与传播形态应服务于价值表达，聚焦客户可感知的结果',
    `上线后应持续验证 ${audience} 能否准确复述品类名、使用场景与替代对象`,
  ]
  const pointSets = [
    [`竞争参照系需要从 ${industry} 的默认品类上移一层。`, '第一心智联想必须能与主要竞品区隔。'],
    [`${audience} 具有更明确的方案需求与决策路径。`, '第二阶段再扩展到泛人群。'],
    ['资产盘点决定差异化是否站得住。', '证据链给出从主张到信任的样例。'],
    ['形态服务于体验，不应遮蔽核心价值。', '对外表达多讲可被讨论的结论。'],
    ['用访谈检查品类名是否被准确复述。', '用转化实验验证表述是否降低误解。'],
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
