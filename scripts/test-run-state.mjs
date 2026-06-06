#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  createRunState,
  markChunkCompleted,
  markChunkFailed,
  markChunkSkipped,
  markChunkStarted,
  readRunState,
  shouldSkipCompletedChunk,
  updateRunState,
} from '../core/runtime/run-state.mjs'

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pptmaster-run-state-'))
const runDir = path.join(tmp, 'outputs/client/_runs/run-a')

try {
  const created = await createRunState({
    runDir,
    runId: 'run-a',
    clientSlug: 'client',
    schemeType: 'brand_positioning_case',
    totalChunks: 2,
  })

  assert.equal(created.run_id, 'run-a')
  assert.equal(created.status, 'running')
  assert.equal(created.total_chunks, 2)
  assert.deepEqual(created.chunks, {})

  await markChunkStarted({ runDir, chunkId: 'p2-c1', workerId: 'industry_analysis' })
  let state = await readRunState(runDir)
  assert.equal(state.chunks['p2-c1'].status, 'started')
  assert.ok(state.chunks['p2-c1'].started_at)

  await markChunkCompleted({
    runDir,
    chunkId: 'p2-c1',
    workerId: 'industry_analysis',
    outputPath: 'outputs/client/_chunks/p2-c1.json',
  })
  state = await readRunState(runDir)
  assert.equal(state.completed_chunks, 1)
  assert.equal(state.chunks['p2-c1'].status, 'completed')
  assert.equal(state.chunks['p2-c1'].output_path, 'outputs/client/_chunks/p2-c1.json')
  assert.equal(shouldSkipCompletedChunk(state, 'p2-c1'), true)
  assert.equal(shouldSkipCompletedChunk(state, 'p2-c2'), false)

  await markChunkSkipped({
    runDir,
    chunkId: 'p2-c1',
    workerId: 'industry_analysis',
    reason: 'completed_in_run_state',
  })
  state = await readRunState(runDir)
  assert.equal(state.skipped_chunks, 1)
  assert.equal(state.chunks['p2-c1'].status, 'skipped')
  assert.equal(state.chunks['p2-c1'].previous_status, 'completed')

  await markChunkFailed({
    runDir,
    chunkId: 'p2-c2',
    workerId: 'competitor_analysis',
    errorMessage: 'boom',
    terminationReason: 'chunk_failed',
  })
  state = await readRunState(runDir)
  assert.equal(state.status, 'failed')
  assert.equal(state.failed_chunks, 1)
  assert.equal(state.chunks['p2-c2'].error_message, 'boom')
  assert.equal(state.chunks['p2-c2'].termination_reason, 'chunk_failed')

  const updated = await updateRunState(runDir, current => ({
    ...current,
    status: 'completed',
    completed_at: '2026-06-06T00:00:00.000Z',
  }))
  assert.equal(updated.status, 'completed')

  const restored = await readRunState(runDir)
  assert.equal(restored.completed_at, '2026-06-06T00:00:00.000Z')
} finally {
  await fs.rm(tmp, { recursive: true, force: true })
}

console.log('✅ run-state tests passed')
