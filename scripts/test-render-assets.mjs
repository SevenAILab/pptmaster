import assert from 'node:assert/strict'
import fs from 'node:fs'

const symlinks = [
  'templates/template-swiss.html',
  'templates/template-magazine.html',
  'templates/motion.min.js',
  'templates/guizang-refs',
  'validators/validate-swiss-deck.mjs',
]

for (const file of symlinks) {
  const stat = fs.lstatSync(file)
  assert.ok(stat.isSymbolicLink(), `${file} should be a symlink`)
  assert.ok(fs.existsSync(file), `${file} symlink target should exist`)
}

const layoutMap = JSON.parse(fs.readFileSync('templates/sub-agent-to-layout-map.json', 'utf8'))
for (const agent of [
  'consumer_insight',
  'industry_analysis',
  'competitor_analysis',
  'brand_positioning',
  'brand_building',
  'annual_planning',
]) {
  assert.ok(Array.isArray(layoutMap[agent].primary_layouts), `${agent} missing primary_layouts`)
  assert.ok(layoutMap[agent].primary_layouts.length >= 3, `${agent} should have at least 3 primary layouts`)
}

const pipeline = fs.readFileSync('templates/render-pipeline.md', 'utf8')
assert.ok(pipeline.includes('Sub-Agent JSON'), 'render pipeline should document Sub-Agent JSON input')
assert.ok(pipeline.includes('validate-swiss-deck.mjs'), 'render pipeline should document validator')

console.log('✅ render assets test passed')
