import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { runBrandBookMode } from './gen-fullcase-cli.mjs'

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pptmaster-brandbook-cli-'))
try {
  const outputDir = path.join(tmp, 'out')
  const result = await runBrandBookMode({
    slug: 'fixture-luma-coffee',
    opts: {
      root: path.resolve('.'),
      outputDir,
      noModel: true,
      pick: 'd1',
      outputs: ['brand-book', 'independent-site'],
    },
  })
  assert.ok(result.content.strategic_spine.locked)
  assert.ok(result.content.modules.some(module => module.kind === 'risk_check' && module.visibility === 'internal'))
  const brandBook = await fs.readFile(path.join(outputDir, 'brand-book.html'), 'utf8')
  const site = await fs.readFile(path.join(outputDir, 'independent-site.html'), 'utf8')
  assert.ok(brandBook.includes('LUMA Coffee'))
  assert.ok(site.includes('LUMA Coffee'))
  assert.ok(!brandBook.includes('单店回本测算'))
  assert.ok(!site.includes('单店回本测算'))
  assert.ok(!brandBook.includes('production_note'))
  assert.ok(!site.includes('production_note'))
  assert.ok(await fs.stat(path.join(outputDir, 'brand-system-content.json')))
} finally {
  await fs.rm(tmp, { recursive: true, force: true })
}

console.log('✅ brandbook-cli tests passed')
