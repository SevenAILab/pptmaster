import assert from 'node:assert/strict'
import { resolveOutputDirName, SUITE_ORDER, upstreamKeyForSuffix } from './run-full-suite.mjs'

assert.deepEqual(
  SUITE_ORDER.map(agent => agent.id),
  [
    'industry_analysis',
    'consumer_insight',
    'competitor_analysis',
    'brand_positioning',
    'brand_building',
    'annual_planning',
  ],
)

assert.deepEqual(
  SUITE_ORDER.map(agent => agent.suffix),
  ['industry', 'consumer', 'competitor', 'positioning', 'building', 'annual'],
)

assert.equal(upstreamKeyForSuffix('industry'), 'industry_analysis')
assert.equal(upstreamKeyForSuffix('consumer'), 'consumer_insight')
assert.equal(upstreamKeyForSuffix('competitor'), 'competitor_analysis')
assert.equal(upstreamKeyForSuffix('positioning'), 'brand_positioning')
assert.equal(upstreamKeyForSuffix('building'), 'brand_building')
assert.equal(resolveOutputDirName('smallrig', 'positioning'), 'smallrig-positioning')
assert.equal(resolveOutputDirName('smallrig', 'legacy_positioning'), 'smallrig')

const annualAgent = SUITE_ORDER.find(agent => agent.id === 'annual_planning')
assert.deepEqual(annualAgent.upstream, ['positioning', 'building'])

console.log('✅ run-full-suite test passed')
