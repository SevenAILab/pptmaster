import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const MAX_FRAMEWORK_CHARS = 1200
const SHARED_EVIDENCE_DISCIPLINE = [
  '## 共享证据戒律(所有专家必须遵守)',
  '- Facts Over Opinions / 事实优先: 每条主张必须可追溯；推断必须显式标为 hypothesis，并写 hypothesis_basis 与 validation_method。',
  '- Structured & Comparable / 结构化可比: 同类对象必须使用一致维度，便于横向比较；不得为了套模板补不存在的数据。',
  '- Current Data / 当前数据: 标注检索或生成日期；发现过期、口径不清或互相冲突的数据必须 flag，不得硬拼成结论。',
  '- Honest Assessment / 诚实评估: 不夸大机会或竞品弱点，不淡化竞品强项；证据不足只能进入待验证假设。',
].join('\n')

const BORROWED_OUTPUT_STRUCTURES = {
  industry_analysis: [
    '## 外部框架借鉴输出结构(只提供结构，不提供事实)',
    '- 竞争格局判断必须区分“真威胁 vs 长得像但不抢”：真威胁需同时影响同一付费方/JTBD/预算池/替代路径；长得像但不抢只能作为相邻参照或待验证假设。',
  ].join('\n'),
  competitor_analysis: [
    '## 外部框架借鉴输出结构(只提供结构，不提供事实)',
    '- 竞品横向对比表候选维度: competitor、tagline、目标人群、定位角度、定价、免费档、关键强项、关键弱项；缺来源的字段必须留空或标 hypothesis，不得补模板占位。',
    '- Positioning Map / 定位双轴图: 可作为 chunk 页结构候选；双轴定义必须来自真实竞品证据和用户/采购证据，不能只凭产品功能想象。',
    '- 威胁分级必须区分“真威胁 vs 长得像但不抢”：真威胁需共享目标人群、预算池、JTBD 或替代路径；长得像但不抢只能作相邻参照或待验证假设。',
  ].join('\n'),
  consumer_insight: [
    '## 外部框架借鉴输出结构(只提供结构，不提供事实)',
    '- VOC 用户原话: 只有搜索结果、UGC 或一手资料中出现的真实原话才能引用，必须带来源；没有原话时写“可追溯用户信号”，不得编造引号。',
    '- JTBD 输出需写清目标人群在什么情境下要完成什么任务、当前阻力、理想进展。',
    '- 至少沉淀 3 痛点 / 3 wish 结构；每条都必须关联来源或进入 hypothesis + hypothesis_basis + validation_method。',
  ].join('\n'),
  brand_positioning: [
    '## 外部框架借鉴输出结构(只提供结构，不提供事实)',
    '- 一页 messaging framework 候选骨架: 对谁说 / 说什么 / 不说什么 / 价值主张 / 差异点 / proof points / messaging pillars。',
    '- 每条价值主张、差异点、proof 或 pillars 必须回指上游证据；证据不足一律写成 hypothesis，并给 hypothesis_basis 与 validation_method。',
  ].join('\n'),
  brand_building: [
    '## 外部框架借鉴输出结构(只提供结构，不提供事实)',
    '- 品牌叙事弧候选骨架: 主角=客户 / 冲突 / 转折 / 品牌角色；品牌不是英雄，品牌只作为帮助客户完成转变的角色。',
    '- 叙事中的冲突、转折和品牌角色必须来自定位承诺、上游证据或客户一手资料；没有证据的口号/IP/情绪只能标 hypothesis。',
  ].join('\n'),
}

const AGENT_METHODOLOGY_FILES = {
  industry_analysis: ['02-industry-analysis.md'],
  competitor_analysis: ['03-competitor-analysis.md'],
  consumer_insight: ['05-user-analysis.md', '06-user-insight.md'],
  brand_positioning: ['01-essence.md', '09-brand-strategy.md', '13-brand-house.md'],
  brand_building: ['09-brand-strategy.md', '13-brand-house.md'],
  annual_planning: ['09-brand-strategy.md', '13-brand-house.md'],
}

const frameworkCache = new Map()

function repoPath(...segments) {
  return path.join(REPO_ROOT, ...segments)
}

function compactText(text, maxLength = MAX_FRAMEWORK_CHARS) {
  const normalized = String(text || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength).trim()}...` : normalized
}

function sectionBeforeNextHeading(markdown, heading) {
  const pattern = new RegExp(`(^|\\n)## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n`, 'm')
  const match = markdown.match(pattern)
  if (!match) return ''
  const start = match.index + match[0].length
  const rest = markdown.slice(start)
  const next = rest.search(/\n##\s+/)
  return rest.slice(0, next === -1 ? undefined : next).trim()
}

