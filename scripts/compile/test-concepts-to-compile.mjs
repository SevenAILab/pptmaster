import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../..')
const CHECKLIST_PATH = path.join(REPO_ROOT, 'assets/_compiled/CONCEPTS-TO-COMPILE.md')

const requiredSections = [
  '## Sub-Agent ① consumer_insight',
  '## Sub-Agent ② industry_analysis',
  '## Sub-Agent ③ competitor_analysis',
  '## Sub-Agent ④ brand_positioning',
  '## Sub-Agent ⑤ brand_building',
  '## Sub-Agent ⑥ annual_planning',
  '## 横切方法论'
]

const requiredConcepts = [
  'JTBD',
  'Persona-5W2H',
  'User-Journey',
  '4A-Funnel',
  'Maslow',
  'Pain-Gain-Map',
  'PESTEL',
  'Industry-Lifecycle',
  'Porter-5-Forces',
  'Value-Chain',
  'S-Curve',
  '5-Why-Essence',
  'SWOT',
  'Competitor-Matrix',
  'Perceptual-Map',
  '4P-Comparison',
  'BCG-Matrix',
  'TOWS',
  'STP',
  'Brand-Positioning-Triangle',
  'Business-Model-Canvas',
  'Value-Prop-Canvas',
  'Aaker-Brand-Personality',
  'RTB',
  'VMV',
  'Brand-House',
  'Product-House',
  'Slogan-7-Principles',
  'Visual-Hammer-Verbal-Nail',
  'Brand-Asset-5-Star',
  'Brand-Story-Hero-Journey',
  'OKR',
  'Marketing-Calendar',
  '4P-Rhythm',
  'AARRR-Funnel',
  'PDCA',
  'Communication-Theory-34',
  'IMC',
  'MECE',
  'Pyramid-Principle'
]

assert.ok(fs.existsSync(CHECKLIST_PATH), 'CONCEPTS-TO-COMPILE.md should exist')

const markdown = fs.readFileSync(CHECKLIST_PATH, 'utf8')

assert.match(markdown, /^# 60 个核心概念 · 待编译清单/m)

for (const section of requiredSections) {
  assert.ok(markdown.includes(section), `Missing section: ${section}`)
}

for (const concept of requiredConcepts) {
  assert.match(markdown, new RegExp(`- \\[ \\] ${concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), `Missing concept: ${concept}`)
}

const checklistItems = markdown.match(/^- \[ \] /gm) || []
assert.equal(checklistItems.length, 60, `Expected exactly 60 checklist concepts, got ${checklistItems.length}`)

assert.ok(markdown.includes('occ:'), 'Checklist should include occurrence evidence')
assert.ok(markdown.includes('sources:'), 'Checklist should include source evidence')
assert.ok(markdown.includes('status:'), 'Checklist should flag source status')
assert.equal(/occ: [1-9]\d*[^)]*当前语料 0 命中/.test(markdown), false, 'Non-zero concepts should not keep stale zero-hit status')

console.log('✅ concepts-to-compile test passed')
