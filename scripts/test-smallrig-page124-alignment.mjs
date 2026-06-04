import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const page124 = await fs.readFile('assets/_raw/cases/标杆案例/smallrig/page-124.md', 'utf8')
const output = JSON.parse(await fs.readFile('outputs/smallrig/raw-output.json', 'utf8'))
const outputText = JSON.stringify(output, null, 2)

for (const required of [
  '全球影像场景产品生态开创者',
  '突破影像边界',
  '让拍摄更自由',
  '每个人都能实现创作梦想',
  'FREE YOUR DREAM',
  '自由创想',
  'Rig UP',
  'Redefinition 重新定义',
  'Imagination 想象力',
  'Gear 装备',
  '影像内容创作者',
  '实现更多创作可能和更高创作能力',
  '对释放灵感和创作自由的追求',
  '全生态',
  '全场景',
  '全兼容',
  '快制造',
  '相机支撑与稳定',
  '储能解决方案',
  '手机支撑与稳定',
  '灯光与控制系统',
]) {
  assert.ok(page124.includes(required), `page-124 missing expected source field: ${required}`)
  assert.ok(outputText.includes(required), `raw-output missing page-124 field: ${required}`)
}

for (const forbidden of [
  '75% 海外营收',
  '300+ 国家',
  '共创循环',
  '全球专业摄影师',
  '视频创作者、Vlogger',
  '中小型影视团队',
  'Manfrotto',
  'Ulanzi',
  'Tilta',
  'PolarPro',
]) {
  assert.ok(!outputText.includes(forbidden), `raw-output includes non page-124 field: ${forbidden}`)
}

for (const slide of output.slides) {
  for (const dataRef of slide.data_refs || []) {
    assert.equal(
      dataRef.source,
      'assets/_raw/cases/标杆案例/smallrig/page-124.md',
      `Page ${slide.page_no} data_ref source must be page-124`,
    )
  }
}

assert.equal(output.slides.length, 12)
assert.equal(output.metadata.self_check_passed, true)

console.log('✅ SmallRig page-124 alignment test passed')
