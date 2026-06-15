import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildBlackboxReport } from './blackbox-report.mjs'
import { writeTrace } from './trace-log.mjs'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pptmaster-bb-'))
try {
  writeTrace({
    runDir: tmp,
    step: 'outline',
    injected: { skill: 'proposal-narrative', refs: [{ ref: 'scqa-pyramid', chars: 1200 }] },
    output: { chapters: 6 },
    note: 'SCQA 搭骨架',
  })
  writeTrace({
    runDir: tmp,
    step: 'design',
    injected: { skill: 'deck-design-system', refs: [{ ref: 'layout-system', chars: 900 }] },
    output: { slides: 24 },
    note: '逐页设计',
  })
  fs.writeFileSync(path.join(tmp, 'outline.json'), '{}')
  fs.writeFileSync(path.join(tmp, 'audit-visual.txt'), 'PASS')

  const md = buildBlackboxReport(tmp)
  assert.match(md, /# .*黑箱/)
  assert.match(md, /outline/)
  assert.match(md, /proposal-narrative/)
  assert.match(md, /scqa-pyramid/)
  assert.match(md, /design/)
  assert.match(md, /deck-design-system/)
  assert.match(md, /outline\.json/)
  assert.match(md, /audit-visual\.txt/)
  assert.ok(md.indexOf('outline') < md.indexOf('design'))
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}
console.log('✅ blackbox-report passed')
