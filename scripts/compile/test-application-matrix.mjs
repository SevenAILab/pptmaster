import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const MATRIX_PATH = path.join(REPO_ROOT, 'assets/_compiled/concept-application-matrix.json')
const GOLDEN_DIR = path.join(REPO_ROOT, 'assets/_compiled/concepts-golden')

const SUB_AGENTS = [
  'consumer_insight',
  'industry_analysis',
  'competitor_analysis',
  'brand_positioning',
  'brand_building',
  'annual_planning',
]

const EXPECTED = {
  consumer_insight: {
    must_load: ['JTBD', 'Persona-5W2H', 'User-Journey'],
    recommended: ['4A-Funnel', 'Maslow', 'Pain-Gain-Map'],
  },
  industry_analysis: {
    must_load: ['PESTEL', 'Industry-Lifecycle', 'Porter-5-Forces'],
    recommended: ['Value-Chain', 'S-Curve', '5-Why-Essence'],
  },
  competitor_analysis: {
    must_load: ['SWOT', 'Competitor-Matrix', 'Perceptual-Map'],
    recommended: ['4P-Comparison', 'BCG-Matrix', 'TOWS'],
  },
  brand_positioning: {
    must_load: ['STP', 'Brand-Positioning-Triangle', 'Business-Model-Canvas', 'Value-Prop-Canvas'],
    recommended: ['Aaker-Brand-Personality', 'RTB', 'VMV', '5-Why-Essence'],
  },
  brand_building: {
    must_load: ['Brand-House', 'Product-House', 'Slogan-7-Principles', 'Visual-Hammer-Verbal-Nail'],
    recommended: ['Brand-Asset-5-Star', 'Aaker-Brand-Personality', 'Brand-Story-Hero-Journey'],
  },
  annual_planning: {
    must_load: ['OKR', 'Marketing-Calendar', '4P-Rhythm', 'AARRR-Funnel'],
    recommended: ['PDCA', 'Communication-Theory-34', 'IMC'],
  },
}

function flattenTier(matrix, agent, tier) {
  return new Set(matrix[agent][tier].map(item => item.concept))
}

const matrix = JSON.parse(await fs.readFile(MATRIX_PATH, 'utf8'))
const goldenFiles = (await fs.readdir(GOLDEN_DIR)).filter(file => file.endsWith('.md') && file !== 'INDEX.md')

assert.equal(matrix.version, '1.0', 'matrix version should be 1.0')
assert.equal(matrix.generated_from?.golden_concepts_count, goldenFiles.length, 'golden concept count mismatch')
assert.ok(matrix.generated_at, 'missing generated_at')

for (const agent of SUB_AGENTS) {
  assert.ok(matrix.matrix[agent], `missing agent ${agent}`)
  for (const tier of ['must_load', 'recommended', 'optional']) {
    assert.ok(Array.isArray(matrix.matrix[agent][tier]), `${agent}.${tier} should be an array`)
  }
  assert.ok(matrix.coverage_stats[agent].total >= 6, `${agent} should have at least 6 mapped concepts`)
  assert.ok(matrix.coverage_stats[agent].must_load_count >= 3, `${agent} should have at least 3 must_load concepts`)

  for (const [tier, concepts] of Object.entries(EXPECTED[agent])) {
    const actual = flattenTier(matrix.matrix, agent, tier)
    for (const concept of concepts) {
      assert.ok(actual.has(concept), `${agent}.${tier} missing ${concept}`)
    }
  }

  assert.deepEqual(
    [...flattenTier(matrix.matrix, agent, 'must_load')].sort(),
    [...EXPECTED[agent].must_load].sort(),
    `${agent}.must_load should exactly match spec §4.3-4.8`,
  )
}

assert.ok(matrix.coverage_stats.overall.coverage_ratio >= 0.9, 'overall coverage should be >= 90%')
assert.ok(matrix.cross_methodologies.essence_seeker.some(item => item.concept === '5-Why-Essence'), 'missing essence seeker cross methodology')
assert.ok(matrix.cross_methodologies.swot.some(item => item.concept === 'SWOT'), 'missing SWOT cross methodology')
assert.ok(matrix.cross_methodologies.communication_theory_34.some(item => item.concept === 'Communication-Theory-34'), 'missing communication theory cross methodology')
assert.ok(matrix.cross_methodologies.mece.some(item => item.concept === 'MECE'), 'missing MECE cross methodology')
assert.ok(
  matrix.cross_methodologies.pyramid_principle.some(item => item.concept === 'Pyramid-Principle'),
  'missing Pyramid-Principle cross methodology',
)
assert.ok(matrix.cross_methodologies.action_title.some(item => item.concept === 'Action-Title'), 'missing Action-Title cross methodology')

console.log('✅ application matrix test passed')
