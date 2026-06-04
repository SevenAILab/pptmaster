#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { generateBlueprintDemo } from './generate-blueprint-demo.mjs'

const clientSlug = 'test-blueprint-demo-client'
const outputSlug = `${clientSlug}-deck`

await fs.rm(`inputs/${clientSlug}`, { recursive: true, force: true })
await fs.rm(`outputs/${clientSlug}`, { recursive: true, force: true })
await fs.rm(`outputs/${outputSlug}`, { recursive: true, force: true })
await fs.mkdir(`inputs/${clientSlug}`, { recursive: true })
await fs.writeFile(`inputs/${clientSlug}/form.json`, JSON.stringify({
  name: 'PPTAgent',
  industry: 'AI Agent / 品牌策划工具',
  stage: '0-1 启动',
  core_products: ['客户资料 + 表单输入', '品牌策略 Sub-Agent', '咨询级 HTML 横向翻页 PPT'],
  target_audience: ['甲方品牌方', '市场部人员'],
  competitors: ['Gamma', 'WPS AIslides', 'AiPPT', 'ChatPPT', '传统 4A 基础提案服务'],
  tonality: '理性专业',
  render_style: 'swiss',
}, null, 2))
await fs.writeFile(`inputs/${clientSlug}/summary.md`, [
  '# PPTAgent',
  '',
  'PPTAgent 是面向品牌策划场景的 AI Agent 框架,输入客户资料和表单选择题,输出咨询级品牌全案 HTML 横向翻页 PPT。',
  '它要避开 Gamma / AiPPT / WPS AI 等通用 AI PPT 红海,用品牌策划方案垂直方向和 Seven 私有方法论资产建立护城河。',
].join('\n'))

const result = await generateBlueprintDemo(clientSlug, 'brand_positioning_case', {
  outputSlug,
  force: true,
})

assert.equal(result.totalPages, 80)
assert.equal(result.review.passed, true)

const raw = JSON.parse(await fs.readFile(`outputs/${outputSlug}/raw-output.json`, 'utf8'))
assert.equal(raw.slides.length, 80)
assert.ok(raw.slides[0].action_title.includes('PPTAgent'))
assert.ok(raw.slides[10].action_title.includes('核心问题'))
assert.ok(raw.slides[40].action_title.includes('PPTAgent'))
assert.ok(raw.slides[78].action_title.includes('品牌屋'))
assert.ok(raw.slides.every(slide => slide.data_refs.every(ref => ref.source.startsWith(`inputs/${clientSlug}/`))))

const insights = JSON.parse(await fs.readFile(`outputs/${clientSlug}/_insights.json`, 'utf8'))
assert.equal(insights.chunks.length, 13)

const html = await fs.readFile(`outputs/${outputSlug}/index.html`, 'utf8')
assert.ok(html.includes('PPTAgent'))
assert.ok(!html.includes('assets/_raw/cases/标杆案例/smallrig/page-124.md'))

await fs.rm(`inputs/${clientSlug}`, { recursive: true, force: true })
await fs.rm(`outputs/${clientSlug}`, { recursive: true, force: true })
await fs.rm(`outputs/${outputSlug}`, { recursive: true, force: true })

console.log('✅ blueprint-demo-generator test passed')
