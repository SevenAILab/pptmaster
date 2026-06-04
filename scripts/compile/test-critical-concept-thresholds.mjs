import assert from 'node:assert/strict'
import fs from 'node:fs'

const candidates = JSON.parse(fs.readFileSync('assets/_compiled/concepts-candidates.json', 'utf8'))
const byName = new Map(candidates.concepts.map(concept => [concept.concept, concept]))

const thresholds = {
  'Slogan-7-Principles': 5,
  JTBD: 8,
  'Industry-Lifecycle': 3,
  'Competitor-Matrix': 3,
  'Perceptual-Map': 3,
  'Marketing-Calendar': 3,
  '4P-Rhythm': 3,
  'Pain-Gain-Map': 3,
  '4A-Funnel': 3,
  MECE: 3,
  'Action-Title': 3
}

for (const [name, minCount] of Object.entries(thresholds)) {
  const count = byName.get(name)?.occurrence_count || 0
  assert.ok(count >= minCount, `${name} should have occ >= ${minCount}, got ${count}`)
}

console.log('✅ critical concept threshold test passed')
