import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { callClaude } from './llm-clients/claude-client.mjs'
import { callDeepSeek, callOpenAI } from './llm-clients/openai-client.mjs'
import { callQwen } from './llm-clients/qwen-client.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPORT_PATH = path.join(REPO_ROOT, 'docs/model-agnostic-validation.md')

export const MODEL_REGISTRY = {
  claude: {
    key: 'claude',
    name: 'claude-sonnet-4.5',
    env: 'ANTHROPIC_API_KEY',
    fn: callClaude,
    defaultModel: 'claude-sonnet-4-5-20251022',
  },
  'gpt-4o': {
    key: 'gpt-4o',
    name: 'gpt-4o',
    env: 'OPENAI_API_KEY',
    fn: callOpenAI,
    defaultModel: 'gpt-4o',
  },
  qwen: {
    key: 'qwen',
    name: 'qwen-max',
    env: 'DASHSCOPE_API_KEY',
    fn: callQwen,
    defaultModel: 'qwen-max',
  },
  deepseek: {
    key: 'deepseek',
    name: 'deepseek-v3',
    env: 'DEEPSEEK_API_KEY',
    fn: callDeepSeek,
    defaultModel: 'deepseek-chat',
  },
}

export const SUB_AGENTS = [
  'industry_analysis',
  'consumer_insight',
  'competitor_analysis',
  'brand_positioning',
  'brand_building',
  'annual_planning',
]

export function parseModelList(value = 'claude,gpt-4o,qwen,deepseek') {
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

export function calculateDelta(scores) {
  const usable = scores.filter(score => score > 0)
  if (usable.length === 0) return 0
  const max = Math.max(...usable)
  const min = Math.min(...usable)
  return max > 0 ? Number((((max - min) / max) * 100).toFixed(1)) : 0
}

export function evaluateOutput(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { score: 0, passed: false, reasons: ['JSON 解析失败'] }
  }

  const reasons = []
  let score = 30
  if (Array.isArray(parsed.slides) && parsed.slides.length > 0) score += 20
  else reasons.push('缺 slides 数组')

  const slides = parsed.slides || []
  if (slides.every(slide => slide.action_title && !/(介绍|概述|分析)$/.test(slide.action_title))) score += 15
  else reasons.push('Action Title 不完整')

  if (slides.every(slide => Array.isArray(slide.models_used) && slide.models_used.length > 0)) score += 15
  else reasons.push('models_used 不完整')

  if (slides.some(slide => Array.isArray(slide.data_refs) && slide.data_refs.some(ref => ref.source))) score += 10
  else reasons.push('缺 data_refs source')

  if (parsed.metadata?.self_check_passed === true) score += 10
  else reasons.push('metadata.self_check_passed 不是 true')

  return { score, passed: score >= 70, reasons }
}

function envSnapshot(models) {
  return Object.fromEntries(models.map(model => [model.env, Boolean(process.env[model.env])]))
}

function ensureCanSpend(models, options) {
  if (options.dryRun) return
  if (!options.yesSpend) {
    throw new Error('真实跨模型验证预计消耗约 $1-2。请先让 Seven 确认预算,再带 --yes-spend 运行。')
  }

  const missing = models.filter(model => !process.env[model.env]).map(model => model.env)
  if (missing.length > 0) {
    throw new Error(`缺少 LLM API key: ${missing.join(', ')}。请 Seven 先写入本地 .env,不要提交。`)
  }
}

async function readSmallRigUserPrompt(agentId) {
  const bundlePath = path.join(REPO_ROOT, 'outputs', agentId === 'brand_positioning' ? 'smallrig' : `smallrig-${suffixForAgent(agentId)}`, 'prompt-bundle.md')
  try {
    const bundle = await fs.readFile(bundlePath, 'utf8')
    return [
      '请基于以下 prompt bundle 输出严格 JSON。为跨模型验证节省成本,生成 6 页即可,但必须保留 action_title、core_points、data_refs、models_used、metadata.self_check_passed。',
      '',
      bundle.slice(0, 26000),
    ].join('\n')
  } catch {
    return '输入 client_profile: SmallRig MI 升级。请生成 6 页符合契约的 JSON,不要 markdown 围栏。'
  }
}

function suffixForAgent(agentId) {
  return {
    industry_analysis: 'industry',
    consumer_insight: 'consumer',
    competitor_analysis: 'competitor',
    brand_positioning: 'positioning',
    brand_building: 'building',
    annual_planning: 'annual',
  }[agentId]
}

