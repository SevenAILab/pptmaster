import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { appendLLMAuditLog, estimateCost } from '../audit-log.mjs'
import { callClaude, DEFAULT_CLAUDE_MODEL } from '../llm-clients/claude-client.mjs'
import { extractJsonOrThrow } from './deepresearch-common.mjs'
import { loadMethodologyFramework } from './methodology-injection.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const REQUIRED_ESSENCE_FIELDS = [
  'category_name',
  'who_pays',
  'value_chain',
  'profit_pool',
  'key_variables',
]

const REQUIRED_BLUEPRINT_FIELDS = [
  'industry_questions',
  'competitor_targets',
  'consumer_segments',
  'positioning_hypotheses_to_test',
]

function repoPath(...segments) {
  return path.join(REPO_ROOT, ...segments)
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

function usageTokens(usage = {}) {
  return {
    input_tokens: Number(usage.input_tokens ?? usage.prompt_tokens ?? 0),
    output_tokens: Number(usage.output_tokens ?? usage.completion_tokens ?? 0),
    cache_read_tokens: Number(usage.cache_read_input_tokens ?? usage.cache_read_tokens ?? 0),
    cache_creation_tokens: Number(usage.cache_creation_input_tokens ?? usage.cache_creation_tokens ?? 0),
  }
}

async function appendBlueprintAuditLog(slug, entry) {
  await appendLLMAuditLog(slug, entry)
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

function listText(value) {
  return Array.isArray(value) ? value.join(', ') : String(value || '')
}

export function buildResearchBlueprintPrompt(form, schemeType, essenceFramework) {
  const client = {
    name: form.name || form.brand || form.client_name || '',
    industry: form.industry || '',
    competitors: listText(form.competitors),
    target_audience: listText(form.target_audience),
    core_products: listText(form.core_products),
    stage: form.stage || '',
    scheme_type: schemeType,
  }
  return {
    system: [
      '你是咨询公司合伙人，负责在品牌策略项目启动前产出品类研究蓝图。',
      '你必须先推演品类本质，再设计行业/竞品/用户/定位假设的调研方向。',
      '只输出严格 JSON，不要 Markdown。',
    ].join('\n'),
    user: [
      '请基于客户表单和《如何找到本质》方法论，产出本项目的 Stage 0 品类研究蓝图。',
      '',
      '方法论框架:',
      essenceFramework,
      '',
      '客户表单:',
      JSON.stringify(client, null, 2),
      '',
      '硬约束:',
      '- category_essence 必须回答: 品类一句话定义、谁付钱、钱怎么流、利润/话语权在哪、3-5 个关键变量。',
      '- research_blueprint.industry_questions 至少 4 条，围绕市场大盘/趋势/关键变量/怎么赚钱。',
      '- research_blueprint.competitor_targets 必须包含表单里的种子竞品，并补充从品类推演出的替代方案。',
      '- research_blueprint.consumer_segments 必须写人群分层和各自 JTBD 方向。',
      '- positioning_hypotheses_to_test 只能写待验证假设，不得伪装成事实。',
      '- 不许编造数字；没有来源的内容只是调研方向或假设。',
      '',
      '输出严格 JSON，结构必须为:',
      JSON.stringify({
        category_essence: {
          category_name: '品类一句话定义',
          who_pays: '谁付钱(B/C、决策者vs使用者、客单频次)',
          value_chain: '钱怎么流(上中下游角色)',
          profit_pool: '利润/话语权集中在哪',
          key_variables: ['决定这个品类成败的 3-5 个关键变量'],
        },
        research_blueprint: {
          industry_questions: ['该查的行业方向，至少 4 条'],
          competitor_targets: ['种子竞品 + 应补查竞品'],
          consumer_segments: ['人群分层 + JTBD 方向'],
          positioning_hypotheses_to_test: ['待验证定位假设'],
        },
      }, null, 2),
    ].join('\n'),
  }
}

function assertNonEmptyString(value, pathLabel) {
  if (!String(value || '').trim()) throw new Error(`Invalid research blueprint: ${pathLabel} is required`)
}

function assertNonEmptyArray(value, pathLabel, min = 1) {
  if (!Array.isArray(value) || value.map(item => String(item || '').trim()).filter(Boolean).length < min) {
    throw new Error(`Invalid research blueprint: ${pathLabel} must contain at least ${min} item(s)`)
  }
}

export function validateResearchBlueprint(value) {
  if (!value || typeof value !== 'object') throw new Error('Invalid research blueprint: root object is required')
  if (!value.category_essence || typeof value.category_essence !== 'object') {
    throw new Error('Invalid research blueprint: category_essence is required')
  }
  if (!value.research_blueprint || typeof value.research_blueprint !== 'object') {
    throw new Error('Invalid research blueprint: research_blueprint is required')
  }
  for (const field of REQUIRED_ESSENCE_FIELDS) {
    if (!(field in value.category_essence)) {
      throw new Error(`Invalid research blueprint: category_essence.${field} is required`)
    }
  }
  for (const field of REQUIRED_BLUEPRINT_FIELDS) {
    if (!(field in value.research_blueprint)) {
      throw new Error(`Invalid research blueprint: research_blueprint.${field} is required`)
    }
  }

  assertNonEmptyString(value.category_essence.category_name, 'category_essence.category_name')
  assertNonEmptyString(value.category_essence.who_pays, 'category_essence.who_pays')
  assertNonEmptyString(value.category_essence.value_chain, 'category_essence.value_chain')
  assertNonEmptyString(value.category_essence.profit_pool, 'category_essence.profit_pool')
  assertNonEmptyArray(value.category_essence.key_variables, 'category_essence.key_variables', 3)
  assertNonEmptyArray(value.research_blueprint.industry_questions, 'research_blueprint.industry_questions', 4)
  assertNonEmptyArray(value.research_blueprint.competitor_targets, 'research_blueprint.competitor_targets')
  assertNonEmptyArray(value.research_blueprint.consumer_segments, 'research_blueprint.consumer_segments')
  assertNonEmptyArray(value.research_blueprint.positioning_hypotheses_to_test, 'research_blueprint.positioning_hypotheses_to_test')

  return value
}

async function callBlueprintLLM({ slug, schemeType, prompt, callStep, appendAuditLog, model }) {
  const startedAt = Date.now()
  const purpose = `research-blueprint.${schemeType}`
  const response = await callStep({
    system: prompt.system,
    user: prompt.user,
    model,
    maxTokens: 2600,
    temperature: 0.2,
  }, { slug, purpose, model })
  if (appendAuditLog) {
    await appendAuditLog(slug, buildAuditEntry({ response, startedAt, purpose, model }))
  }
  return response
}

export async function ensureResearchBlueprint(clientSlug, schemeType, options = {}) {
  if (!clientSlug) throw new Error('ensureResearchBlueprint requires clientSlug')
  if (!schemeType) throw new Error('ensureResearchBlueprint requires schemeType')
  const outputPath = repoPath('outputs', clientSlug, '_research-blueprint.json')
  if (!options.force) {
    try {
      const existing = validateResearchBlueprint(JSON.parse(await fs.readFile(outputPath, 'utf8')))
      return { status: 'existing', blueprint: existing, path: outputPath }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }

  const form = options.form || await (options.readForm
    ? options.readForm(clientSlug)
    : readJson(repoPath('inputs', clientSlug, 'form.json')))

  if (!options.realLLM) {
    return {
      status: 'skipped_missing_no_real_llm',
      blueprint: null,
      path: outputPath,
      reason: 'Stage 0 research blueprint requires realLLM=true when no valid cached blueprint exists',
    }
  }

  const model = options.model || DEFAULT_CLAUDE_MODEL
  const essenceFramework = options.essenceFramework || await loadMethodologyFramework('industry_analysis')
  const prompt = buildResearchBlueprintPrompt(form, schemeType, essenceFramework)
  const callStep = options.callStep || (async (args) => {
    const response = await callClaude(args.system, args.user, {
      model: args.model || model,
      maxTokens: args.maxTokens,
      temperature: args.temperature,
    })
    return response
  })
  const response = await callBlueprintLLM({
    slug: clientSlug,
    schemeType,
    prompt,
    callStep,
    appendAuditLog: options.appendAuditLog === false ? null : (options.appendAuditLog || appendBlueprintAuditLog),
    model,
  })
  const blueprint = validateResearchBlueprint(extractJsonOrThrow(response, ['category_essence', 'research_blueprint']))
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, JSON.stringify(blueprint, null, 2))
  return { status: 'generated', blueprint, path: outputPath }
}
