import { addModule } from '../core/content-model.mjs'
import { classifyVisibility } from '../core/visibility-classifier.mjs'
import { chapterWeights } from './detect-brand-type.mjs'
import { BRAND_BOOK_MODULES } from './renderers/render-brand-book.mjs'
import { renderableFieldsForKind, sanitizeRenderableContent } from './renderers/renderable-fields.mjs'
import { loadSkillGuidance } from './skill-injector.mjs'

const MODULE_KIND_TO_STAGE = {
  brand_entry: 'draft',
  market_context: 'analysis_industry',
  brand_definition: 'draft',
  audience_scenarios: 'analysis_user',
  strategy_core: 'draft',
  narrative_system: 'draft',
  product_system: 'analysis_self',
  visual_direction: 'design',
  proof_growth: 'analysis_self',
  personality_statement: 'draft',
}

const KIND_TO_CARD_TYPES = {
  brand_entry: ['self', 'user'],
  market_context: ['industry', 'competitor'],
  brand_definition: ['competitor', 'self', 'user'],
  audience_scenarios: ['user'],
  strategy_core: ['competitor', 'self', 'user', 'industry'],
  narrative_system: ['competitor', 'user', 'self'],
  product_system: ['self', 'competitor'],
  visual_direction: ['self', 'user'],
  proof_growth: ['self', 'competitor', 'industry'],
  personality_statement: ['user', 'self'],
}

function text(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(text).join(' ')
  if (typeof value === 'object') return Object.values(value).map(text).join(' ')
  return String(value)
}

