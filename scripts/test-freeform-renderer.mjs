import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { renderFreeformDeck } from './freeform-renderer.mjs'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pptmaster-freeform-'))
try {
  const deck = {
    client_profile: { name: 'Freeform Test', render_style: 'swiss' },
    slides: [
      { page_no: 1, action_title: 'A', core_points: ['a'], data_refs: [{ source: 'inputs/x/summary.md' }] },
      { page_no: 2, action_title: 'B', core_points: ['b'], data_refs: [{ source: 'inputs/x/summary.md' }] },
    ],
  }
  let calls = 0
  const rendered = await renderFreeformDeck(deck, {
    runDir: tmp,
    style: 'swiss',
    callModel: async (_system, user) => {
      calls += 1
      return `<section class="slide light"><h1>${user.includes('A') ? 'A' : 'B'}</h1></section>`
    },
  })
  assert.equal(calls, 2)
  assert.ok(fs.existsSync(rendered.designedPath))
  assert.ok(fs.existsSync(rendered.htmlPath))
  assert.match(fs.readFileSync(rendered.htmlPath, 'utf8'), /Freeform Test/)
  assert.match(fs.readFileSync(rendered.htmlPath, 'utf8'), /<section/)

  const reused = await renderFreeformDeck(deck, {
    runDir: tmp,
    style: 'swiss',
    callModel: async () => {
      throw new Error('cached sections should be reused')
    },
  })
  assert.equal(reused.designed.slides.length, 2)
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}

console.log('✅ freeform-renderer: design checkpoint + HTML assembly passed')
