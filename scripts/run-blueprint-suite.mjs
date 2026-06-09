#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runConsultingReview } from './consulting-review.mjs'
import { appendRunEvent } from '../core/runtime/event-ledger.mjs'
import {
  ensureRunState,
  markChunkCompleted,
  markChunkFailed,
  markChunkRetry,
  markChunkSkipped,
  markChunkStarted,
  markRunCompleted,
  markRunFailed,
  readRunState,
  shouldSkipCompletedChunk,
} from '../core/runtime/run-state.mjs'
import { prepareSubAgentBundle, runRealLLMSubAgent } from './run-sub-agent.mjs'
import { ensureStrategicQuestion } from './strategic-question.mjs'
import { applyLayoutDecisions, runLayoutDesigner } from './sub-agents/layout-designer.mjs'
import { ensureResearchBlueprint } from './sub-agents/research-blueprint.mjs'
import { loadSchemeRegistry } from '../core/registry/scheme-registry.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const SCHEME_TO_BLUEPRINT = {
  brand_positioning_case: 'assets/_compiled/blueprints/brand-positioning-deck-v1.json',
  brand_building_case: 'assets/_compiled/blueprints/brand-building-deck-v1.json',
}

const schemeRegistry = loadSchemeRegistry({ root: REPO_ROOT, fallbackBlueprints: SCHEME_TO_BLUEPRINT })

