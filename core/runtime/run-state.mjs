import fs from 'node:fs/promises'
import path from 'node:path'

const STATE_FILE = 'state.json'

function nowIso() {
  return new Date().toISOString()
}

function statePath(runDir) {
  if (!runDir) throw new Error('runDir is required')
  return path.join(runDir, STATE_FILE)
}

function countByStatus(chunks, status) {
  return Object.values(chunks || {}).filter(chunk => chunk.status === status).length
}

function withCounts(state) {
  const chunks = state.chunks || {}
  return {
    ...state,
    completed_chunks: countByStatus(chunks, 'completed'),
    failed_chunks: countByStatus(chunks, 'failed'),
    skipped_chunks: countByStatus(chunks, 'skipped'),
  }
}

function mergeChunk(state, chunkId, patch) {
  if (!chunkId) throw new Error('chunkId is required')
  const previous = state.chunks?.[chunkId] || {}
  const updatedAt = nowIso()
  return withCounts({
    ...state,
    status: patch.status === 'failed' ? 'failed' : state.status,
    updated_at: updatedAt,
    chunks: {
      ...(state.chunks || {}),
      [chunkId]: {
        ...previous,
        chunk_id: chunkId,
        ...patch,
        updated_at: updatedAt,
      },
    },
  })
}

export async function readRunState(runDir) {
  return JSON.parse(await fs.readFile(statePath(runDir), 'utf8'))
}

export async function writeRunState(runDir, state) {
  await fs.mkdir(runDir, { recursive: true })
  const normalized = withCounts(state)
  await fs.writeFile(statePath(runDir), JSON.stringify(normalized, null, 2))
  return normalized
}

export async function createRunState({
  runDir,
  runId,
  clientSlug,
  schemeType,
  totalChunks = 0,
} = {}) {
  if (!runId) throw new Error('runId is required')
  if (!clientSlug) throw new Error('clientSlug is required')
  if (!schemeType) throw new Error('schemeType is required')
  const timestamp = nowIso()
  return writeRunState(runDir, {
    run_id: runId,
    client_slug: clientSlug,
    scheme_type: schemeType,
    status: 'running',
    created_at: timestamp,
    updated_at: timestamp,
    total_chunks: totalChunks,
    completed_chunks: 0,
    failed_chunks: 0,
    skipped_chunks: 0,
    chunks: {},
  })
}

export async function ensureRunState(args = {}) {
  try {
    const current = await readRunState(args.runDir)
    return writeRunState(args.runDir, {
      ...current,
      run_id: current.run_id || args.runId,
      client_slug: current.client_slug || args.clientSlug,
      scheme_type: current.scheme_type || args.schemeType,
      total_chunks: args.totalChunks ?? current.total_chunks ?? 0,
      status: current.status === 'failed' ? 'running' : (current.status || 'running'),
      updated_at: nowIso(),
    })
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return createRunState(args)
  }
}

export async function updateRunState(runDir, updater) {
  const current = await readRunState(runDir)
  const next = await updater(current)
  return writeRunState(runDir, {
    ...next,
    updated_at: next.updated_at || nowIso(),
  })
}

export async function markChunkStarted({ runDir, chunkId, workerId } = {}) {
  return updateRunState(runDir, state => mergeChunk(state, chunkId, {
    worker_id: workerId || '',
    status: 'started',
    started_at: nowIso(),
  }))
}

export async function markChunkCompleted({ runDir, chunkId, workerId, outputPath } = {}) {
  return updateRunState(runDir, state => mergeChunk(state, chunkId, {
    worker_id: workerId || state.chunks?.[chunkId]?.worker_id || '',
    status: 'completed',
    completed_at: nowIso(),
    output_path: outputPath || '',
  }))
}

export async function markChunkSkipped({ runDir, chunkId, workerId, reason } = {}) {
  return updateRunState(runDir, state => {
    const previousStatus = state.chunks?.[chunkId]?.status || ''
    return mergeChunk(state, chunkId, {
      worker_id: workerId || state.chunks?.[chunkId]?.worker_id || '',
      status: 'skipped',
      previous_status: previousStatus,
      skipped_at: nowIso(),
      reason: reason || '',
    })
  })
}

export async function markChunkFailed({
  runDir,
  chunkId,
  workerId,
  errorMessage,
  terminationReason,
} = {}) {
  if (!errorMessage) throw new Error('errorMessage is required')
  if (!terminationReason) throw new Error('terminationReason is required')
  return updateRunState(runDir, state => mergeChunk(state, chunkId, {
    worker_id: workerId || state.chunks?.[chunkId]?.worker_id || '',
    status: 'failed',
    failed_at: nowIso(),
    error_message: errorMessage,
    termination_reason: terminationReason,
  }))
}

export async function markRunCompleted(runDir) {
  return updateRunState(runDir, state => ({
    ...state,
    status: 'completed',
    completed_at: nowIso(),
  }))
}

export async function markRunFailed({ runDir, errorMessage, terminationReason } = {}) {
  if (!errorMessage) throw new Error('errorMessage is required')
  if (!terminationReason) throw new Error('terminationReason is required')
  return updateRunState(runDir, state => ({
    ...state,
    status: 'failed',
    error_message: errorMessage,
    termination_reason: terminationReason,
  }))
}

export function shouldSkipCompletedChunk(state, chunkId) {
  return state?.chunks?.[chunkId]?.status === 'completed'
}
