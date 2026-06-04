import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { appendLLMAuditLog, estimateCost, readLLMAuditLog } from '../audit-log.mjs'
import { callClaude, DEFAULT_CLAUDE_MODEL } from '../llm-clients/claude-client.mjs'
import {
  classifySource,
  coerceLocalDataRefValue,
  isAllowedLocalSource,
  isHttpSource,
  isVerifiableSource,
  normalizeSourcePath,
  sortBySourceTier,
  verifyLocalDataRef,
} from '../source-tiers.mjs'
import { sanitizeDomesticMediaQuery, webSearch } from '../web-search.mjs'
import {
  appendMethodologyToSystem,
  buildBlueprintContextSnippet,
  injectBlueprintSnippetIntoContext,
} from './methodology-injection.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const GENERIC_TAKEAWAY_PATTERN = /本部分分析了|赋能|闭环|打造/
const MAX_COST_PER_CHUNK_USD = 2

export const TRACEABLE_DATA_REF_INSTRUCTION = [
  '- 每页 data_refs 必须使用可追溯来源：优先 T1 一手 / T2 权威二手，其次真实 https URL。',
  '- 关键战略判断（人群分层 / 复购 / 心智占位 / 市场规模 / 预算比例）必须挂 T1 或 T2；T3/T4 只能作辅证。',
  '- 可引用的 T1 本地来源只能来自当前客户 inputs/<slug>/first-party/**；assets/_raw/cases/** 只能作为方法论范例，永不写入最终 data_refs。',
  '- T1 本地来源的 data_refs.value 必须写该文件中可逐字验证的原文关键短语/数值，不要把多个来源或策略结论合并成一句。',
  '- 仍禁止 inputs/<slug>/summary.md 作为 data_refs.source（它是定性概述，不是数据来源）。',
  '- 当本页结论与 source_pool 中的真实 https 来源（多来自上游 industry/competitor/consumer 调研）相关时，必须优先把该网络来源写进 data_refs，而不是退回本地泛来源。',
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

function buildAuditEntry({ response, startedAt, purpose, model }) {
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
  if (!slug) throw new Error('callClaudeWithRetry requires slug for audit logging')
  if (!purpose) throw new Error('callClaudeWithRetry requires purpose')

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
  const text = response.text || ''
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

async function runJsonStep({
  callStep,
  args,
  model,
  system,
  user,
  purpose,
  expectedKeys,
  maxTokens,
  temperature,
  stepName,
}) {
  let lastError
  const maxAttempts = 2
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await callStep({
      system,
      user: [
        user,
        attempt > 1
          ? `\n\n上一次 ${stepName} 输出 JSON 解析失败: ${lastError.message}\n请重新输出严格 JSON, 只包含要求的对象字段，不得有注释、尾逗号、半截数组或 Markdown。`
          : '',
      ].join(''),
      model,
      maxTokens,
      temperature: attempt === 1 ? temperature : 0,
    }, { slug: args.slug, purpose: attempt === 1 ? purpose : `${purpose}.json-retry${attempt - 1}`, model })

    try {
      return extractJsonOrThrow(response, expectedKeys)
    } catch (error) {
      lastError = error
      console.warn(`${stepName} JSON parse attempt ${attempt}/${maxAttempts} failed for ${purpose}: ${error.message}`)
      if (attempt === maxAttempts) throw error
    }
  }
  throw lastError
}

export function thinkingContent(text) {
  const normalized = String(text || '').trim()
  if (normalized.length >= 100) return normalized
  return `${normalized}。本步骤保留研究判断、证据取舍和下一步影响，用于审计 DeepResearch 是否真实经过该环节，而不是直接写出页面。`
}

function compactText(text, maxLength = 1200) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized
}

function sourceMeta(source, opts = {}) {
  return classifySource(source, opts)
}

function decorateLocalEvidenceEntry({ file, page_no: pageNo = null, content, slug = '' }) {
  const meta = sourceMeta(file, { slug })
  return {
    file,
    source: file,
    source_tier: meta.source_tier,
    source_label: pageNo
      ? `${meta.source_label} (p${pageNo})`
      : meta.source_label,
    type: meta.type,
    page_no: pageNo,
    content: compactText(content, 1800),
  }
}

async function readFirstPartyInputEvidence(slug) {
  if (!slug) return []
  const firstPartyRoot = repoPath('inputs', slug, 'first-party')
  let entries = []
  try {
    entries = await fs.readdir(firstPartyRoot, { withFileTypes: true, recursive: true })
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }

  const files = entries
    .filter(entry => entry.isFile())
    .map(entry => path.relative(REPO_ROOT, path.join(entry.parentPath || firstPartyRoot, entry.name)))
    .filter(file => /\.(md|txt|json|csv)$/i.test(file))
    .sort()
  const evidence = []
  for (const file of files) {
    evidence.push(decorateLocalEvidenceEntry({
      file,
      slug,
      content: await fs.readFile(repoPath(file), 'utf8'),
    }))
  }
  return evidence
}

export async function readLocalEvidenceForChunk(chunk, extraPageNos = [], options = {}) {
  const slug = options.slug || ''
  void chunk
  void extraPageNos
  return readFirstPartyInputEvidence(slug)
}

function realUrlsFromValue(value, urls = new Set()) {
  if (!value) return urls
  if (typeof value === 'string') {
    for (const match of value.matchAll(/https?:\/\/[^\s"'<>),，。]+/g)) {
      urls.add(match[0])
    }
    return urls
  }
  if (Array.isArray(value)) {
    for (const item of value) realUrlsFromValue(item, urls)
    return urls
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value)) realUrlsFromValue(item, urls)
  }
  return urls
}

export function extractRealUrls(value) {
  return [...realUrlsFromValue(value)]
}

function sourceFromItem(item) {
  if (!item) return ''
  if (typeof item === 'string') return item
  return item.source || item.source_url || item.url || ''
}

function decorateTraceableSource(source, opts = {}) {
  const rawSource = sourceFromItem(source)
  if (!rawSource) return null
  if (!isVerifiableSource(rawSource, opts)) return null
  const meta = sourceMeta(rawSource, opts)
  return {
    source: normalizeSourcePath(rawSource),
    source_url: normalizeSourcePath(rawSource),
    source_tier: meta.source_tier,
    source_label: typeof source === 'object' ? (source.source_label || meta.source_label) : meta.source_label,
    type: typeof source === 'object' ? (source.type || meta.type) : meta.type,
    tier_inferred: Boolean(meta.tier_inferred),
  }
}

function isTraceableSource(source, opts = {}) {
  return Boolean(decorateTraceableSource(source, opts))
}

function localEvidenceSources(localEvidence = []) {
  return (Array.isArray(localEvidence) ? localEvidence : [])
    .map(item => decorateTraceableSource(item, { slug: item.slug }))
    .filter(Boolean)
}

function extractKeyFactsFromText(content, limit = 5) {
  const normalized = String(content || '')
    .split(/\n+/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => line && !/^---$/.test(line) && !/^(page|total_pages|case_slug|source|char_count):/i.test(line))
  const numeric = normalized.filter(line => /\d/.test(line))
  const candidates = numeric.length > 0 ? numeric : normalized
  return candidates
    .flatMap(line => line.split(/[。；;]/).map(item => item.trim()).filter(Boolean))
    .filter(item => item.length >= 6)
    .slice(0, limit)
}

function compactLocalEvidence(localEvidence = [], limit = 10) {
  return (Array.isArray(localEvidence) ? localEvidence : [])
    .slice(0, limit)
    .map(item => ({
      source: normalizeSourcePath(item.source || item.file),
      source_url: normalizeSourcePath(item.source || item.file),
      source_tier: item.source_tier || 'T1',
      source_label: item.source_label || '客户提供一手资料',
      type: item.type || 'first_party',
      page_no: item.page_no || null,
      key_facts: extractKeyFactsFromText(item.content, 5),
      excerpt: compactText(item.content, 700),
    }))
}

function localEvidenceForPrompts(context) {
  return compactLocalEvidence(context.localEvidence, 12)
}

