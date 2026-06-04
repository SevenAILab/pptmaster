#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { flattenBlueprintChunks, loadBlueprintForScheme } from './run-blueprint-suite.mjs'
import { ensureStrategicQuestion } from './strategic-question.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function repoPath(...segments) {
  return path.join(REPO_ROOT, ...segments)
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8')
}

function asList(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (!value) return []
  return String(value).split(/[、,，/]/).map(item => item.trim()).filter(Boolean)
}

function pick(form, ...keys) {
  for (const key of keys) {
    if (form[key] !== undefined && form[key] !== null && form[key] !== '') return form[key]
  }
  return ''
}

function extractRootQuestion(strategicQuestion = '') {
  return strategicQuestion.match(/## 根问题\s+([\s\S]*?)(?:\n## |\n$)/)?.[1]?.trim() || ''
}

function compactText(text, maxLength = 900) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}…`
}

function chunkPageRange(chunk) {
  if (Array.isArray(chunk.page_range)) return chunk.page_range
  const pageNos = (chunk.pages || []).map(page => page.page_no).filter(Number.isFinite)
  return [Math.min(...pageNos), Math.max(...pageNos)]
}

function clientInputRefs(clientSlug) {
  return [
    { type: 'client_form', ref: `inputs/${clientSlug}/form.json` },
    { type: 'client_summary', ref: `inputs/${clientSlug}/summary.md` },
    { type: 'strategic_question', ref: `inputs/${clientSlug}/strategic-question.md` },
  ]
}

function expectedOutputPath(clientSlug, chunk) {
  return `outputs/${clientSlug}/_chunks/${chunk.chunk_id}.json`
}

export function buildOrchestratorTaskPacket({
  clientSlug,
  schemeType,
  blueprint,
  blueprintPath,
  chunk,
  form,
  summary,
  strategicQuestion,
  upstreamSummaries = [],
  orchestrationIndex = 1,
  totalChunks = 1,
}) {
  if (!chunk) throw new Error('buildOrchestratorTaskPacket requires chunk')
  const pageRange = chunkPageRange(chunk)
  const rootQuestion = extractRootQuestion(strategicQuestion)

  return {
    schema_version: 'chief-strategist-task-packet/v1',
    orchestrator: {
      role: 'chief_strategist',
      responsibilities: [
        '需求澄清',
        '根问题定义',
        'blueprint 选择',
        '任务派发',
        '上下文裁剪',
        '证据核查',
        '冲突核查',
        '整案汇总',
      ],
    },
    client_slug: clientSlug,
    scheme_type: schemeType,
    blueprint_id: blueprint.blueprint_id,
    blueprint_path: blueprintPath,
    orchestration_index: orchestrationIndex,
    total_chunks: totalChunks,
    agent_id: chunk.driving_sub_agent,
    chunk_id: chunk.chunk_id,
    task: {
      title: chunk.chunk_title,
      intent: chunk.chunk_intent,
      must_answer: chunk.chunk_insight_question || chunk.chunk_intent,
      expected_insights_count: chunk.expected_insights_count || 1,
      must_yield_takeaway: chunk.must_yield_takeaway !== false,
      thinking_seed: chunk.thinking_seed || '先回扣 strategic question,再读取上游 chunk_takeaway,最后输出本段判断。',
      feeds_into: chunk.feeds_into || [],
    },
    context_layers: {
      global_context: {
        client_name: pick(form, 'name', '客户名') || clientSlug,
        industry: pick(form, 'industry', '行业') || '',
        stage: pick(form, 'stage', '品牌阶段') || '',
        target_audience: asList(pick(form, 'target_audience', '目标人群', '目标用户')),
        core_products: asList(pick(form, 'core_products', '核心产品', '核心产品/服务')),
        competitors: asList(pick(form, 'competitors', '主要竞品')),
        tonality: pick(form, 'tonality', '调性偏好') || '',
        scheme_type: schemeType,
        root_question: rootQuestion,
      },
      evidence_context: {
        client_inputs: clientInputRefs(clientSlug),
        summary_excerpt: compactText(summary),
        required_inputs: chunk.required_inputs || [],
        data_source_hints: (chunk.pages || []).map(page => ({
          page_no: page.page_no,
          hint: page.data_source_hint || '',
          case_reference_slide: page.case_reference_slide || null,
        })),
      },
      blueprint_context: {
        part_no: chunk.part_no,
        part_title: chunk.part_title,
        page_range: pageRange,
        page_count: chunk.pages?.length || 0,
        allowed_concepts: chunk.allowed_concepts || [],
        pages: (chunk.pages || []).map(page => ({
          page_no: page.page_no,
          page_intent: page.page_intent,
          page_subtitle: page.page_subtitle,
          recommended_layout: page.recommended_layout,
          concept_for_this_page: page.concept_for_this_page || null,
        })),
      },
      working_memory: {
        upstream_chunk_ids: chunk.upstream_chunks || [],
        upstream_chunks: upstreamSummaries,
      },
    },
    output_contract: {
      output_path: expectedOutputPath(clientSlug, chunk),
      required_fields: [
        'agent_id',
        'blueprint_chunk_id',
        'chunk_takeaway',
        'chunk_insights',
        'thinking_log',
        'slides',
        'metadata.blueprint_chunk_id',
      ],
      handoff_back_to_orchestrator: [
        'chunk_takeaway',
        'chunk_insights',
        'assumptions',
        'data_refs',
        'self_check_notes',
      ],
      slide_rules: [
        'slides.length 必须等于 blueprint_context.page_count',
        '每页 models_used 必须来自 allowed_concepts',
        '每页 action_title 必须推进判断,不能只写主题名',
        '资料不足时写 assumptions,不得伪造事实',
      ],
    },
    quality_gates: [
      'blueprintCheck',
      'contentCheck',
      'methodologyCheck',
      'consultingReview',
      'assembleByBlueprint',
    ],
  }
}

export function buildOrchestratorTaskPackets({
  clientSlug,
  schemeType,
  blueprint,
  blueprintPath,
  chunks,
  form,
  summary,
  strategicQuestion,
  upstreamByChunkId = {},
}) {
  return chunks.map((chunk, index) => buildOrchestratorTaskPacket({
    clientSlug,
    schemeType,
    blueprint,
    blueprintPath,
    chunk,
    form,
    summary,
    strategicQuestion,
    upstreamSummaries: (chunk.upstream_chunks || []).map(chunkId => upstreamByChunkId[chunkId]).filter(Boolean),
    orchestrationIndex: index + 1,
    totalChunks: chunks.length,
  }))
}

export function formatOrchestratorTaskPacket(packet) {
  return [
    '```json',
    JSON.stringify(packet, null, 2),
    '```',
  ].join('\n')
}

