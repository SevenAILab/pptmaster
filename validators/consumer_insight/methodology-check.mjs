import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REQUIRED_FAMILIES = [
  ['JTBD'],
  ['Persona-5W2H'],
  ['User-Journey', 'Consumer-Lifecycle'],
  ['Pain-Gain-Map', 'Maslow'],
]

export function methodologyCheck(output) {
  const errors = []
  const warnings = []

  if (!output.slides || !Array.isArray(output.slides)) {
    return { passed: false, errors: ['No slides'], warnings }
  }

  const allModels = new Set()
  for (const slide of output.slides) {
    if (!slide.models_used || slide.models_used.length === 0) {
      errors.push(`Page ${slide.page_no}: models_used 为空`)
    }
    for (const model of slide.models_used || []) allModels.add(model)
  }

  for (const family of REQUIRED_FAMILIES) {
    if (!family.some(model => allModels.has(model))) {
      errors.push(`缺必检方法论: 至少需要 ${family.join(' 或 ')} 之一`)
    }
  }

  const checks = [
    { keyword: ['画像', 'Persona', 'Who', 'WHO', 'What', 'WHAT'], desc: '人群画像 5W2H' },
    { keyword: ['旅程', 'Journey', '触达', '复购'], desc: '用户旅程' },
    { keyword: ['JTBD', 'Job', '任务', '功能', '情感'], desc: '核心 JTBD' },
    { keyword: ['痛点', 'Pain', '收益', 'Gain'], desc: '痛点-收益矩阵' },
  ]
  const allText = output.slides
    .flatMap(slide => [slide.action_title, ...(slide.core_points || [])])
    .join(' ')

  for (const check of checks) {
    if (!check.keyword.some(keyword => allText.includes(keyword))) {
      warnings.push(`必检字段可能未覆盖: ${check.desc} (关键词 ${check.keyword.join('/')} 未出现)`)
    }
  }

  return { passed: errors.length === 0, errors, warnings }
}

async function cliMain() {
  const file = process.argv[2]
  if (!file) {
    console.error('Usage: node methodology-check.mjs <output.json>')
    process.exit(1)
  }

  const output = JSON.parse(await fs.readFile(file, 'utf8'))
  const result = methodologyCheck(output)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.passed ? 0 : 1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