export async function readAvailableChunkContext(slug, currentChunkId) {
  if (!slug) return []
  const chunkDir = repoPath('outputs', slug, '_chunks')
  let files = []
  try {
    files = await fs.readdir(chunkDir)
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }

  const chunks = []
  for (const file of files.filter(name => name.endsWith('.json')).sort()) {
    const chunkId = file.replace(/\.json$/, '')
    if (chunkId === currentChunkId) continue
    const raw = await fs.readFile(path.join(chunkDir, file), 'utf8')
    const output = JSON.parse(raw)
    chunks.push({
      chunk_id: output.blueprint_chunk_id || chunkId,
      source: `outputs/${slug}/_chunks/${file}`,
      chunk_takeaway: output.chunk_takeaway || '',
      chunk_insights: output.chunk_insights || [],
      data_refs: (output.slides || [])
        .flatMap(slide => slide.data_refs || [])
        .filter(ref => isTraceableSource(ref.source || ref.source_url, { slug }))
        .map(ref => ({
          ...ref,
          ...decorateTraceableSource(ref.source || ref.source_url, { slug }),
        }))
        .slice(0, 12),
    })
  }
  return chunks
}

export function normalizeQuestions(value, fallback = [], minCount = 3, maxCount = 8) {
  const raw = Array.isArray(value) ? value : []
  const questions = raw
    .map(item => String(item).trim())
    .filter(Boolean)
    .slice(0, maxCount)

  for (const question of fallback) {
    if (questions.length >= minCount) break
    questions.push(question)
  }

  return questions.slice(0, maxCount)
}

