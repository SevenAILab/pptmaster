import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { appendLLMAuditLog, estimateCost, readLLMAuditLog, summarizeLLMUsage } from '../audit-log.mjs'
import { callClaude, DEFAULT_CLAUDE_MODEL } from '../llm-clients/claude-client.mjs'
import { classifySource, coerceLocalDataRefValue, isVerifiableSource, normalizeSourcePath, sortBySourceTier, verifyLocalDataRef } from '../source-tiers.mjs'
import { webSearch } from '../web-search.mjs'
import {
  appendMethodologyToSystem,
  buildBlueprintContextSnippet,
  injectBlueprintSnippetIntoContext,
} from './methodology-injection.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const MAX_COST_PER_CHUNK_USD = 2
const GENERIC_TAKEAWAY_PATTERN = /本部分分析了|赋能|闭环|打造/
const TRACEABLE_DATA_REF_INSTRUCTION = [
  '- 每页 data_refs 必须使用可追溯来源：优先 T1 一手 / T2 权威二手，其次真实 https URL。',
  '- 关键战略判断（人群分层 / 复购 / 心智占位 / 市场规模 / 预算比例）必须挂 T1 或 T2；T3/T4 只能作辅证。',
  '- 可引用的 T1 本地来源只能来自当前客户 inputs/<slug>/first-party/**；assets/_raw/cases/** 只能作为方法论范例，永不写入最终 data_refs。',
  '- T1 本地来源的 data_refs.value 必须写该文件中可逐字验证的原文关键短语/数值，不要把多个来源或策略结论合并成一句。',
  '- 仍禁止 inputs/<slug>/summary.md 作为 data_refs.source（它是定性概述，不是数据来源）。',
].join('\n')
const GROWTH_MATH_INSTRUCTION = [
  '- 涉及 CAGR / 年复合增长率时，必须核对“起始年份、结束年份、起始值、结束值、CAGR”是否数学一致。',
  '- 如果搜索摘要或来源片段中的起止值与 CAGR 明显不一致，必须丢弃该数值组合，不得写入 facts、chunk_insights 或 data_refs。',
  '- 不要自行推导或补写 CAGR；只有来源明确给出且与起止值一致时才可引用。',
].join('\n')

