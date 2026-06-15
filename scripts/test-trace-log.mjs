import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { readTraces, writeTrace } from './trace-log.mjs'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pptmaster-trace-'))
try {
  writeTrace({
    runDir: tmp,
    step: 'outline',
    injected: { skill: 'proposal-narrative', refs: ['scqa-pyramid'] },
    output: { chapters: 6 },
    note: 'SCQA 锁主线',
  })
  writeTrace({
    runDir: tmp,
    step: 'design',
    injected: { skill: 'deck-design-system', refs: ['layout-system'] },
    output: { slides: 24 },
    note: '逐页设计',
  })
  const traceDir = path.join(tmp, 'trace')
  const files = fs.readdirSync(traceDir).sort()
  assert.equal(files.length, 2)
  assert.match(files[0], /^01-outline\.json$/)
  assert.match(files[1], /^02-design\.json$/)

  const first = JSON.parse(fs.readFileSync(path.join(traceDir, files[0]), 'utf8'))
  assert.equal(first.seq, '01')
  assert.equal(first.step, 'outline')
  assert.deepEqual(first.injected.refs, ['scqa-pyramid'])
  assert.equal(first.output.chapters, 6)
  assert.ok(first.timestamp)

  fs.writeFileSync(path.join(traceDir, '09-manual.json'), JSON.stringify({ seq: '09', step: 'manual' }))
  const next = writeTrace({ runDir: tmp, step: 'visual-audit' })
  assert.equal(next.seq, '10')
  assert.ok(fs.existsSync(path.join(traceDir, '10-visual-audit.json')))

  const all = readTraces(tmp)
  assert.deepEqual(all.map(t => t.step), ['outline', 'design', 'manual', 'visual-audit'])
  assert.throws(() => writeTrace({ runDir: tmp }), /step is required/)
  assert.throws(() => writeTrace({ step: 'outline' }), /requires runDir/)
  assert.deepEqual(readTraces(path.join(tmp, 'missing')), [])
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}
console.log('✅ trace-log: write + read passed')