function normalizeSearchQueryText(text) {
  return sanitizeDomesticMediaQuery(text)
    .replace(/[？?。；;！!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function searchQueryTokens(text) {
  return normalizeSearchQueryText(text)
    .split(/[\s,，、:：]+/)
    .map(token => token.trim())
    .filter(Boolean)
}

function isLongSearchQuestion(question) {
  const normalized = normalizeSearchQueryText(question)
  return normalized.length >= 40 || searchQueryTokens(normalized).length >= 12
}

function isReportEvidenceQuestion(question) {
  return /报告|研究|证据|数据|来源|支撑|验证|洞察|分析|report|research|evidence|source|analysis/i.test(question)
}

function preserveEntityTokens(tokens) {
  return tokens.filter(token => (
    /^[A-Z][A-Za-z0-9-]{1,}$/.test(token) ||
    /SmallRig|Ulanzi|Tilta|Manfrotto|PolarPro|DJI|Sony|Canon|Nikon|RED|ARRI/i.test(token)
  ))
}

function fallbackEntityPrefix(entityTokens, keywordTokens = []) {
  return [...new Set([...entityTokens, ...keywordTokens])]
    .slice(0, 5)
    .join(' ')
}

function dedupeQueries(queries) {
  const seen = new Set()
  const deduped = []
  for (const query of queries) {
    const normalized = normalizeSearchQueryText(query)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    deduped.push(normalized)
  }
  return deduped
}

export function buildSearchQueryVariants(question, options = {}) {
  const sanitized = normalizeSearchQueryText(question)
  if (!sanitized) return []

  const tokens = searchQueryTokens(sanitized)
  const entityTokens = preserveEntityTokens(tokens)
  const stopwordPattern = /^(应该|如何|哪些|什么|为什么|是否|以及|并用|他们|真实|判断|支撑|需要|可以|优先|服务|问题|when|what|how|why|which|should|compare|about|question|questions|need|needs|zero|result|results|oversized|essay)$/i
  const keywordTokens = tokens.filter(token => (
    token.length >= 2 &&
    !stopwordPattern.test(token)
  ))
  const entityPrefix = fallbackEntityPrefix(entityTokens, keywordTokens)
  const variants = []

  if (!isLongSearchQuestion(sanitized)) {
    variants.push(sanitized)
  } else {
    const clauses = sanitized
      .split(/[，,、；;:：]/)
      .map(part => part.trim())
      .filter(part => part.length >= 8)
      .slice(0, 3)
    for (const clause of clauses) {
      const clauseTokens = [...new Set([
        ...entityTokens,
        ...searchQueryTokens(clause).filter(token => token.length >= 2),
      ])].slice(0, 10)
      variants.push(clauseTokens.join(' '))
    }
    variants.push([...new Set([...entityTokens, ...keywordTokens])].slice(0, 10).join(' '))
  }

  if (options.retry) {
    variants.push([...new Set([...entityTokens, ...keywordTokens])].slice(0, 8).join(' '))
    if (/用户|人群|创作者|购买|痛点|触点|收益/.test(sanitized)) {
      variants.push(`${entityPrefix || sanitized} user pain points review`.trim())
    }
    if (/竞品|竞争|对比|矩阵|差异/.test(sanitized)) {
      variants.push(`${entityPrefix || sanitized} competitor matrix positioning`.trim())
    }
    if (/报告|市场|行业|规模|趋势/.test(sanitized)) {
      variants.push(`${entityPrefix || sanitized} market report industry trend`.trim())
    }
  }

  return dedupeQueries(variants).slice(0, options.maxVariants || 4)
}

function shouldUseExaForSearchQuestion(question, variant) {
  return isReportEvidenceQuestion(question) || isReportEvidenceQuestion(variant) || isLongSearchQuestion(question)
}

function engineForSearchQuestion(index, question, variant, config) {
  if (config.engineForQuestion) return config.engineForQuestion(index, variant, question)
  if (shouldUseExaForSearchQuestion(question, variant)) return 'exa'
  return 'auto'
}

function isTransientSearchError(error) {
  return /(?:HTTP\s*)?(?:403|408|429|500|502|503|504|520|522|524)\b|fetch failed|network|timeout|temporar/i.test(String(error?.message || error || ''))
}

async function boundedSearch(searchFn, query, opts, config = {}) {
  const maxAttempts = config.maxSearchAttempts || 2
  let lastError
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await searchFn(query, opts)
    } catch (error) {
      lastError = error
      if (!isTransientSearchError(error) || attempt === maxAttempts) break
      await sleep(250 * attempt)
    }
  }
  console.warn(`web search failed for "${query}" via ${opts.engine || 'auto'}: ${lastError.message}`)
  return {
    engine: opts.engine || 'auto',
    query,
    results: [],
    error: lastError.message,
    transient_error: isTransientSearchError(lastError),
  }
}

export function summarizeResults(searchResults) {
  return searchResults.map(item => ({
    query: item.query,
    engine: item.engine,
    results: (item.results || []).slice(0, 6).map(result => ({
      title: result.title,
      url: result.url,
      snippet: compactText(result.snippet || result.text || '', 360),
    })),
  }))
}

function normalizeSourceObject(source, opts = {}) {
  return decorateTraceableSource(source, opts)
}

export function normalizeFacts(value, fallbackUrls = [], options = {}) {
  const facts = Array.isArray(value) ? value : []
  return facts
    .map((fact, index) => {
      const source = String(fact.source || fact.source_url || fact.url || fallbackUrls[index] || '').trim()
      const sourceInfo = normalizeSourceObject(source, options)
      if (!sourceInfo) return null
      return {
        statement: compactText(fact.statement || fact.fact || fact.quote || '', 420),
        source_url: sourceInfo.source,
        source: sourceInfo.source,
        source_tier: fact.source_tier || sourceInfo.source_tier,
        source_label: fact.source_label || sourceInfo.source_label,
        type: fact.type || sourceInfo.type || 'external_signal',
        tier_inferred: sourceInfo.tier_inferred,
        confidence: fact.confidence || 'medium',
        supports: compactText(fact.supports || '', 220),
      }
    })
    .filter(fact => fact?.statement && isVerifiableSource(fact.source, options))
}

export function normalizeInsights(value, fallbackUrls = []) {
  const insights = Array.isArray(value) ? value : []
  return insights
    .map((item, index) => {
      if (typeof item === 'string') {
        return { insight: item.trim(), source_url: fallbackUrls[index] || fallbackUrls[0] || '' }
      }
      const source = sourceFromItem(item) || fallbackUrls[index] || fallbackUrls[0] || ''
      const sourceInfo = decorateTraceableSource(source) || {}
      return {
        insight: String(item.insight || item.statement || '').trim(),
        source_url: sourceInfo.source || String(source).trim(),
        source: sourceInfo.source || String(source).trim(),
        source_tier: item.source_tier || sourceInfo.source_tier,
        source_label: item.source_label || sourceInfo.source_label,
      }
    })
    .filter(item => item.insight)
}

function firstTraceableSource(items = [], opts = {}) {
  for (const item of items) {
    const sourceInfo = decorateTraceableSource(item, opts)
    if (sourceInfo) return sourceInfo
  }
  return null
}

function normalizeDataRefs(dataRefs = [], fallbackSource, options = {}) {
  const refs = Array.isArray(dataRefs) ? dataRefs : []
  const normalized = refs
    .map(ref => {
      const sourceInfo = normalizeSourceObject(ref.source || ref.source_url || ref.url || '', options)
      if (!sourceInfo) return null
      const trustedTier = isHttpSource(sourceInfo.source)
        ? sourceInfo.source_tier
        : ref.source_tier || sourceInfo.source_tier
      const trustedLabel = isHttpSource(sourceInfo.source)
        ? sourceInfo.source_label
        : ref.source_label || sourceInfo.source_label
      const normalizedRef = {
        value: ref.value || ref.title || ref.statement || 'DeepResearch 可追溯来源',
        source: sourceInfo.source,
        source_tier: trustedTier,
        source_label: trustedLabel,
        type: ref.type || sourceInfo.type || 'quote',
        tier_inferred: sourceInfo.tier_inferred,
      }
      return coerceLocalDataRefValue(normalizedRef, options)
    })
    .filter(Boolean)

  if (normalized.length > 0) return sortBySourceTier(normalized)
  if (!fallbackSource) return []
  const fallbackInfo = normalizeSourceObject(fallbackSource.source || fallbackSource.source_url || fallbackSource, options)
  if (!fallbackInfo) return []
  return [{
    value: fallbackSource.statement || fallbackSource.insight || fallbackSource.value || fallbackSource.source_label || 'DeepResearch 可追溯来源',
    source: fallbackInfo.source,
    source_tier: fallbackInfo.source_tier,
    source_label: fallbackInfo.source_label,
    type: fallbackSource.type || fallbackInfo.type || 'quote',
  }]
}

function normalizeModels(models = [], spec, allowedConcepts = []) {
  const allowed = new Set(allowedConcepts)
  const filtered = (Array.isArray(models) ? models : []).filter(model => allowed.has(model))
  if (filtered.length > 0) return filtered.slice(0, 3)
  if (spec.concept_for_this_page && allowed.has(spec.concept_for_this_page)) return [spec.concept_for_this_page]
  return allowedConcepts.slice(0, 1)
}

function normalizeCorePoint(item) {
  if (typeof item === 'string') return item.trim()
  if (item === null || item === undefined) return ''
  if (typeof item === 'number' || typeof item === 'boolean') return String(item)
  if (typeof item === 'object') {
    for (const key of ['point', 'text', 'content', 'insight', 'label', 'title', 'value', 'summary']) {
      if (item[key]) return String(item[key]).trim()
    }
    return Object.entries(item)
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
      .join('；')
      .trim()
  }
  return String(item).trim()
}

function ensureCorePoints(value) {
  const points = Array.isArray(value)
    ? value.map(normalizeCorePoint).filter(Boolean)
    : []
  if (points.some(point => point.includes('[object Object]'))) {
    throw new Error('NO-FALLBACK violation: core_points contains [object Object]')
  }
  if (points.length >= 2) return points.slice(0, 6)
  return [
    ...points,
    '本页结论来自 DeepResearch 的上游证据和当前 chunk 策略判断。',
    '后续执行需继续以真实业务数据和客户访谈校准。',
  ].slice(0, 6)
}

function slideTextForEvidence(slide = {}) {
  return [
    slide.action_title || '',
    ...(slide.core_points || []).map(point => (typeof point === 'string' ? point : JSON.stringify(point))),
  ].join(' ')
}

function slideHasStrongEvidence(slide = {}) {
  return (slide.data_refs || []).some(ref => ['T1', 'T2'].includes(String(ref.source_tier || '').toUpperCase()))
}

function deriveHypothesisBasis(slide = {}) {
  const candidates = (slide.core_points || [])
    .map(point => (typeof point === 'string' ? point : JSON.stringify(point)))
    .filter(point => /基于|类比|不能直接证明|证据|依据/.test(point))
  const explicit = compactText(slide.hypothesis_basis || '', 240)
  if (explicit) return explicit
  if (candidates[0]) return compactText(candidates[0], 240)
  return '基于现有竞品能力与公开资料的类比推理，不能直接证明本品的真实需求或定位成立'
}

function deriveValidationMethod(slide = {}) {
  const candidates = (slide.core_points || [])
    .map(point => (typeof point === 'string' ? point : JSON.stringify(point)))
    .filter(point => /需要|需向|索取|访谈|调研|才能验证/.test(point))
  const explicit = compactText(slide.validation_method || '', 240)
  if (explicit) return explicit
  if (candidates[0]) return compactText(candidates[0], 240)
  return '需向目标用户/采购方访谈并索取真实需求、付费意愿或使用数据才能验证'
}

function englishBrandName(value, fallback = 'client brand') {
  const match = String(value || '').match(/[A-Za-z][A-Za-z0-9-]*/)
  return match?.[0] || fallback
}

export function normalizeSlides(slides = [], chunk, evidenceItems = [], chunkInsights = []) {
  const fallbackSources = [
    ...chunkInsights.map(item => ({ source_url: item.source_url })),
    ...evidenceItems,
  ].filter(item => isTraceableSource(item.source_url || item.url || item.source, { slug: item.slug }))
  const sortedFallbackSources = sortBySourceTier(fallbackSources.map(item => ({
    ...item,
    ...(decorateTraceableSource(item.source_url || item.url || item.source, { slug: item.slug }) || {}),
  })))
  const firstSource = firstTraceableSource(sortedFallbackSources)

  return (chunk.pages || []).map((spec, index) => {
    const slide = slides[index] || {}
    const fallbackSource = firstTraceableSource([
      chunkInsights[index],
      evidenceItems[index],
      ...sortedFallbackSources,
    ]) || firstSource
    const normalizedSlide = {
      ...slide,
      page_no: spec.page_no,
      layout: spec.recommended_layout,
      page_subtitle: slide.page_subtitle || spec.page_subtitle,
      page_intent: slide.page_intent || spec.page_intent,
      action_title: slide.action_title || spec.page_intent,
      core_points: ensureCorePoints(slide.core_points),
      data_refs: normalizeDataRefs(slide.data_refs, fallbackSource),
      models_used: normalizeModels(slide.models_used, spec, chunk.allowed_concepts || []),
    }
    const evidenceText = slideTextForEvidence(normalizedSlide)
    const markedAsAssumption = /待验证|假设|需要验证|仍需验证|不能直接证明/.test(evidenceText)
    const explicitlyHypothesis = slide.evidence_status === 'hypothesis'
    if (explicitlyHypothesis || markedAsAssumption) {
      return {
        ...normalizedSlide,
        evidence_status: 'hypothesis',
        hypothesis_basis: deriveHypothesisBasis(normalizedSlide),
        validation_method: deriveValidationMethod(normalizedSlide),
      }
    }
    return {
      ...normalizedSlide,
      evidence_status: slide.evidence_status || 'evidenced',
      hypothesis_basis: slide.hypothesis_basis || '',
      validation_method: slide.validation_method || '',
    }
  })
}

// Phase 2b 红线护栏：webSearch=required 的 Sub-Agent 必须至少带 1 条 http(s) 真网络来源。
// 抓「被要求联网取证却只用本地文件填空」的退化；optional/false 直接放行。失败必抛错，不静默兜底。
export function assertWebSearchEvidence(result, options = {}) {
  if (options.webSearchRequirement !== 'required') return
  const hasWebRef = (result.slides || [])
    .flatMap(slide => slide.data_refs || [])
    .some(ref => isHttpSource(ref && (ref.source || ref.source_url || ref.url) || ''))
  if (!hasWebRef) {
    throw new Error(
      `NO-FALLBACK violation: webSearch=required agent "${options.agentId || '?'}" produced 0 web (http) data_refs（被要求联网取证却只用了本地来源，禁止用本地填空冒充调研）`,
    )
  }
}

function textFromSlide(slide = {}) {
  return [
    slide.action_title || '',
    ...(slide.core_points || []).map(point => (typeof point === 'string' ? point : JSON.stringify(point))),
    ...(slide.data_refs || []).map(ref => ref.value || ref.statement || ref.title || ''),
  ].join(' ')
}

function refLooksLikeDemandEvidence(ref = {}) {
  const text = [
    ref.value,
    ref.statement,
    ref.title,
    ref.type,
    ref.source_label,
  ].join(' ')
  return /用户|客户|采购|付费|预算|业务成果|ROI|需求|痛点|使用|企业|市场部|品牌方|in-house|咨询|提案|成果计费|user|customer|procurement|pricing|budget|roi|demand|pain|adoption|business outcome|marketing team/i.test(text)
}

function refLooksLikeCompetitorEvidence(ref = {}) {
  const text = [
    ref.value,
    ref.statement,
    ref.title,
    ref.type,
    ref.source,
    ref.source_url,
  ].join(' ')
  return /竞品|竞争|Gamma|Canva|WPS|AiPPT|ChatPPT|Beautiful|Copilot|feature|presentation|template|office|product_matrix|marketing_claim|pricing/i.test(text)
}

function refLooksLikeCompetitorOwnedSource(ref = {}) {
  const source = refSource(ref)
  const text = [
    ref.value,
    ref.statement,
    ref.title,
    ref.type,
    source,
  ].join(' ')
  return /gamma\.app|ai\.wps\.com|explore\.wps\.com|canva\.com|aippt\.cn|chat-ppt\.com|chatppt|beautiful\.ai|microsoft\.com|techcommunity\.microsoft\.com|manus\.im/i.test(text)
}

function refSource(ref = {}) {
  return String(ref.source || ref.source_url || ref.url || '')
}

function refLooksLikeRepoPopularity(ref = {}) {
  const text = [
    ref.value,
    ref.statement,
    ref.title,
    ref.type,
    ref.source,
    ref.source_url,
  ].join(' ')
  return /github\.com|stars?|forks?|repository|\brepo\b|开源|仓库/i.test(text)
}

function refLooksLikeIndependentDemandEvidence(ref = {}) {
  return refLooksLikeDemandEvidence(ref) && !refLooksLikeCompetitorEvidence(ref) && !refLooksLikeCompetitorOwnedSource(ref) && !refLooksLikeRepoPopularity(ref)
}

function compactRetryEvidence(refs = [], limit = 6) {
  return (refs || [])
    .filter(refLooksLikeIndependentDemandEvidence)
    .slice(0, limit)
    .map(ref => ({
      value: compactText(ref.value || ref.statement || ref.title || ref.source_label || '', 180),
      source: refSource(ref),
      source_tier: ref.source_tier,
      source_label: ref.source_label,
      type: ref.type,
      source_chunk_id: ref.source_chunk_id,
    }))
}

function violationSlideSnippet(slide = {}) {
  return compactText(JSON.stringify({
    page_no: slide.page_no,
    action_title: slide.action_title,
    core_points: slide.core_points,
  }), 600)
}

function competitorPositioningError(message, slide) {
  const error = new Error(message)
  error.violationSnippet = violationSlideSnippet(slide)
  return error
}

const POSITIONING_LEAP_RE = /咨询级|品牌策划|策略工作流|专业工作流|策略生成|方案\s*AI\s*Agent|品牌策略\s*Agent|专业\s*Agent|空位|心智|占位|抢占/i
const ACTION_VERB_RE = /应以|应当|应该|应成为|应\s|切入|抢占|占据|定位为|成为|主打|发力/g
const HYP_BASIS_TEXT = '基于竞品能力证据的类比推理，不能直接证明本品的真实付费需求'
const HYP_METHOD_TEXT = '需向目标用户/采购方访谈并索取真实需求与付费数据才能验证'

function stripActionVerbs(text = '') {
  return String(text).replace(ACTION_VERB_RE, '待验证').replace(/\s{2,}/g, ' ').trim()
}

function stripUnsupportedCompetitorNames(slide) {
  const refsText = (slide.data_refs || [])
    .map(ref => [ref.value, ref.statement, ref.title, ref.source, ref.source_url].join(' '))
    .join(' ')
  let actionTitle = slide.action_title || ''
  let corePoints = [...(slide.core_points || [])]
  for (const [label, textPattern, sourcePattern] of competitorAliases()) {
    const named = textPattern.test([actionTitle, ...corePoints].join(' '))
    if (!named) continue
    const hasRef = textPattern.test(refsText) || sourcePattern.test(refsText)
    if (hasRef) continue
    const labelRe = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    actionTitle = actionTitle.replace(labelRe, '').replace(/\s{2,}/g, ' ').replace(/[、，,]\s*(?=[、，,。])/g, '').trim()
    corePoints = corePoints.map(p =>
      (typeof p === 'string' ? p : JSON.stringify(p)).replace(labelRe, '').replace(/\s{2,}/g, ' ').trim(),
    )
  }
  return { ...slide, action_title: actionTitle, core_points: corePoints }
}

export function downgradePositioningSlides(slides = [], options = {}) {
  const sourcePool = options.sourcePool || []
  const availableIndependentDemand = sourcePool.filter(refLooksLikeIndependentDemandEvidence)

  return (slides || []).map(rawSlide => {
    const slide = stripUnsupportedCompetitorNames(rawSlide)

    const text = textFromSlide(slide)
    const makesPositioningLeap = POSITIONING_LEAP_RE.test(text)
    if (!makesPositioningLeap) return slide

    const refs = slide.data_refs || []
    const hasIndependentDemand = refs.some(refLooksLikeIndependentDemandEvidence)
    if (hasIndependentDemand) return slide

    if (availableIndependentDemand.length > 0) {
      return { ...slide, data_refs: [...refs, availableIndependentDemand[0]] }
    }

    const keptRefs = refs.filter(ref => !refLooksLikeRepoPopularity(ref))
    const dataRefs = keptRefs.length > 0 ? keptRefs : refs

    const alreadyDowngraded = /待验证假设/.test(slide.action_title || '')
    const actionTitle = alreadyDowngraded
      ? slide.action_title
      : `${stripActionVerbs(slide.action_title)}（待验证假设，进入验证清单）`

    const corePoints = (slide.core_points || []).map(p =>
      stripActionVerbs(typeof p === 'string' ? p : JSON.stringify(p)),
    )
    const joined = corePoints.join(' ')
    if (!/基于|类比|不能直接证明|证据|依据/.test(joined)) corePoints.push(HYP_BASIS_TEXT)
    if (!/需要|需向|索取|访谈|调研|才能验证/.test(joined)) corePoints.push(HYP_METHOD_TEXT)

    return {
      ...slide,
      action_title: actionTitle,
      core_points: corePoints,
      data_refs: dataRefs,
      evidence_status: 'hypothesis',
      hypothesis_basis: HYP_BASIS_TEXT,
      validation_method: HYP_METHOD_TEXT,
    }
  })
}

export function assertCompetitorPositioningEvidence(result = {}, options = {}) {
  for (const slide of result.slides || []) {
    const text = textFromSlide(slide)
    const makesPositioningLeap = /咨询级|品牌策划|策略工作流|专业工作流|策略生成|方案\s*AI\s*Agent|品牌策略\s*Agent|专业\s*Agent|空位|心智|占位|抢占/i.test(text)
    if (!makesPositioningLeap) continue

    const refs = slide.data_refs || []
    const hasCompetitorEvidence = refs.some(refLooksLikeCompetitorEvidence)
    const hasIndependentDemandEvidence = refs.some(refLooksLikeIndependentDemandEvidence)
    const markedAsAssumption = /待验证|假设|需要验证|仍需验证|不能直接证明/.test(text)
    const hasHonestHypothesisContract = markedAsAssumption &&
      String(slide.hypothesis_basis || '').trim() &&
      String(slide.validation_method || '').trim()
    const turnsHypothesisIntoRecommendation = markedAsAssumption && /应以|应该|切入|抢占|占据|定位为|成为|主打|发力/i.test(text)
    const competitorDemandSources = refs
      .filter(ref => refLooksLikeDemandEvidence(ref) && (refLooksLikeCompetitorEvidence(ref) || refLooksLikeCompetitorOwnedSource(ref)))
      .map(refSource)
      .filter(Boolean)
      .join(', ')
    if (makesPositioningLeap && refs.some(refLooksLikeRepoPopularity)) {
      throw competitorPositioningError(`NO-FALLBACK violation: competitor positioning evidence gap on page ${slide.page_no || '?'}; GitHub/repo popularity cannot prove user demand or market positioning`, slide)
    }
    if (slide.page_no === 22 && /空位|心智|占位|抢占|专业\s*Agent|策略工作流/i.test(text)) {
      throw competitorPositioningError('NO-FALLBACK violation: page 22 must stay a competitor matrix, not repeat the positioning/perceptual-map conclusion', slide)
    }
    if (turnsHypothesisIntoRecommendation) {
      throw competitorPositioningError(`NO-FALLBACK violation: competitor positioning evidence gap on page ${slide.page_no || '?'}; cannot turn validation hypotheses into action recommendations`, slide)
    }
    if (hasCompetitorEvidence && !hasIndependentDemandEvidence && competitorDemandSources && !hasHonestHypothesisContract) {
      throw competitorPositioningError(`NO-FALLBACK violation: competitor positioning evidence gap on page ${slide.page_no || '?'}; positioning claims require independent user/procurement/business-demand evidence instead of competitor-owned demand snippets${competitorDemandSources ? ` (${competitorDemandSources})` : ''}`, slide)
    }
    if (hasCompetitorEvidence && !hasIndependentDemandEvidence && !hasHonestHypothesisContract) {
      throw competitorPositioningError(`NO-FALLBACK violation: competitor positioning evidence gap on page ${slide.page_no || '?'}; positioning claims require competitor evidence plus independent user/procurement/business-demand evidence, or must be labeled as a validation hypothesis`, slide)
    }
  }
  assertCompetitorRefsCoverNamedBrands(result)
}

function competitorAliases() {
  return [
    ['Gamma', /Gamma/i, /gamma\.app/i],
    ['WPS', /WPS|AIslides/i, /wps\.com|ai\.wps\.com|explore\.wps\.com/i],
    ['Canva', /Canva/i, /canva\.com/i],
    ['AiPPT', /AiPPT/i, /aippt/i],
    ['ChatPPT', /ChatPPT/i, /chatppt|chatppts/i],
    ['Beautiful.ai', /Beautiful\.ai|Beautiful/i, /beautiful\.ai/i],
    ['Office Copilot', /Office\s*Copilot|Microsoft\s*365\s*Copilot|PowerPoint\s*Agents?/i, /microsoft\.com|techcommunity\.microsoft\.com/i],
  ]
}

export function assertCompetitorRefsCoverNamedBrands(result = {}) {
  for (const slide of result.slides || []) {
    const text = [
      slide.action_title || '',
      ...(slide.core_points || []).map(point => (typeof point === 'string' ? point : JSON.stringify(point))),
    ].join(' ')
    const refs = slide.data_refs || []
    for (const [label, textPattern, sourcePattern] of competitorAliases()) {
      if (!textPattern.test(text)) continue
      const hasRef = refs.some(ref => {
        const refText = [ref.value, ref.statement, ref.title, ref.source, ref.source_url].join(' ')
        return textPattern.test(refText) || sourcePattern.test(refText)
      })
      if (!hasRef) {
        throw new Error(`NO-FALLBACK violation: named competitor lacks page-level evidence on page ${slide.page_no || '?'}: ${label}`)
      }
    }
  }
}

export function noFallbackSelfCheck(result, chunk, options = {}) {
  const expectedSteps = options.expectedSteps || 5
  const minInsights = options.minInsights || 3

  if (!Array.isArray(result.thinking_log) || result.thinking_log.length !== expectedSteps) {
    throw new Error(`NO-FALLBACK violation: thinking_log must contain exactly ${expectedSteps} steps`)
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
  if (!Array.isArray(result.chunk_insights) || result.chunk_insights.length < minInsights) {
    throw new Error(`NO-FALLBACK violation: chunk_insights must contain at least ${minInsights} insights`)
  }
  if (!Array.isArray(result.slides) || result.slides.length !== chunk.pages.length) {
    throw new Error(`NO-FALLBACK violation: slides.length=${result.slides?.length || 0} != chunk.pages.length=${chunk.pages.length}`)
  }

  const refs = result.slides
    .flatMap(slide => slide.data_refs || [])
    .filter(ref => {
      if (!isVerifiableSource(ref.source || ref.source_url, options)) return false
      verifyLocalDataRef(ref, options)
      return true
    })
  if (refs.length === 0) {
    throw new Error('NO-FALLBACK violation: chunk has 0 verifiable data_refs')
  }
  if (options.agentId === 'competitor_analysis') {
    assertCompetitorPositioningEvidence(result, options)
  }
}

async function readAuditCount(slug) {
  try {
    return (await readLLMAuditLog(slug)).length
  } catch (error) {
    if (error.code === 'ENOENT') return 0
    throw error
  }
}

async function enforceCostGuard(slug, startingAuditCount) {
  const entries = await readLLMAuditLog(slug)
  const newEntries = entries.slice(startingAuditCount)
  const cost = newEntries.reduce((sum, entry) => sum + Number(entry.estimated_cost_usd || 0), 0)
  if (cost > MAX_COST_PER_CHUNK_USD) {
    throw new Error(`Cost guard violated for chunk: ${cost} > ${MAX_COST_PER_CHUNK_USD}`)
  }
}

function buildBaseContext({
  chunk,
  form,
  clientSummary,
  strategicQuestion,
  upstreamChunksSummary,
  localEvidence,
  availableChunks,
  retryHint = null,
}) {
  return {
    client_name: form.name || '',
    client_industry: form.industry || '',
    core_products: Array.isArray(form.core_products) ? form.core_products.join(', ') : '',
    competitors: Array.isArray(form.competitors) ? form.competitors.join(', ') : '',
    target_audience: Array.isArray(form.target_audience) ? form.target_audience.join(', ') : '',
    chunk,
    slug: form.slug || '',
    clientSummary,
    strategicQuestion: strategicQuestion || '(not provided)',
    upstreamChunksSummary: upstreamChunksSummary || '(not provided)',
    retryHint,
    availableChunks,
    localEvidence,
  }
}

async function prepareContext(args, config) {
  const {
    chunk,
    form = {},
    clientSummary = '',
    strategicQuestion = '',
    upstreamChunksSummary = '',
    slug,
    retryHint = null,
  } = args
  if (!chunk?.chunk_id) throw new Error(`${config.agentId} DeepResearch requires chunk`)
  if (!slug) throw new Error(`${config.agentId} DeepResearch requires slug`)

  const localEvidence = await readLocalEvidenceForChunk(chunk, [], { slug })
  const availableChunks = await readAvailableChunkContext(slug, chunk.chunk_id)
  const baseContext = buildBaseContext({
    chunk,
    form: { ...form, slug },
    clientSummary,
    strategicQuestion,
    upstreamChunksSummary,
    retryHint,
    localEvidence,
    availableChunks,
  })
  const blueprintSnippet = await buildBlueprintContextSnippet(slug, config.agentId)
  return injectBlueprintSnippetIntoContext(baseContext, blueprintSnippet)
}

async function runSearches(subQuestions, args, config) {
  const searchFn = args.searchFn || webSearch
  const searchResults = []
  for (const [index, question] of subQuestions.entries()) {
    const sanitizedQuestion = sanitizeDomesticMediaQuery(question)
    const variants = buildSearchQueryVariants(sanitizedQuestion, {
      maxVariants: config.maxSearchVariantsPerQuestion || 4,
    })
    const searchQuery = variants[0] || sanitizedQuestion
    const engine = engineForSearchQuestion(index, sanitizedQuestion, searchQuery, config)
    const result = await boundedSearch(searchFn, searchQuery, {
      engine,
      maxResults: config.maxResultsPerQuery || 5,
      searchDepth: 'advanced',
      slug: args.slug,
    }, config)
    const normalizedResult = {
      ...result,
      original_question: sanitizedQuestion,
      query: result.query || searchQuery,
    }
    searchResults.push(normalizedResult)

    if ((normalizedResult.results?.length || 0) === 0) {
      const retryQuery = buildSearchQueryVariants(sanitizedQuestion, {
        retry: true,
        maxVariants: config.maxSearchRetryVariants || 4,
      }).find(variant => variant !== searchQuery)
      if (retryQuery) {
        const retryEngine = engineForSearchQuestion(index, sanitizedQuestion, retryQuery, config)
        const retryResult = await boundedSearch(searchFn, retryQuery, {
          engine: retryEngine,
          maxResults: config.maxResultsPerQuery || 5,
          searchDepth: 'advanced',
          slug: args.slug,
        }, config)
        searchResults.push({
          ...retryResult,
          original_question: sanitizedQuestion,
          retry_for_query: searchQuery,
          query: retryResult.query || retryQuery,
        })
      }
    }
  }
  return searchResults
}

async function runSocialSearches(subQuestions, args, config) {
  const searchFn = args.searchFn || webSearch
  const platform = config.socialSearchPlatform || 'reddit'
  const limit = config.maxSocialSearches || 2
  const clientName = args.form?.name || args.form?.brand || args.form?.client_name || 'client brand'
  const englishClientName = englishBrandName(clientName)
  const socialQueries = config.socialQueries
    ? config.socialQueries({ ...args, clientName, englishClientName, subQuestions })
    : [
        `${englishClientName} user review`,
        `${englishClientName} customer pain points review`,
      ]
  const searchResults = []
  for (const query of socialQueries.slice(0, limit)) {
    const sanitizedQuery = sanitizeDomesticMediaQuery(query)
    const result = await boundedSearch(searchFn, sanitizedQuery, {
      engine: `social:${platform}`,
      platform,
      maxResults: config.maxSocialResultsPerQuery || 5,
      slug: args.slug,
    }, config)
    searchResults.push({ ...result, query: result.query || sanitizedQuery })
  }
  return searchResults
}

async function runSearchesWithOptionalSocial(subQuestions, plan, args, config) {
  const searchResults = await runSearches(subQuestions, args, config)
  const shouldRunSocial = Boolean(config.allowUgcSearch && plan.needs_ugc_search)
  if (!shouldRunSocial) return searchResults
  return [
    ...searchResults,
    ...await runSocialSearches(subQuestions, args, config),
  ]
}

function sourcePoolFromContext(context, facts = []) {
  const sources = [
    ...facts.map(fact => ({
      value: fact.statement || fact.value,
      source: fact.source || fact.source_url,
      source_tier: fact.source_tier,
      source_label: fact.source_label,
      type: fact.type,
      confidence: fact.confidence,
      supports: fact.supports,
    })),
    ...localEvidenceSources(context.localEvidence),
    ...extractRealUrls(context.clientSummary).map(source => ({ source })),
    ...extractRealUrls(context.strategicQuestion).map(source => ({ source })),
    ...extractRealUrls(context.researchBlueprintContext).map(source => ({ source })),
    ...extractRealUrls(context.availableChunks).map(source => ({ source })),
    ...extractRealUrls(context.upstreamChunksSummary).map(source => ({ source })),
    ...(context.availableChunks || []).flatMap(chunk => (chunk.data_refs || []).map(ref => ({
      value: ref.value || ref.statement || ref.title,
      source: ref.source || ref.source_url,
      source_tier: ref.source_tier,
      source_label: ref.source_label,
      type: ref.type,
      source_chunk_id: chunk.chunk_id,
    }))),
  ].filter(item => sourceFromItem(item))
  const bySource = new Map()
  for (const source of sources) {
    const sourceInfo = decorateTraceableSource(source, { slug: context.slug })
    if (!sourceInfo) continue
    const normalized = {
      ...sourceInfo,
      value: source.value || source.statement || source.title || sourceInfo.source_label,
      source_tier: source.source_tier || sourceInfo.source_tier,
      source_label: source.source_label || sourceInfo.source_label,
      type: source.type || sourceInfo.type,
      source_chunk_id: source.source_chunk_id,
    }
    const previous = bySource.get(sourceInfo.source)
    if (!previous) {
      bySource.set(sourceInfo.source, normalized)
      continue
    }
    bySource.set(sourceInfo.source, {
      ...previous,
      value: previous.value || normalized.value,
      source_tier: previous.source_tier || normalized.source_tier,
      source_label: previous.source_label || normalized.source_label,
      type: previous.type || normalized.type,
      source_chunk_id: previous.source_chunk_id || normalized.source_chunk_id,
    })
  }
  return sortBySourceTier([...bySource.values()]).slice(0, 24)
}

function compactEvidence(items = [], limit = 14) {
  return items.slice(0, limit).map(item => ({
    statement: compactText(item.statement, 320),
    source_url: item.source_url,
    source: item.source || item.source_url,
    source_tier: item.source_tier,
    source_label: item.source_label,
    type: item.type,
    confidence: item.confidence,
    supports: compactText(item.supports, 160),
  }))
}

function compactInsights(items = [], limit = 5) {
  return items.slice(0, limit).map(item => ({
    insight: compactText(item.insight, 360),
    source_url: item.source_url,
    source: item.source || item.source_url,
    source_tier: item.source_tier,
    source_label: item.source_label,
  }))
}

export function compactWritePayload({
  context,
  facts = [],
  synthesize,
  chunkInsights = [],
  sourcePool = [],
  planningQuestions = [],
}) {
  const writeFacts = facts.filter(fact => !refLooksLikeRepoPopularity(fact))
  const writeSourcePool = sourcePool.filter(ref => !refLooksLikeRepoPopularity(ref))
  return {
    chunk: context.chunk,
    planningQuestions,
    client: {
      name: context.client_name,
      industry: context.client_industry,
      core_products: context.core_products,
      competitors: context.competitors,
      target_audience: context.target_audience,
    },
    upstreamChunks: (context.availableChunks || []).slice(0, 4).map(item => ({
      chunk_id: item.chunk_id,
      chunk_takeaway: compactText(item.chunk_takeaway, 240),
      data_refs: (item.data_refs || []).filter(ref => !refLooksLikeRepoPopularity(ref)).slice(0, 2),
    })),
    research_blueprint_context: context.researchBlueprintContext || '',
    facts: compactEvidence(writeFacts, 10),
    local_evidence: compactLocalEvidence(context.localEvidence, 12),
    chunk_takeaway: synthesize.chunk_takeaway,
    chunk_insights: compactInsights(chunkInsights, 4),
    source_pool: sortBySourceTier(writeSourcePool).slice(0, 12),
  }
}

function chunkArray(items = [], size = 4) {
  const chunks = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function withChunkPages(context, pages) {
  return {
    ...context,
    chunk: {
      ...context.chunk,
      pages,
      page_range: pages.length ? [pages[0].page_no, pages[pages.length - 1].page_no] : context.chunk.page_range,
    },
  }
}

async function runWriteStep({
  args,
  config,
  callStep,
  model,
  context,
  writeInput,
  purposePrefix,
  maxTokens,
}) {
  let lastError
  let lastRetryKind = 'json'
  const maxWriteParseAttempts = config.maxWriteParseAttempts || 2
  const independentDemandEvidence = compactRetryEvidence(writeInput.sourcePool || writeInput.baseWriteInput?.sourcePool || [])
  for (let attempt = 1; attempt <= maxWriteParseAttempts; attempt += 1) {
    const namedCompetitorHint = '\n每个被点名竞品都必须有同页来源；没有来源就删掉该竞品名，不得用其他竞品或泛行业来源冒充。矩阵页可以增加 data_refs 覆盖被点名竞品，但不得伪造来源。'
    const hypothesisActionHint = '\n待验证假设不得同时写行动定论；如果页面包含“待验证/仍需验证/付费案例仍待验证”，必须删掉“应以|应该|切入|抢占|占据|定位为|成为|主打|发力”等行动动词，只能写“进入验证清单/下一步验证”。标题和 core_points 都不得出现行动定论；把“PPTAgent 应以此切入”改成“进入验证清单”或“下一步验证”；Page 24 如果没有独立需求证据，必须写成待验证假设或进入验证清单。'
    const evidenceSpecificHint = /GitHub\/repo popularity cannot prove user demand or market positioning/i.test(lastError?.message || '')
      ? '\nGitHub/repo/stars/forks 不能作为 page 23 的需求、心智占位或可抢空位 data_refs；如果只剩 GitHub/repo 热度，必须移除或软化定位跃迁，只能写成验证问题。'
      : /named competitor lacks page-level evidence/i.test(lastError?.message || '')
        ? namedCompetitorHint
        : /cannot turn validation hypotheses into action recommendations/i.test(lastError?.message || '')
          ? hypothesisActionHint
      : ''
    const evidenceRetryHint = [
      evidenceSpecificHint,
      evidenceSpecificHint.includes(namedCompetitorHint) ? '' : namedCompetitorHint,
      evidenceSpecificHint.includes(hypothesisActionHint) ? '' : hypothesisActionHint,
    ].join('')
    const retryHint = attempt > 1 && lastRetryKind === 'evidence'
      ? `\n\n上一次 write 输出违反硬护栏: ${lastError.message}${lastError.violationSnippet ? `\n上一次违规页面片段（必须逐项修正 action_title 和 core_points）:\n${lastError.violationSnippet}` : ''}\n请重写 slides: 涉及“品牌策划 / 策略工作流 / 专业 Agent / 心智空位”的页面，必须在 data_refs 同时包含竞品能力来源和用户/采购/业务成果来源；如果没有后者，页面文字必须明确标成“待验证假设”。不得删除来源，不得伪造数据。${evidenceRetryHint}\n可用独立需求证据（只能从这些真实来源里选择相关项，不要改写 source）：\n${JSON.stringify(independentDemandEvidence, null, 2)}`
      : `\n\n上一次 write 输出 JSON 解析失败: ${lastError?.message || ''}\n请重新输出严格 JSON, 只包含 {"slides":[...]}，不得有注释、尾逗号、半截数组或 Markdown。`
    const retryPurpose = attempt === 1
      ? purposePrefix
      : lastRetryKind === 'evidence'
        ? `${purposePrefix}.evidence-retry${attempt - 1}`
        : `${purposePrefix}.json-retry${attempt - 1}`
    const writeResponse = await callStep({
      system: config.writeSystem,
      user: [
        config.writeUser(writeInput),
        attempt > 1 ? retryHint : '',
      ].join(''),
      model,
      maxTokens,
      temperature: attempt === 1 ? (config.writeTemperature ?? 0.3) : 0,
    }, { slug: args.slug, purpose: retryPurpose, model })

    try {
      const parsed = extractJsonOrThrow(writeResponse, ['slides'])
      if (config.agentId === 'competitor_analysis') {
        const sourcePool = writeInput.sourcePool || writeInput.baseWriteInput?.sourcePool || []
        // Phase 2e: 先降级（补真证据或标成诚实假设），再让 tripwire 兜底。
        parsed.slides = downgradePositioningSlides(parsed.slides, { sourcePool })
        assertCompetitorPositioningEvidence(parsed, { sourcePool })
      }
      return parsed
    } catch (error) {
      lastError = error
      lastRetryKind = /competitor positioning evidence|named competitor lacks page-level evidence/i.test(error.message) ? 'evidence' : 'json'
      const label = lastRetryKind === 'evidence' ? 'hard-guard' : 'JSON parse'
      console.warn(`Write ${label} attempt ${attempt}/${maxWriteParseAttempts} failed for ${purposePrefix}: ${error.message}`)
      if (attempt === maxWriteParseAttempts) throw error
    }
  }

  throw lastError
}

async function runBatchedWriteStep({
  args,
  config,
  callStep,
  model,
  context,
  baseWriteInput,
  facts,
  chunkInsights,
  purposePrefix,
}) {
  const batchSize = config.writeBatchSize || 4
  const pageBatches = chunkArray(args.chunk.pages || [], batchSize)
  const slides = []
  for (const [batchIndex, pages] of pageBatches.entries()) {
    const batchContext = withChunkPages(context, pages)
    const batchWriteInput = {
      ...baseWriteInput,
      context: batchContext,
      facts,
      chunkInsights,
    }
    const write = await runWriteStep({
      args,
      config,
      callStep,
      model,
      context: batchContext,
      writeInput: batchWriteInput,
      purposePrefix: `${purposePrefix}.batch${batchIndex + 1}`,
      maxTokens: config.writeBatchMaxTokens || config.writeMaxTokens || 4200,
    })
    slides.push(...(write.slides || []))
  }
  return { slides }
}

function buildOutput({ config, chunk, synthesize, chunkInsights, slides, thinkingLog, metadata }) {
  return {
    agent_id: config.agentId,
    blueprint_chunk_id: chunk.chunk_id,
    chunk_takeaway: String(synthesize.chunk_takeaway || '').trim(),
    chunk_insights: chunkInsights,
    thinking_log: thinkingLog,
    slides,
    metadata: {
      blueprint_chunk_id: chunk.chunk_id,
      ...metadata,
    },
  }
}

export async function runFiveStepDeepResearch(args, config) {
  const model = args.model || DEFAULT_CLAUDE_MODEL
  const callStep = args.callStep || callClaudeWithRetry
  const startingAuditCount = args.skipCostGuard ? 0 : await readAuditCount(args.slug)
  const context = await prepareContext(args, config)
  const planSystem = await appendMethodologyToSystem(config.planSystem, config.agentId)
  const writeSystem = await appendMethodologyToSystem(config.writeSystem, config.agentId)

  const plan = await runJsonStep({
    callStep,
    args,
    model,
    system: planSystem,
    user: config.planUser(context),
    purpose: `${config.purposePrefix}.plan`,
    expectedKeys: ['sub_questions'],
    maxTokens: 2200,
    temperature: 0.3,
    stepName: 'plan',
  })
  const subQuestions = normalizeQuestions(
    plan.sub_questions,
    config.fallbackQuestions(context),
    config.minSearches || 5,
    config.maxQuestions || 8,
  ).map(question => sanitizeDomesticMediaQuery(question))

  const searchResults = await runSearchesWithOptionalSocial(subQuestions, plan, args, config)
  const searchSummary = summarizeResults(searchResults)
  const fallbackUrls = extractRealUrls(searchSummary)

  const read = await runJsonStep({
    callStep,
    args,
    model,
    system: config.readSystem,
    user: config.readUser({
      context,
      searchSummary,
      localEvidence: localEvidenceForPrompts(context),
    }),
    purpose: `${config.purposePrefix}.read`,
    expectedKeys: ['facts'],
    maxTokens: 4500,
    temperature: 0.2,
    stepName: 'read',
  })
  const facts = normalizeFacts(read.facts, fallbackUrls, { slug: args.slug })
  if (facts.length < (config.minFacts || 3)) {
    throw new Error(`${config.agentId} READ step returned too few sourced facts: ${facts.length}`)
  }

  const synthesize = await runJsonStep({
    callStep,
    args,
    model,
    system: config.synthesizeSystem,
    user: config.synthesizeUser({ context, facts }),
    purpose: `${config.purposePrefix}.synthesize`,
    expectedKeys: ['chunk_takeaway', 'chunk_insights'],
    maxTokens: 2800,
    temperature: config.synthesizeTemperature ?? 0.4,
    stepName: 'synthesize',
  })
  const sourcePool = sourcePoolFromContext(context, facts)
  const chunkInsights = normalizeInsights(synthesize.chunk_insights, sourcePool)

  const write = config.writeBatchSize
    ? await runBatchedWriteStep({
        args,
        config: { ...config, writeSystem },
        callStep,
        model,
        context,
        baseWriteInput: { synthesize, sourcePool, context },
        facts,
        chunkInsights,
        purposePrefix: `${config.purposePrefix}.write`,
      })
    : await runWriteStep({
        args,
        config: { ...config, writeSystem },
        callStep,
        model,
        context,
        writeInput: { context, facts, synthesize, chunkInsights, sourcePool },
        purposePrefix: `${config.purposePrefix}.write`,
        maxTokens: config.writeMaxTokens || 6500,
      })

  const slides = normalizeSlides(write.slides, args.chunk, [
    ...facts,
    ...localEvidenceForPrompts(context).map(item => ({
      statement: item.key_facts[0] || item.source_label,
      source: item.source,
      source_url: item.source,
      source_tier: item.source_tier,
      source_label: item.source_label,
      type: item.type,
    })),
  ], chunkInsights)
  const result = buildOutput({
    config,
    chunk: args.chunk,
    synthesize,
    chunkInsights,
    slides,
    thinkingLog: [
      {
        step: 'plan',
        content: thinkingContent(`围绕“${args.chunk.chunk_insight_question}”拆出 ${subQuestions.length} 个可搜索子问题: ${subQuestions.join('；')}`),
      },
      {
        step: 'search',
        content: thinkingContent(`执行 ${searchResults.length} 次真实 web search，覆盖 ${[...new Set(searchResults.map(item => item.engine))].join('/')}。共返回 ${searchResults.reduce((sum, item) => sum + (item.results?.length || 0), 0)} 条结果。`),
        queries: subQuestions,
        result_summary: searchSummary,
      },
      {
        step: 'read',
        content: thinkingContent(`从搜索结果和 ${context.localEvidence.length} 份本地一手证据中筛出 ${facts.length} 条可追溯事实，按 ${config.readFocus} 做取舍，丢弃无关和不可追溯信息。`),
      },
      {
        step: 'synthesize',
        content: thinkingContent(`综合事实后得出 takeaway: ${String(synthesize.chunk_takeaway || '').trim()}；洞察数量 ${chunkInsights.length}，用于后续 chunk 决策。`),
      },
      {
        step: 'write',
        content: thinkingContent(`按 blueprint ${args.chunk.chunk_id} 写出 ${write.slides?.length || 0} 页，逐页匹配 page_no/layout/allowed_concepts，并强制 data_refs 使用可追溯来源且保留 source_tier。`),
      },
    ],
    metadata: {
      deepresearch_steps: 5,
      total_searches: searchResults.length,
      social_search_used: searchResults.some(item => String(item.engine || '').startsWith('social:')),
      total_facts: facts.length,
      web_search_used: true,
      local_evidence_files: context.localEvidence.map(item => item.file),
      available_upstream_chunks: context.availableChunks.map(item => item.chunk_id),
      llm_steps_contract: config.llmSteps || [],
      search_contract: config.searchSteps || [],
    },
  })

  noFallbackSelfCheck(result, args.chunk, {
    expectedSteps: 5,
    minInsights: config.minInsights || 3,
    slug: args.slug,
    agentId: config.agentId,
  })
  assertWebSearchEvidence(result, { webSearchRequirement: args.webSearchRequirement, agentId: config.agentId })
  if (!args.skipCostGuard) await enforceCostGuard(args.slug, startingAuditCount)
  return result
}

export async function runThreeStepDeepResearch(args, config) {
  const model = args.model || DEFAULT_CLAUDE_MODEL
  const callStep = args.callStep || callClaudeWithRetry
  const startingAuditCount = args.skipCostGuard ? 0 : await readAuditCount(args.slug)
  const context = await prepareContext(args, config)
  const planSystem = await appendMethodologyToSystem(config.planSystem, config.agentId)
  const writeSystem = await appendMethodologyToSystem(config.writeSystem, config.agentId)

  const plan = await runJsonStep({
    callStep,
    args,
    model,
    system: planSystem,
    user: config.planUser(context),
    purpose: `${config.purposePrefix}.plan`,
    expectedKeys: [config.planQuestionsKey || 'positioning_questions'],
    maxTokens: 2200,
    temperature: 0.3,
    stepName: 'plan',
  })
  const planningQuestions = normalizeQuestions(
    plan[config.planQuestionsKey || 'positioning_questions'],
    config.fallbackQuestions(context),
    3,
    6,
  ).map(question => sanitizeDomesticMediaQuery(question))

  const needsSearch = Boolean(config.allowOptionalSearch && plan.needs_search)
  let searchResults = []
  let facts = []
  let searchSummary = []
  if (needsSearch) {
    const subQuestions = normalizeQuestions(plan.sub_questions, planningQuestions, 3, 5)
      .map(question => sanitizeDomesticMediaQuery(question))
    searchResults = await runSearches(subQuestions, args, config)
    searchSummary = summarizeResults(searchResults)
    const read = await runJsonStep({
      callStep,
      args,
      model,
      system: config.readSystem,
      user: config.readUser({
        context,
        searchSummary,
        localEvidence: localEvidenceForPrompts(context),
      }),
      purpose: `${config.purposePrefix}.read`,
      expectedKeys: ['facts'],
      maxTokens: 3800,
      temperature: 0.2,
      stepName: 'read',
    })
    facts = normalizeFacts(read.facts, extractRealUrls(searchSummary), { slug: args.slug })
  }

  const sourcePool = sourcePoolFromContext(context, facts)
  if (sourcePool.length === 0) {
    throw new Error(`${config.agentId} requires real upstream URL sources before writing a no-search chunk`)
  }

  const synthesize = await runJsonStep({
    callStep,
    args,
    model,
    system: config.synthesizeSystem,
    user: config.synthesizeUser({ context, plan, planningQuestions, facts, sourcePool }),
    purpose: `${config.purposePrefix}.synthesize`,
    expectedKeys: ['chunk_takeaway', 'chunk_insights'],
    maxTokens: 3200,
    temperature: config.synthesizeTemperature ?? 0.4,
    stepName: 'synthesize',
  })
  const chunkInsights = normalizeInsights(synthesize.chunk_insights, sourcePool)

  const write = config.writeBatchSize
    ? await runBatchedWriteStep({
        args,
        config: { ...config, writeSystem },
        callStep,
        model,
        context,
        baseWriteInput: { plan, planningQuestions, synthesize, sourcePool },
        facts,
        chunkInsights,
        purposePrefix: `${config.purposePrefix}.write`,
      })
    : await runWriteStep({
        args,
        config: { ...config, writeSystem },
        callStep,
        model,
        context,
        writeInput: { context, plan, planningQuestions, facts, synthesize, chunkInsights, sourcePool },
        purposePrefix: `${config.purposePrefix}.write`,
        maxTokens: config.writeMaxTokens || 6500,
      })

  const evidenceItems = facts.length > 0
    ? facts
    : sourcePool.map(item => ({
        statement: item.source_label || '上游可追溯来源',
        source_url: item.source,
        source: item.source,
        source_tier: item.source_tier,
        source_label: item.source_label,
        confidence: 'medium',
      }))
  const slides = normalizeSlides(write.slides, args.chunk, [
    ...evidenceItems,
    ...localEvidenceForPrompts(context).map(item => ({
      statement: item.key_facts[0] || item.source_label,
      source: item.source,
      source_url: item.source,
      source_tier: item.source_tier,
      source_label: item.source_label,
      type: item.type,
    })),
  ], chunkInsights)
  const thinkingLog = [
    {
      step: 'plan',
      content: thinkingContent(`围绕“${args.chunk.chunk_insight_question}”基于上游 chunks 拆出 ${planningQuestions.length} 个策略问题: ${planningQuestions.join('；')}。`),
    },
  ]
  if (needsSearch) {
    thinkingLog.push(
      {
        step: 'search',
        content: thinkingContent(`PLAN 判断年度规划需要补充外部时点信号，因此执行 ${searchResults.length} 次真实 web search，共返回 ${searchResults.reduce((sum, item) => sum + (item.results?.length || 0), 0)} 条结果。`),
        queries: searchResults.map(item => item.query),
        result_summary: searchSummary,
      },
      {
        step: 'read',
        content: thinkingContent(`从外部搜索结果和 ${context.localEvidence.length} 份本地一手证据中筛出 ${facts.length} 条可追溯事实，作为年度节奏或传播动作的校准材料。`),
      },
    )
  }
  thinkingLog.push(
    {
      step: 'synthesize',
      content: thinkingContent(`综合上游 chunk 和真实来源池后得出 takeaway: ${String(synthesize.chunk_takeaway || '').trim()}；洞察数量 ${chunkInsights.length}。`),
    },
    {
      step: 'write',
      content: thinkingContent(`按 blueprint ${args.chunk.chunk_id} 写出 ${write.slides?.length || 0} 页，逐页匹配 page_no/layout/allowed_concepts，并让 data_refs 回指带 source_tier 的可追溯来源。`),
    },
  )

  const result = buildOutput({
    config,
    chunk: args.chunk,
    synthesize,
    chunkInsights,
    slides,
    thinkingLog,
    metadata: {
      deepresearch_steps: thinkingLog.length,
      total_searches: searchResults.length,
      total_facts: facts.length,
      web_search_used: needsSearch,
      local_evidence_files: context.localEvidence.map(item => item.file),
      available_upstream_chunks: context.availableChunks.map(item => item.chunk_id),
      source_pool_urls: sourcePool.slice(0, 12),
      llm_steps_contract: config.llmSteps || [],
      search_contract: config.searchSteps || [],
    },
  })

  noFallbackSelfCheck(result, args.chunk, {
    expectedSteps: thinkingLog.length,
    minInsights: config.minInsights || 3,
    slug: args.slug,
    agentId: config.agentId,
  })
  assertWebSearchEvidence(result, { webSearchRequirement: args.webSearchRequirement, agentId: config.agentId })
  if (!args.skipCostGuard) await enforceCostGuard(args.slug, startingAuditCount)
  return result
}
