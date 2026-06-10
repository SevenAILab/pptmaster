#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function checkMethodologyUsage(deck, { minPages = 2 } = {}) {
  const slides = Array.isArray(deck?.slides) ? deck.slides : []
  const marker = /\[框架[:：]\s*([^\]]+)\]/g
  const frameworks = new Set()
  let usedPageCount = 0

  for (const slide of slides) {
    const haystack = [
      slide?.intent,
      slide?.action_title,
      ...(Array.isArray(slide?.core_points) ? slide.core_points : []),
    ].map(value => String(value ?? '')).join('\n')
    const matches = [...haystack.matchAll(marker)]
    if (matches.length > 0) {
      usedPageCount += 1
      for (const match of matches) frameworks.add(match[1].trim())
    }
  }

  const violations = []
  if (usedPageCount < minPages) {
    violations.push(`方法论运用页 ${usedPageCount} 页，少于要求的 ${minPages} 页`)
  }
  return {
    ok: violations.length === 0,
    usedPageCount,
    totalPages: slides.length,
    frameworks: [...frameworks],
    violations,
  }
}

async function cliMain() {
  const [deckPath] = process.argv.slice(2).filter(arg => !arg.startsWith('--'))
  const json = process.argv.includes('--json')
  const minArg = process.argv.find(arg => arg.startsWith('--min='))
  if (!deckPath) {
    console.error('Usage: node scripts/check-methodology-usage.mjs <deck.json> [--json] [--min=2]')
    process.exit(2)
  }
  const deck = JSON.parse(fs.readFileSync(path.resolve(deckPath), 'utf8'))
  const result = checkMethodologyUsage(deck, {
    minPages: minArg ? Number(minArg.slice('--min='.length)) : 2,
  })
  console.log(json
    ? JSON.stringify(result, null, 2)
    : (result.ok
      ? `✅ 方法论运用：${result.usedPageCount}/${result.totalPages} 页（${result.frameworks.join('、')}）`
      : `❌ ${result.violations.join('；')}`))
  if (!result.ok) process.exit(1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
