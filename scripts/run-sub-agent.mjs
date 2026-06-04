import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { contentCheck as consumerInsightContentCheck } from '../validators/consumer_insight/content-check.mjs'
import { methodologyCheck as consumerInsightMethodologyCheck } from '../validators/consumer_insight/methodology-check.mjs'
import { contentCheck as industryAnalysisContentCheck } from '../validators/industry_analysis/content-check.mjs'
import { methodologyCheck as industryAnalysisMethodologyCheck } from '../validators/industry_analysis/methodology-check.mjs'
import { contentCheck as competitorAnalysisContentCheck } from '../validators/competitor_analysis/content-check.mjs'
import { methodologyCheck as competitorAnalysisMethodologyCheck } from '../validators/competitor_analysis/methodology-check.mjs'
import { contentCheck as brandPositioningContentCheck } from '../validators/brand_positioning/content-check.mjs'
import { methodologyCheck as brandPositioningMethodologyCheck } from '../validators/brand_positioning/methodology-check.mjs'
import { contentCheck as brandBuildingContentCheck } from '../validators/brand_building/content-check.mjs'
import { methodologyCheck as brandBuildingMethodologyCheck } from '../validators/brand_building/methodology-check.mjs'
import { contentCheck as annualPlanningContentCheck } from '../validators/annual_planning/content-check.mjs'
import { methodologyCheck as annualPlanningMethodologyCheck } from '../validators/annual_planning/methodology-check.mjs'
import { buildOrchestratorTaskPacket, formatOrchestratorTaskPacket } from './chief-strategist-orchestrator.mjs'
import { renderDeck } from './render-deck.mjs'
import { callClaude, DEFAULT_CLAUDE_MODEL } from './llm-clients/claude-client.mjs'
import { appendLLMAuditLog, estimateCost } from './audit-log.mjs'
import { runIndustryDeepResearch } from './sub-agents/industry-analysis-deepresearch.mjs'
import { runConsumerDeepResearch } from './sub-agents/consumer-insight-deepresearch.mjs'
import { runCompetitorDeepResearch } from './sub-agents/competitor-analysis-deepresearch.mjs'
import { runPositioningDeepResearch } from './sub-agents/brand-positioning-deepresearch.mjs'
import { runBuildingDeepResearch } from './sub-agents/brand-building-deepresearch.mjs'
import { runAnnualDeepResearch } from './sub-agents/annual-planning-deepresearch.mjs'
import { applyLayoutDecisions, runLayoutDesigner } from './sub-agents/layout-designer.mjs'
import { classifySource, isVerifiableSource, normalizeSourcePath, sortBySourceTier } from './source-tiers.mjs'
import { buildBlueprintContextSnippet, loadMethodologyFramework } from './sub-agents/methodology-injection.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const SUB_AGENTS = {
  consumer_insight: {
    promptsDir: 'prompts/consumer_insight',
    validators: [consumerInsightContentCheck, consumerInsightMethodologyCheck],
    webSearch: 'optional',
    maxSearches: 3,
  },
  industry_analysis: {
    promptsDir: 'prompts/industry_analysis',
    validators: [industryAnalysisContentCheck, industryAnalysisMethodologyCheck],
    webSearch: 'required',
    maxSearches: 8,
  },
  competitor_analysis: {
    promptsDir: 'prompts/competitor_analysis',
    validators: [competitorAnalysisContentCheck, competitorAnalysisMethodologyCheck],
    webSearch: 'required',
    maxSearches: 12,
  },
  brand_positioning: {
    promptsDir: 'prompts/brand_positioning',
    validators: [brandPositioningContentCheck, brandPositioningMethodologyCheck],
    webSearch: false,
    maxSearches: 0,
  },
  brand_building: {
    promptsDir: 'prompts/brand_building',
    validators: [brandBuildingContentCheck, brandBuildingMethodologyCheck],
    webSearch: false,
    maxSearches: 0,
  },
  annual_planning: {
    promptsDir: 'prompts/annual_planning',
    validators: [annualPlanningContentCheck, annualPlanningMethodologyCheck],
    webSearch: 'optional',
    maxSearches: 4,
  },
}

const DEEP_RESEARCH_DISPATCH = {
  industry_analysis: runIndustryDeepResearch,
  consumer_insight: runConsumerDeepResearch,
  competitor_analysis: runCompetitorDeepResearch,
  brand_positioning: runPositioningDeepResearch,
  brand_building: runBuildingDeepResearch,
  annual_planning: runAnnualDeepResearch,
}

