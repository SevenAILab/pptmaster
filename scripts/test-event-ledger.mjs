#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  appendRunEvent,
  readRunEvents,
} from '../core/runtime/event-ledger.mjs'

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pptmaster-event-ledger-'))
const runDir = path.join(tmp, 'outputs/client/_runs/run-a')

try {
  const first = await appendRunEvent({
    runDir,
    runId: 'run-a',
    eventType: 'chunk_started',
    chunkId: 'p2-c1',
    workerId: 'industry_analysis',
  })
  assert.equal(first.event_type, 'chunk_started')
  assert.equal(first.run_id, 'run-a')
  assert.equal(first.chunk_id, 'p2-c1')
  assert.ok(first.event_id)
  assert.ok(first.timestamp)

  const failed = await appendRunEvent({
    runDir,
    runId: 'run-a',
    eventType: 'chunk_failed',
    chunkId: 'p2-c2',
    workerId: 'competitor_analysis',
    errorMessage: 'boom',
    terminationReason: 'chunk_failed',
    retryOfEventId: first.event_id,
  })
  assert.equal(failed.error_message, 'boom')
  assert.equal(failed.termination_reason, 'chunk_failed')
  assert.equal(failed.retry_of_event_id, first.event_id)

  const raw = await fs.readFile(path.join(runDir, 'events.jsonl'), 'utf8')
  const lines = raw.trim().split('\n')
  assert.equal(lines.length, 2)
  for (const line of lines) assert.doesNotThrow(() => JSON.parse(line))

  const events = await readRunEvents(runDir)
  assert.deepEqual(events.map(event => event.event_type), ['chunk_started', 'chunk_failed'])

  await assert.rejects(
    () => appendRunEvent({ runDir, runId: 'run-a', eventType: 'chunk_failed' }),
    /error_message/i,
  )
  await assert.rejects(
    () => appendRunEvent({ runDir, runId: 'run-a', eventType: 'chunk_failed', errorMessage: 'boom' }),
    /termination_reason/i,
  )
} finally {
  await fs.rm(tmp, { recursive: true, force: true })
}

console.log('✅ event-ledger tests passed')
