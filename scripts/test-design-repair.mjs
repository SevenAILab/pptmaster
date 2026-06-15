import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeAccents, repairDeck } from './design-repair.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const normalized = normalizeAccents(
  '<section class="slide"><i style="color:#ff6b35"></i><div style="background:linear-gradient(#fff,#000)">x</div><p style="color:#111">n</p></section>',
  '#002fa7',
)
assert.match(normalized, /#002fa7/)
assert.ok(!normalized.includes('#ff6b35'))
assert.ok(!/gradient/i.test(normalized))
assert.match(normalized, /#111/)

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pptmaster-repair-'))
try {
  const htmlPath = path.join(tmp, 'deck.freeform.html')
  fs.writeFileSync(htmlPath, '<section class="slide"><h1 style="color:#ff6b35">A</h1><div style="background:linear-gradient(#fff,#000)">x</div></section>')
  const result = await repairDeck({
    htmlPath,
    runDir: tmp,
    root: REPO_ROOT,
    accent: '#002fa7',
  })
  assert.equal(result.rounds.length >= 1, true)
  assert.equal(result.finalPass, true)
  const repaired = fs.readFileSync(htmlPath, 'utf8')
  assert.match(repaired, /#002fa7/)
  assert.ok(!/gradient/i.test(repaired))
  assert.ok(fs.existsSync(path.join(tmp, 'visual-repair.json')))
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}

console.log('✅ design-repair: normalize accents + audit loop passed')
