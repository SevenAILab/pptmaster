import assert from 'node:assert/strict'
import fs from 'node:fs'

const readme = fs.readFileSync('README.md', 'utf8')

for (const text of [
  '![Version](https://img.shields.io/badge/version-1.0.0-green)',
  '60 编译后黄金概念',
  '6 个 Sub-Agent',
  'Chief Strategist Orchestrator',
  'blueprint-driven',
  'npm run blueprint:suite',
  '跨 Agent / 跨模型可用',
  'adapters/openai-api/',
  'docs/QUICKSTART.md',
  'docs/phase-1-retro.md',
]) {
  assert.ok(readme.includes(text), `README should include ${text}`)
}

const requiredAgents = [
  'consumer_insight',
  'industry_analysis',
  'competitor_analysis',
  'brand_positioning',
  'brand_building',
  'annual_planning',
]

for (const agent of requiredAgents) {
  assert.ok(readme.includes(agent), `README should include ${agent}`)
}

assert.ok(!readme.includes('一键全案串联, 30 分钟产出咨询级品牌全案'), 'README should not overpromise deterministic 30-minute delivery')
assert.ok(!readme.includes('run-full-suite.mjs'), 'README should not promote legacy run-full-suite flow')

console.log('✅ README release test passed')
