#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  buildResearchBlueprintPrompt,
  ensureResearchBlueprint,
  validateResearchBlueprint,
} from './sub-agents/research-blueprint.mjs'

const slug = 'phase3-research-blueprint-test'

await fs.rm(`inputs/${slug}`, { recursive: true, force: true })
await fs.rm(`outputs/${slug}`, { recursive: true, force: true })
await fs.mkdir(`inputs/${slug}`, { recursive: true })
await fs.writeFile(`inputs/${slug}/form.json`, JSON.stringify({
  name: 'PPTAgent',
  industry: 'AI Agent / 品牌策划工具 / AI 生成 PPT',
  competitors: ['Gamma', 'WPS AIslides'],
  target_audience: ['甲方品牌方', '品牌咨询团队'],
  core_products: ['客户资料输入', '咨询级品牌策略 PPT'],
  stage: 'new_brand',
}, null, 2))

const prompt = buildResearchBlueprintPrompt({
  name: 'PPTAgent',
  industry: 'AI Agent / 品牌策划工具 / AI 生成 PPT',
  competitors: ['Gamma'],
  target_audience: ['品牌咨询团队'],
  core_products: ['咨询级品牌策略 PPT'],
}, 'brand_positioning_case', '## 核心方法\n找到本质')
assert.ok(prompt.user.includes('谁付钱'))
assert.ok(prompt.user.includes('钱怎么流'))
assert.ok(prompt.user.includes('利润/话语权'))
assert.ok(prompt.user.includes('research_blueprint'))

const goodBlueprint = {
  category_essence: {
    category_name: '面向品牌策划工作的 AI 方案生成 Agent',
    who_pays: '甲方品牌团队或咨询团队负责人付费，使用者与决策者可能分离',
    value_chain: '客户资料进入策略工作流，Agent 生成方案，团队用输出交付或汇报',
    profit_pool: '利润集中在专业判断、客户信任和可复用方法论资产',
    key_variables: ['专业可信度', '输出可编辑性', '证据可追溯', '交付效率'],
  },
  research_blueprint: {
    industry_questions: ['AI PPT 行业怎么赚钱', '品牌策划预算怎么流', '企业采购看什么', '专业方案交付如何计费'],
    competitor_targets: ['Gamma', 'WPS AIslides', 'Beautiful.ai', '咨询公司内部 AI 工具'],
    consumer_segments: ['甲方品牌负责人', '市场部执行者', '独立品牌顾问'],
    positioning_hypotheses_to_test: ['PPTAgent 是否能占据咨询级品牌方案 Agent'],
  },
}

const calls = []
const result = await ensureResearchBlueprint(slug, 'brand_positioning_case', {
  realLLM: true,
  callStep: async (args, options) => {
    calls.push({ args, options })
    assert.ok(args.system.includes('品类研究蓝图'))
    assert.ok(args.user.includes('PPTAgent'))
    return { text: JSON.stringify(goodBlueprint), usage: {}, provider: 'test', model: 'test' }
  },
  model: 'test-model',
})
assert.equal(result.status, 'generated')
assert.equal(calls.length, 1)
assert.equal(calls[0].options.purpose, 'research-blueprint.brand_positioning_case')

const saved = JSON.parse(await fs.readFile(`outputs/${slug}/_research-blueprint.json`, 'utf8'))
assert.deepEqual(saved.category_essence.key_variables, goodBlueprint.category_essence.key_variables)
assert.deepEqual(saved.research_blueprint.industry_questions, goodBlueprint.research_blueprint.industry_questions)

const reused = await ensureResearchBlueprint(slug, 'brand_positioning_case', {
  realLLM: true,
  callStep: async () => {
    throw new Error('should not call LLM when blueprint exists and force=false')
  },
})
assert.equal(reused.status, 'existing')

await assert.rejects(
  () => ensureResearchBlueprint(slug, 'brand_positioning_case', {
    realLLM: true,
    force: true,
    callStep: async () => ({
      text: JSON.stringify({ category_essence: {}, research_blueprint: {} }),
      usage: {},
    }),
  }),
  /category_essence|research_blueprint|key_variables|industry_questions/i,
)

assert.throws(
  () => validateResearchBlueprint({ category_essence: goodBlueprint.category_essence }),
  /research_blueprint/,
)

const missingSlug = 'phase3-research-blueprint-missing-test'
await fs.rm(`outputs/${missingSlug}`, { recursive: true, force: true })
const skipped = await ensureResearchBlueprint(missingSlug, 'brand_positioning_case', {
  realLLM: false,
  readForm: async () => ({ name: 'No LLM Brand' }),
})
assert.equal(skipped.status, 'skipped_missing_no_real_llm')

await fs.rm(`inputs/${slug}`, { recursive: true, force: true })
await fs.rm(`outputs/${slug}`, { recursive: true, force: true })
await fs.rm(`outputs/${missingSlug}`, { recursive: true, force: true })

console.log('✅ research-blueprint tests passed')
