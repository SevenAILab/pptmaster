import { appendLLMAuditLog, estimateCost } from '../audit-log.mjs'
import { callClaude, DEFAULT_CLAUDE_MODEL } from '../llm-clients/claude-client.mjs'

export const ALLOWED_SMART_LAYOUTS = [
  'hero-statement',
  'split-statement',
  'three-layers',
  'matrix-2x2',
  'matrix-3x3',
  'flow-arrow',
  'timeline',
  'pyramid',
  'tree',
  'kpi-card',
  'framework-grid',
  'brand-house-9-layer',
  'image-hero',
]

const TITLE_POSITIONS = new Set(['top-left', 'top-center', 'bottom-left'])
const SECONDARY_FORMATS = new Set(['small', 'italic', 'muted'])

const SYSTEM_PROMPT = [
  'You are a senior brand strategy slide layout designer.',
  'You inspect real PPT strategy chunk output and choose the most useful smart layout for every slide.',
  'Return strict JSON only. Do not write prose outside JSON.',
].join(' ')

function usageTokens(usage = {}) {
  return {
    input_tokens: Number(usage.input_tokens ?? usage.prompt_tokens ?? 0),
    output_tokens: Number(usage.output_tokens ?? usage.completion_tokens ?? 0),
    cache_read_tokens: Number(usage.cache_read_input_tokens ?? usage.cache_read_tokens ?? 0),
    cache_creation_tokens: Number(usage.cache_creation_input_tokens ?? usage.cache_creation_tokens ?? 0),
  }
}

