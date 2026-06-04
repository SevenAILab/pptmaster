import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const skill = await fs.readFile('SKILL.md', 'utf8')

assert.ok(skill.startsWith('---\nname: pptmaster'), 'SKILL.md must start with pptmaster frontmatter')
assert.ok(skill.includes('description: PPTAgent'), 'SKILL.md must include PPTAgent description')
assert.ok(skill.includes('Sub-Agent ④ **品牌定位**'), 'SKILL.md must document Phase 1 brand_positioning support')
assert.ok(skill.includes('inputs/{client_slug}/form.json'), 'SKILL.md must document form input path')
assert.ok(skill.includes('inputs/{client_slug}/summary.md'), 'SKILL.md must document summary input path')
assert.ok(skill.includes('node scripts/run-sub-agent.mjs brand_positioning {client_slug}'), 'SKILL.md must document bundle generation command')
assert.ok(skill.includes('node scripts/run-sub-agent.mjs brand_positioning {client_slug} --validate'), 'SKILL.md must document validation command')
assert.ok(skill.includes('outputs/{client_slug}/raw-output.json'), 'SKILL.md must document raw output target')
assert.ok(skill.includes('60 个概念黄金版本'), 'SKILL.md must document compiled golden concepts')
assert.ok(skill.includes('Sub-Agent ④ 品牌定位不需要 web search'), 'SKILL.md must document web-search boundary')

console.log('✅ skill entrypoint test passed')
