import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const prompt = await fs.readFile('prompts/brand_positioning/system.md', 'utf8')

for (const required of [
  '# Sub-Agent: 品牌定位 (brand_positioning)',
  'assets/_compiled/concept-application-matrix.json',
  'matrix.brand_positioning.must_load',
  'STP',
  'Brand-Positioning-Triangle',
  'Business-Model-Canvas',
  'Value-Prop-Canvas',
  'Aaker-Brand-Personality',
  'RTB',
  'VMV',
  '5-Why-Essence',
  '不调用 web search',
  '输入契约',
  '输出契约',
  '必检字段',
  '禁忌',
  '推荐版式 mapping',
  '生成流程',
  '"agent_id": "brand_positioning"',
  '"self_check_passed": true',
]) {
  assert.ok(prompt.includes(required), `system prompt missing: ${required}`)
}

for (const layout of ['S03', 'S09', 'S12', 'S13', 'S17', 'S05', 'S22']) {
  assert.ok(prompt.includes(layout), `system prompt missing layout ${layout}`)
}

console.log('✅ brand_positioning system prompt test passed')
