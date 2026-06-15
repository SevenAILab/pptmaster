import fs from 'node:fs'
import path from 'node:path'

function traceDirFor(runDir) {
  return path.join(runDir, 'trace')
}

function seqFromFilename(file) {
  const match = String(file).match(/^(\d+)-.+\.json$/)
  return match ? Number(match[1]) : 0
}

function safeStepName(step) {
  return String(step).trim().replace(/[^a-zA-Z0-9._-]+/g, '-')
}

export function writeTrace({
  runDir,
  step,
  injected = null,
  output = null,
  note = '',
} = {}) {
  if (!runDir) throw new Error('writeTrace requires runDir')
  if (!step) throw new Error('writeTrace step is required')

  const traceDir = traceDirFor(runDir)
  fs.mkdirSync(traceDir, { recursive: true })
  const existingSeqs = fs.readdirSync(traceDir)
    .filter(file => file.endsWith('.json'))
    .map(seqFromFilename)
  const nextSeq = Math.max(0, ...existingSeqs) + 1
  const seq = String(nextSeq).padStart(2, '0')
  const record = {
    seq,
    step,
    injected,
    output,
    note,
    timestamp: new Date().toISOString(),
  }
  fs.writeFileSync(
    path.join(traceDir, `${seq}-${safeStepName(step)}.json`),
    JSON.stringify(record, null, 2),
  )
  return record
}

export function readTraces(runDir) {
  const traceDir = traceDirFor(runDir)
  if (!fs.existsSync(traceDir)) return []
  return fs.readdirSync(traceDir)
    .filter(file => file.endsWith('.json'))
    .sort((left, right) => {
      const seqDelta = seqFromFilename(left) - seqFromFilename(right)
      return seqDelta || left.localeCompare(right)
    })
    .map(file => JSON.parse(fs.readFileSync(path.join(traceDir, file), 'utf8')))
}
