#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { generateBlueprintDemo } from './generate-blueprint-demo.mjs'

async function resetClient(slug, form, summary) {
  await fs.rm(`inputs/${slug}`, { recursive: true, force: true })
  await fs.rm(`outputs/${slug}`, { recursive: true, force: true })
  await fs.rm(`outputs/${slug}-deck`, { recursive: true, force: true })
  await fs.mkdir(`inputs/${slug}`, { recursive: true })
  await fs.writeFile(`inputs/${slug}/form.json`, JSON.stringify(form, null, 2))
  await fs.writeFile(`inputs/${slug}/summary.md`, summary)
}

async function cleanup(...slugs) {
  for (const slug of slugs) {
    await fs.rm(`inputs/${slug}`, { recursive: true, force: true })
    await fs.rm(`outputs/${slug}`, { recursive: true, force: true })
    await fs.rm(`outputs/${slug}-deck`, { recursive: true, force: true })
  }
}

function duplicateTitleCount(slides) {
  const seen = new Set()
  let duplicates = 0
  for (const slide of slides) {
    if (seen.has(slide.action_title)) duplicates += 1
    seen.add(slide.action_title)
  }
  return duplicates
}

function assertNoForbiddenText(raw, forbiddenTexts, label) {
  const text = JSON.stringify(raw)
  for (const forbidden of forbiddenTexts) {
    assert.equal(text.includes(forbidden), false, `${label} should not include ${forbidden}`)
  }
}

const positioningSlug = 'test-positioning-case-local'
await resetClient(positioningSlug, {
  name: '茶语',
  industry: '新式茶饮',
  stage: '重新定位',
  core_products: ['鲜果茶', '国风奶茶', '直营 200 家', '加盟 80 家'],
  target_audience: ['18-30 岁一线/新一线女性', '注重生活方式的茶饮消费者'],
  competitors: ['喜茶', '奈雪', '茶颜悦色', '蜜雪冰城', 'coco'],
  tonality: '东方生活方式 / 现代专业',
  render_style: 'swiss',
}, [
  '# 客户摘要: 茶语',
  '',
  '茶语现有定位“年轻人的茶饮”过于宽泛,被喜茶、奈雪、茶颜悦色挤压心智。',
  '本次需要重新定位,目标是 2026 Q2 上线新定位和全渠道传播。',
  '基建包括直营+加盟双轨、7 个区域仓、24 小时鲜果配送和自研 SaaS POS 系统。',
].join('\n'))

const positioning = await generateBlueprintDemo(positioningSlug, 'brand_positioning_case', {
  outputSlug: `${positioningSlug}-deck`,
  force: true,
})
assert.equal(positioning.totalPages, 80)
const positioningRaw = JSON.parse(await fs.readFile(`outputs/${positioningSlug}-deck/raw-output.json`, 'utf8'))
assert.ok(positioningRaw.slides[0].action_title.includes('茶语'))
assert.ok(positioningRaw.slides[10].action_title.includes('核心问题'))
assert.ok(positioningRaw.slides[40].action_title.includes('茶语'))
assert.ok(positioningRaw.slides[78].action_title.includes('品牌屋'))
assert.ok(!JSON.stringify(positioningRaw).includes('PPTAgent'))
assert.ok(!JSON.stringify(positioningRaw).includes('AI PPT'))
assert.ok(!JSON.stringify(positioningRaw).includes('甲方品牌方和市场部'))

const buildingSlug = 'test-building-case-local'
await resetClient(buildingSlug, {
  name: '启程',
  industry: '城市通勤电动车',
  stage: '0-1 新品牌',
  core_products: ['智能电动车', '配套服务'],
  target_audience: ['22-35 岁一线/新一线通勤白领'],
  competitors: ['九号', 'Niu', '春风', 'Vmoto', '小牛'],
  tonality: '理性专业 / 城市机能',
  render_style: 'swiss',
}, [
  '# 客户摘要: 启程',
  '',
  '启程是城市通勤电动车新品牌,从 0 到 1 起步,需要全套品牌建设。',
  '团队来自传统两轮品牌和互联网公司,懂供应链也懂年轻人。',
  '当前劣势是 0 品牌资产、0 用户、渠道从 0 起步。',
].join('\n'))

const building = await generateBlueprintDemo(buildingSlug, 'brand_building_case', {
  outputSlug: `${buildingSlug}-deck`,
  force: true,
})
assert.equal(building.totalPages, 95)
const buildingRaw = JSON.parse(await fs.readFile(`outputs/${buildingSlug}-deck/raw-output.json`, 'utf8'))
assert.ok(buildingRaw.slides[27].action_title.includes('SWOT'))
assert.ok(buildingRaw.slides[28].action_title.includes('SO'))
assert.ok(buildingRaw.slides[29].action_title.includes('ST'))
assert.ok(buildingRaw.slides[30].action_title.includes('WO'))
assert.ok(buildingRaw.slides[31].action_title.includes('WT'))
assert.ok(buildingRaw.slides[36].action_title.includes('五年规划'))
assert.ok(buildingRaw.slides[66].action_title.includes('TVC'))
assert.ok(buildingRaw.slides[92].action_title.includes('品牌'))
assert.equal(duplicateTitleCount(buildingRaw.slides), 0)
assert.equal(JSON.stringify(buildingRaw).includes('第 2 页要服务'), false)
assert.equal(JSON.stringify(buildingRaw).includes('品牌建设主线'), false)