function extractJsonObject(value) {
  const rawText = String(value || '')
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = fenced ? fenced[1] : rawText
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object in brand module response: ${rawText.slice(0, 200)}`)
  }
  return JSON.parse(raw.slice(start, end + 1))
}

function flatCards(analysisCards = {}) {
  const cards = Array.isArray(analysisCards.cards) ? analysisCards.cards : []
  const byTypeCards = Object.entries(analysisCards.byType || {}).flatMap(([type, group]) => (
    (group.cards || []).map(card => ({ ...card, analysis_type: card.analysis_type || type }))
  ))
  const merged = [...cards, ...byTypeCards]
  const byId = new Map()
  for (const card of merged) {
    if (card?.id && !byId.has(card.id)) byId.set(card.id, card)
  }
  return [...byId.values()]
}

export function selectRelevantCards(analysisCards, kind) {
  const wanted = new Set(KIND_TO_CARD_TYPES[kind] || [])
  const selected = flatCards(analysisCards).filter(card => wanted.has(card.analysis_type))
  return selected.length ? selected : flatCards(analysisCards)
}

function defaultKinds(content) {
  const weights = chapterWeights(content.meta.brand_type)
  return BRAND_BOOK_MODULES.filter(kind => (weights[kind] ?? 0) > 0)
}

function collectSpecificTerms({ brief = {}, cards = [] } = {}) {
  const form = brief.form || {}
  const base = [
    brief.slug,
    form.name,
    form.industry,
    ...(Array.isArray(form.core_products) ? form.core_products : []),
    ...(Array.isArray(form.target_audience) ? form.target_audience : []),
    ...(Array.isArray(form.competitors) ? form.competitors : []),
    ...cards.flatMap(card => [card.id, card.claim, card.implication]),
  ]
  return [...new Set(base
    .flatMap(item => String(item || '').split(/[、，,。；;\s]+/))
    .map(item => item.trim())
    .filter(item => item.length >= 2))]
}

export function assertNotBoilerplate({ kind, content, spine, cards = [], brief = {} } = {}) {
  const body = text(content)
  const stripped = body.replaceAll(spine || '', '').replace(/\s+/g, '')
  if (stripped.length < 8) throw new Error(`boilerplate: ${kind} module not brand-specific`)
  const terms = collectSpecificTerms({ brief, cards })
  if (!terms.some(term => body.includes(term))) {
    throw new Error(`boilerplate: ${kind} module lacks specific evidence or brand terms`)
  }
}

function validateEvidenceRefs(refs, allCards, kind) {
  if (!Array.isArray(refs) || refs.length === 0) throw new Error(`${kind} evidence_refs required`)
  const cardIds = new Set(allCards.map(card => card.id))
  for (const ref of refs) {
    if (!cardIds.has(ref)) throw new Error(`${kind} evidence_ref not found in analysis cards: ${ref}`)
  }
}

function moduleText(content) {
  return text(content)
}

async function generateOneModule({
  kind,
  content,
  brief,
  analysisCards,
  researchBrief,
  generatedSummaries,
  callModel,
  root,
} = {}) {
  const stage = MODULE_KIND_TO_STAGE[kind] || 'draft'
  const guidance = root ? loadSkillGuidance({ root, stage, maxCharsPerRef: 1800 }) : null
  const cards = selectRelevantCards(analysisCards, kind)
  const allCards = flatCards(analysisCards)
  const fields = renderableFieldsForKind(kind)
  const baseSystem = [
    `你正在生成品牌手册模块 kind=${kind}。`,
    '必须从已锁战略主线推导，不得重写主线。',
    '必须引用真实 analysis-card id，evidence_refs 不能为空。',
    `renderable-fields 只允许这些 content 字段：${fields.join(', ')}。不要输出 production_note、layout_hint、*_note。`,
    '每个模块必须 L3/L4 深度，避免套话；必须包含来自 brief 或 analysis-card 的品牌专属细节。',
    '这是对外品牌手册模块，禁止输出对内信息或对内词：营收、利润、毛利、成本、现金流、单店、回本、测算、底价、返点、KPI、薪酬、绩效、未发布、风险清单、竞品弱点。',
    '只输出 JSON：{"content":{},"evidence_refs":[...],"depth_level":"L3|L4"}。',
    guidance?.text,
  ].filter(Boolean).join('\n')
  const user = JSON.stringify({
    module_kind: kind,
    strategic_spine: content.strategic_spine,
    brief,
    researchBrief,
    relevant_cards: cards,
    generated_module_summaries: generatedSummaries,
  }, null, 2)

  let lastError
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const system = [
      baseSystem,
      attempt > 1
        ? `上一次生成没有通过校验：${lastError?.message || lastError}。请重写整个模块，保留真实 evidence_refs，移除对内信息、套话和重复模板，只输出 JSON。`
        : '',
    ].filter(Boolean).join('\n')

    try {
      const parsed = extractJsonObject(await callModel(system, user))
      validateEvidenceRefs(parsed.evidence_refs, allCards, kind)
      if (!['L3', 'L4'].includes(parsed.depth_level)) throw new Error(`${kind} depth_level must be L3/L4`)
      const sanitized = sanitizeRenderableContent(kind, parsed.content || {})
      assertNotBoilerplate({
        kind,
        content: sanitized,
        spine: content.strategic_spine.positioning_statement,
        cards,
        brief,
      })
      const classified = classifyVisibility({
        kind,
        text: moduleText(sanitized),
        evidence_refs: parsed.evidence_refs,
      })
      if (classified.visibility === 'internal') {
        throw new Error(`${kind} visibility gate failed: internal content in external module (${classified.reason})`)
      }
      return {
        id: kind.replaceAll('_', '-'),
        kind,
        visibility: classified.visibility === 'review' ? 'external' : classified.visibility,
        content: sanitized,
        evidence_refs: parsed.evidence_refs,
        depth_level: parsed.depth_level,
        spine_alignment: content.strategic_spine.positioning_statement,
      }
    } catch (error) {
      lastError = error
      if (attempt === 2) throw error
    }
  }
  throw lastError
}

export async function generateBrandModules({
  content,
  brief,
  analysisCards,
  researchBrief,
  callModel,
  root,
  kinds,
} = {}) {
  if (!content?.strategic_spine?.locked) throw new Error('generateBrandModules requires locked strategic_spine')
  if (typeof callModel !== 'function') throw new Error('generateBrandModules requires callModel')
  const selectedKinds = kinds || defaultKinds(content)
  let next = content
  const generated = []
  for (const kind of selectedKinds) {
    const module = await generateOneModule({
      kind,
      content: next,
      brief,
      analysisCards,
      researchBrief,
      generatedSummaries: generated.map(item => ({ kind: item.kind, title: item.content?.title, positioning: item.content?.positioning })),
      callModel,
      root,
    })
    next = addModule(next, module)
    generated.push(module)
  }
  return { content: next, modules: generated }
}

function addDeterministicModule(content, module) {
  const classified = classifyVisibility({
    kind: module.kind,
    text: moduleText(module.content),
    evidence_refs: module.evidence_refs || [],
  })
  return addModule(content, {
    depth_level: 'L3',
    spine_alignment: content.strategic_spine.positioning_statement,
    ...module,
    visibility: module.visibility || (classified.visibility === 'review' ? 'external' : classified.visibility),
    content: {
      ...module.content,
      offline: true,
    },
  })
}

export function deterministicBrandModules({ content, brief = {} } = {}) {
  const form = brief.form || {}
  const name = form.name || brief.slug || content.meta.brand_slug
  const industry = form.industry || '所在行业'
  const audience = Array.isArray(form.target_audience) ? form.target_audience.join('、') : text(form.target_audience)
  const products = Array.isArray(form.core_products) ? form.core_products : []
  const spine = content.strategic_spine.positioning_statement
  const refs = {
    brand_entry: ['self-1'],
    market_context: ['ind-1', 'comp-1'],
    brand_definition: ['comp-1', 'usr-1'],
    audience_scenarios: ['usr-1'],
    strategy_core: ['comp-1', 'self-1'],
    narrative_system: ['usr-1', 'self-1'],
    product_system: ['self-1'],
    visual_direction: ['self-1'],
    proof_growth: ['self-1', 'ind-1'],
    personality_statement: ['usr-1'],
  }
  let next = content
  const modules = [
    { id: 'brand-entry', kind: 'brand_entry', content: { name, slogan: spine, one_liner: content.strategic_spine.proposition, category: industry } },
    { id: 'market-context', kind: 'market_context', content: { title: '市场背景', body: `${industry} 的竞争正在从供给竞争进入心智竞争，${name} 需要用 ${spine} 建立清晰选择理由。`, points: ['离线占位非交付', '等待真实 LLM 生成'] } },
    { id: 'brand-definition', kind: 'brand_definition', content: { title: '品牌定义', positioning: spine, what_it_is: `${name} 是围绕 ${audience || '核心用户'} 的品牌系统。`, differentiation: [`基于 ${industry} 场景`, '离线占位非交付'], body: `${name} 暂以 ${spine} 作为离线占位主线。` } },
    { id: 'audience-scenarios', kind: 'audience_scenarios', content: { title: '人群与场景', body: `${audience || '核心用户'} 在高频使用场景里需要更稳定的选择理由。`, core_audience: audience, scenarios: ['离线占位非交付'] } },
    { id: 'strategy-core', kind: 'strategy_core', content: { title: '战略核心', mission: content.strategic_spine.mission, vision: content.strategic_spine.vision, proposition: content.strategic_spine.proposition, body: `${spine} 是离线占位主线。` } },
    { id: 'narrative-system', kind: 'narrative_system', content: { title: '叙事系统', brand_story: `${name} 从 ${industry} 的真实问题出发建立 ${spine}。`, slogan: spine, body: '离线占位非交付。' } },
    { id: 'product-system', kind: 'product_system', content: { title: '产品体系', product_positioning: `${products.join('、') || '核心产品'} 服务于 ${spine}`, product_series: products, body: '离线占位非交付。' } },
    { id: 'visual-direction', kind: 'visual_direction', content: { title: '视觉方向', color_direction: '由 tonality.palette 决定', typography_direction: '专业克制', symbol_concept: spine, body: '离线占位非交付。' } },
    { id: 'proof-growth', kind: 'proof_growth', content: { title: '证明与增长', milestones: ['离线占位非交付'], public_metrics: ['等待真实证据'], future_plan: `${name} 后续以真实 analysis-card 校准。` } },
    { id: 'personality-statement', kind: 'personality_statement', content: { title: '品牌人格', archetype: '可靠专家', traits: ['专业', '稳定'], tone: '克制清晰', body: `${name} 的人格服务于 ${spine}。` } },
  ]
  for (const module of modules) {
    next = addDeterministicModule(next, { ...module, evidence_refs: refs[module.kind] || ['self-1'] })
  }
  next = addDeterministicModule(next, {
    id: 'personality-playbook',
    kind: 'personality_playbook',
    visibility: 'internal',
    evidence_refs: ['self-1'],
    content: { title: '内部话术边界', body: '客服话术：不可说绝对化承诺；遇到未验证效果必须标注假设。' },
  })
  next = addDeterministicModule(next, {
    id: 'risk-check',
    kind: 'risk_check',
    visibility: 'internal',
    evidence_refs: ['self-1'],
    content: { title: '内部风险', body: '单店回本测算、毛利、未发布战略只进入内部模块，不出现在对外手册或独立站。' },
  })
  return { content: next, modules: next.modules }
}
