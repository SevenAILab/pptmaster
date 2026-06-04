import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const userPrompt = await fs.readFile('prompts/brand_positioning/user.md', 'utf8')
const examples = await fs.readFile('prompts/brand_positioning/examples.md', 'utf8')

for (const required of [
  '# User Prompt Template · Sub-Agent ④ brand_positioning',
  '{{client_name}}',
  '{{industry}}',
  '{{stage}}',
  '{{core_products}}',
  '{{target_audience}}',
  '{{competitors}}',
  '{{budget_level}}',
  '{{tonality}}',
  '{{uploaded_materials_summary}}',
  '{{upstream.consumer_insight',
  '{{upstream.industry_analysis',
  '{{upstream.competitor_analysis',
  '{{render_style}}',
  '{{expected_pages}}',
]) {
  assert.ok(userPrompt.includes(required), `user.md missing ${required}`)
}

for (const required of [
  '# In-context examples · Sub-Agent ④ brand_positioning',
  'SmallRig',
  '案例可追溯报告',
  'assets/_raw/cases/标杆案例/smallrig/page-124.md',
  '从摄影配件供应商升级为全球影像场景产品生态开创者',
  '全球影像场景产品生态开创者',
  '影像内容创作者',
  'FREE YOUR DREAM',
  'Rig UP',
  'Redefinition 重新定义',
  'Imagination 想象力',
  'Gear 装备',
  '全生态 / 全场景 / 全兼容 / 快制造',
  '相机支撑与稳定',
  '储能解决方案',
  '手机支撑与稳定',
  '灯光与控制系统',
  'Brand-Positioning-Triangle',
  'Business-Model-Canvas',
  'Aaker-Brand-Personality',
  'P0-2 SmallRig 真实性约束',
  '元气森林',
]) {
  assert.ok(examples.includes(required), `examples.md missing ${required}`)
}

const smallRigSection = examples.slice(
  examples.indexOf('## 示例 1 · SmallRig'),
  examples.indexOf('## 示例 2 · 元气森林'),
)

for (const forbidden of [
  '从配件供应商升级为全球摄影师的创作工具平台',
  '全球专业摄影师、视频创作者和中小型影视团队',
  '共创循环',
  '75%海外营收',
  '300+国家',
]) {
  assert.ok(!smallRigSection.includes(forbidden), `SmallRig example must not include untraceable phrase: ${forbidden}`)
}

console.log('✅ brand_positioning prompts test passed')
