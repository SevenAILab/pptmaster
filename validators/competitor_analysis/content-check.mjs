import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { blueprintCheck } from '../blueprint-check.mjs'

const TOPIC_TITLE_PATTERN = /^(.+?)(介绍|背景|现状|概述|说明|分析|描述|阐述)$/

export { blueprintCheck }

export function contentCheck(output, options = {}) {
  const errors = []
  const warnings = []

  if (!output.slides || !Array.isArray(output.slides)) {
    return { passed: false, errors: ['No slides array'], warnings }
  }

  let hasData = false
  for (const slide of output.slides) {
    if (!slide.action_title || slide.action_title.length < 6) {
      errors.push(`Page ${slide.page_no}: action_title 过短`)
    }
    if (TOPIC_TITLE_PATTERN.test(slide.action_title || '')) {
      errors.push(`Page ${slide.page_no}: action_title 是话题型 "${slide.action_title}", 应改为结论型`)
    }

    const pointCount = slide.core_points?.length || 0
    if (pointCount < 2 || pointCount > 6) {
      errors.push(`Page ${slide.page_no}: core_points 数量 ${pointCount}, 应 2-6`)
    }

    if (slide.data_refs?.length > 0) {
      hasData = true
      for (const dataRef of slide.data_refs) {
        if (!dataRef.source) warnings.push(`Page ${slide.page_no}: data_ref 缺 source`)
      }
    }
  }

  if (!hasData) warnings.push('整份方案没有任何 data_refs')

  if (options.blueprintChunk) {
    const bpResult = blueprintCheck(output, options.blueprintChunk)
    errors.push(...(bpResult.errors || []))
    warnings.push(...(bpResult.warnings || []))
  }

  return { passed: errors.length === 0, errors, warnings }
}

async function cliMain() {
  const file = process.argv[2]
  if (!file) {
    console.error('Usage: node content-check.mjs <output.json>')
    process.exit(1)
  }

  const output = JSON.parse(await fs.readFile(file, 'utf8'))
  const result = contentCheck(output)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.passed ? 0 : 1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