const softwareSlug = 'test-software-agent-local'
await resetClient(softwareSlug, {
  name: '策略云',
  industry: 'AI Agent / 品牌策划工具',
  stage: '0-1 启动',
  core_products: ['客户资料输入', '策略 Agent 工作流', 'HTML 横向翻页方案', '品牌方法论库'],
  target_audience: ['甲方市场部', '品牌负责人'],
  competitors: ['Gamma', 'WPS AIslides', '传统品牌咨询基础提案服务'],
  tonality: '理性专业',
  render_style: 'swiss',
}, [
  '# 客户摘要: 策略云',
  '',
  '策略云是一款面向品牌策划场景的 AI Agent 产品,希望避开通用 AI PPT 红海。',
  '它通过客户资料、表单字段和方法论库生成咨询级品牌方案 HTML PPT。',
  '当前需要明确新品类定位,并设计适合 Web App 的品牌建设资产。',
].join('\n'))

const softwarePositioning = await generateBlueprintDemo(softwareSlug, 'brand_positioning_case', {
  outputSlug: `${softwareSlug}-positioning-deck`,
  force: true,
})
assert.equal(softwarePositioning.totalPages, 80)
const softwarePositioningRaw = JSON.parse(await fs.readFile(`outputs/${softwareSlug}-positioning-deck/raw-output.json`, 'utf8'))
assert.ok(softwarePositioningRaw.slides[0].action_title.includes('策略云'))
assert.ok(softwarePositioningRaw.slides[40].action_title.includes('策略云'))
assertNoForbiddenText(softwarePositioningRaw, [
  '茶语',
  '一杯茶',
  '茶饮',
  '东方生活方式',
  '鲜果',
  '年轻女性',
  '门店',
  '杯身',
], 'software positioning demo')

const softwareBuilding = await generateBlueprintDemo(softwareSlug, 'brand_building_case', {
  outputSlug: `${softwareSlug}-building-deck`,
  force: true,
})
assert.equal(softwareBuilding.totalPages, 95)
const softwareBuildingRaw = JSON.parse(await fs.readFile(`outputs/${softwareSlug}-building-deck/raw-output.json`, 'utf8'))
assert.ok(JSON.stringify(softwareBuildingRaw).includes('官网'))
assert.ok(JSON.stringify(softwareBuildingRaw).includes('产品界面'))
assertNoForbiddenText(softwareBuildingRaw, [
  '茶语',
  '一杯茶',
  '茶饮',
  '鲜果',
  '门店',
  '杯身',
  '包装',
], 'software building demo')

const smallrigSlug = 'test-smallrig-mi-local'
await resetClient(smallrigSlug, {
  name: 'SmallRig',
  scheme_type: 'brand_building_case',
  stage: 'MI 升级',
  core_products: ['相机支撑与稳定', '储能解决方案', '手机支撑与稳定', '灯光与控制系统'],
  target_audience: ['影像内容创作者'],
  tonality: '专业 / 自由创想',
  render_style: 'swiss',
}, [
  '# 客户摘要: SmallRig MI 升级项目',
  '',
  'SmallRig 已完成“全球影像场景产品生态开创者”的品牌升级,本案基于 page-124 做 MI/VI 落地。',
  '所有品牌字段必须来自 assets/_raw/cases/标杆案例/smallrig/page-124.md。',
].join('\n'))

const smallrig = await generateBlueprintDemo(smallrigSlug, 'brand_building_case', {
  outputSlug: `${smallrigSlug}-deck`,
  force: true,
})
assert.equal(smallrig.totalPages, 95)
const smallrigRaw = JSON.parse(await fs.readFile(`outputs/${smallrigSlug}-deck/raw-output.json`, 'utf8'))
const smallrigText = JSON.stringify(smallrigRaw)
for (const required of [
  '全球影像场景产品生态开创者',
  'FREE YOUR DREAM',
  'Rig UP',
  'Redefinition 重新定义',
  'Imagination 想象力',
  'Gear 装备',
  '全生态',
  '全场景',
  '全兼容',
  '快制造',
]) {
  assert.ok(smallrigText.includes(required), `SmallRig output missing ${required}`)
}
for (const slide of smallrigRaw.slides) {
  for (const dataRef of slide.data_refs || []) {
    assert.equal(dataRef.source, 'assets/_raw/cases/标杆案例/smallrig/page-124.md')
  }
}
assert.ok(smallrigRaw.slides[92].action_title.includes('品牌'))
assert.equal(duplicateTitleCount(smallrigRaw.slides), 0)
assert.equal((smallrigText.match(/必须从 SmallRig page-124 的品牌屋字段展开/g) || []).length, 0)

await cleanup(positioningSlug, buildingSlug, softwareSlug, smallrigSlug)

console.log('✅ blueprint demo cases test passed')