function repoPath(...segments) {
  return path.join(REPO_ROOT, ...segments)
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

async function readJsonOptional(filePath, fallback = null) {
  try {
    return await readJson(filePath)
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

function extractJsonFromText(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = fenced?.[1] || text
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object found in Claude response: ${text.slice(0, 240)}`)
  }
  return JSON.parse(trimmed.slice(start, end + 1))
}

function resolveRepoFile(filePath) {
  return path.isAbsolute(filePath) ? filePath : repoPath(filePath)
}

async function readOptionalText(filePath, fallback = '') {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

async function readStrategicQuestion(clientSlug) {
  const strategicQuestion = await readOptionalText(repoPath('inputs', clientSlug, 'strategic-question.md'), '')
  return strategicQuestion.trim() || '(not provided; generate inputs/<slug>/strategic-question.md before final production run)'
}

function ensureKnownAgent(agentId) {
  const config = SUB_AGENTS[agentId]
  if (!config) {
    throw new Error(`Unknown agent ${agentId}. Known agents: ${Object.keys(SUB_AGENTS).join(', ')}`)
  }
  return config
}

async function loadMatrixForAgent(agentId) {
  const matrix = await readJson(repoPath('assets/_compiled/concept-application-matrix.json'))
  return matrix.matrix?.[agentId] || { must_load: [], recommended: [], optional: [] }
}

async function readMustLoadConcepts(agentMatrix) {
  const concepts = []
  for (const item of agentMatrix.must_load || []) {
    const conceptPath = repoPath(item.file || `assets/_compiled/concepts-golden/${item.slug}.md`)
    const content = await fs.readFile(conceptPath, 'utf8')
    concepts.push({
      concept: item.concept,
      role: item.role || '',
      file: item.file || path.relative(REPO_ROOT, conceptPath),
      content,
    })
  }
  return concepts
}

async function readCasePatterns(agentId) {
  const manifestPath = repoPath('assets/_compiled/case-patterns/manifest.json')
  const manifest = await readJson(manifestPath)
  const entries = manifest[agentId] || []
  const patterns = []

  for (const entry of entries) {
    const patternPath = repoPath(entry.file)
    const content = await fs.readFile(patternPath, 'utf8')
    patterns.push({
      file: entry.file,
      role: entry.role || '',
      content,
    })
  }

  return patterns
}

function formatCasePatterns(casePatterns) {
  if (!casePatterns.length) return '(none)'

  return casePatterns.map(pattern => [
    `### Case Pattern: ${pattern.file}`,
    '',
    `Role: ${pattern.role}`,
    '',
    pattern.content,
  ].join('\n')).join('\n\n---\n\n')
}

function renderUserTemplate(template, form, summary) {
  const joined = value => Array.isArray(value) ? value.join(', ') : value || ''
  const replacements = {
    '{{client_name}}': form.name || '',
    '{{industry}}': form.industry || '',
    '{{stage}}': form.stage || '',
    '{{core_products}}': joined(form.core_products),
    '{{target_audience}}': joined(form.target_audience),
    '{{competitors}}': joined(form.competitors),
    '{{budget_level}}': form.budget_level || '',
    '{{tonality}}': form.tonality || '',
    '{{render_style}}': form.render_style || 'swiss',
    '{{expected_pages}}': String(form.expected_pages || 12),
    '{{uploaded_materials_summary}}': summary || '(empty)',
    '{{blueprint_chunk}}': form.blueprint_chunk_json || '',
    '{{upstream_chunks_summary}}': form.upstream_chunks_summary || '',
    '{{upstream.consumer_insight | "未提供,自行用通用方法补"}}': form.upstream_outputs?.consumer_insight || '未提供,自行用通用方法补',
    '{{upstream.industry_analysis | "未提供,自行用通用方法补"}}': form.upstream_outputs?.industry_analysis || '未提供,自行用通用方法补',
    '{{upstream.competitor_analysis | "未提供,自行用通用方法补"}}': form.upstream_outputs?.competitor_analysis || '未提供,自行用通用方法补',
    '{{upstream.consumer_insight | "未提供,可用客户资料和通用方法补,并记录 assumptions"}}': form.upstream_outputs?.consumer_insight || '未提供,可用客户资料和通用方法补,并记录 assumptions',
    '{{upstream.industry_analysis | "未提供,可用客户资料和 web_search 补,并记录 assumptions"}}': form.upstream_outputs?.industry_analysis || '未提供,可用客户资料和 web_search 补,并记录 assumptions',
    '{{upstream.brand_positioning | "未提供。只能生成待确认版本,不得伪造已定稿定位。"}}': form.upstream_outputs?.brand_positioning || '未提供。只能生成待确认版本,不得伪造已定稿定位。',
    '{{upstream.brand_building | "未提供,年度规划只能生成待确认版本,不得伪造已定稿品牌建设决策。"}}': form.upstream_outputs?.brand_building || '未提供,年度规划只能生成待确认版本,不得伪造已定稿品牌建设决策。',
    '{{upstream.consumer_insight | "未提供,可用客户资料补,并记录 assumptions"}}': form.upstream_outputs?.consumer_insight || '未提供,可用客户资料补,并记录 assumptions',
    '{{upstream.industry_analysis | "未提供,可用客户资料补,并记录 assumptions"}}': form.upstream_outputs?.industry_analysis || '未提供,可用客户资料补,并记录 assumptions',
    '{{upstream.competitor_analysis | "未提供,可用客户资料补,并记录 assumptions"}}': form.upstream_outputs?.competitor_analysis || '未提供,可用客户资料补,并记录 assumptions',
  }

  return Object.entries(replacements).reduce(
    (out, [token, value]) => out.replaceAll(token, value),
    template,
  )
}

export async function loadBlueprintChunk(blueprintPath, chunkId) {
  if (!blueprintPath || !chunkId) return null

  const blueprint = await readJson(resolveRepoFile(blueprintPath))
  for (const part of blueprint.parts || []) {
    for (const chunk of part.chunks || []) {
      if (chunk.chunk_id === chunkId) {
        return {
          ...chunk,
          driving_sub_agent: chunkId === 'p3-c6-focus-touchpoints'
            ? 'annual_planning'
            : chunk.driving_sub_agent,
          blueprint_id: blueprint.blueprint_id,
          blueprint_path: blueprintPath,
          scheme_type: blueprint.scheme_type,
          scheme_label_zh: blueprint.scheme_label_zh,
          part_no: part.part_no,
          part_title: part.part_title,
        }
      }
    }
  }

  throw new Error(`Chunk ${chunkId} not found in blueprint ${blueprintPath}`)
}

async function summarizeChunkOutput(clientSlug, chunkId) {
  const chunkPath = repoPath('outputs', clientSlug, '_chunks', `${chunkId}.json`)
  const output = await readJson(chunkPath)
  return {
    chunk_id: chunkId,
    source: path.relative(REPO_ROOT, chunkPath),
    chunk_takeaway: output.chunk_takeaway || '',
    chunk_insights: output.chunk_insights || [],
    slide_count: output.slides?.length || 0,
    titles: (output.slides || []).map(slide => slide.action_title).slice(0, 8),
    data_refs: collectTraceableDataRefs(output, clientSlug, { chunkId, maxDataRefs: 8 }),
  }
}

async function summarizeChunkOutputForRun(clientSlug, chunkId, options = {}) {
  const chunkPath = repoPath('outputs', clientSlug, '_chunks', `${chunkId}.json`)
  const output = await readJson(chunkPath)
  const runId = output.metadata?.run_id || null
  if (options.requireRunId && runId !== options.requireRunId) {
    return {
      chunk_id: chunkId,
      source: path.relative(REPO_ROOT, chunkPath),
      skipped: true,
      reason: `run_id mismatch: ${runId || '(missing)'} != ${options.requireRunId}`,
    }
  }
  return {
    chunk_id: chunkId,
    source: path.relative(REPO_ROOT, chunkPath),
    chunk_takeaway: output.chunk_takeaway || '',
    chunk_insights: output.chunk_insights || [],
    slide_count: output.slides?.length || 0,
    titles: (output.slides || []).map(slide => slide.action_title).slice(0, 8),
    data_refs: collectTraceableDataRefs(output, clientSlug, { chunkId, maxDataRefs: options.maxDataRefs || 8 }),
  }
}

function refSource(ref = {}) {
  return ref.source || ref.source_url || ref.url || ''
}

function collectTraceableDataRefs(output, clientSlug, options = {}) {
  const maxDataRefs = Number(options.maxDataRefs || 8)
  const seen = new Set()
  const refs = []
  for (const slide of output.slides || []) {
    for (const ref of slide.data_refs || []) {
      const source = refSource(ref)
      if (!source || seen.has(normalizeSourcePath(source))) continue
      if (!isVerifiableSource(source, { slug: clientSlug })) continue
      seen.add(normalizeSourcePath(source))
      const sourceInfo = classifySource(source, { slug: clientSlug })
      refs.push({
        value: ref.value || ref.statement || ref.title || '',
        source: normalizeSourcePath(source),
        source_tier: ref.source_tier || sourceInfo.source_tier,
        source_label: ref.source_label || sourceInfo.source_label,
        type: ref.type || sourceInfo.type,
        from_chunk_id: options.chunkId || output.blueprint_chunk_id || '',
        from_page_no: slide.page_no ?? null,
      })
    }
  }
  return sortBySourceTier(refs).slice(0, maxDataRefs)
}

function budgetRefsAcrossChunks(summaries, maxDataRefs) {
  const limit = Number(maxDataRefs || 8)
  const seen = new Set()
  let remaining = limit
  return summaries.map(summary => {
    if (!Array.isArray(summary.data_refs)) return summary
    const dataRefs = []
    for (const ref of summary.data_refs) {
      const source = normalizeSourcePath(ref.source || ref.source_url || '')
      if (!source || seen.has(source) || remaining <= 0) continue
      seen.add(source)
      remaining -= 1
      dataRefs.push(ref)
    }
    return {
      ...summary,
      data_refs: dataRefs,
    }
  })
}

export async function loadUpstreamChunksSummary(clientSlug, upstreamChunkIds = [], options = {}) {
  if (!upstreamChunkIds.length) return ''

  const summaries = []
  for (const chunkId of upstreamChunkIds) {
    try {
      const summary = await summarizeChunkOutputForRun(clientSlug, chunkId, options)
      summaries.push({
        ...summary,
        data_refs: (summary.data_refs || []).slice(0, options.maxDataRefs || 8),
      })
    } catch (error) {
      summaries.push({
        chunk_id: chunkId,
        missing: true,
        error: error.message,
      })
    }
  }

  return JSON.stringify(budgetRefsAcrossChunks(summaries, options.maxDataRefs || 8), null, 2)
}

export async function loadUpstreamChunkObjects(clientSlug, upstreamChunkIds = [], options = {}) {
  const items = []
  for (const chunkId of upstreamChunkIds) {
    const chunkPath = repoPath('outputs', clientSlug, '_chunks', `${chunkId}.json`)
    const output = await readJsonOptional(chunkPath, null)
    if (!output) {
      items.push({
        chunk_id: chunkId,
        missing: true,
        source: path.relative(REPO_ROOT, chunkPath),
      })
      continue
    }
    if (options.requireRunId && output.metadata?.run_id !== options.requireRunId) {
      items.push({
        chunk_id: chunkId,
        skipped: true,
        reason: `run_id mismatch: ${output.metadata?.run_id || '(missing)'} != ${options.requireRunId}`,
        source: path.relative(REPO_ROOT, chunkPath),
      })
      continue
    }

    items.push({
      chunk_id: chunkId,
      source: path.relative(REPO_ROOT, chunkPath),
      chunk_takeaway: output.chunk_takeaway || '',
      chunk_insights: output.chunk_insights || [],
      slide_count: output.slides?.length || 0,
      data_refs: collectTraceableDataRefs(output, clientSlug, { chunkId, maxDataRefs: options.maxDataRefs || 8 }),
    })
  }
  return items
}

async function loadBlueprintFromChunk(blueprintChunk) {
  if (!blueprintChunk?._blueprint_path && !blueprintChunk?.blueprint_path) return null
  return readJson(resolveRepoFile(blueprintChunk._blueprint_path || blueprintChunk.blueprint_path))
}

function getOutputDirName(clientSlug, options = {}) {
  return options.outputSuffix ? `${clientSlug}-${options.outputSuffix}` : clientSlug
}

function getChunkIdFromOptions(options = {}) {
  return options.chunkId || options.blueprintChunk?.chunk_id || null
}

function getOutputTarget(clientSlug, options = {}) {
  const chunkId = getChunkIdFromOptions(options)
  if (chunkId) {
    const outputDir = repoPath('outputs', clientSlug, '_chunks')
    return {
      outputDir,
      outputDirName: `${clientSlug}/_chunks`,
      bundlePath: path.join(outputDir, `${chunkId}.prompt-bundle.md`),
      rawPath: path.join(outputDir, `${chunkId}.json`),
      htmlPath: path.join(outputDir, `${chunkId}.html`),
      rawOutputRef: `outputs/${clientSlug}/_chunks/${chunkId}.json`,
    }
  }

  const outputDirName = getOutputDirName(clientSlug, options)
  const outputDir = repoPath('outputs', outputDirName)
  return {
    outputDir,
    outputDirName,
    bundlePath: path.join(outputDir, 'prompt-bundle.md'),
    rawPath: path.join(outputDir, 'raw-output.json'),
    htmlPath: path.join(outputDir, 'index.html'),
    rawOutputRef: `outputs/${outputDirName}/raw-output.json`,
  }
}

export async function prepareSubAgentBundle(agentId, clientSlug, options = {}) {
  const agentConfig = ensureKnownAgent(agentId)
  const inputDir = repoPath('inputs', clientSlug)
  const outputTarget = getOutputTarget(clientSlug, options)
  const formPath = path.join(inputDir, 'form.json')
  const summaryPath = path.join(inputDir, 'summary.md')

  const form = await readJson(formPath)
  const blueprintChunk = options.blueprintChunk || await loadBlueprintChunk(options.blueprintPath, options.chunkId)
  const upstreamChunkIds = options.upstreamChunks || blueprintChunk?.upstream_chunks || []
  const upstreamChunksSummary = options.upstreamChunksSummary ?? await loadUpstreamChunksSummary(clientSlug, upstreamChunkIds, {
    requireRunId: options.runId || null,
  })
  const formWithUpstream = options.upstreamOutputs
    ? {
        ...form,
        upstream_outputs: {
          ...(form.upstream_outputs || {}),
          ...options.upstreamOutputs,
        },
        blueprint_chunk_json: blueprintChunk ? JSON.stringify(blueprintChunk, null, 2) : '',
        upstream_chunks_summary: upstreamChunksSummary,
      }
    : {
        ...form,
        blueprint_chunk_json: blueprintChunk ? JSON.stringify(blueprintChunk, null, 2) : '',
        upstream_chunks_summary: upstreamChunksSummary,
      }
  const summary = await readOptionalText(summaryPath, '')
  const strategicQuestion = await readStrategicQuestion(clientSlug)
  const methodologyFramework = await loadMethodologyFramework(agentId)
  const researchBlueprintSnippet = await buildBlueprintContextSnippet(clientSlug, agentId)
  const agentMatrix = await loadMatrixForAgent(agentId)
  const mustLoad = await readMustLoadConcepts(agentMatrix)
  const casePatterns = await readCasePatterns(agentId)
  const blueprint = await loadBlueprintFromChunk(blueprintChunk)
  const upstreamChunkObjects = await loadUpstreamChunkObjects(clientSlug, upstreamChunkIds, {
    requireRunId: options.runId || null,
  })
  const orchestratorTaskPacket = blueprintChunk && blueprint
    ? buildOrchestratorTaskPacket({
        clientSlug,
        schemeType: blueprintChunk.scheme_type || blueprint.scheme_type,
        blueprint,
        blueprintPath: blueprintChunk._blueprint_path || blueprintChunk.blueprint_path,
        chunk: blueprintChunk,
        form,
        summary,
        strategicQuestion,
        upstreamSummaries: upstreamChunkObjects,
      })
    : null

  const promptsDir = repoPath(agentConfig.promptsDir)
  const systemMd = await fs.readFile(path.join(promptsDir, 'system.md'), 'utf8')
  const userMdTpl = await fs.readFile(path.join(promptsDir, 'user.md'), 'utf8')
  const examplesMd = await fs.readFile(path.join(promptsDir, 'examples.md'), 'utf8')
  const userPrompt = renderUserTemplate(userMdTpl, formWithUpstream, summary)

  const bundle = [
    `# Prompt Bundle · ${agentId} · ${clientSlug}`,
    '',
    '## System',
    '',
    systemMd,
    '',
    '---',
    '',
    '## Examples',
    '',
    examplesMd,
    '',
    '---',
    '',
    '## Case Patterns (auto-injected)',
    '',
    formatCasePatterns(casePatterns),
    '',
    '---',
    '',
    '## Must-load concepts (auto-injected)',
    '',
    mustLoad.map(concept => [
      `### Concept: ${concept.concept} (role: ${concept.role})`,
      '',
      `Source: \`${concept.file}\``,
      '',
      concept.content,
    ].join('\n')).join('\n\n---\n\n'),
    '',
    '---',
    '',
    '## Strategic Question (auto-injected)',
    '',
    strategicQuestion,
    '',
    '---',
    '',
    '## Research Blueprint (auto-injected)',
    '',
    researchBlueprintSnippet || '(not generated yet; blueprint suite creates this during --real-llm runs)',
    '',
    '---',
    '',
    '## Methodology Framework (auto-injected)',
    '',
    methodologyFramework,
    '',
    '---',
    '',
    '## Orchestrator Task Packet (auto-injected)',
    '',
    orchestratorTaskPacket
      ? formatOrchestratorTaskPacket(orchestratorTaskPacket)
      : '(not in blueprint mode; chief strategist task packet is only injected when --blueprint and --chunk-id are provided)',
    '',
    '---',
    '',
    '## User Input',
    '',
    userPrompt,
    '',
    '---',
    '',
    '## Raw Client Profile',
    '',
    '```json',
    JSON.stringify(formWithUpstream, null, 2),
    '```',
    '',
    '## Output Target',
    '',
    `请按 System 契约输出严格 JSON 到 \`${outputTarget.rawOutputRef}\`。`,
  ].join('\n')

  await fs.mkdir(outputTarget.outputDir, { recursive: true })
  await fs.writeFile(outputTarget.bundlePath, bundle)

  return {
    agentId,
    clientSlug,
    outputDirName: outputTarget.outputDirName,
    bundlePath: outputTarget.bundlePath,
    rawPath: outputTarget.rawPath,
    mustLoadCount: mustLoad.length,
    casePatternCount: casePatterns.length,
    recommendedCount: agentMatrix.recommended?.length || 0,
    webSearch: agentConfig.webSearch,
    maxSearches: agentConfig.maxSearches || 0,
    blueprintChunk,
    systemPrompt: systemMd,
    userPrompt,
  }
}

function usageTokens(usage = {}) {
  return {
    input_tokens: Number(usage.input_tokens ?? usage.prompt_tokens ?? 0),
    output_tokens: Number(usage.output_tokens ?? usage.completion_tokens ?? 0),
    cache_read_tokens: Number(usage.cache_read_input_tokens ?? usage.cache_read_tokens ?? 0),
    cache_creation_tokens: Number(usage.cache_creation_input_tokens ?? usage.cache_creation_tokens ?? 0),
  }
}

export async function runRealLLMSubAgent(agentId, clientSlug, options = {}) {
  const bundleResult = await prepareSubAgentBundle(agentId, clientSlug, options)
  const deepResearchRunner = DEEP_RESEARCH_DISPATCH[agentId]
  if (deepResearchRunner && bundleResult.blueprintChunk) {
    const inputDir = repoPath('inputs', clientSlug)
    const form = await readJson(path.join(inputDir, 'form.json'))
    const clientSummary = await readOptionalText(path.join(inputDir, 'summary.md'), '')
    const strategicQuestion = await readStrategicQuestion(clientSlug)
    const upstreamChunksSummary = await loadUpstreamChunksSummary(
      clientSlug,
      options.upstreamChunks || bundleResult.blueprintChunk.upstream_chunks || [],
      { requireRunId: options.runId || null },
    )
    const output = await deepResearchRunner({
      chunk: {
        ...bundleResult.blueprintChunk,
        driving_sub_agent: agentId,
      },
      form,
      clientSummary,
      strategicQuestion,
      upstreamChunksSummary,
      slug: clientSlug,
      model: options.model || DEFAULT_CLAUDE_MODEL,
      retryHint: options.retryHint || null,
      webSearchRequirement: bundleResult.webSearch,
    })
    await fs.mkdir(path.dirname(bundleResult.rawPath), { recursive: true })
    await fs.writeFile(bundleResult.rawPath, JSON.stringify(output, null, 2))
    return {
      ...bundleResult,
      model: options.model || DEFAULT_CLAUDE_MODEL,
      usage: { input_tokens: 0, output_tokens: 0 },
      latencyMs: 0,
      output,
      deepResearch: true,
    }
  }

  if (bundleResult.blueprintChunk && !deepResearchRunner) {
    throw new Error(`No DeepResearch loop for ${agentId}`)
  }

  const prompt = [
    bundleResult.userPrompt,
    '',
    'Return only valid JSON. Do not wrap the response in commentary.',
  ].join('\n')
  const model = options.model || DEFAULT_CLAUDE_MODEL
  const start = Date.now()
  const response = await callClaude(bundleResult.systemPrompt, prompt, {
    model,
    maxTokens: options.maxTokens || 8000,
    temperature: options.temperature ?? 0.3,
    dryRun: options.dryRun === true,
  })
  const latencyMs = Date.now() - start
  const usage = usageTokens(response.usage)

  await appendLLMAuditLog(clientSlug, {
    timestamp: new Date().toISOString(),
    provider: response.provider || 'anthropic',
    model: response.model || model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_read_tokens: usage.cache_read_tokens,
    cache_creation_tokens: usage.cache_creation_tokens,
    latency_ms: latencyMs,
    estimated_cost_usd: estimateCost(usage, response.model || model),
    purpose: `${agentId}.${options.chunkId || 'raw-output'}`,
  })

  const output = extractJsonFromText(response.text)
  await fs.mkdir(path.dirname(bundleResult.rawPath), { recursive: true })
  await fs.writeFile(bundleResult.rawPath, JSON.stringify(output, null, 2))

  return {
    ...bundleResult,
    model: response.model || model,
    usage,
    latencyMs,
    output,
  }
}

export async function applyLayoutDesignerToRunResult(result, clientSlug, options = {}) {
  if (!result?.output?.slides?.length) {
    throw new Error('Layout Designer requires a sub-agent output with slides')
  }

  const layoutDesignerRunner = options.layoutDesignerRunner || runLayoutDesigner
  const decisions = await layoutDesignerRunner({
    chunkOutput: result.output,
    slug: clientSlug,
    model: options.model,
  })
  const decoratedOutput = applyLayoutDecisions(result.output, decisions)
  await fs.writeFile(result.rawPath, JSON.stringify(decoratedOutput, null, 2))
  return {
    ...result,
    output: decoratedOutput,
    layoutDesigner: {
      decisions: decisions.layout_decisions.length,
    },
  }
}

export async function validateSubAgentOutput(agentId, clientSlug, options = {}) {
  const agentConfig = ensureKnownAgent(agentId)
  const blueprintChunk = options.blueprintChunk || await loadBlueprintChunk(options.blueprintPath, options.chunkId)
  const outputTarget = getOutputTarget(clientSlug, { ...options, blueprintChunk })
  const rawPath = outputTarget.rawPath
  const htmlPath = outputTarget.htmlPath
  const output = await readJson(rawPath)

  const validationResults = agentConfig.validators.map(validator => validator(output, { blueprintChunk }))
  const errors = validationResults.flatMap(result => result.errors || [])
  const warnings = validationResults.flatMap(result => result.warnings || [])
  const passed = errors.length === 0

  if (!passed) {
    return { passed, errors, warnings, rawPath, htmlPath }
  }

  const style = output.client_profile?.render_style || output.metadata?.render_style || 'swiss'
  const renderResult = await renderDeck(rawPath, htmlPath, { style })
  return { passed, errors, warnings, rawPath, htmlPath, renderResult }
}

export function parseArgs(args) {
  const positional = []
  let validateOnly = false
  let outputSuffix
  let blueprintPath
  let chunkId
  let upstreamChunks = []
  let realLLM = false
  let withLayoutDesigner = false

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--real-llm') {
      realLLM = true
      continue
    }
    if (arg === '--with-layout-designer') {
      withLayoutDesigner = true
      continue
    }
    if (arg === '--validate') {
      validateOnly = true
      continue
    }
    if (arg === '--output-suffix') {
      outputSuffix = args[index + 1]
      index += 1
      continue
    }
    if (arg.startsWith('--output-suffix=')) {
      outputSuffix = arg.split('=').slice(1).join('=')
      continue
    }
    if (arg === '--blueprint') {
      blueprintPath = args[index + 1]
      index += 1
      continue
    }
    if (arg.startsWith('--blueprint=')) {
      blueprintPath = arg.split('=').slice(1).join('=')
      continue
    }
    if (arg === '--chunk-id') {
      chunkId = args[index + 1]
      index += 1
      continue
    }
    if (arg.startsWith('--chunk-id=')) {
      chunkId = arg.split('=').slice(1).join('=')
      continue
    }
    if (arg === '--upstream-chunks') {
      upstreamChunks = (args[index + 1] || '').split(',').filter(Boolean)
      index += 1
      continue
    }
    if (arg.startsWith('--upstream-chunks=')) {
      upstreamChunks = arg.split('=').slice(1).join('=').split(',').filter(Boolean)
      continue
    }
    if (arg.startsWith('--')) continue
    positional.push(arg)
  }

  return {
    agentId: positional[0],
    clientSlug: positional[1],
    validateOnly,
    outputSuffix,
    blueprintPath,
    chunkId,
    upstreamChunks,
    realLLM,
    withLayoutDesigner,
  }
}

