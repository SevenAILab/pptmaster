#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  appendMethodologyToSystem,
  buildBlueprintContextSnippet,
  buildMethodologyPromptContext,
  loadMethodologyFramework,
} from './sub-agents/methodology-injection.mjs'

const industryFramework = await loadMethodologyFramework('industry_analysis')
assert.ok(industryFramework.includes('怎么赚钱') || industryFramework.includes('钱从哪来'), industryFramework)
assert.ok(/利润|话语权/.test(industryFramework), industryFramework)
assert.ok(industryFramework.length <= 1300)

for (const agentId of [
  'industry_analysis',
  'competitor_analysis',
  'consumer_insight',
  'brand_positioning',
  'brand_building',
  'annual_planning',
]) {
  const framework = await loadMethodologyFramework(agentId)
  assert.ok(framework.includes('## 核心方法') || framework.includes('核心方法'), `${agentId} missing core method`)
}

const evidenceDisciplineKeywords = [
  /Facts Over Opinions|Facts-over-opinions|事实优先/i,
  /Structured & Comparable|Structured-comparable|结构化.*可比/i,
  /Current Data|Current-data|当前数据/i,
  /Honest Assessment|Honest-assessment|诚实评估/i,
]

for (const agentId of [
  'industry_analysis',
  'competitor_analysis',
  'consumer_insight',
  'brand_positioning',
  'brand_building',
  'annual_planning',
]) {
  const injectedWriteSystem = await appendMethodologyToSystem('writeSystem baseline', agentId)
  for (const keyword of evidenceDisciplineKeywords) {
    assert.match(injectedWriteSystem, keyword, `${agentId} writeSystem missing shared evidence discipline ${keyword}`)
  }
}

await assert.rejects(
  () => loadMethodologyFramework('unknown_agent'),
  /Unknown methodology agent/i,
)

const slug = 'phase3-methodology-injection-test'
await fs.rm(`outputs/${slug}`, { recursive: true, force: true })
await fs.mkdir(`outputs/${slug}`, { recursive: true })
await fs.writeFile(`outputs/${slug}/_research-blueprint.json`, JSON.stringify({
  category_essence: {
    category_name: 'AI 品牌策划方案 Agent',
    who_pays: '甲方品牌负责人和咨询团队负责人付费',
    value_chain: '客户资料进入策略工作流，Agent 生成方案并由团队交付',
    profit_pool: '专业判断、证据可信度和交付效率',
    key_variables: ['专业可信', '可编辑交付', '证据可追溯'],
  },
  research_blueprint: {
    industry_questions: ['AI PPT 行业怎么赚钱', '品牌策划预算怎么流', '专业方案交付趋势'],
    competitor_targets: ['Gamma', 'WPS AIslides', '咨询公司内部 AI 工具'],
    consumer_segments: ['甲方品牌负责人', '独立品牌顾问'],
    positioning_hypotheses_to_test: ['咨询级品牌方案 Agent 是否成立'],
  },
}, null, 2))

const competitorSnippet = await buildBlueprintContextSnippet(slug, 'competitor_analysis')
assert.ok(competitorSnippet.includes('品类研究蓝图'))
assert.ok(competitorSnippet.includes('AI 品牌策划方案 Agent'))
assert.ok(competitorSnippet.includes('Gamma'))
assert.ok(!competitorSnippet.includes('甲方品牌负责人') || competitorSnippet.includes('谁付钱'))

const consumerSnippet = await buildBlueprintContextSnippet(slug, 'consumer_insight')
assert.ok(consumerSnippet.includes('甲方品牌负责人'))
assert.ok(consumerSnippet.includes('JTBD') || consumerSnippet.includes('人群'))

const missingSnippet = await buildBlueprintContextSnippet('missing-methodology-slug', 'industry_analysis')
assert.equal(missingSnippet, '')

const system = await appendMethodologyToSystem('原系统提示', 'industry_analysis')
assert.ok(system.includes('原系统提示'))
assert.ok(system.includes('## 调研方法论框架'))
assert.ok(system.includes('怎么赚钱') || system.includes('钱从哪来'))

const context = await buildMethodologyPromptContext({ slug, agentId: 'brand_positioning' })
assert.ok(context.methodologyFramework.includes('品牌'))
assert.ok(context.blueprintSnippet.includes('定位假设') || context.blueprintSnippet.includes('咨询级品牌方案 Agent'))

await fs.rm(`outputs/${slug}`, { recursive: true, force: true })

console.log('✅ methodology-injection tests passed')