function extractJsonOrThrow(response) {
  const text = response.text || ''
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = fenced?.[1] || text
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object found in Layout Designer response: ${text.slice(0, 240)}`)
  }
  return JSON.parse(trimmed.slice(start, end + 1))
}

function compactChunkOutput(chunkOutput) {
  return {
    agent_id: chunkOutput.agent_id,
    blueprint_chunk_id: chunkOutput.blueprint_chunk_id,
    chunk_takeaway: chunkOutput.chunk_takeaway,
    chunk_insights: chunkOutput.chunk_insights || [],
    slides: (chunkOutput.slides || []).map(slide => ({
      page_no: slide.page_no,
      original_layout: slide.layout,
      page_intent: slide.page_intent,
      page_subtitle: slide.page_subtitle,
      action_title: slide.action_title,
      core_points: slide.core_points || [],
      data_refs: slide.data_refs || [],
      models_used: slide.models_used || [],
    })),
  }
}

export function buildLayoutDesignerPrompt(chunkOutput) {
  return [
    '请基于下面的真实 chunk_output，为每一页选择最合适的 smart_layout。',
    '',
    '输入 chunk_output:',
    JSON.stringify(compactChunkOutput(chunkOutput), null, 2),
    '',
    '可选 smart_layout 类型，必须从以下 13 个中选择，不能自创:',
    '- hero-statement: 大字单一判断，适合 takeaway 类页',
    '- split-statement: 大字判断 + 小字 3-5 条论据，适合结论页',
    '- three-layers: 3 个并列要素，适合三段论',
    '- matrix-2x2: 2x2 矩阵，适合双轴对比和 SWOT',
    '- matrix-3x3: 3x3 矩阵，适合多维度对比',
    '- flow-arrow: 流程图箭头，适合步骤推演',
    '- timeline: 时间线，适合历史/未来节奏',
    '- pyramid: 金字塔层级，适合从基础到顶层',
    '- tree: 树形展开，适合一对多分解',
    '- kpi-card: 大字数据 + 小字注解，适合关键 KPI',
    '- framework-grid: 框架格子，适合 PESTEL / 4P / 5C',
    '- brand-house-9-layer: 品牌屋 9 层，适合品牌屋专用页',
    '- image-hero: 大图 + 文字，适合视觉锤页面',
    '',
    '决策原则:',
    '- 内容是数据对比，优先 matrix-2x2 / matrix-3x3 / framework-grid。',
    '- 内容是流程步骤，优先 flow-arrow / timeline。',
    '- 内容是层级关系，优先 pyramid / tree。',
    '- 内容是单一大判断，优先 hero-statement。',
    '- 内容是多元论据，优先 split-statement。',
    '- 内容是关键 KPI，优先 kpi-card。',
    '- 内容是品牌屋，优先 brand-house-9-layer。',
    '',
    '强约束:',
    '- thinking_log 必须至少 3 step，分别体现 read_content / classify_slide_intent / choose_layouts。',
    '- layout_decisions.length 必须等于 slides.length。',
    '- page_no 必须逐一匹配输入 slides。',
    '- original_layout 是输入 slide.layout，只作为 fallback hint。',
    '- reason 必须基于 chunk_takeaway、action_title 或 core_points，不能写泛泛理由。',
    '- 不允许全部使用 split-statement；多页 chunk 应体现布局选择差异。',
    '- 如果 chunk 有 2 页及以上，至少 50% 的页应该换成不同于 original_layout 的 smart_layout 语义选择。',
    '',
    '输出严格 JSON:',
    JSON.stringify({
      thinking_log: [
        { step: 'read_content', content: '...' },
        { step: 'classify_slide_intent', content: '...' },
        { step: 'choose_layouts', content: '...' },
      ],
      layout_decisions: [
        {
          page_no: 1,
          original_layout: 'S05',
          smart_layout: 'matrix-2x2',
          smart_layout_reason: '...',
          layout_variant_hints: {
            title_position: 'top-left',
            accent_data: '...',
            secondary_data_format: 'small',
            diagram_type: 'matrix-2x2',
          },
        },
      ],
    }, null, 2),
  ].join('\n')
}

function normalizeThinkingLog(value) {
  const log = Array.isArray(value) ? value : []
  if (log.length < 3) {
    throw new Error(`Layout Designer thinking_log must contain at least 3 steps, got ${log.length}`)
  }
  return log.map((entry, index) => {
    if (typeof entry === 'string') {
      return { step: `step_${index + 1}`, content: entry }
    }
    return {
      step: String(entry.step || `step_${index + 1}`).trim(),
      content: String(entry.content || '').trim(),
    }
  }).filter(entry => entry.step && entry.content)
}

function normalizeHints(value = {}, smartLayout) {
  const titlePosition = TITLE_POSITIONS.has(value.title_position) ? value.title_position : 'top-left'
  const secondaryFormat = SECONDARY_FORMATS.has(value.secondary_data_format) ? value.secondary_data_format : 'small'
  return {
    title_position: titlePosition,
    accent_data: String(value.accent_data || '').trim(),
    secondary_data_format: secondaryFormat,
    diagram_type: String(value.diagram_type || smartLayout).trim(),
  }
}

function semanticOriginalLayout(slide) {
  return slide.layout_designer?.smart_layout || slide.layout || ''
}

export function normalizeLayoutDesignerResponse(responseJson, chunkOutput) {
  const slides = chunkOutput.slides || []
  if (slides.length === 0) throw new Error('Layout Designer requires chunkOutput.slides')

  const thinkingLog = normalizeThinkingLog(responseJson.thinking_log)
  if (thinkingLog.length < 3) {
    throw new Error(`Layout Designer thinking_log must contain at least 3 valid steps, got ${thinkingLog.length}`)
  }

  const rawDecisions = Array.isArray(responseJson.layout_decisions) ? responseJson.layout_decisions : []
  if (rawDecisions.length !== slides.length) {
    throw new Error(`Layout Designer returned ${rawDecisions.length} layout_decisions but chunk has ${slides.length} slides`)
  }

  const slideByPage = new Map(slides.map(slide => [slide.page_no, slide]))
  const decisions = rawDecisions.map(decision => {
    const pageNo = Number(decision.page_no)
    const slide = slideByPage.get(pageNo)
    if (!slide) throw new Error(`Layout Designer returned unknown page_no: ${decision.page_no}`)

    const smartLayout = String(decision.smart_layout || '').trim()
    if (!ALLOWED_SMART_LAYOUTS.includes(smartLayout)) {
      throw new Error(`Unsupported smart_layout "${smartLayout}" for page ${pageNo}`)
    }

    const reason = String(decision.smart_layout_reason || decision.reason || '').trim()
    if (reason.length < 12) {
      throw new Error(`Layout Designer reason too short for page ${pageNo}`)
    }

    return {
      page_no: pageNo,
      original_layout: String(decision.original_layout || semanticOriginalLayout(slide)).trim(),
      smart_layout: smartLayout,
      smart_layout_reason: reason,
      layout_variant_hints: normalizeHints(decision.layout_variant_hints || decision, smartLayout),
    }
  })

  const uniqueSmartLayouts = new Set(decisions.map(decision => decision.smart_layout))
  if (slides.length > 1 && uniqueSmartLayouts.size === 1 && uniqueSmartLayouts.has('split-statement')) {
    throw new Error('Layout Designer cannot assign split-statement to every slide')
  }

  return {
    thinking_log: thinkingLog,
    layout_decisions: decisions,
  }
}

export function applyLayoutDecisions(chunkOutput, layoutDesignerOutput) {
  const decisionsByPage = new Map(layoutDesignerOutput.layout_decisions.map(decision => [decision.page_no, decision]))
  const slides = (chunkOutput.slides || []).map(slide => {
    const decision = decisionsByPage.get(slide.page_no)
    if (!decision) return { ...slide }
    return {
      ...slide,
      layout_original: slide.layout,
      layout: decision.smart_layout,
      layout_designer: decision,
    }
  })

  return {
    ...chunkOutput,
    slides,
    layout_designer: {
      agent_id: 'layout_designer',
      thinking_log: layoutDesignerOutput.thinking_log,
      layout_decisions: layoutDesignerOutput.layout_decisions,
    },
    metadata: {
      ...(chunkOutput.metadata || {}),
      layout_designer_applied: true,
      layout_designer_layout_count: layoutDesignerOutput.layout_decisions.length,
    },
  }
}

export async function runLayoutDesigner({
  chunkOutput,
  slug,
  model = DEFAULT_CLAUDE_MODEL,
  callStep = callClaude,
  appendAuditLog = appendLLMAuditLog,
} = {}) {
  if (!chunkOutput) throw new Error('runLayoutDesigner requires chunkOutput')
  if (!slug) throw new Error('runLayoutDesigner requires slug for audit logging')

  const startedAt = Date.now()
  const response = await callStep(SYSTEM_PROMPT, buildLayoutDesignerPrompt(chunkOutput), {
    model,
    maxTokens: 3000,
    temperature: 0.4,
  })
  const usage = usageTokens(response.usage)
  await appendAuditLog(slug, {
    timestamp: new Date().toISOString(),
    provider: response.provider || 'anthropic',
    model: response.model || model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_read_tokens: usage.cache_read_tokens,
    cache_creation_tokens: usage.cache_creation_tokens,
    latency_ms: Date.now() - startedAt,
    estimated_cost_usd: estimateCost(usage, response.model || model),
    purpose: `layout-designer.${chunkOutput.blueprint_chunk_id || 'unknown-chunk'}`,
  })

  return normalizeLayoutDesignerResponse(extractJsonOrThrow(response), chunkOutput)
}
