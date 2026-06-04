import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REQUIRED_FAMILIES = [
  ['Brand-House'],
  ['Product-House'],
  ['Slogan-7-Principles'],
  ['Visual-Hammer-Verbal-Nail', 'Aaker-Brand-Personality'],
]

function requiredFamiliesForOptions(options = {}) {
  const allowed = new Set(options.blueprintChunk?.allowed_concepts || [])
  if (!allowed.size) return REQUIRED_FAMILIES
  return REQUIRED_FAMILIES.filter(family => family.some(model => allowed.has(model)))
}

export function methodologyCheck(output, options = {}) {
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

  for (const family of requiredFamiliesForOptions(options)) {
    if (!family.some(model => allModels.has(model))) {
      errors.push(`缺必检方法论: 至少需要 ${family.join(' 或 ')} 之一`)
    }
  }

  const checks = [
    { keyword: ['品牌屋', 'Brand House', '战略', '心智', '论点', '论据', '落地'], desc: '品牌屋' },
    { keyword: ['产品屋', 'Product House', '产品族', '产品系列'], desc: '产品屋' },
    { keyword: ['口号', 'Slogan', '主张', '语言钉'], desc: '品牌口号' },
    { keyword: ['调性', '人格', '视觉锤', 'Visual Hammer'], desc: '调性 + 视觉锤' },
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
