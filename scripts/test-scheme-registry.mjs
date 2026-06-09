import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSchemeRegistry } from '../core/registry/scheme-registry.mjs'
import { loadBlueprintForScheme, SCHEME_TO_BLUEPRINT } from './run-blueprint-suite.mjs'
import { SUB_AGENTS } from './run-sub-agent.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function tmpRootWithScheme() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reg-'))
  fs.mkdirSync(path.join(root, 'schemes', 'demo'), { recursive: true })
  fs.writeFileSync(path.join(root, 'schemes', 'demo', 'manifest.json'), JSON.stringify({
    scheme_id: 'demo',
    blueprints: [{ blueprint_id: 'bp1', scheme_type: 'demo_case', path: 'assets/bp1.json' }],
  }))
  return root
}

// ---- resolveBlueprintPath ----
const root = tmpRootWithScheme()
const reg = loadSchemeRegistry({ root, fallbackBlueprints: { other_case: 'fallback/bp.json' } })
assert.deepEqual(reg.resolveBlueprintPath('demo_case'), { path: 'assets/bp1.json', source: 'manifest' })
assert.deepEqual(reg.resolveBlueprintPath('other_case'), { path: 'fallback/bp.json', source: 'fallback' })
assert.throws(() => reg.resolveBlueprintPath('nope_case'), /Unknown scheme_type/)
fs.rmSync(root, { recursive: true, force: true })

// No schemes directory: fallback remains usable, unknown still throws.
const reg2 = loadSchemeRegistry({
  root: path.join(os.tmpdir(), `no-such-${Date.now()}`),
  fallbackBlueprints: { x_case: 'f.json' },
})
assert.equal(reg2.resolveBlueprintPath('x_case').source, 'fallback')
assert.throws(() => reg2.resolveBlueprintPath('x_case2'), /Unknown scheme_type/)

// ---- resolveWorker: manifest + fallback + throw ----
const root3 = fs.mkdtempSync(path.join(os.tmpdir(), 'regw-'))
fs.mkdirSync(path.join(root3, 'schemes', 'demo'), { recursive: true })
fs.writeFileSync(path.join(root3, 'schemes', 'demo', 'workers.json'), JSON.stringify({
  industry_analysis: {
    promptsDir: 'prompts/industry_analysis',
    tools: { web_search: 'required', max_searches: 8 },
  },
}))
const regw = loadSchemeRegistry({
  root: root3,
  fallbackWorkers: { brand_positioning: { promptsDir: 'prompts/brand_positioning' } },
})
assert.equal(regw.resolveWorker('industry_analysis').source, 'manifest')
assert.equal(regw.resolveWorker('industry_analysis').promptsDir, 'prompts/industry_analysis')
assert.equal(regw.resolveWorker('brand_positioning').source, 'fallback')
assert.throws(() => regw.resolveWorker('ghost_worker'), /Unknown worker_id/)
fs.rmSync(root3, { recursive: true, force: true })

// ---- real brand_strategy manifest: no fallback needed ----
const real = loadSchemeRegistry({ root: REPO_ROOT })
assert.deepEqual(real.resolveBlueprintPath('brand_positioning_case'), {
  path: 'assets/_compiled/blueprints/brand-positioning-deck-v1.json',
  source: 'manifest',
})
assert.deepEqual(real.resolveBlueprintPath('brand_building_case'), {
  path: 'assets/_compiled/blueprints/brand-building-deck-v1.json',
  source: 'manifest',
})
const ind = real.resolveWorker('industry_analysis')
assert.equal(ind.source, 'manifest')
assert.equal(ind.promptsDir, 'prompts/industry_analysis')
assert.equal(ind.tools.max_searches, 8)
assert.deepEqual(real.listWorkers().sort(), [
  'annual_planning',
  'brand_building',
  'brand_positioning',
  'competitor_analysis',
  'consumer_insight',
  'industry_analysis',
])

// ---- suite wiring: known scheme path stays byte-for-byte compatible ----
const bp = await loadBlueprintForScheme('brand_positioning_case')
assert.equal(bp.blueprintPath, 'assets/_compiled/blueprints/brand-positioning-deck-v1.json')
assert.equal(bp.blueprintPath, SCHEME_TO_BLUEPRINT.brand_positioning_case)
assert.ok(bp.blueprint && typeof bp.blueprint === 'object')

// ---- consistency: manifest mirrors legacy SUB_AGENTS and runner paths ----
const expectedRunners = {
  industry_analysis: 'scripts/sub-agents/industry-analysis-deepresearch.mjs',
  consumer_insight: 'scripts/sub-agents/consumer-insight-deepresearch.mjs',
  competitor_analysis: 'scripts/sub-agents/competitor-analysis-deepresearch.mjs',
  brand_positioning: 'scripts/sub-agents/brand-positioning-deepresearch.mjs',
  brand_building: 'scripts/sub-agents/brand-building-deepresearch.mjs',
  annual_planning: 'scripts/sub-agents/annual-planning-deepresearch.mjs',
}
for (const [id, cfg] of Object.entries(SUB_AGENTS)) {
  const worker = real.resolveWorker(id)
  assert.equal(worker.source, 'manifest', `${id} should resolve from manifest`)
  assert.equal(worker.promptsDir, cfg.promptsDir, `${id} promptsDir mismatch`)
  assert.equal(worker.tools.web_search, cfg.webSearch, `${id} web_search mismatch`)
  assert.equal(worker.tools.max_searches, cfg.maxSearches, `${id} max_searches mismatch`)
  assert.equal(worker.runner, expectedRunners[id], `${id} runner mismatch`)
}

console.log('✅ scheme-registry: resolve + real manifest + suite wiring + SUB_AGENTS consistency passed')