function repoPath(...segments) {
  return path.join(REPO_ROOT, ...segments)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function usageTokens(usage = {}) {
  return {
    input_tokens: Number(usage.input_tokens ?? usage.prompt_tokens ?? 0),
    output_tokens: Number(usage.output_tokens ?? usage.completion_tokens ?? 0),
    cache_read_tokens: Number(usage.cache_read_input_tokens ?? usage.cache_read_tokens ?? 0),
    cache_creation_tokens: Number(usage.cache_creation_input_tokens ?? usage.cache_creation_tokens ?? 0),
  }
}

function extractJsonFromText(text, expectedKeys = []) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = fenced?.[1] || text
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object found in LLM response: ${text.slice(0, 240)}`)
  }

  const parsed = JSON.parse(trimmed.slice(start, end + 1))
  for (const key of expectedKeys) {
    if (!(key in parsed)) throw new Error(`Missing expected key "${key}" in LLM response`)
  }
  return parsed
}

function buildAuditEntry({ response, startedAt, slug, purpose, model }) {
  const usage = usageTokens(response.usage)
  return {
    timestamp: new Date().toISOString(),
    provider: response.provider || 'anthropic',
    model: response.model || model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_read_tokens: usage.cache_read_tokens,
    cache_creation_tokens: usage.cache_creation_tokens,
    latency_ms: Date.now() - startedAt,
    estimated_cost_usd: estimateCost(usage, response.model || model),
    purpose,
  }
}

export async function callClaudeWithRetry(args, options = {}) {
  const { maxRetries = 3, slug, purpose, model = DEFAULT_CLAUDE_MODEL } = options
  let lastError

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const startedAt = Date.now()
    try {
      const response = await callClaude(args.system, args.user, {
        model: args.model || model,
        maxTokens: args.maxTokens,
        temperature: args.temperature,
      })
      await appendLLMAuditLog(slug, buildAuditEntry({
        response,
        startedAt,
        slug,
        purpose,
        model: args.model || model,
      }))
      return response
    } catch (error) {
      lastError = error
      console.warn(`LLM attempt ${attempt}/${maxRetries} failed for ${purpose}: ${error.message}`)
      if (attempt < maxRetries) await sleep(1000 * attempt)
    }
  }

  throw new Error(`callClaudeWithRetry failed after ${maxRetries} attempts for ${purpose}: ${lastError.message}`)
}

export function extractJsonOrThrow(response, expectedKeys = []) {
  return extractJsonFromText(response.text || '', expectedKeys)
}

function summarizeResults(searchResults) {
  return searchResults.map(item => ({
    query: item.query,
    engine: item.engine,
    results: (item.results || []).slice(0, 5).map(result => ({
      title: result.title,
      url: result.url,
      snippet: result.snippet,
    })),
  }))
}

function compactList(value) {
  return Array.isArray(value)
    ? value.map(item => String(item).trim()).filter(Boolean).join(' ')
    : String(value || '').trim()
}

export function normalizeQuestions(value, form = {}) {
  const raw = Array.isArray(value) ? value : []
  const questions = raw
    .map(item => String(item).trim())
    .filter(Boolean)
    .slice(0, 8)

  const name = String(form.name || form.brand || form.client_name || '客户品牌').trim()
  const industry = String(form.industry || '目标行业').trim()
  const product = compactList(form.core_products) || industry
  const competitors = compactList(form.competitors)
  const audience = compactList(form.target_audience)
  const fallback = [
    `${industry} 2025 市场规模 增速 竞争格局`,
    `${industry} 2026 趋势 预测 行业报告`,
    `${name} ${product} 垂直场景 工作流 趋势`,
    competitors ? `${name} ${competitors} 竞品 定位 付费模式 对比` : `${name} 主要替代方案 竞品 定位 对比`,
    audience ? `${industry} ${audience} 需求 痛点 预算 意愿` : `${industry} 目标客户 需求 痛点 预算 意愿`,
  ]

  for (const question of fallback) {
    if (questions.length >= 5) break
    questions.push(question)
  }

  return questions.slice(0, 8)
}

function decorateSource(source, opts = {}) {
  const rawSource = String(source || '').trim()
  if (!rawSource || !isVerifiableSource(rawSource, opts)) return null
  const meta = classifySource(rawSource, opts)
  return {
    source: normalizeSourcePath(rawSource),
    source_url: normalizeSourcePath(rawSource),
    source_tier: meta.source_tier,
    source_label: meta.source_label,
    type: meta.type,
    tier_inferred: meta.tier_inferred,
  }
}

function extractKeyFactsFromText(content, limit = 5) {
  return String(content || '')
    .split(/[\n。；;]/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => line.length >= 6 && !/^(---|page:|total_pages:|case_slug:|source:|char_count:)/i.test(line))
    .sort((a, b) => Number(/\d/.test(b)) - Number(/\d/.test(a)))
    .slice(0, limit)
}

function compactLocalEvidence(localEvidence = [], opts = {}) {
  return localEvidence.map(item => {
    const sourceInfo = decorateSource(item.file, opts)
    return {
      source: normalizeSourcePath(item.file),
      source_url: normalizeSourcePath(item.file),
      source_tier: sourceInfo?.source_tier || 'T1',
      source_label: sourceInfo?.source_label || '客户提供一手资料',
      type: 'first_party',
      key_facts: extractKeyFactsFromText(item.content),
      excerpt: String(item.content || '').replace(/\s+/g, ' ').trim().slice(0, 700),
    }
  })
}

function normalizeFacts(value, opts = {}) {
  const facts = Array.isArray(value) ? value : []
  return facts
    .map(fact => {
      const sourceInfo = decorateSource(fact.source || fact.source_url || fact.url || '', opts)
      if (!sourceInfo) return null
      return {
        statement: String(fact.statement || fact.fact || '').trim(),
        source_url: sourceInfo.source,
        source: sourceInfo.source,
        source_tier: fact.source_tier || sourceInfo.source_tier,
        source_label: fact.source_label || sourceInfo.source_label,
        type: fact.type || sourceInfo.type,
        confidence: fact.confidence || 'medium',
        supports: fact.supports || '',
      }
    })
    .filter(fact => fact?.statement && isVerifiableSource(fact.source, opts))
}

function normalizeInsights(value) {
  const insights = Array.isArray(value) ? value : []
  return insights.map(item => {
    if (typeof item === 'string') return { insight: item, source_url: '' }
    return {
      insight: String(item.insight || item.statement || '').trim(),
      source_url: String(item.source_url || item.url || '').trim(),
    }
  }).filter(item => item.insight)
}

function firstRealUrl(items = []) {
  for (const item of items) {
    if (!item) continue
    const url = item.source_url || item.url || item.source
    if (isVerifiableSource(url || '')) return decorateSource(url)
  }
  return null
}

function normalizeDataRefs(dataRefs = [], fallbackUrl, opts = {}) {
  const refs = Array.isArray(dataRefs) ? dataRefs : []
  const normalized = refs
    .map(ref => {
      const sourceInfo = decorateSource(ref.source || ref.source_url || ref.url || '', opts)
      if (!sourceInfo) return null
      const normalizedRef = {
        value: ref.value || ref.title || ref.statement || '可追溯行业信号',
        source: sourceInfo.source,
        source_tier: ref.source_tier || sourceInfo.source_tier,
        source_label: ref.source_label || sourceInfo.source_label,
        type: ref.type || sourceInfo.type || 'quote',
      }
      return coerceLocalDataRefValue(normalizedRef, opts)
    })
    .filter(Boolean)

  if (normalized.length > 0) return sortBySourceTier(normalized)
  if (!fallbackUrl) return []
  const fallbackInfo = decorateSource(fallbackUrl.source || fallbackUrl.source_url || fallbackUrl, opts)
  if (!fallbackInfo) return []
  return [{
    value: fallbackUrl.statement || fallbackUrl.insight || fallbackUrl.value || fallbackUrl.source_label || 'DeepResearch 可追溯行业信号',
    source: fallbackInfo.source,
    source_tier: fallbackInfo.source_tier,
    source_label: fallbackInfo.source_label,
    type: fallbackUrl.type || fallbackInfo.type || 'quote',
  }]
}

function normalizeModels(models = [], spec, allowedConcepts = []) {
  const allowed = new Set(allowedConcepts)
  const filtered = (Array.isArray(models) ? models : []).filter(model => allowed.has(model))
  if (filtered.length > 0) return filtered
  if (spec.concept_for_this_page && allowed.has(spec.concept_for_this_page)) return [spec.concept_for_this_page]
  return allowedConcepts.slice(0, 1)
}

function requiredModelForIndex(index) {
  return ['MECE', 'Industry-Lifecycle', 'Porter-5-Forces', 'PESTEL', 'MECE'][index] || null
}

function ensureRequiredModel(models, index, allowedConcepts = []) {
  const required = requiredModelForIndex(index)
  if (!required || !allowedConcepts.includes(required) || models.includes(required)) return models
  return [required, ...models].slice(0, 3)
}

function industryFallbackContext(opts = {}) {
  const form = opts.form || {}
  const competitors = compactList(form.competitors) || '主要替代方案'
  const industry = String(form.industry || '目标行业').trim()
  const audience = compactList(form.target_audience) || '目标客户'
  return {
    competitors,
    industry,
    audience,
  }
}

function ensureMethodologyText(slide, index, opts = {}) {
  const context = industryFallbackContext(opts)
  if (index === 2) {
    const text = [...(slide.core_points || []), slide.action_title || ''].join(' ')
    if (/Porter|五力|潜在|替代|议价/.test(text)) return slide
    return {
      ...slide,
      action_title: slide.action_title.includes('五力')
        ? slide.action_title
        : `${slide.action_title}，Porter 五力提示竞争会挤压单品利润`,
      core_points: [
        ...(slide.core_points || []).slice(0, 4),
        `Porter 五力判断：现有竞争来自 ${context.competitors} 等替代方案，购买者议价要求品牌从单点功能转向可验证的场景价值。`,
      ],
    }
  }
  if (index === 3) {
    const text = [...(slide.core_points || []), slide.action_title || ''].join(' ')
    if (/趋势|驱动力|Why Now/.test(text)) return slide
    return {
      ...slide,
      core_points: [
        ...(slide.core_points || []).slice(0, 4),
        `Why Now 驱动力：${context.industry} 的工具化、专业化和工作流升级，正在放大 ${context.audience} 对可信方案的需求。`,
      ],
    }
  }
  return slide
}

export function normalizeSlides(slides = [], chunk, facts, chunkInsights, opts = {}) {
  const fallbackSources = [
    ...chunkInsights.map(item => ({ source_url: item.source_url })),
    ...facts,
  ].filter(item => isVerifiableSource(item.source_url || item.url || item.source || '', opts))
  const firstUrl = firstRealUrl(fallbackSources)

  return chunk.pages.map((spec, index) => {
    const slide = slides[index] || {}
    const fallbackUrl = firstRealUrl([chunkInsights[index], facts[index], ...fallbackSources]) || firstUrl
    const normalized = {
      ...slide,
      page_no: spec.page_no,
      layout: spec.recommended_layout,
      page_subtitle: slide.page_subtitle || spec.page_subtitle,
      page_intent: slide.page_intent || spec.page_intent,
      action_title: slide.action_title || spec.page_intent,
      core_points: Array.isArray(slide.core_points) ? slide.core_points.slice(0, 6) : [],
      data_refs: normalizeDataRefs(slide.data_refs, fallbackUrl, opts),
      models_used: ensureRequiredModel(
        normalizeModels(slide.models_used, spec, chunk.allowed_concepts || []),
        index,
        chunk.allowed_concepts || [],
      ),
    }
    return ensureMethodologyText(normalized, index, opts)
  })
}

function thinkingContent(text) {
  const normalized = String(text || '').trim()
  if (normalized.length >= 100) return normalized
  return `${normalized}。本步骤保留研究判断、证据取舍和下一步影响，用于审计 DeepResearch 是否真实经过该环节，而不是直接写出页面。`
}

function parsePercent(value) {
  const normalized = String(value || '').replace('%', '').trim()
  const number = Number(normalized)
  return Number.isFinite(number) ? number : null
}

function parseNumericValue(value) {
  const normalized = String(value || '').replace(/,/g, '').trim()
  const number = Number(normalized)
  return Number.isFinite(number) && number > 0 ? number : null
}

function expectedCagrPercent(startValue, endValue, years) {
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue) || !Number.isFinite(years) || years <= 0 || startValue <= 0 || endValue <= 0) {
    return null
  }
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100
}

function extractSuspiciousGrowthClaims(text) {
  const input = String(text || '')
  const claims = []
  const patterns = [
    /(?<startYear>20\d{2})\s*[-—–至到]\s*(?<endYear>20\d{2})年?[^。\n；;，,]{0,48}?(?:由|从)\s*(?<startValue>\d+(?:\.\d+)?)\s*(?<startUnit>万亿|亿元|亿美元|百万美元|十亿美元|百万元|万元|元|%|个|家|人)?[^。\n；;，,]{0,32}?(?:增长至|增至|达到|至|到)\s*(?<endValue>\d+(?:\.\d+)?)\s*(?<endUnit>万亿|亿元|亿美元|百万美元|十亿美元|百万元|万元|元|%|个|家|人)?[^。\n；;]{0,48}?(?:CAGR|年复合增长率)\s*(?:为|约|达|=|:|：)?\s*(?<cagr>-?\d+(?:\.\d+)?)\s*%/gi,
    /(?:由|从)\s*(?<startValue>\d+(?:\.\d+)?)\s*(?<startUnit>万亿|亿元|亿美元|百万美元|十亿美元|百万元|万元|元|%|个|家|人)?[^。\n；;，,]{0,32}?(?:增长至|增至|达到|至|到)\s*(?<endValue>\d+(?:\.\d+)?)\s*(?<endUnit>万亿|亿元|亿美元|百万美元|十亿美元|百万元|万元|元|%|个|家|人)?[^。\n；;]{0,48}?(?<startYear>20\d{2})\s*[-—–至到]\s*(?<endYear>20\d{2})年?[^。\n；;]{0,48}?(?:CAGR|年复合增长率)\s*(?:为|约|达|=|:|：)?\s*(?<cagr>-?\d+(?:\.\d+)?)\s*%/gi,
  ]

  for (const pattern of patterns) {
    for (const match of input.matchAll(pattern)) {
      const groups = match.groups || {}
      const startYear = Number(groups.startYear)
      const endYear = Number(groups.endYear)
      const startValue = parseNumericValue(groups.startValue)
      const endValue = parseNumericValue(groups.endValue)
      const statedCagr = parsePercent(groups.cagr)
      if (!startYear || !endYear || !startValue || !endValue || statedCagr === null) continue
      if (groups.startUnit && groups.endUnit && groups.startUnit !== groups.endUnit) continue
      const years = Math.abs(endYear - startYear)
      const expected = expectedCagrPercent(startValue, endValue, years)
      if (expected === null) continue
      const tolerance = Math.max(2, Math.abs(expected) * 0.08)
      if (Math.abs(expected - statedCagr) > tolerance) {
        claims.push({
          text: match[0],
          startYear,
          endYear,
          startValue,
          endValue,
          statedCagr,
          expectedCagr: expected,
        })
      }
    }
  }
  return claims
}

export function assertNoSuspiciousGrowthMath(result) {
  const chunks = [
    result?.chunk_takeaway,
    ...(result?.chunk_insights || []).map(item => item.insight || item.statement || ''),
    ...(result?.slides || []).flatMap(slide => [
      slide.action_title || '',
      ...(slide.core_points || []).map(item => typeof item === 'string' ? item : JSON.stringify(item)),
      ...(slide.data_refs || []).map(ref => ref.value || ref.statement || ref.title || ''),
    ]),
  ]
  const suspicious = chunks.flatMap(extractSuspiciousGrowthClaims)
  if (suspicious.length > 0) {
    const claim = suspicious[0]
    throw new Error(`NO-FALLBACK violation: growth math mismatch in claim "${claim.text}" (stated CAGR ${claim.statedCagr.toFixed(1)}%, expected about ${claim.expectedCagr.toFixed(1)}%)`)
  }
}

export function noFallbackSelfCheck(result, chunk) {
  if (!Array.isArray(result.thinking_log) || result.thinking_log.length !== 5) {
    throw new Error('NO-FALLBACK violation: thinking_log must contain exactly 5 steps')
  }
  for (const item of result.thinking_log) {
    if (String(item.content || item.result_summary || '').length < 100) {
      throw new Error(`NO-FALLBACK violation: thinking_log step "${item.step}" is too short`)
    }
  }
  if (!result.chunk_takeaway || result.chunk_takeaway.length < 20) {
    throw new Error('NO-FALLBACK violation: chunk_takeaway too short')
  }
  if (GENERIC_TAKEAWAY_PATTERN.test(result.chunk_takeaway)) {
    throw new Error('NO-FALLBACK violation: chunk_takeaway hits generic pattern')
  }
  if (!Array.isArray(result.chunk_insights) || result.chunk_insights.length < 3) {
    throw new Error('NO-FALLBACK violation: chunk_insights must contain at least 3 insights')
  }
  if (!Array.isArray(result.slides) || result.slides.length !== chunk.pages.length) {
    throw new Error(`NO-FALLBACK violation: slides.length=${result.slides?.length || 0} != chunk.pages.length=${chunk.pages.length}`)
  }

  const refs = result.slides
    .flatMap(slide => slide.data_refs || [])
    .filter(ref => {
      if (!isVerifiableSource(ref.source || ref.source_url, { slug: result.metadata?.slug })) return false
      verifyLocalDataRef(ref, { slug: result.metadata?.slug })
      return true
    })
  if (refs.length === 0) {
    throw new Error('NO-FALLBACK violation: industry chunk has 0 verifiable data_refs')
  }
  assertNoSuspiciousGrowthMath(result)
}

export async function readLocalIndustryEvidence(slug) {
  if (!slug) return []
  const root = repoPath('inputs', slug, 'first-party')
  let entries = []
  try {
    entries = await fs.readdir(root, { withFileTypes: true, recursive: true })
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
  const files = entries
    .filter(entry => entry.isFile())
    .map(entry => path.relative(REPO_ROOT, path.join(entry.parentPath || root, entry.name)))
    .filter(file => /\.(md|txt|json|csv)$/i.test(file))
    .sort()
  const evidence = []
  for (const file of files) {
    evidence.push({ file, content: await fs.readFile(repoPath(file), 'utf8') })
  }
  return evidence
}

async function readAuditCount(slug) {
  try {
    return (await readLLMAuditLog(slug)).length
  } catch (error) {
    if (error.code === 'ENOENT') return 0
    throw error
  }
}

export async function enforceIncrementalCostGuard(slug, entries = null, startingAuditCount = 0) {
  const allEntries = entries || await readLLMAuditLog(slug)
  const newEntries = allEntries.slice(startingAuditCount)
  const usage = summarizeLLMUsage(newEntries)
  if (usage.total_cost_usd > MAX_COST_PER_CHUNK_USD) {
    throw new Error(`Cost guard violated: ${usage.total_cost_usd} > ${MAX_COST_PER_CHUNK_USD}`)
  }
  return usage
}

export async function runIndustryDeepResearch({
  chunk,
  form,
  clientSummary,
  strategicQuestion,
  upstreamChunksSummary = '',
  slug,
  model = DEFAULT_CLAUDE_MODEL,
} = {}) {
  if (!chunk?.chunk_id) throw new Error('runIndustryDeepResearch requires chunk')
  if (!slug) throw new Error('runIndustryDeepResearch requires slug')
  const startingAuditCount = await readAuditCount(slug)

  const localEvidence = await readLocalIndustryEvidence(slug)
  const context = injectBlueprintSnippetIntoContext({
    client_name: form.name || slug,
    client_industry: form.industry || '',
    core_products: Array.isArray(form.core_products) ? form.core_products.join(', ') : '',
    competitors: Array.isArray(form.competitors) ? form.competitors.join(', ') : '',
    target_audience: Array.isArray(form.target_audience) ? form.target_audience.join(', ') : '',
    chunk,
    slug,
    strategicQuestion: strategicQuestion || '(not provided)',
    upstreamChunksSummary: upstreamChunksSummary || '(not provided)',
    clientSummary,
    localEvidence,
  }, await buildBlueprintContextSnippet(slug, 'industry_analysis'))
  const planSystem = await appendMethodologyToSystem('你是资深品牌策略行业分析师。你必须先把行业问题拆成可被真实 Web Search 验证的研究子问题。', 'industry_analysis')
  const writeSystem = await appendMethodologyToSystem('你是咨询级品牌策略 PPT 作者。你只输出严格 JSON，页面必须符合 blueprint chunk pages。', 'industry_analysis')

  const planResponse = await callClaudeWithRetry({
    system: planSystem,
    user: [
      '请基于以下客户和蓝图 chunk，列出 5-8 个需要搜索验证的研究子问题。',
      '要求输出严格 JSON: {"sub_questions":["..."]}。',
      JSON.stringify(context, null, 2),
    ].join('\n\n'),
    model,
    maxTokens: 2000,
    temperature: 0.3,
  }, { slug, purpose: 'industry.plan', model })
  const plan = extractJsonOrThrow(planResponse, ['sub_questions'])
  const subQuestions = normalizeQuestions(plan.sub_questions, form)

  const searchResults = []
  for (const [index, question] of subQuestions.entries()) {
    const engine = index < 5 ? 'tavily' : 'serper'
    const result = await webSearch(question, {
      engine,
      maxResults: 5,
      searchDepth: 'advanced',
      slug,
    })
    searchResults.push(result)
  }

  const searchSummary = summarizeResults(searchResults)
  const localEvidenceForPrompt = compactLocalEvidence(localEvidence, { slug })
  const readResponse = await callClaudeWithRetry({
    system: '你是严谨行业研究员。只从搜索结果中筛选有价值事实，必须保留真实 source_url。',
    user: [
      '请从以下搜索结果和 local_evidence 中筛选 8-14 条事实，丢弃无关、重复、低质量结果。',
      '可从 local_evidence 抽取 fact；本地一手 fact 的 source_url 必须写原始文件路径，source_tier 写 T1。',
      GROWTH_MATH_INSTRUCTION,
      '输出严格 JSON: {"facts":[{"statement":"...","source_url":"https://或本地路径","source_tier":"T1|T2|T3|T4","source_label":"...","type":"first_party|industry_report|official_data|media","confidence":"high|medium|low","supports":"..."}]}',
      JSON.stringify({ searchSummary, local_evidence: localEvidenceForPrompt, chunk_insight_question: chunk.chunk_insight_question }, null, 2),
    ].join('\n\n'),
    model,
    maxTokens: 4000,
    temperature: 0.2,
  }, { slug, purpose: 'industry.read', model })
  const read = extractJsonOrThrow(readResponse, ['facts'])
  const facts = normalizeFacts(read.facts, { slug })
  if (facts.length < 3) throw new Error(`READ step returned too few sourced facts: ${facts.length}`)

  const synthesizeResponse = await callClaudeWithRetry({
    system: '你是咨询级品牌策略行业分析师。你必须把事实压缩成能服务定位机会的洞察。',
    user: [
      '请基于 facts 产出 1 句 chunk_takeaway 和 3 条 chunk_insights。',
      'chunk_takeaway 必须具体，不得使用“本部分分析了/赋能/闭环/打造”。',
      '每条 insight 必须带 source_url。',
      GROWTH_MATH_INSTRUCTION,
      '输出严格 JSON: {"chunk_takeaway":"...","chunk_insights":[{"insight":"...","source_url":"https://..."}]}',
      JSON.stringify({ facts, chunk_insight_question: chunk.chunk_insight_question }, null, 2),
    ].join('\n\n'),
    model,
    maxTokens: 2500,
    temperature: 0.4,
  }, { slug, purpose: 'industry.synthesize', model })
  const synthesize = extractJsonOrThrow(synthesizeResponse, ['chunk_takeaway', 'chunk_insights'])
  const chunkInsights = normalizeInsights(synthesize.chunk_insights)

  const writeResponse = await callClaudeWithRetry({
    system: writeSystem,
    user: [
      '请把洞察转成 blueprint chunk 的 slide JSON。',
      '硬约束:',
      '- slides.length 必须等于 chunk.pages.length',
      '- slides[i].page_no 必须等于 chunk.pages[i].page_no',
      '- slides[i].layout 必须等于 chunk.pages[i].recommended_layout',
      '- models_used 只能来自 chunk.allowed_concepts',
      '- 5 页方法论覆盖必须包含: page14 MECE, page15 Industry-Lifecycle, page16 Porter-5-Forces, page17 PESTEL, page18 MECE',
      '- page16 必须显式写 Porter 五力、现有竞争、替代威胁或购买者议价之一',
      '- page17 必须显式写趋势/驱动力/Why Now 之一',
      TRACEABLE_DATA_REF_INSTRUCTION,
      GROWTH_MATH_INSTRUCTION,
      '- 章节封面也要可追溯到一个 T1/T2 或真实 URL 来源。',
      '- page 14 是章节封面，但 core_points 仍需 2-3 条以通过现有 validator',
      '输出严格 JSON: {"slides":[...]}',
      JSON.stringify({
        chunk,
        facts,
        local_evidence: localEvidenceForPrompt,
        source_pool: sortBySourceTier([
          ...facts.map(fact => decorateSource(fact.source || fact.source_url, { slug })).filter(Boolean),
          ...localEvidenceForPrompt.map(item => decorateSource(item.source, { slug })).filter(Boolean),
        ]),
        research_blueprint_context: context.researchBlueprintContext || '',
        chunk_takeaway: synthesize.chunk_takeaway,
        chunk_insights: chunkInsights,
      }, null, 2),
    ].join('\n\n'),
    model,
    maxTokens: 5000,
    temperature: 0.3,
  }, { slug, purpose: 'industry.write', model })
  const write = extractJsonOrThrow(writeResponse, ['slides'])

  const result = {
    agent_id: 'industry_analysis',
    blueprint_chunk_id: chunk.chunk_id,
    chunk_takeaway: String(synthesize.chunk_takeaway || '').trim(),
    chunk_insights: chunkInsights,
    thinking_log: [
      {
        step: 'plan',
        content: thinkingContent(`围绕“${chunk.chunk_insight_question}”拆出 ${subQuestions.length} 个可搜索子问题: ${subQuestions.join('；')}`),
      },
      {
        step: 'search',
        content: thinkingContent(`执行 ${searchResults.length} 次真实 web search，覆盖 Tavily/Serper。共返回 ${searchResults.reduce((sum, item) => sum + (item.results?.length || 0), 0)} 条结果；关键查询包括: ${subQuestions.slice(0, 5).join('；')}`),
        queries: subQuestions,
        result_summary: searchSummary,
      },
      {
        step: 'read',
        content: thinkingContent(`从搜索结果和 ${localEvidence.length} 份本地一手证据中筛出 ${facts.length} 条可追溯事实，优先保留市场规模、区域结构、创作者经济、影像服务增长和玩家结构相关证据。`),
      },
      {
        step: 'synthesize',
        content: thinkingContent(`综合事实后得出 takeaway: ${String(synthesize.chunk_takeaway || '').trim()}；洞察数量 ${chunkInsights.length}，用于喂给竞争分析和定位表达。`),
      },
      {
        step: 'write',
        content: thinkingContent(`按 blueprint ${chunk.chunk_id} 写出 ${write.slides?.length || 0} 页，逐页匹配 page_no/layout/allowed_concepts，并强制 data_refs 使用可追溯来源且保留 source_tier。`),
      },
    ],
    slides: normalizeSlides(write.slides, chunk, [
      ...facts,
      ...localEvidenceForPrompt.map(item => ({
        statement: item.key_facts[0] || item.source_label,
        source: item.source,
        source_url: item.source,
        source_tier: item.source_tier,
        source_label: item.source_label,
        type: item.type,
      })),
    ], chunkInsights, { slug, form }),
    metadata: {
      blueprint_chunk_id: chunk.chunk_id,
      slug,
      deepresearch_steps: 5,
      total_searches: searchResults.length,
      total_facts: facts.length,
      web_search_used: true,
      local_evidence_files: localEvidence.map(item => item.file),
    },
  }

  noFallbackSelfCheck(result, chunk)

  await enforceIncrementalCostGuard(slug, null, startingAuditCount)

  return result
}
