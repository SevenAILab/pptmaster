#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { ensureStrategicQuestion } from './strategic-question.mjs'

const clientSlug = 'test-strategic-question-client'

await fs.rm(`inputs/${clientSlug}`, { recursive: true, force: true })
await fs.mkdir(`inputs/${clientSlug}`, { recursive: true })
await fs.writeFile(`inputs/${clientSlug}/form.json`, JSON.stringify({
  name: 'PPTAgent',
  industry: 'AI Agent / 品牌策划工具',
  stage: '0-1 启动',
  core_products: ['品牌策略 Sub-Agent', 'HTML 横向翻页 PPT'],
  target_audience: ['甲方品牌方', '市场部人员'],
  competitors: ['Gamma', 'WPS AI', '传统 4A 基础提案服务'],
}, null, 2))
await fs.writeFile(`inputs/${clientSlug}/summary.md`, [
  '# PPTAgent',
  '',
  'PPTAgent 需要避开通用 AI PPT 红海,用品牌策划方案垂直方向和 Seven 私有方法论资产建立定位。',
].join('\n'))

const result = await ensureStrategicQuestion(clientSlug, 'brand_positioning_case', { force: true })
const markdown = await fs.readFile(result.path, 'utf8')

assert.ok(markdown.includes('# Strategic Question'))
assert.ok(markdown.includes('PPTAgent'))
assert.ok(markdown.includes('品牌策划'))
assert.ok(markdown.includes('根问题'))
assert.ok(result.rootQuestion.includes('PPTAgent'))

await fs.rm(`inputs/${clientSlug}`, { recursive: true, force: true })

console.log('✅ strategic-question test passed')