function extractFrameworkSections(markdown) {
  const core = sectionBeforeNextHeading(markdown, '核心方法')
  const toc = sectionBeforeNextHeading(markdown, '文章目录')
  const firstStepMatch = markdown.match(/\n##\s+1[.．、]?\s+[^\n]+\n([\s\S]*?)(?=\n##\s+2[.．、]?\s+|\n##\s+适用场景|\n##\s+关键模型|$)/)
  const firstStep = firstStepMatch ? firstStepMatch[0].trim() : ''
  return [
    core ? `## 核心方法\n${core}` : '',
    toc ? `## 文章目录\n${toc}` : '',
    firstStep,
  ].filter(Boolean).join('\n\n')
}

export async function loadMethodologyFramework(agentId) {
  if (frameworkCache.has(agentId)) return frameworkCache.get(agentId)
  const files = AGENT_METHODOLOGY_FILES[agentId]
  if (!files) {
    throw new Error(`Unknown methodology agent "${agentId}". Known: ${Object.keys(AGENT_METHODOLOGY_FILES).join(', ')}`)
  }

  const chunks = []
  for (const file of files) {
    const raw = await fs.readFile(repoPath('assets/_raw/methodologies/summaries', file), 'utf8')
    const framework = extractFrameworkSections(raw)
    if (!framework) continue
    chunks.push(`### ${file.replace(/\.md$/, '')}\n${framework}`)
  }

  const combined = compactText(chunks.join('\n\n---\n\n'), MAX_FRAMEWORK_CHARS)
  frameworkCache.set(agentId, combined)
  return combined
}

function normalizeList(value, maxItems = 6) {
  return (Array.isArray(value) ? value : [])
    .map(item => String(item).trim())
    .filter(Boolean)
    .slice(0, maxItems)
}

function agentBlueprintSlice(blueprint, agentId) {
  const rb = blueprint.research_blueprint || {}
  if (agentId === 'industry_analysis') {
    return { industry_questions: normalizeList(rb.industry_questions, 8) }
  }
  if (agentId === 'competitor_analysis') {
    return {
      competitor_targets: normalizeList(rb.competitor_targets, 10),
      positioning_hypotheses_to_test: normalizeList(rb.positioning_hypotheses_to_test, 5),
    }
  }
  if (agentId === 'consumer_insight') {
    return {
      consumer_segments: normalizeList(rb.consumer_segments, 10),
      positioning_hypotheses_to_test: normalizeList(rb.positioning_hypotheses_to_test, 5),
    }
  }
  if (agentId === 'brand_positioning') {
    return {
      positioning_hypotheses_to_test: normalizeList(rb.positioning_hypotheses_to_test, 8),
      competitor_targets: normalizeList(rb.competitor_targets, 6),
      consumer_segments: normalizeList(rb.consumer_segments, 6),
    }
  }
  if (agentId === 'brand_building' || agentId === 'annual_planning') {
    return {
      positioning_hypotheses_to_test: normalizeList(rb.positioning_hypotheses_to_test, 6),
      consumer_segments: normalizeList(rb.consumer_segments, 6),
    }
  }
  return rb
}

export async function readResearchBlueprint(slug) {
  if (!slug) return null
  try {
    const raw = await fs.readFile(repoPath('outputs', slug, '_research-blueprint.json'), 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

export async function buildBlueprintContextSnippet(slug, agentId) {
  const blueprint = await readResearchBlueprint(slug)
  if (!blueprint) return ''
  const essence = blueprint.category_essence || {}
  const payload = {
    category_essence: {
      category_name: essence.category_name || '',
      who_pays: essence.who_pays || '',
      value_chain: essence.value_chain || '',
      profit_pool: essence.profit_pool || '',
      key_variables: normalizeList(essence.key_variables, 6),
    },
    agent_research_slice: agentBlueprintSlice(blueprint, agentId),
  }
  return [
    '## 品类研究蓝图（Stage 0，共享上下文）',
    '调研子问题必须围绕这个品类本质、谁付钱、钱怎么流、利润/话语权和关键变量展开；不能只围绕品牌名机械搜索。',
    'agent_research_slice 是当前 worker 的导航切片：行业看怎么赚钱/关键变量，竞品看对象/流派/空缺，用户看人群分层/JTBD，定位/建设看待验证假设。',
    JSON.stringify(payload, null, 2),
  ].join('\n')
}

export async function appendMethodologyToSystem(systemPrompt, agentId) {
  if (String(systemPrompt || '').includes('## 调研方法论框架')) return String(systemPrompt || '').trim()
  const framework = await loadMethodologyFramework(agentId)
  const borrowedStructure = BORROWED_OUTPUT_STRUCTURES[agentId] || ''
  return [
    String(systemPrompt || '').trim(),
    '',
    SHARED_EVIDENCE_DISCIPLINE,
    '',
    borrowedStructure,
    borrowedStructure ? '' : '',
    '## 调研方法论框架(必须据此设计子问题和成稿结构)',
    framework,
    '',
    '注意: 方法论只提供思考结构，具体事实、数字和判断仍必须来自真实搜索结果、客户一手资料或上游可追溯证据；不得引用方法论范例数字当事实。',
  ].join('\n')
}

export async function buildMethodologyPromptContext({ slug, agentId }) {
  const [methodologyFramework, blueprintSnippet] = await Promise.all([
    loadMethodologyFramework(agentId),
    buildBlueprintContextSnippet(slug, agentId),
  ])
  return { methodologyFramework, blueprintSnippet }
}

export function injectBlueprintSnippetIntoContext(context, blueprintSnippet) {
  if (!blueprintSnippet) return context
  return {
    ...context,
    researchBlueprintContext: blueprintSnippet,
  }
}
