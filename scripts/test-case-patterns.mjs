import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function read(rel) {
  const file = path.join(root, rel)
  assert.ok(fs.existsSync(file), `${rel} should exist`)
  return fs.readFileSync(file, 'utf8')
}

const manifest = JSON.parse(read('assets/_compiled/case-patterns/manifest.json'))

for (const agentId of [
  'consumer_insight',
  'industry_analysis',
  'competitor_analysis',
  'brand_positioning',
  'brand_building',
  'annual_planning',
]) {
  assert.ok(Array.isArray(manifest[agentId]), `${agentId} should have case patterns`)
  assert.ok(manifest[agentId].length >= 2, `${agentId} should load at least 2 case patterns`)
}

const index = read('assets/_compiled/case-patterns/INDEX.md')
for (const text of [
  '品牌定位案例.pptx',
  '品牌建设案例.pptx',
  '斯莫格MI升级案例.pdf',
  '2024品牌管理全工作手册.pdf',
]) {
  assert.ok(index.includes(text), `INDEX should include ${text}`)
}

const requiredFiles = [
  'brand-positioning-case-pattern.md',
  'brand-building-case-pattern.md',
  'smallrig-mi-upgrade-case-pattern.md',
  'brand-management-sop-pattern.md',
]

for (const file of requiredFiles) {
  const content = read(`assets/_compiled/case-patterns/${file}`)
  assert.ok(content.includes('## 可复用结构'), `${file} should expose reusable structure`)
  assert.ok(content.includes('## 证据来源'), `${file} should list evidence sources`)
  assert.ok(content.includes('## 使用边界'), `${file} should state usage boundaries`)
}

const positioning = read('assets/_compiled/case-patterns/brand-positioning-case-pattern.md')
assert.ok(positioning.includes('贝比赋'), 'brand positioning pattern should preserve source case name')
assert.ok(positioning.includes('市场扫描'), 'brand positioning pattern should include market scan structure')
assert.ok(positioning.includes('心智第一联想'), 'brand positioning pattern should include mental association structure')

const building = read('assets/_compiled/case-patterns/brand-building-case-pattern.md')
assert.ok(building.includes('童里'), 'brand building pattern should preserve source case name')
assert.ok(building.includes('定位之下的四大配称'), 'brand building pattern should include matching structure')
assert.ok(building.includes('五年规划'), 'brand building pattern should include planning structure')

const smallrig = read('assets/_compiled/case-patterns/smallrig-mi-upgrade-case-pattern.md')
assert.ok(smallrig.includes('FREE YOUR DREAM'), 'SmallRig pattern should preserve page-124 field')
assert.ok(smallrig.includes('Rig UP'), 'SmallRig pattern should preserve product slogan')
assert.ok(smallrig.includes('page-124.md'), 'SmallRig pattern should cite page-124')

const sop = read('assets/_compiled/case-patterns/brand-management-sop-pattern.md')
assert.ok(sop.includes('品牌战略'), 'SOP pattern should include brand strategy')
assert.ok(sop.includes('品牌表达'), 'SOP pattern should include brand expression')
assert.ok(sop.includes('品牌沟通'), 'SOP pattern should include brand communication')

console.log('✅ case-patterns test passed')