function repoPath(...segments) {
  return path.join(REPO_ROOT, ...segments)
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

export async function loadBlueprintForScheme(schemeType) {
  const { path: blueprintPath } = schemeRegistry.resolveBlueprintPath(schemeType)
  const blueprint = await readJson(repoPath(blueprintPath))
  return { blueprint, blueprintPath }
}

export function flattenBlueprintChunks(blueprint, blueprintPath = SCHEME_TO_BLUEPRINT[blueprint.scheme_type]) {
  const chunks = []
  for (const part of blueprint.parts || []) {
    for (const chunk of part.chunks || []) {
      chunks.push({
        ...chunk,
        part_no: part.part_no,
        part_title: part.part_title,
        _blueprint_path: blueprintPath,
      })
    }
  }
  return chunks
}

async function chunkOutputExists(clientSlug, chunkId) {
  try {
    await fs.access(repoPath('outputs', clientSlug, '_chunks', `${chunkId}.json`))
    return true
  } catch {
    return false
  }
}

async function readChunkOutput(clientSlug, chunkId) {
  return readJson(repoPath('outputs', clientSlug, '_chunks', `${chunkId}.json`))
}

async function writeChunkOutput(clientSlug, chunkId, output) {
  const chunkPath = repoPath('outputs', clientSlug, '_chunks', `${chunkId}.json`)
  await fs.mkdir(path.dirname(chunkPath), { recursive: true })
  await fs.writeFile(chunkPath, JSON.stringify(output, null, 2))
  return chunkPath
}

function suiteRunId(options = {}) {
  return options.runId || `suite-${new Date().toISOString()}`
}

function suiteRunDir(clientSlug, runId) {
  return repoPath('outputs', clientSlug, '_runs', runId)
}

function eventWorkerId(chunk) {
  return agentIdForChunk(chunk)
}

function stampChunkOutput(output, chunk, options = {}) {
  const now = new Date().toISOString()
  return {
    ...output,
    metadata: {
      ...(output.metadata || {}),
      blueprint_chunk_id: output.metadata?.blueprint_chunk_id || chunk.chunk_id,
      generated_at: output.metadata?.generated_at || now,
      run_id: output.metadata?.run_id || suiteRunId(options),
    },
  }
}

async function persistChunkReview(clientSlug, chunk, review) {
  const chunkOutput = await readChunkOutput(clientSlug, chunk.chunk_id)
  const reviewed = {
    ...chunkOutput,
    metadata: {
      ...(chunkOutput.metadata || {}),
      consulting_review: review,
    },
  }
  await writeChunkOutput(clientSlug, chunk.chunk_id, reviewed)
}

function agentIdForChunk(chunk) {
  return chunk.chunk_id === 'p3-c6-focus-touchpoints'
    ? 'annual_planning'
    : chunk.driving_sub_agent
}

async function prepareChunk(clientSlug, chunk) {
  return prepareSubAgentBundle(agentIdForChunk(chunk), clientSlug, {
    blueprintPath: chunk._blueprint_path,
    chunkId: chunk.chunk_id,
    upstreamChunks: chunk.upstream_chunks || [],
  })
}

async function runRealLLMChunk(clientSlug, chunk, options = {}) {
  const agentId = agentIdForChunk(chunk)
  const runner = options.realLLMRunner || runRealLLMSubAgent
  const result = await runner(agentId, clientSlug, {
    blueprintPath: chunk._blueprint_path,
    chunkId: chunk.chunk_id,
    upstreamChunks: chunk.upstream_chunks || [],
    model: options.model,
    retryHint: options.retryHint || null,
    runId: suiteRunId(options),
  })

  let outputPath = result.rawPath
  if (result.output) {
    outputPath = await writeChunkOutput(clientSlug, chunk.chunk_id, stampChunkOutput(result.output, chunk, options))
  }

  return {
    chunk_id: chunk.chunk_id,
    status: 'real_llm_generated',
    agent_id: agentId,
    output_path: path.relative(REPO_ROOT, outputPath),
  }
}

export async function runLayoutDesignerForChunk(clientSlug, chunk, options = {}) {
  const chunkOutput = await readChunkOutput(clientSlug, chunk.chunk_id)
  const layoutDesignerRunner = options.layoutDesignerRunner || runLayoutDesigner
  const decisions = await layoutDesignerRunner({
    chunkOutput,
    slug: clientSlug,
    model: options.model,
  })
  const decorated = applyLayoutDecisions(chunkOutput, decisions)
  const chunkPath = await writeChunkOutput(clientSlug, chunk.chunk_id, decorated)
  return {
    chunk_id: chunk.chunk_id,
    status: 'layout_designed',
    output_path: path.relative(REPO_ROOT, chunkPath),
    decisions: decisions.layout_decisions.length,
  }
}

export async function runConsultingReviewForChunk(clientSlug, chunk, options = {}) {
  const chunkOutput = await readChunkOutput(clientSlug, chunk.chunk_id)
  const reviewRunner = options.consultingReviewRunner || runConsultingReview
  let review
  try {
    review = await reviewRunner(chunkOutput, clientSlug, {
      blueprintChunk: chunk,
      model: options.model,
    })
  } catch (error) {
    const reviewFromError = error.consultingReview || (
      error.message?.includes('Consulting Review BLOCKED')
        ? {
            chunk_id: chunk.chunk_id,
            verdict: 'BLOCK',
            key_weakness: error.message,
          }
        : null
    )
    if (reviewFromError) {
      await persistChunkReview(clientSlug, chunk, reviewFromError)
    }
    throw error
  }
  await persistChunkReview(clientSlug, chunk, review)
  if (review.verdict === 'BLOCK') {
    throw new Error(`Consulting Review BLOCKED chunk ${chunk.chunk_id}: ${review.key_weakness}`)
  }
  return {
    chunk_id: chunk.chunk_id,
    status: 'consulting_reviewed',
    verdict: review.verdict,
    insight_depth_score: review.insight_depth_score,
    consulting_tone_score: review.consulting_tone_score,
    page_efficiency_score: review.page_efficiency_score,
    data_credibility_score: review.data_credibility_score,
    key_weakness: review.key_weakness,
  }
}

async function runPostProcessorsForChunk(clientSlug, chunk, options = {}) {
  const results = []
  let layoutDesigned = 0
  let reviewed = 0

  if (options.withLayoutDesigner) {
    const layoutResult = await runLayoutDesignerForChunk(clientSlug, chunk, options)
    layoutDesigned += 1
    results.push(layoutResult)
    console.log(`LAYOUT ${chunk.chunk_id} -> ${layoutResult.output_path}`)
  }

  if (options.withConsultingReview) {
    const reviewResult = await runConsultingReviewForChunk(clientSlug, chunk, options)
    reviewed += 1
    results.push(reviewResult)
    console.log(`REVIEW ${chunk.chunk_id} -> ${reviewResult.verdict}`)
  }

  return { results, layoutDesigned, reviewed }
}

async function runRetryForReviewIfNeeded(clientSlug, chunk, reviewResult, options = {}) {
  if (reviewResult?.verdict !== 'RETRY') {
    return { results: [], generated: 0, layoutDesigned: 0 }
  }
  if (!options.realLLM) {
    throw new Error(`Consulting Review RETRY for ${chunk.chunk_id} requires --real-llm to regenerate`)
  }

  console.warn(`RETRY ${chunk.chunk_id}: ${reviewResult.key_weakness}`)
  if (options.runDir) {
    await markChunkRetry({
      runDir: options.runDir,
      chunkId: chunk.chunk_id,
      workerId: eventWorkerId(chunk),
      reason: reviewResult.key_weakness || 'consulting_review_retry',
    })
    await appendRunEvent({
      runDir: options.runDir,
      runId: suiteRunId(options),
      eventType: 'chunk_retry',
      chunkId: chunk.chunk_id,
      workerId: eventWorkerId(chunk),
      reason: reviewResult.key_weakness || 'consulting_review_retry',
      metadata: {
        verdict: reviewResult.verdict,
        must_fix_pages: reviewResult.must_fix_pages || [],
      },
    })
  }
  const retryResult = await runRealLLMChunk(clientSlug, chunk, {
    ...options,
    retryHint: reviewResult,
  })
  const results = [{ ...retryResult, status: 'real_llm_retry_generated' }]
  let layoutDesigned = 0
  console.log(`REAL_LLM_RETRY ${chunk.chunk_id} -> ${retryResult.output_path}`)
  if (options.withLayoutDesigner) {
    const retryLayoutResult = await runLayoutDesignerForChunk(clientSlug, chunk, options)
    layoutDesigned += 1
    results.push({ ...retryLayoutResult, status: 'layout_redesigned_after_retry' })
    console.log(`LAYOUT_RETRY ${chunk.chunk_id} -> ${retryLayoutResult.output_path}`)
  }
  await persistChunkReview(clientSlug, chunk, reviewResult)

  return { results, generated: 1, layoutDesigned }
}

export async function runBlueprintSuite(clientSlug, schemeType, options = {}) {
  const runId = suiteRunId(options)
  const {
    onlyChunk = null,
    skipExisting = true,
    failFast = false,
    realLLM = false,
    withLayoutDesigner = false,
    withConsultingReview = false,
  } = options
  const runOptions = { ...options, runId }
  const { blueprint, blueprintPath } = await loadBlueprintForScheme(schemeType)
  await ensureStrategicQuestion(clientSlug, schemeType, { force: options.forceStrategicQuestion || false })
  const researchBlueprintResult = await ensureResearchBlueprint(clientSlug, schemeType, {
    realLLM,
    force: options.forceResearchBlueprint || options.force || false,
    model: options.model,
  })
  if (researchBlueprintResult.status === 'generated') {
    console.log(`RESEARCH_BLUEPRINT ${clientSlug} -> ${path.relative(REPO_ROOT, researchBlueprintResult.path)}`)
  } else if (researchBlueprintResult.status === 'existing') {
    console.log(`RESEARCH_BLUEPRINT ${clientSlug} -> existing`)
  } else {
    console.log(`RESEARCH_BLUEPRINT ${clientSlug} -> skipped (prepare mode; generated during --real-llm run)`)
  }
  const allChunks = flattenBlueprintChunks(blueprint, blueprintPath)
  const targetChunks = onlyChunk ? allChunks.filter(chunk => chunk.chunk_id === onlyChunk) : allChunks

  if (onlyChunk && targetChunks.length === 0) {
    throw new Error(`Chunk ${onlyChunk} not found in ${schemeType}`)
  }

  const results = []
  let prepared = 0
  let generated = 0
  let skipped = 0
  let failed = 0
  let layoutDesigned = 0
  let reviewed = 0
  const runDir = suiteRunDir(clientSlug, runId)
  await ensureRunState({
    runDir,
    runId,
    clientSlug,
    schemeType,
    totalChunks: targetChunks.length,
  })
  await appendRunEvent({
    runDir,
    runId,
    eventType: 'run_started',
    metadata: { total_chunks: targetChunks.length, only_chunk: onlyChunk || null },
  })

  for (const chunk of targetChunks) {
    const currentRunState = await readRunState(runDir)
    const currentChunkState = currentRunState.chunks?.[chunk.chunk_id] || null
    if (skipExisting && shouldSkipCompletedChunk(currentRunState, chunk.chunk_id)) {
      await markChunkSkipped({
        runDir,
        chunkId: chunk.chunk_id,
        workerId: eventWorkerId(chunk),
        reason: 'completed_in_run_state',
      })
      await appendRunEvent({
        runDir,
        runId,
        eventType: 'chunk_skipped',
        chunkId: chunk.chunk_id,
        workerId: eventWorkerId(chunk),
        reason: 'completed_in_run_state',
      })
      skipped += 1
      results.push({ chunk_id: chunk.chunk_id, status: 'skipped_completed_in_run_state' })
      console.log(`SKIP ${chunk.chunk_id}: completed in run state`)
      continue
    }

    const outputExists = await chunkOutputExists(clientSlug, chunk.chunk_id)
    if (skipExisting && outputExists && !currentChunkState) {
      if (withLayoutDesigner || withConsultingReview) {
        try {
          await markChunkStarted({ runDir, chunkId: chunk.chunk_id, workerId: eventWorkerId(chunk) })
          await appendRunEvent({
            runDir,
            runId,
            eventType: 'chunk_started',
            chunkId: chunk.chunk_id,
            workerId: eventWorkerId(chunk),
            reason: 'postprocess_existing_output',
          })
          const postResult = await runPostProcessorsForChunk(clientSlug, chunk, {
            ...runOptions,
            runDir,
            withLayoutDesigner,
            withConsultingReview,
          })
          layoutDesigned += postResult.layoutDesigned
          reviewed += postResult.reviewed
          results.push(...postResult.results)
          const reviewResult = postResult.results.find(item => item.status === 'consulting_reviewed')
          const retryPostResult = await runRetryForReviewIfNeeded(clientSlug, chunk, reviewResult, {
            ...runOptions,
            runDir,
            realLLM,
            withLayoutDesigner,
          })
          generated += retryPostResult.generated
          layoutDesigned += retryPostResult.layoutDesigned
          results.push(...retryPostResult.results)
          await markChunkCompleted({
            runDir,
            chunkId: chunk.chunk_id,
            workerId: eventWorkerId(chunk),
            outputPath: repoPath('outputs', clientSlug, '_chunks', `${chunk.chunk_id}.json`),
          })
          await appendRunEvent({
            runDir,
            runId,
            eventType: 'chunk_completed',
            chunkId: chunk.chunk_id,
            workerId: eventWorkerId(chunk),
            outputPath: path.relative(REPO_ROOT, repoPath('outputs', clientSlug, '_chunks', `${chunk.chunk_id}.json`)),
          })
        } catch (error) {
          failed += 1
          results.push({ chunk_id: chunk.chunk_id, status: 'postprocess_failed', error: error.message })
          console.error(`POSTPROCESS FAILED ${chunk.chunk_id}: ${error.message}`)
          await markChunkFailed({
            runDir,
            chunkId: chunk.chunk_id,
            workerId: eventWorkerId(chunk),
            errorMessage: error.message,
            terminationReason: 'chunk_failed',
          })
          await appendRunEvent({
            runDir,
            runId,
            eventType: 'chunk_failed',
            chunkId: chunk.chunk_id,
            workerId: eventWorkerId(chunk),
            errorMessage: error.message,
            terminationReason: 'chunk_failed',
          })
          if (failFast) throw error
        }
        continue
      }
      await markChunkSkipped({
        runDir,
        chunkId: chunk.chunk_id,
        workerId: eventWorkerId(chunk),
        reason: 'existing_output',
      })
      await appendRunEvent({
        runDir,
        runId,
        eventType: 'chunk_skipped',
        chunkId: chunk.chunk_id,
        workerId: eventWorkerId(chunk),
        reason: 'existing_output',
      })
      skipped += 1
      results.push({ chunk_id: chunk.chunk_id, status: 'skipped_existing' })
      console.log(`SKIP ${chunk.chunk_id}: existing output`)
      continue
    }

    try {
      await markChunkStarted({ runDir, chunkId: chunk.chunk_id, workerId: eventWorkerId(chunk) })
      await appendRunEvent({
        runDir,
        runId,
        eventType: 'chunk_started',
        chunkId: chunk.chunk_id,
        workerId: eventWorkerId(chunk),
      })
      let chunkOutputPath = ''
      if (realLLM) {
        const generatedResult = await runRealLLMChunk(clientSlug, chunk, runOptions)
        generated += 1
        results.push(generatedResult)
        chunkOutputPath = generatedResult.output_path
        console.log(`REAL_LLM ${chunk.chunk_id} -> ${generatedResult.output_path}`)
      } else {
        const bundle = await prepareChunk(clientSlug, chunk)
        prepared += 1
        results.push({
          chunk_id: chunk.chunk_id,
          status: 'prepared',
          agent_id: agentIdForChunk(chunk),
          bundle_path: path.relative(REPO_ROOT, bundle.bundlePath),
          output_path: path.relative(REPO_ROOT, bundle.rawPath),
        })
        chunkOutputPath = path.relative(REPO_ROOT, bundle.rawPath)
        console.log(`PREPARED ${chunk.chunk_id} -> ${path.relative(REPO_ROOT, bundle.bundlePath)}`)
      }

      if (withLayoutDesigner || withConsultingReview) {
        if (!realLLM) {
          throw new Error('--with-layout-designer/--with-consulting-review requires an existing chunk output or --real-llm')
        }
        const postResult = await runPostProcessorsForChunk(clientSlug, chunk, {
          ...runOptions,
          runDir,
          withLayoutDesigner,
          withConsultingReview,
        })
        layoutDesigned += postResult.layoutDesigned
        reviewed += postResult.reviewed
        results.push(...postResult.results)

        const reviewResult = postResult.results.find(item => item.status === 'consulting_reviewed')
        const retryPostResult = await runRetryForReviewIfNeeded(clientSlug, chunk, reviewResult, {
          ...runOptions,
          runDir,
          realLLM,
          withLayoutDesigner,
        })
        generated += retryPostResult.generated
        layoutDesigned += retryPostResult.layoutDesigned
        results.push(...retryPostResult.results)
        if (retryPostResult.results.at(-1)?.output_path) {
          chunkOutputPath = retryPostResult.results.at(-1).output_path
        }
      }
      await markChunkCompleted({
        runDir,
        chunkId: chunk.chunk_id,
        workerId: eventWorkerId(chunk),
        outputPath: chunkOutputPath,
      })
      await appendRunEvent({
        runDir,
        runId,
        eventType: 'chunk_completed',
        chunkId: chunk.chunk_id,
        workerId: eventWorkerId(chunk),
        outputPath: chunkOutputPath,
      })
    } catch (error) {
      failed += 1
      results.push({ chunk_id: chunk.chunk_id, status: 'failed', error: error.message })
      console.error(`FAILED ${chunk.chunk_id}: ${error.message}`)
      await markChunkFailed({
        runDir,
        chunkId: chunk.chunk_id,
        workerId: eventWorkerId(chunk),
        errorMessage: error.message,
        terminationReason: 'chunk_failed',
      })
      await appendRunEvent({
        runDir,
        runId,
        eventType: 'chunk_failed',
        chunkId: chunk.chunk_id,
        workerId: eventWorkerId(chunk),
        errorMessage: error.message,
        terminationReason: 'chunk_failed',
      })
      if (failFast) throw error
    }
  }

  if (failed > 0) {
    await markRunFailed({ runDir, errorMessage: `${failed} chunk(s) failed`, terminationReason: 'suite_failed' })
    await appendRunEvent({
      runDir,
      runId,
      eventType: 'run_failed',
      errorMessage: `${failed} chunk(s) failed`,
      terminationReason: 'suite_failed',
    })
  } else {
    await markRunCompleted(runDir)
    await appendRunEvent({
      runDir,
      runId,
      eventType: 'run_completed',
      metadata: { generated, skipped, prepared, reviewed, layout_designed: layoutDesigned },
    })
  }

  return {
    clientSlug,
    schemeType,
    blueprint_id: blueprint.blueprint_id,
    runId,
    totalChunks: targetChunks.length,
    prepared,
    generated,
    skipped,
    failed,
    layoutDesigned,
    reviewed,
    researchBlueprint: {
      status: researchBlueprintResult.status,
      path: path.relative(REPO_ROOT, researchBlueprintResult.path),
    },
    results,
  }
}

export function parseArgs(args) {
  const positional = []
  const flags = {
    scheme: null,
    onlyChunk: null,
    force: false,
    failFast: false,
    realLLM: false,
    withLayoutDesigner: false,
    withConsultingReview: false,
    runId: null,
  }

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
    if (arg === '--only-chunk') {
      flags.onlyChunk = args[index + 1]
      index += 1
      continue
    }
    if (arg.startsWith('--only-chunk=')) {
      flags.onlyChunk = arg.split('=').slice(1).join('=')
      continue
    }
    if (arg === '--force') {
      flags.force = true
      continue
    }
    if (arg === '--fail-fast') {
      flags.failFast = true
      continue
    }
    if (arg === '--real-llm') {
      flags.realLLM = true
      continue
    }
    if (arg === '--with-layout-designer') {
      flags.withLayoutDesigner = true
      continue
    }
    if (arg === '--with-consulting-review') {
      flags.withConsultingReview = true
      continue
    }
    if (arg === '--run-id') {
      flags.runId = args[index + 1]
      index += 1
      continue
    }
    if (arg.startsWith('--run-id=')) {
      flags.runId = arg.split('=').slice(1).join('=')
      continue
    }
    if (arg.startsWith('--')) continue
    positional.push(arg)
  }

  return { clientSlug: positional[0], ...flags }
}

async function cliMain() {
  const { clientSlug, scheme, onlyChunk, force, failFast, realLLM, withLayoutDesigner, withConsultingReview, runId } = parseArgs(process.argv.slice(2))

  if (!clientSlug || !scheme) {
    console.error('Usage: node scripts/run-blueprint-suite.mjs <client_slug> --scheme <brand_positioning_case|brand_building_case> [--only-chunk <id>] [--force] [--fail-fast] [--real-llm] [--with-layout-designer] [--with-consulting-review]')
    process.exit(1)
  }

  console.log(`\n=== Blueprint Suite: ${clientSlug} (${scheme}) ===\n`)
  const result = await runBlueprintSuite(clientSlug, scheme, {
    onlyChunk,
    skipExisting: !force,
    force,
    failFast,
    realLLM,
    withLayoutDesigner,
    withConsultingReview,
    runId,
  })
  console.log(`\n=== Suite Prepared: ${result.prepared} prepared / ${result.generated} generated / ${result.skipped} skipped / ${result.layoutDesigned} layout-designed / ${result.reviewed} reviewed / ${result.failed} failed ===`)
  if (result.failed > 0) process.exit(1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
