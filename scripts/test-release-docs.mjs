import assert from 'node:assert/strict'
import fs from 'node:fs'

function read(path) {
  assert.ok(fs.existsSync(path), `${path} should exist`)
  return fs.readFileSync(path, 'utf8')
}

const quickstart = read('docs/QUICKSTART.md')
for (const text of [
  '5 分钟上手',
  'npm install',
  'TAVILY_API_KEY',
  'SERPER_API_KEY',
  'node scripts/generate-blueprint-demo.mjs',
  'npm run blueprint:suite',
  'npm run blueprint:assemble',
  'Chief Strategist',
]) {
  assert.ok(quickstart.includes(text), `QUICKSTART should include ${text}`)
}
assert.ok(!quickstart.includes('node scripts/run-full-suite.mjs test-client'), 'QUICKSTART should not recommend legacy run-full-suite as the default path')
assert.ok(!quickstart.includes('node scripts/merge-full-deck.mjs test-client'), 'QUICKSTART should not recommend legacy merge-full-deck as the default path')

const gallery = read('docs/CASE-GALLERY.md')
for (const text of [
  'SmallRig MI 升级',
  'outputs/smallrig-mi-blueprint/index.html',
  '茶语品牌定位案',
  '启程品牌建设案',
  'Oatly',
  '元气森林',
  '蜜雪冰城',
  '泡泡玛特',
]) {
  assert.ok(gallery.includes(text), `CASE-GALLERY should include ${text}`)
}

const changelog = read('docs/CHANGELOG.md')
for (const text of [
  '[1.0.0]',
  '6 个 Sub-Agent',
  'Chief Strategist Orchestrator',
  'blueprint-driven',
  '60 个黄金概念库',
  '5 个 adapter',
  '跨模型验证',
]) {
  assert.ok(changelog.includes(text), `CHANGELOG should include ${text}`)
}

console.log('✅ release docs test passed')
