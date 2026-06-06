import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

const EVENTS_FILE = 'events.jsonl'

function nowIso() {
  return new Date().toISOString()
}

function eventPath(runDir) {
  if (!runDir) throw new Error('runDir is required')
  return path.join(runDir, EVENTS_FILE)
}

function normalizeEventType(eventType) {
  const value = String(eventType || '').trim()
  if (!value) throw new Error('eventType is required')
  return value
}

function validateFailureEvent(event) {
  if (!/_failed$/.test(event.event_type)) return
  if (!event.error_message) throw new Error(`${event.event_type} requires error_message`)
  if (!event.termination_reason) throw new Error(`${event.event_type} requires termination_reason`)
}

export async function appendRunEvent({
  runDir,
  runId,
  eventType,
  chunkId,
  workerId,
  status,
  reason,
  outputPath,
  errorMessage,
  terminationReason,
  retryOfEventId,
  metadata,
} = {}) {
  if (!runId) throw new Error('runId is required')
  const event = {
    event_id: crypto.randomUUID(),
    run_id: runId,
    event_type: normalizeEventType(eventType),
    timestamp: nowIso(),
    ...(chunkId ? { chunk_id: chunkId } : {}),
    ...(workerId ? { worker_id: workerId } : {}),
    ...(status ? { status } : {}),
    ...(reason ? { reason } : {}),
    ...(outputPath ? { output_path: outputPath } : {}),
    ...(errorMessage ? { error_message: errorMessage } : {}),
    ...(terminationReason ? { termination_reason: terminationReason } : {}),
    ...(retryOfEventId ? { retry_of_event_id: retryOfEventId } : {}),
    ...(metadata ? { metadata } : {}),
  }
  validateFailureEvent(event)
  await fs.mkdir(runDir, { recursive: true })
  await fs.appendFile(eventPath(runDir), `${JSON.stringify(event)}\n`)
  return event
}

export async function readRunEvents(runDir) {
  try {
    const content = await fs.readFile(eventPath(runDir), 'utf8')
    return content
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line))
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}
