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
  const framework = await loadMethodologyFramework(agentId)
  return [
    String(systemPrompt || '').trim(),
    '',
    SHARED_EVIDENCE_DISCIPLINE,
    '',
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