async function cliMain() {
  const {
    agentId,
    clientSlug,
    validateOnly,
    outputSuffix,
    blueprintPath,
    chunkId,
    upstreamChunks,
    realLLM,
    withLayoutDesigner,
  } = parseArgs(process.argv.slice(2))
  const options = { outputSuffix, blueprintPath, chunkId, upstreamChunks }

  if (!agentId || !clientSlug) {
    console.error('Usage: node scripts/run-sub-agent.mjs <agent_id> <client_slug> [--output-suffix=<suffix>] [--blueprint=<path>] [--chunk-id=<id>] [--upstream-chunks=<ids>] [--real-llm] [--with-layout-designer] [--validate]')
    console.error(`  agent_id: ${Object.keys(SUB_AGENTS).join(' | ')}`)
    console.error('  client_slug: e.g. smallrig')
    process.exit(1)
  }

  if (withLayoutDesigner && !realLLM) {
    throw new Error('--with-layout-designer requires --real-llm so the source chunk is freshly generated by a real sub-agent')
  }

  const outputTarget = getOutputTarget(clientSlug, options)

  if (validateOnly) {
    console.log(`\n[4/6] Validating ${path.relative(REPO_ROOT, outputTarget.rawPath)}...`)
    const result = await validateSubAgentOutput(agentId, clientSlug, options)
    if (!result.passed) {
      console.error('  ❌ validation failed')
      for (const error of result.errors) console.error(`     - ${error}`)
      for (const warning of result.warnings) console.error(`     warning: ${warning}`)
      process.exit(1)
    }

    console.log(`  ✅ validators passed (warnings: ${result.warnings.length})`)
    for (const warning of result.warnings) console.log(`     warning: ${warning}`)
    console.log(`[5/6] Rendered ${result.renderResult.slideCount} slides, style=${result.renderResult.style}`)
    console.log(`[6/6] Done. Open: ${path.relative(REPO_ROOT, result.htmlPath)}`)
    return
  }

  console.log(`\n=== Run Sub-Agent ${agentId} for client ${clientSlug} ===\n`)
  if (realLLM) {
    let result = await runRealLLMSubAgent(agentId, clientSlug, options)
    if (withLayoutDesigner) {
      result = await applyLayoutDesignerToRunResult(result, clientSlug, options)
    }
    console.log(`[1/4] Wrote prompt bundle -> ${path.relative(REPO_ROOT, result.bundlePath)}`)
    if (result.blueprintChunk) {
      console.log(`[2/4] BLUEPRINT MODE chunk -> ${result.blueprintChunk.chunk_id} (${result.blueprintChunk.pages?.length || 0} pages)`)
    } else {
      console.log('[2/4] Standard raw-output mode')
    }
    console.log(`[3/4] Called Claude model=${result.model}`)
    if (result.deepResearch) {
      console.log('      DeepResearch loop: plan/search/read/synthesize/write')
    } else {
      console.log(`      Tokens: ${result.usage.input_tokens} in / ${result.usage.output_tokens} out`)
      console.log(`      Latency: ${result.latencyMs}ms`)
    }
    console.log(`[4/4] Wrote JSON -> ${path.relative(REPO_ROOT, result.rawPath)}`)
    if (result.layoutDesigner) {
      console.log(`      Layout Designer applied: ${result.layoutDesigner.decisions} decisions`)
    }
    return
  }

  const result = await prepareSubAgentBundle(agentId, clientSlug, options)
  console.log(`[1/6] Loaded ${result.mustLoadCount} must_load concepts from matrix`)
  console.log(`[2/6] Wrote prompt bundle -> ${path.relative(REPO_ROOT, result.bundlePath)}`)
  if (result.blueprintChunk) {
    console.log(`[2.5/6] BLUEPRINT MODE chunk -> ${result.blueprintChunk.chunk_id} (${result.blueprintChunk.pages?.length || 0} pages)`)
  }
  const wsConfig = result.webSearch
  if (wsConfig === 'required') {
    console.log(`[3/6] ⚠️  本 Sub-Agent 必须调用 web_search (最多 ${result.maxSearches} 次)`)
    console.log('     Claude 生成 raw-output 前必须先调用 node scripts/web-search.mjs 获取真实数据')
  } else if (wsConfig === 'optional') {
    console.log(`[3/6] ℹ️  本 Sub-Agent 可选 web_search (条件触发, ≤ ${result.maxSearches} 次)`)
  } else {
    console.log('[3/6] 本 Sub-Agent 不调用 web_search')
  }
  console.log('     Now ask Claude/Codex to read the bundle and produce raw-output.json')
  console.log(`\n下一步:`)
  console.log(`  1) 读取 ${path.relative(REPO_ROOT, result.bundlePath)}`)
  console.log(`  2) 生成符合 schema 的 JSON 写入 ${path.relative(REPO_ROOT, result.rawPath)}`)
  console.log(`  3) 重新跑: node scripts/run-sub-agent.mjs ${agentId} ${clientSlug}${outputSuffix ? ` --output-suffix=${outputSuffix}` : ''}${blueprintPath ? ` --blueprint=${blueprintPath}` : ''}${chunkId ? ` --chunk-id=${chunkId}` : ''} --validate`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