export async function buildPacketForChunk(clientSlug, schemeType, chunkId, options = {}) {
  const { blueprint, blueprintPath } = await loadBlueprintForScheme(schemeType)
  const chunks = flattenBlueprintChunks(blueprint, blueprintPath)
  const chunk = chunks.find(item => item.chunk_id === chunkId)
  if (!chunk) throw new Error(`Chunk ${chunkId} not found in ${schemeType}`)

  const inputDir = repoPath('inputs', clientSlug)
  const form = await readJson(path.join(inputDir, 'form.json'))
  const summary = await readText(path.join(inputDir, 'summary.md'))
  const strategic = await ensureStrategicQuestion(clientSlug, schemeType, { force: options.forceStrategicQuestion || false })
  const strategicQuestion = await readText(strategic.path)

  return buildOrchestratorTaskPacket({
    clientSlug,
    schemeType,
    blueprint,
    blueprintPath,
    chunk,
    form,
    summary,
    strategicQuestion,
    upstreamSummaries: options.upstreamSummaries || [],
    orchestrationIndex: chunks.findIndex(item => item.chunk_id === chunkId) + 1,
    totalChunks: chunks.length,
  })
}

async function cliMain() {
  const [clientSlug, schemeType, chunkId] = process.argv.slice(2)
  if (!clientSlug || !schemeType || !chunkId) {
    console.error('Usage: node scripts/chief-strategist-orchestrator.mjs <client_slug> <scheme_type> <chunk_id>')
    process.exit(1)
  }

  const packet = await buildPacketForChunk(clientSlug, schemeType, chunkId)
  console.log(formatOrchestratorTaskPacket(packet))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