function expectedDryRunOutput(agentId, modelName) {
  return JSON.stringify({
    agent_id: agentId,
    model: modelName,
    slides: [
      {
        page_no: 1,
        layout: 'S03',
        action_title: `${agentId} 在 ${modelName} 上保持结构化输出`,
        core_points: ['严格 JSON', '每页 models_used 非空', '保留 data_refs source'],
        data_refs: [{ value: 'SmallRig page-124', source: 'assets/_raw/cases/标杆案例/smallrig/page-124.md', type: 'quote' }],
        models_used: ['Action-Title'],
      },
    ],
    metadata: { self_check_passed: true },
  })
}

async function runOnce(agentId, model, options = {}) {
  if (options.dryRun) {
    const text = expectedDryRunOutput(agentId, model.name)
    return { text, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, model: model.name }
  }

  const systemPrompt = await fs.readFile(path.join(REPO_ROOT, `prompts/${agentId}/system.md`), 'utf8')
  const userPrompt = await readSmallRigUserPrompt(agentId)
  return model.fn(systemPrompt, userPrompt, { model: model.defaultModel, maxTokens: options.maxTokens || 8000 })
}

export function renderReport({ matrix, models, generatedAt, dryRun = false, env = {} }) {
  const lines = [
    '# Model Agnostic Validation Report',
    '',
    `生成时间: ${generatedAt}`,
    '',
    `运行模式: ${dryRun ? 'dry-run 离线结构验证' : 'real API calls'}`,
    '',
    '## 环境密钥状态',
    '',
    ...Object.entries(env).map(([key, present]) => `- ${key}: ${present ? 'present' : 'missing'}`),
    '',
    `## 跨模型评分矩阵 (6 Sub-Agent × ${models.length} LLM)`,
    '',
    `| Sub-Agent | ${models.map(model => model.name).join(' | ')} | Delta |`,
    `|---|${models.map(() => '---:').join('|')}|---:|`,
  ]

  const deltas = []
  for (const agent of Object.keys(matrix)) {
    const scores = models.map(model => matrix[agent][model.key]?.score || 0)
    const delta = calculateDelta(scores)
    deltas.push(delta)
    lines.push(`| ${agent} | ${scores.join(' | ')} | ${delta.toFixed(1)}% |`)
  }

  const maxDelta = deltas.length ? Math.max(...deltas) : 0
  lines.push(
    '',
    '## 通过标准',
    '',
    '- Spec §1.3 北极星指标: 跨模型质量 delta < 20%',
    `- 最大 delta: ${maxDelta.toFixed(1)}%`,
    dryRun
      ? '- 本报告为 dry-run,只能验证脚本、评分和报告结构；真实 PASS 需补齐 key 后运行 real API calls。'
      : '',
    '',
    !dryRun && maxDelta < 20 ? '✅ **PASS** (跨模型质量稳定)' : '🔴 **PENDING/FAIL** (需真实跨模型结果或 prompt 修复)',
    '',
    '## 明细',
    '',
  )

  for (const agent of Object.keys(matrix)) {
    lines.push(`### ${agent}`, '')
    for (const model of models) {
      const result = matrix[agent][model.key]
      lines.push(`- ${model.name}: ${result?.score ?? 0}/100${result?.error ? `, error=${result.error}` : ''}`)
    }
    lines.push('')
  }

  return lines.filter(line => line !== '').join('\n')
}

export async function runValidation(options = {}) {
  const models = parseModelList(options.models).map(key => {
    const model = MODEL_REGISTRY[key]
    if (!model) throw new Error(`Unknown model key: ${key}`)
    return model
  })
  ensureCanSpend(models, options)

  const matrix = {}
  for (const agent of SUB_AGENTS) {
    matrix[agent] = {}
    for (const model of models) {
      try {
        console.log(`Running ${agent} on ${model.name}${options.dryRun ? ' (dry-run)' : ''}...`)
        const result = await runOnce(agent, model, options)
        const evaluation = evaluateOutput(result.text)
        matrix[agent][model.key] = {
          score: evaluation.score,
          passed: evaluation.passed,
          reasons: evaluation.reasons,
          usage: result.usage,
        }
        console.log(`  -> score ${evaluation.score}/100`)
      } catch (error) {
        matrix[agent][model.key] = { score: 0, passed: false, error: error.message }
        console.error(`  failed: ${error.message}`)
      }
    }
  }

  const report = renderReport({
    matrix,
    models,
    generatedAt: new Date().toISOString(),
    dryRun: options.dryRun,
    env: envSnapshot(models),
  })
  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true })
  await fs.writeFile(REPORT_PATH, report)
  return { matrix, models, reportPath: REPORT_PATH }
}

async function cliMain() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const yesSpend = args.includes('--yes-spend')
  const models = args.find(arg => arg.startsWith('--models='))?.split('=')[1]
  const result = await runValidation({ dryRun, yesSpend, models })
  console.log(`[validation] Report: ${path.relative(REPO_ROOT, result.reportPath)}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error.message)
    process.exit(1)
  })
}
