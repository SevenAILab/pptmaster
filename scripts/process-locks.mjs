#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { crossPageRepetition } from './deck-quality-score.mjs'

export const ALLOWED_BLOCK_TYPES = [
  'bullet_list',
  'callout',
  'comparison',
  'framework',
  'matrix',
  'metric',
  'quote',
  'steps',
  'table',
  'timeline',
]

const ALLOWED_BLOCK_TYPE_SET = new Set(ALLOWED_BLOCK_TYPES)
const EVIDENCE_KINDS = new Set(['empirical', 'deductive', 'hypothesis'])
const STRUCTURAL_PAGE_KINDS = new Set(['cover', 'toc', 'brief', 'section_intro', 'closing', 'conclusion', 'action'])
const ALLOWED_PAGE_KINDS = new Set([...STRUCTURAL_PAGE_KINDS, 'content'])

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function hasTraceableRef(slide) {
  return Array.isArray(slide?.data_refs) &&
    slide.data_refs.some(ref => ref && nonEmptyString(String(ref.source || ref.source_url || ref.url || '')))
}

function blocksFor(slide) {
  if (Array.isArray(slide?.blocks)) return slide.blocks
  if (Array.isArray(slide?.content_blocks)) return slide.content_blocks
  return []
}

function isContentSlide(slide) {
  return !slide?.page_kind || slide.page_kind === 'content'
}

function contentSlides(slides) {
  return slides.filter(isContentSlide)
}

function validatePageBudget(slides, options) {
  const min = Number(options.minPages ?? 5)
  const max = Number(options.maxPages ?? 8)
  const violations = []
  if (slides.length < min || slides.length > max) {
    violations.push(`页数必须在 ${min}-${max} 页，当前 ${slides.length} 页`)
  }
  return { min, max, violations }
}

function validateRequiredFields(slides) {
  const violations = []
  for (const [index, slide] of slides.entries()) {
    const page = slide?.page_no ?? index + 1
    if (!nonEmptyString(slide?.intent)) {
      violations.push(`page ${page}: 缺 intent`)
    }
    if (!nonEmptyString(slide?.action_title)) {
      violations.push(`page ${page}: 缺 action_title`)
    }
    if (!Array.isArray(slide?.core_points) || slide.core_points.filter(nonEmptyString).length === 0) {
      violations.push(`page ${page}: 缺 core_points`)
    }
  }
  return violations
}

function validatePageKinds(slides) {
  const violations = []
  for (const [index, slide] of slides.entries()) {
    const page = slide?.page_no ?? index + 1
    const kind = slide?.page_kind
    if (kind && !ALLOWED_PAGE_KINDS.has(kind)) {
      violations.push(`page ${page}: 未知 page_kind "${kind}"`)
      continue
    }
    if (!isContentSlide(slide) && !nonEmptyString(slide?.action_title)) {
      violations.push(`page ${page}: 结构件页缺 action_title`)
    }
  }
  return violations
}

function validateRepetition(slides, options) {
  const repetition = crossPageRepetition({ slides }, {
    threshold: Number(options.repetitionThreshold ?? 0.7),
    n: Number(options.ngram ?? 3),
  })
  const violations = repetition.duplicatePairs.map(pair =>
    `跨页重复：page ${pair.a} 与 page ${pair.b} 相似度 ${pair.sim}`,
  )
  return { repetition, violations }
}

function validateEvidence(slides) {
  const violations = []
  for (const [index, slide] of slides.entries()) {
    const page = slide?.page_no ?? index + 1
    const kind = String(slide?.evidence_kind || '').trim()
    const traceable = hasTraceableRef(slide)
    if (!EVIDENCE_KINDS.has(kind)) {
      violations.push(`page ${page}: evidence_kind 必须是 empirical/deductive/hypothesis`)
      continue
    }
    if (kind === 'hypothesis') {
      if (!nonEmptyString(slide?.validation_method)) {
        violations.push(`page ${page}: hypothesis 必须给 validation_method`)
      }
      continue
    }
    if (!traceable) {
      violations.push(`page ${page}: 缺可追溯 data_refs；若资料不足，应标为 evidence_kind:"hypothesis" 并给 validation_method`)
    }
  }
  return violations
}

function validateBlocks(slides) {
  const violations = []
  for (const [index, slide] of slides.entries()) {
    const page = slide?.page_no ?? index + 1
    const blocks = blocksFor(slide)
    if (!Array.isArray(blocks) || blocks.length === 0) {
      violations.push(`page ${page}: 缺 blocks`)
      continue
    }
    for (const [blockIndex, block] of blocks.entries()) {
      const type = String(block?.type || '').trim()
      if (!ALLOWED_BLOCK_TYPE_SET.has(type)) {
        violations.push(`page ${page}: 未知 block type "${type || '(empty)'}" at blocks[${blockIndex}]`)
      }
    }
  }
  return violations
}

export function validateProcessLocks(deck, options = {}) {
  const slides = Array.isArray(deck?.slides) ? deck.slides : []
  const content = contentSlides(slides)
  const budget = validatePageBudget(slides, options)
  const repetition = validateRepetition(content, options)
  const violations = [
    ...budget.violations,
    ...validatePageKinds(slides),
    ...validateRequiredFields(content),
    ...repetition.violations,
    ...validateEvidence(content),
    ...validateBlocks(content),
  ]
  return {
    ok: violations.length === 0,
    violations,
    summary: {
      slideCount: slides.length,
      contentSlideCount: content.length,
      pageBudget: { min: budget.min, max: budget.max },
      duplicatePairs: repetition.repetition.duplicatePairs,
      allowedBlockTypes: ALLOWED_BLOCK_TYPES,
    },
  }
}

export function assertProcessLocks(deck, options = {}) {
  const result = validateProcessLocks(deck, options)
  if (!result.ok) {
    throw new Error(['过程锁未通过：', ...result.violations.map(v => `  - ${v}`)].join('\n'))
  }
  return result
}

function readDeck(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function parseArgs(argv) {
  const opts = { json: false }
  const positional = []
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--json') opts.json = true
    else if (arg === '--min') {
      opts.minPages = Number(argv[index + 1])
      index += 1
    } else if (arg.startsWith('--min=')) {
      opts.minPages = Number(arg.slice('--min='.length))
    } else if (arg === '--max') {
      opts.maxPages = Number(argv[index + 1])
      index += 1
    } else if (arg.startsWith('--max=')) {
      opts.maxPages = Number(arg.slice('--max='.length))
    } else {
      positional.push(arg)
    }
  }
  return { deckPath: positional[0], opts }
}

function formatResult(result) {
  if (result.ok) {
    return `✅ 过程锁通过：${result.summary.slideCount} 页`
  }
  return ['❌ 过程锁未通过：', ...result.violations.map(v => `- ${v}`)].join('\n')
}

async function cliMain() {
  const { deckPath, opts } = parseArgs(process.argv.slice(2))
  if (!deckPath) {
    console.error('Usage: node scripts/process-locks.mjs <deck.json> [--json] [--min 5] [--max 8]')
    process.exit(2)
  }
  const result = validateProcessLocks(readDeck(deckPath), opts)
  console.log(opts.json ? JSON.stringify(result, null, 2) : formatResult(result))
  if (!result.ok) process.exit(1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
