import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REQUIRED_FAMILIES = [
  ['SWOT'],
  ['Competitor-Matrix'],
  ['Perceptual-Map'],
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
    { keyword: ['竞品', '对手', '对比'], desc: '竞品对比' },
    { keyword: ['SWOT', '知觉地图', 'Perceptual', '认知地图'], desc: 'SWOT 或知觉地图' },
    { keyword: ['差异化', '空白', '机会', '未被'], desc: '差异化机会点' },
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
