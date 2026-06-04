#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function repoPath(...segments) {
  return path.join(REPO_ROOT, ...segments)
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

async function readOptional(filePath, fallback = '') {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
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

function extractSummarySignals(summary) {
  const text = summary.replace(/\s+/g, ' ')
  const hasVertical = /垂直|品牌策划|品牌策略|品牌全案/.test(text)
  const hasRedOcean = /红海|Gamma|AiPPT|ChatPPT|WPS|Copilot|Canva/.test(text)
  const hasAsset = /Seven|方法论|模型|案例库|知识全景图|私有/.test(text)

  return {
    hasVertical,
    hasRedOcean,
    hasAsset,
  }
}

export function buildStrategicQuestionMarkdown(form, summary, schemeType) {
  const clientName = pick(form, 'name', '客户名') || '客户'
  const industry = pick(form, 'industry', '行业') || '未注明行业'
  const stage = pick(form, 'stage', '品牌阶段') || '未注明阶段'
  const targetAudience = asList(pick(form, 'target_audience', '目标人群', '目标用户')).join(' / ') || '目标用户'
  const competitors = asList(pick(form, 'competitors', '主要竞品')).slice(0, 4).join(' / ') || '现有替代方案'
  const products = asList(pick(form, 'core_products', '核心产品', '核心产品/服务')).slice(0, 4).join(' / ') || '核心产品服务'
  const signals = extractSummarySignals(summary)
  const schemeLabel = schemeType === 'brand_building_case' ? '品牌建设案' : '品牌定位案'

  const rootQuestion = `${clientName} 如何在 ${competitors} 等替代方案之外,被 ${targetAudience} 清晰识别为“${signals.hasVertical ? '品牌策划方案 Agent' : `${industry} 的专业解决方案`}”,并证明 ${products} 能持续交付咨询级结果？`
  const decisionQuestion = schemeType === 'brand_building_case'
    ? `如果 ${clientName} 要从 ${stage} 进入市场,品牌建设必须优先建立哪一个战略引擎,再展开产品、渠道、传播和运营配称？`
    : `如果 ${clientName} 要避免被误解为通用工具,定位语句必须先改变哪一个品类框架、哪一个用户任务和哪一个可信证据？`

  return [
    '# Strategic Question',
    '',
    `- 客户: ${clientName}`,
    `- 方案类型: ${schemeLabel}`,
    `- 行业/赛道: ${industry}`,
    `- 品牌阶段: ${stage}`,
    `- 目标用户: ${targetAudience}`,
    `- 主要替代方案: ${competitors}`,
    '',
    '## 根问题',
    '',
    rootQuestion,
    '',
    '## 关键决策问题',
    '',
    `1. ${decisionQuestion}`,
    `2. 哪些事实能证明 ${clientName} 不是“做得更快的 PPT 工具”,而是在替代基础品牌策划提案工作？`,
    `3. 输出的每个 Part 是否都在推进同一个结论,而不是把行业、竞品、消费者和品牌模型并列堆放？`,
    '',
    '## 必须被后续 Chunk 回答的证据线',
    '',
    `- 赛道证据: ${signals.hasRedOcean ? '通用 AI PPT 已经拥挤,必须另开垂直品类框架。' : '需要证明赛道机会足够清晰。'}`,
    `- 能力证据: ${signals.hasAsset ? 'Seven 方法论资产、模型库和真实案例库是可信 RTB。' : '必须从客户资料中找到可验证能力。'}`,
    '- 人群证据: 先锁定最痛的品牌策划任务人群,再讨论拓展人群。',
    '- 交付证据: HTML 横向翻页 PPT 是结果形态,不是品牌价值本身。',
    '',
    '## 使用规则',
    '',
    '- 每个 chunk_takeaway 必须能回扣“根问题”。',
    '- 每页 action_title 必须推进一个判断,不能只描述页面主题。',
    '- 若资料不足,只写假设和待验证,不要伪造事实。',
    '',
  ].join('\n')
}

export async function ensureStrategicQuestion(clientSlug, schemeType, options = {}) {
  const inputDir = repoPath('inputs', clientSlug)
  const outPath = path.join(inputDir, 'strategic-question.md')

  if (!options.force) {
    try {
      const existing = await fs.readFile(outPath, 'utf8')
      const rootQuestion = existing.match(/## 根问题\s+([\s\S]*?)(?:\n## |\n$)/)?.[1]?.trim() || ''
      return { path: outPath, rootQuestion, reused: true }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }

  const form = await readJson(path.join(inputDir, 'form.json'))
  const summary = await readOptional(path.join(inputDir, 'summary.md'))
  const markdown = buildStrategicQuestionMarkdown(form, summary, schemeType)
  await fs.writeFile(outPath, markdown)

  const rootQuestion = markdown.match(/## 根问题\s+([\s\S]*?)(?:\n## |\n$)/)?.[1]?.trim() || ''
  return { path: outPath, rootQuestion, reused: false }
}

async function cliMain() {
  const [clientSlug, schemeType = 'brand_positioning_case'] = process.argv.slice(2)
  const force = process.argv.includes('--force')

  if (!clientSlug) {
    console.error('Usage: node scripts/strategic-question.mjs <client_slug> [scheme_type] [--force]')
    process.exit(1)
  }

  const result = await ensureStrategicQuestion(clientSlug, schemeType, { force })
  console.log(`✅ strategic-question ready -> ${path.relative(REPO_ROOT, result.path)}`)
  console.log(result.rootQuestion)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
