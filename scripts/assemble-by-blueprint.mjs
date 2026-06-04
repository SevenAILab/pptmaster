#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { classifySlideEvidence } from './assumption-policy.mjs'
import { flattenBlueprintChunks, loadBlueprintForScheme } from './run-blueprint-suite.mjs'
import { isHttpSource } from './source-tiers.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function repoPath(...segments) {
  return path.join(REPO_ROOT, ...segments)
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

async function loadChunkOutput(clientSlug, chunkId) {
  const chunkPath = repoPath('outputs', clientSlug, '_chunks', `${chunkId}.json`)
  try {
    return await readJson(chunkPath)
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Missing chunk output: outputs/${clientSlug}/_chunks/${chunkId}.json`)
    }
    throw error
  }
}

export function assertChunkPageCount(chunkOutput, chunkSpec) {
  const actual = chunkOutput.slides?.length || 0
  const expected = chunkSpec.pages?.length || 0
  if (actual !== expected) {
    throw new Error(`Chunk ${chunkSpec.chunk_id} has ${actual} slides but blueprint expects ${expected}`)
  }
}

function assertChunkAssemblyGate(chunkOutput, chunkSpec, options = {}) {
  const metadata = chunkOutput.metadata || {}
  if (options.requireRunId && metadata.run_id !== options.requireRunId) {
    throw new Error(`Chunk ${chunkSpec.chunk_id} run_id ${metadata.run_id || '(missing)'} does not match required run_id ${options.requireRunId}`)
  }
  const review = metadata.consulting_review
  if (options.requireRunId && !review) {
    throw new Error(`Chunk ${chunkSpec.chunk_id} missing Consulting Review verdict`)
  }
  if (review?.verdict === 'BLOCK') {
    throw new Error(`Chunk ${chunkSpec.chunk_id} Consulting Review BLOCK: ${review.key_weakness || ''}`)
  }
  const requiredWebAgents = new Set(['industry_analysis', 'competitor_analysis'])
  const caseLibraryRefs = (chunkOutput.slides || [])
    .flatMap(slide => slide.data_refs || [])
    .filter(ref => String(ref.source || ref.source_url || ref.url || '').startsWith('assets/_raw/cases/'))
  if (caseLibraryRefs.length > 0) {
    throw new Error(`Chunk ${chunkSpec.chunk_id} contains case library data_refs; assets/_raw/cases/** may only be prompt examples, not final sources`)
  }
  if (options.requireRunId && requiredWebAgents.has(chunkSpec.driving_sub_agent)) {
    const hasWebRef = (chunkOutput.slides || [])
      .flatMap(slide => slide.data_refs || [])
      .some(ref => isHttpSource(ref.source || ref.source_url || ref.url || ''))
    if (!hasWebRef) {
      throw new Error(`Chunk ${chunkSpec.chunk_id} required web evidence but has 0 http data_refs`)
    }
  }
}

function decorateSlide(slide, spec, chunk, part, pageNo) {
  return {
    ...slide,
    page_no: pageNo,
    blueprint_page_no: spec.page_no,
    part_no: part.part_no,
    part_title: part.part_title,
    chunk_id: chunk.chunk_id,
    page_intent: slide.page_intent || spec.page_intent,
    page_subtitle: slide.page_subtitle || spec.page_subtitle,
    layout: slide.layout || spec.recommended_layout,
  }
}

function collectMethodologies(slides) {
  return Array.from(new Set(slides.flatMap(slide => slide.models_used || []))).filter(Boolean)
}

function collectChunkTakeaways(chunks) {
  return Object.fromEntries(Object.entries(chunks).map(([chunkId, output]) => [
    chunkId,
    {
      chunk_takeaway: output.chunk_takeaway || '',
      chunk_insights: output.chunk_insights || [],
    },
  ]))
}

function decoratePendingValidationSlides(slides) {
  return slides.map(slide => (
    classifySlideEvidence(slide) === 'hypothesis'
      ? { ...slide, pending_validation: true }
      : slide
  ))
}

function buildValidationChecklist(slides) {
  return slides
    .filter(slide => classifySlideEvidence(slide) === 'hypothesis')
    .map(slide => ({
      page_no: slide.page_no,
      chunk_id: slide.chunk_id,
      claim: slide.action_title || '',
      hypothesis_basis: slide.hypothesis_basis || '',
      validation_method: slide.validation_method || '',
    }))
}

export async function assembleByBlueprint(clientSlug, schemeType, options = {}) {
  const { outputSlug = `${clientSlug}-blueprint`, skipCountAssert = false } = options
  const { blueprint, blueprintPath } = await loadBlueprintForScheme(schemeType)
  const allChunks = flattenBlueprintChunks(blueprint, blueprintPath)
  const chunkOutputs = {}

  for (const chunk of allChunks) {
    chunkOutputs[chunk.chunk_id] = await loadChunkOutput(clientSlug, chunk.chunk_id)
    assertChunkAssemblyGate(chunkOutputs[chunk.chunk_id], chunk, options)
  }

  const mergedSlides = []
  let pageNo = 1

  for (const part of blueprint.parts || []) {
    for (const chunk of part.chunks || []) {
      const chunkOutput = chunkOutputs[chunk.chunk_id]
      if (!skipCountAssert) assertChunkPageCount(chunkOutput, chunk)

      for (let index = 0; index < chunk.pages.length; index += 1) {
        const spec = chunk.pages[index]
        const slide = chunkOutput.slides[index]
        mergedSlides.push(decorateSlide(slide, spec, chunk, part, pageNo))
        pageNo += 1
      }
    }
  }
  const decoratedSlides = decoratePendingValidationSlides(mergedSlides)
  const validationChecklist = buildValidationChecklist(decoratedSlides)
  const totalKeyPages = decoratedSlides.filter(slide => classifySlideEvidence(slide) !== 'descriptive').length

  const merged = {
    agent_id: 'blueprint_suite',
    blueprint_id: blueprint.blueprint_id,
    scheme_type: blueprint.scheme_type,
    scheme_label_zh: blueprint.scheme_label_zh,
    client_profile: {
      name: clientSlug,
      render_style: 'swiss',
    },
    slides: decoratedSlides,
    metadata: {
      total_pages: decoratedSlides.length,
      target_pages: blueprint.target_pages,
      generated_at: new Date().toISOString().split('T')[0],
      run_id: options.requireRunId || null,
      source_blueprint: blueprintPath,
      source_chunks: allChunks.map(chunk => `outputs/${clientSlug}/_chunks/${chunk.chunk_id}.json`),
      methodology_sources: collectMethodologies(decoratedSlides),
      chunk_takeaways: collectChunkTakeaways(chunkOutputs),
      pending_validation: validationChecklist.length > 0,
      validation_checklist: validationChecklist,
      assumption_summary: {
        hypothesis_pages: validationChecklist.length,
        total_key_pages: totalKeyPages,
      },
      self_check_passed: true,
    },
  }

  const outDir = repoPath('outputs', outputSlug)
  await fs.mkdir(outDir, { recursive: true })
  const outPath = path.join(outDir, 'raw-output.json')
  await fs.writeFile(outPath, JSON.stringify(merged, null, 2))

  return { outPath, outputSlug, totalPages: mergedSlides.length, blueprint, merged }
}

function parseArgs(args) {
  const positional = []
  const flags = { scheme: null, outputSlug: null, skipCountAssert: false, requireRunId: null }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--scheme') {
      flags.scheme = args[index + 1]
      index += 1
      continue
    }
    if (arg.startsWith('--scheme=')) {
      flags.scheme = arg.split('=').slice(1).join('=')
      continue
    }
    if (arg === '--output-slug') {
      flags.outputSlug = args[index + 1]
      index += 1
      continue
    }
    if (arg.startsWith('--output-slug=')) {
      flags.outputSlug = arg.split('=').slice(1).join('=')
      continue
    }
    if (arg === '--skip-count-assert') {
      flags.skipCountAssert = true
      continue
    }
    if (arg === '--require-run-id') {
      flags.requireRunId = args[index + 1]
      index += 1
      continue
    }
    if (arg.startsWith('--require-run-id=')) {
      flags.requireRunId = arg.split('=').slice(1).join('=')
      continue
    }
    if (arg.startsWith('--')) continue
    positional.push(arg)
  }

  return { clientSlug: positional[0], ...flags }
}

async function cliMain() {
  const { clientSlug, scheme, outputSlug, skipCountAssert, requireRunId } = parseArgs(process.argv.slice(2))

  if (!clientSlug || !scheme) {
    console.error('Usage: node scripts/assemble-by-blueprint.mjs <client_slug> --scheme <brand_positioning_case|brand_building_case> [--output-slug <slug>] [--skip-count-assert] [--require-run-id <run_id>]')
    process.exit(1)
  }

  console.log(`\n=== Assemble Blueprint Deck: ${clientSlug} (${scheme}) ===\n`)
  const result = await assembleByBlueprint(clientSlug, scheme, { outputSlug: outputSlug || `${clientSlug}-blueprint`, skipCountAssert, requireRunId })
  console.log(`✅ Assembled ${result.totalPages} pages -> ${path.relative(REPO_ROOT, result.outPath)}`)
  console.log(`Next: node scripts/render-deck.mjs ${result.outputSlug}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
