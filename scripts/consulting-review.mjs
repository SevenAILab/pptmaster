#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { appendLLMAuditLog, estimateCost } from './audit-log.mjs'
import { evaluateChunkAssumptions } from './assumption-policy.mjs'
import { callClaude, DEFAULT_CLAUDE_MODEL } from './llm-clients/claude-client.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const SYSTEM_PROMPT = [
  'You are a senior client-side brand director with 5 years of consulting buying experience.',
  'You are reviewing a strategy deck chunk from an external consulting team.',
  'Be strict, concrete, and evidence-aware. Return strict JSON only.',
].join(' ')

function repoPath(...segments) {
  return path.join(REPO_ROOT, ...segments)
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

async function appendConsultingReviewAuditLog(slug, entry) {
  const dir = repoPath('outputs', slug, '_audit')
  await fs.mkdir(dir, { recursive: true })
  await fs.appendFile(path.join(dir, 'consulting-reviews.jsonl'), `${JSON.stringify(entry)}\n`)
}

function usageTokens(usage = {}) {
  return {
    input_tokens: Number(usage.input_tokens ?? usage.prompt_tokens ?? 0),
    output_tokens: Number(usage.output_tokens ?? usage.completion_tokens ?? 0),
    cache_read_tokens: Number(usage.cache_read_input_tokens ?? usage.cache_read_tokens ?? 0),
    cache_creation_tokens: Number(usage.cache_creation_input_tokens ?? usage.cache_creation_tokens ?? 0),
  }
}

function extractJsonOrThrow(response, expectedKeys = []) {
  const text = response.text || ''
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = fenced?.[1] || text
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object found in Consulting Review response: ${text.slice(0, 240)}`)
  }

  const parsed = JSON.parse(trimmed.slice(start, end + 1))
  for (const key of expectedKeys) {
    if (!(key in parsed)) throw new Error(`Consulting Review response missing required key: ${key}`)
  }
  return parsed
}

function compactChunkOutput(chunkOutput) {
  return {
    agent_id: chunkOutput.agent_id,
    blueprint_chunk_id: chunkOutput.blueprint_chunk_id,
    chunk_takeaway: chunkOutput.chunk_takeaway,
    chunk_insights: chunkOutput.chunk_insights || [],
    thinking_log_steps: Array.isArray(chunkOutput.thinking_log) ? chunkOutput.thinking_log.length : 0,
    slides: (chunkOutput.slides || []).map(slide => ({
      page_no: slide.page_no,
      layout: slide.layout,
      action_title: slide.action_title,
      core_points: slide.core_points || [],
      data_refs: slide.data_refs || [],
      evidence_status: slide.evidence_status || 'evidenced',
      hypothesis_basis: slide.hypothesis_basis || '',
      validation_method: slide.validation_method || '',
      models_used: slide.models_used || [],
      layout_designer: slide.layout_designer || null,
    })),
  }
}

export function buildConsultingReviewPrompt(chunkOutput, blueprintChunk = null) {
  return [
    '你是 5 年甲方品牌总监, 刚收到乙方咨询公司提交的 chunk 输出。',
    '你的任务是做严格的反向 stress-test, 判断这段内容是否值得进入完整品牌方案。',
    '',
    'Chunk 输出:',
    JSON.stringify(compactChunkOutput(chunkOutput), null, 2),
    '',
    'Blueprint chunk 约束:',
    JSON.stringify(blueprintChunk ? {
      chunk_id: blueprintChunk.chunk_id,
      chunk_title: blueprintChunk.chunk_title,
      chunk_insight_question: blueprintChunk.chunk_insight_question,
      expected_insights_count: blueprintChunk.expected_insights_count,
      page_count_min: blueprintChunk.page_count_min,
      page_count_max: blueprintChunk.page_count_max,
      pages: (blueprintChunk.pages || []).map(page => ({
        page_no: page.page_no,
        page_subtitle: page.page_subtitle,
        page_intent: page.page_intent,
      })),
    } : {}, null, 2),
    '',
    '请回答 4 个问题, 每题 1-10 分:',
    '',
    'Q1 insight_depth_score: 看完这段你学到什么新东西? 不是套话, 是 insight.',
    '- 8+: 提供 3+ 条非显而易见洞察',
    '- 5-7: 1-2 条洞察, 其他是常识',
    '- 3-4: 全是行业常识/套话',
    '- 1-2: 像 AI 凭空想象, 没有调研支撑',
    '',
    'Q2 consulting_tone_score: 用一句话讲清楚这段核心结论, 能说吗?',
    '- 8+: chunk_takeaway 是咨询级判断, 有立场、反方和具体动作',
    '- 5-7: 有结论但不够锐',
    '- 3-4: 是描述不是判断',
    '- 1-2: 没有结论',
    '',
    'Q3 page_efficiency_score: 哪一页删掉后这段仍然成立?',
    '- 8+: 每页都不可替代',
    '- 5-7: 1 页可删',
    '- 3-4: 2-3 页冗余',
    '- 1-2: 一半页面是水分',
    '',
    'Q4 data_credibility_score: data_refs 的来源是否可信, 且未把未经证实的判断当事实?',
    '- 关键区分: 描述性事实必须有真实来源(T1/T2/T3 皆可, 按 tier 标注); 建议/预测性判断必须有真实证据链, 或被明确标注 evidence_status=hypothesis 且给出 hypothesis_basis + validation_method。第三种「没来源却写成事实/行动结论」是红线违规。',
    '- 8+: 描述事实都有 T1/T2/T3 真实来源; 建议判断要么有可追溯证据, 要么诚实标注为待验证假设(带依据+验证方法)。assets/_raw/cases/** 只能作方法论范例。',
    '- 5-7: 多数有 T2/T3 或诚实假设标注, 个别依据偏弱。',
    '- 3-4: 假设虽多但仍诚实标注; 或 T3/T4 为主、关键判断缺 T1/T2 但未伪装成事实。',
    '- 1-2: 出现把未经证实判断当事实写、假来源、不可访问、无 source、或 inputs/<slug>/summary.md 当数据。',
    '注意: 诚实标注的待验证假设不应被当作低可信度而打到 BLOCK; 真正该重罚的是「把没来源的判断当事实/行动结论」。该违规已由确定性硬闸拦截, 你只需正常打分。',
    '',
    'verdict 判定:',
    '- 4 项平均 >= 7: PASS',
    '- 4 项平均 >= 6 且 < 7: RETRY',
    '- 4 项平均 < 6 或出现假来源: BLOCK',
    '',
    '输出严格 JSON, 不要 Markdown:',
    JSON.stringify({
      insight_depth_score: 8,
      consulting_tone_score: 7,
      page_efficiency_score: 6,
      data_credibility_score: 8,
      key_weakness: '最弱的一点',
      must_fix_pages: [1],
      deletable_pages: [],
      verdict: 'PASS',
    }, null, 2),
  ].join('\n')
}

function clampScore(value, field) {
  const score = Math.round(Number(value))
  if (!Number.isFinite(score) || score < 1 || score > 10) {
    throw new Error(`Consulting Review ${field} must be an integer 1-10, got ${value}`)
  }
  return score
}

function normalizePageList(value, slides) {
  const validPages = new Set((slides || []).map(slide => Number(slide.page_no)).filter(Boolean))
  const pages = Array.isArray(value) ? value : []
  return Array.from(new Set(pages.map(Number).filter(page => validPages.has(page))))
}

function verdictFromScores(review) {
  const average = (
    review.insight_depth_score +
    review.consulting_tone_score +
    review.page_efficiency_score +
    review.data_credibility_score
  ) / 4
  if (average >= 7) return 'PASS'
  if (average >= 6) return 'RETRY'
  return 'BLOCK'
}

export function normalizeConsultingReviewResponse(responseJson, chunkOutput) {
  const llmVerdict = String(responseJson.verdict || '').trim().toUpperCase()
  if (!['PASS', 'RETRY', 'BLOCK'].includes(llmVerdict)) {
    throw new Error(`Consulting Review verdict must be PASS, RETRY, or BLOCK, got ${responseJson.verdict}`)
  }
  const review = {
    insight_depth_score: clampScore(responseJson.insight_depth_score, 'insight_depth_score'),
    consulting_tone_score: clampScore(responseJson.consulting_tone_score, 'consulting_tone_score'),
    page_efficiency_score: clampScore(responseJson.page_efficiency_score, 'page_efficiency_score'),
    data_credibility_score: clampScore(responseJson.data_credibility_score, 'data_credibility_score'),
    key_weakness: String(responseJson.key_weakness || '').trim(),
    must_fix_pages: normalizePageList(responseJson.must_fix_pages, chunkOutput.slides),
    deletable_pages: normalizePageList(responseJson.deletable_pages, chunkOutput.slides),
    llm_verdict: llmVerdict,
  }
  review.verdict = verdictFromScores(review)
  if (review.llm_verdict !== review.verdict) {
    review.verdict_consistency_note = `LLM verdict ${review.llm_verdict} adjusted to rubric verdict ${review.verdict}`
  }
  if (!review.key_weakness) {
    throw new Error('Consulting Review key_weakness must be non-empty')
  }
  return review
}

function applyDeterministicVerdictGuard(review, assumption) {
  if (assumption.hardBlock) return review
  if (review.verdict !== 'BLOCK' && review.llm_verdict !== 'BLOCK') return review
  return {
    ...review,
    verdict: 'RETRY',
    verdict_consistency_note: [
      review.verdict_consistency_note,
      'LLM BLOCK downgraded to RETRY because deterministic evidence gate passed; fix quality issues once, do not hard-block on rubric-score jitter.',
    ].filter(Boolean).join(' | '),
  }
}

export async function runConsultingReview(chunkOutput, slug, options = {}) {
  if (!chunkOutput) throw new Error('runConsultingReview requires chunkOutput')
  if (!slug) throw new Error('runConsultingReview requires slug for audit logging')

  const model = options.model || DEFAULT_CLAUDE_MODEL
  const callStep = options.callStep || callClaude
  const appendLlmAuditLog = options.appendLLMAuditLog || appendLLMAuditLog
  const appendReviewAuditLog = options.appendReviewAuditLog || appendConsultingReviewAuditLog
  const startedAt = Date.now()
  const response = await callStep(
    SYSTEM_PROMPT,
    buildConsultingReviewPrompt(chunkOutput, options.blueprintChunk || null),
    {
      model,
      maxTokens: options.maxTokens || 1800,
      temperature: options.temperature ?? 0.4,
    },
  )
  const usage = usageTokens(response.usage)
  await appendLlmAuditLog(slug, {
    timestamp: new Date().toISOString(),
    provider: response.provider || 'anthropic',
    model: response.model || model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_read_tokens: usage.cache_read_tokens,
    cache_creation_tokens: usage.cache_creation_tokens,
    latency_ms: Date.now() - startedAt,
    estimated_cost_usd: estimateCost(usage, response.model || model),
    purpose: `consulting-review.${chunkOutput.blueprint_chunk_id || 'unknown-chunk'}`,
  })

  const normalizedReview = normalizeConsultingReviewResponse(
    extractJsonOrThrow(response, ['insight_depth_score', 'consulting_tone_score', 'page_efficiency_score', 'data_credibility_score', 'verdict']),
    chunkOutput,
  )
  const assumption = evaluateChunkAssumptions(chunkOutput)
  if (assumption.hardBlock) {
    const error = new Error(`Consulting Review BLOCKED chunk ${chunkOutput.blueprint_chunk_id || ''}: ${assumption.blockReason}`)
    error.consultingReview = {
      chunk_id: chunkOutput.blueprint_chunk_id || '',
      timestamp: new Date().toISOString(),
      verdict: 'BLOCK',
      key_weakness: assumption.blockReason,
      assumption_ratio: assumption.assumptionRatio,
      assumption_overflow: assumption.overflow,
      hard_block: true,
    }
    await appendReviewAuditLog(slug, error.consultingReview)
    throw error
  }
  const review = applyDeterministicVerdictGuard(normalizedReview, assumption)
  const entry = {
    chunk_id: chunkOutput.blueprint_chunk_id || '',
    timestamp: new Date().toISOString(),
    assumption_ratio: assumption.assumptionRatio,
    assumption_overflow: assumption.overflow,
    hypothesis_heavy: assumption.hypothesisHeavy,
    validation_checklist: assumption.validationChecklist,
    key_judgment_count: assumption.keyJudgmentCount,
    hypothesis_count: assumption.hypothesisCount,
    ...review,
  }
  await appendReviewAuditLog(slug, entry)

  if (review.verdict === 'BLOCK') {
    const error = new Error(`Consulting Review BLOCKED chunk ${entry.chunk_id}: ${review.key_weakness}`)
    error.consultingReview = entry
    throw error
  }

  return entry
}

export function summarizeSuiteReview(reviews) {
  const items = Array.isArray(reviews) ? reviews : []
  return {
    passed: items.every(item => item.verdict === 'PASS' || item.passed === true),
    chunk_count: items.length,
    failed_chunks: items.filter(item => item.verdict === 'BLOCK' || item.passed === false).map(item => item.chunk_id),
    retry_chunks: items.filter(item => item.verdict === 'RETRY').map(item => item.chunk_id),
    avg_insight_depth_score: Number((items.reduce((sum, item) => sum + Number(item.insight_depth_score || 0), 0) / Math.max(1, items.length)).toFixed(1)),
    avg_consulting_tone_score: Number((items.reduce((sum, item) => sum + Number(item.consulting_tone_score || 0), 0) / Math.max(1, items.length)).toFixed(1)),
    avg_page_efficiency_score: Number((items.reduce((sum, item) => sum + Number(item.page_efficiency_score || 0), 0) / Math.max(1, items.length)).toFixed(1)),
    avg_data_credibility_score: Number((items.reduce((sum, item) => sum + Number(item.data_credibility_score || 0), 0) / Math.max(1, items.length)).toFixed(1)),
  }
}

async function cliMain() {
  const [chunkOutputPath, blueprintChunkPath] = process.argv.slice(2)
  if (!chunkOutputPath) {
    console.error('Usage: node scripts/consulting-review.mjs <chunk-output.json> [blueprint-chunk.json]')
    process.exit(1)
  }

  const output = await readJson(repoPath(chunkOutputPath))
  const blueprintChunk = blueprintChunkPath ? await readJson(repoPath(blueprintChunkPath)) : null
  const slug = chunkOutputPath.split('/')[1]
  const review = await runConsultingReview(output, slug, { blueprintChunk })
  console.log(JSON.stringify(review, null, 2))
  process.exit(review.verdict === 'PASS' ? 0 : 1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
