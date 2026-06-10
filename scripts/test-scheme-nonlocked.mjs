import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCasePattern, loadNonlockedSchemeConfig, renderResearchAngles } from './scheme-nonlocked.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const config = loadNonlockedSchemeConfig({ root: REPO_ROOT })
assert.ok(config.research_angles.length >= 3)
assert.ok(config.research_angles.every(angle => !angle.includes('site:')), '研究角度模板不得包含 site: 硬编码')
assert.ok(config.case_patterns.length >= 1)

const rendered = renderResearchAngles(['{industry} 市场规模', '{name} 的竞品', '{audience} 的痛点'], {
  name: 'LUMA',
  industry: '精品咖啡',
  target_audience: ['一线白领', '咖啡爱好者'],
})
assert.equal(rendered[0], '精品咖啡 市场规模')
assert.equal(rendered[1], 'LUMA 的竞品')
assert.match(rendered[2], /一线白领、咖啡爱好者/)
assert.throws(() => renderResearchAngles(['{industry} 规模'], { name: 'X' }), /form\.industry/)

const pattern = loadCasePattern({ root: REPO_ROOT, file: config.case_patterns[0], maxChars: 800 })
assert.ok(pattern.content.length > 0 && pattern.content.length <= 800)
assert.throws(() => loadCasePattern({ root: REPO_ROOT, file: 'assets/nope.md' }), /missing/i)

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pptmaster-scheme-'))
try {
  fs.mkdirSync(path.join(tmp, 'schemes', 'brand_strategy'), { recursive: true })
  fs.writeFileSync(path.join(tmp, 'schemes', 'brand_strategy', 'manifest.json'), '{"scheme_id":"brand_strategy"}')
  assert.throws(() => loadNonlockedSchemeConfig({ root: tmp }), /nonlocked\.research_angles/)
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}

console.log('✅ scheme-nonlocked: config + angles + case pattern passed')
