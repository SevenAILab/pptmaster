#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  flattenBlueprintChunks,
  loadBlueprintForScheme,
  parseArgs,
  runBlueprintSuite,
} from './run-blueprint-suite.mjs'

const clientSlug = 'test-blueprint-suite-client'

await fs.rm(`inputs/${clientSlug}`, { recursive: true, force: true })
await fs.rm(`outputs/${clientSlug}`, { recursive: true, force: true })
await fs.mkdir(`inputs/${clientSlug}`, { recursive: true })
await fs.writeFile(`inputs/${clientSlug}/form.json`, JSON.stringify({
  name: '蓝图测试客户',
  industry: 'AI 品牌策划',
  stage: '0-1 启动',
  core_products: ['AI Agent'],
  target_audience: ['品牌方'],
  competitors: ['Gamma'],
  tonality: '理性专业',
  render_style: 'swiss',
}, null, 2))
await fs.writeFile(`inputs/${clientSlug}/summary.md`, '蓝图测试客户需要按真实案例结构输出品牌定位案。')

const cachedResearchBlueprint = {
  category_essence: {
    category_name: 'AI 品牌策划方案 Agent',
    who_pays: '甲方品牌方和品牌咨询团队负责人付费',
    value_chain: '客户资料进入策略工作流，Agent 生成方案并由团队交付',
    profit_pool: '专业判断、证据可信度和交付效率',
    key_variables: ['专业可信', '证据可追溯', '可编辑交付'],
  },
  research_blueprint: {
    industry_questions: ['AI PPT 行业怎么赚钱', '品牌策划预算怎么流', '企业采购看什么', '专业方案交付如何计费'],
    competitor_targets: ['Gamma', 'WPS AIslides'],
    consumer_segments: ['甲方品牌负责人', '独立品牌顾问'],
    positioning_hypotheses_to_test: ['咨询级品牌方案 Agent 是否成立'],
  },
}

const { blueprint, blueprintPath } = await loadBlueprintForScheme('brand_positioning_case')
const chunks = flattenBlueprintChunks(blueprint, blueprintPath)
assert.equal(chunks.length, 13)
assert.equal(chunks[0].chunk_id, 'p1-c1-brief-and-status')
assert.equal(chunks[0]._blueprint_path, 'assets/_compiled/blueprints/brand-positioning-deck-v1.json')
assert.equal(chunks.find(chunk => chunk.chunk_id === 'p3-c6-focus-touchpoints').driving_sub_agent, 'brand_building')

const parsed = parseArgs([
  clientSlug,
  '--scheme',
  'brand_positioning_case',
  '--only-chunk',
  'p3-c6-focus-touchpoints',
  '--real-llm',
  '--with-layout-designer',
  '--with-consulting-review',
  '--fail-fast',
  '--run-id',
  'cli-run-id',
])
assert.equal(parsed.realLLM, true)
assert.equal(parsed.withLayoutDesigner, true)
assert.equal(parsed.withConsultingReview, true)
assert.equal(parsed.onlyChunk, 'p3-c6-focus-touchpoints')
assert.equal(parsed.runId, 'cli-run-id')

const onlyResult = await runBlueprintSuite(clientSlug, 'brand_positioning_case', {
  onlyChunk: 'p2-c3-consumer-portraits',
  skipExisting: false,
})
assert.equal(onlyResult.totalChunks, 1)
assert.equal(onlyResult.prepared, 1)
assert.equal(onlyResult.failed, 0)
assert.equal(onlyResult.researchBlueprint.status, 'skipped_missing_no_real_llm')
assert.ok(await fs.stat(`outputs/${clientSlug}/_chunks/p2-c3-consumer-portraits.prompt-bundle.md`))
const strategicQuestion = await fs.readFile(`inputs/${clientSlug}/strategic-question.md`, 'utf8')
assert.ok(strategicQuestion.includes('蓝图测试客户'))
const promptBundle = await fs.readFile(`outputs/${clientSlug}/_chunks/p2-c3-consumer-portraits.prompt-bundle.md`, 'utf8')
assert.ok(promptBundle.includes('## Strategic Question (auto-injected)'))

await fs.writeFile(`outputs/${clientSlug}/_chunks/p2-c3-consumer-portraits.json`, JSON.stringify({
  slides: [],
}, null, 2))
const skippedResult = await runBlueprintSuite(clientSlug, 'brand_positioning_case', {
  onlyChunk: 'p2-c3-consumer-portraits',
  skipExisting: true,
})
assert.equal(skippedResult.prepared, 0)
assert.equal(skippedResult.skipped, 1)

await fs.mkdir(`outputs/${clientSlug}`, { recursive: true })
await fs.writeFile(`outputs/${clientSlug}/_research-blueprint.json`, JSON.stringify(cachedResearchBlueprint, null, 2))

const firstChunk = chunks[0]
let realRunCount = 0
let reviewRunCount = 0
const realResult = await runBlueprintSuite(clientSlug, 'brand_positioning_case', {
  onlyChunk: firstChunk.chunk_id,
  skipExisting: false,
  realLLM: true,
  withConsultingReview: true,
  runId: 'test-run-watermark',
  realLLMRunner: async (agentId, slug, options) => {
    realRunCount += 1
    assert.equal(agentId, firstChunk.driving_sub_agent)
    assert.equal(slug, clientSlug)
    assert.equal(options.chunkId, firstChunk.chunk_id)
    assert.equal(options.runId, 'test-run-watermark')
    return {
      rawPath: `outputs/${clientSlug}/_chunks/${firstChunk.chunk_id}.json`,
      output: {
        agent_id: agentId,
        blueprint_chunk_id: firstChunk.chunk_id,
        chunk_takeaway: '真实 LLM chunk 输出会进入 Consulting Review。',
        chunk_insights: [{ insight: '真实输出需要被甲方视角 stress-test。', source_url: 'https://example.com/review' }],
        thinking_log: [
          { step: 'plan', content: '规划。' },
          { step: 'synthesize', content: '综合。' },
          { step: 'write', content: '写作。' },
        ],
        slides: firstChunk.pages.map(page => ({
          page_no: page.page_no,
          layout: page.recommended_layout,
          action_title: `${page.page_subtitle} review test`,
          core_points: ['真实内容', '甲方审查'],
          data_refs: [{ value: 'source', source: 'https://example.com/review', type: 'quote' }],
          models_used: [page.concept_for_this_page || firstChunk.allowed_concepts[0]],
        })),
      },
    }
  },
  consultingReviewRunner: async (chunkOutput, slug, options) => {
    reviewRunCount += 1
    assert.equal(slug, clientSlug)
    assert.equal(chunkOutput.blueprint_chunk_id, firstChunk.chunk_id)
    assert.equal(options.blueprintChunk.chunk_id, firstChunk.chunk_id)
    return {
      chunk_id: firstChunk.chunk_id,
      verdict: 'PASS',
      insight_depth_score: 8,
      consulting_tone_score: 8,
      page_efficiency_score: 8,
      data_credibility_score: 8,
      key_weakness: '测试弱点',
      must_fix_pages: [],
      deletable_pages: [],
    }
  },
})
assert.equal(realResult.generated, 1)
assert.equal(realResult.reviewed, 1)
assert.equal(realRunCount, 1)
assert.equal(reviewRunCount, 1)
assert.ok(await fs.stat(`outputs/${clientSlug}/_chunks/${firstChunk.chunk_id}.json`))
const reviewedChunk = JSON.parse(await fs.readFile(`outputs/${clientSlug}/_chunks/${firstChunk.chunk_id}.json`, 'utf8'))
assert.equal(reviewedChunk.metadata.run_id, 'test-run-watermark')
assert.match(reviewedChunk.metadata.generated_at, /^\d{4}-\d{2}-\d{2}T/)
assert.equal(reviewedChunk.metadata.consulting_review.verdict, 'PASS')
assert.equal(reviewedChunk.metadata.consulting_review.data_credibility_score, 8)

let retryRealRunCount = 0
const retryResult = await runBlueprintSuite(clientSlug, 'brand_positioning_case', {
  onlyChunk: firstChunk.chunk_id,
  skipExisting: false,
  realLLM: true,
  withConsultingReview: true,
  realLLMRunner: async (agentId, slug, options) => {
    retryRealRunCount += 1
    if (retryRealRunCount === 2) {
      assert.equal(options.retryHint.verdict, 'RETRY')
      assert.equal(options.retryHint.key_weakness, '需要更锐的 takeaway')
    }
    return {
      rawPath: `outputs/${clientSlug}/_chunks/${firstChunk.chunk_id}.json`,
      output: {
        agent_id: agentId,
        blueprint_chunk_id: firstChunk.chunk_id,
        chunk_takeaway: `第 ${retryRealRunCount} 次真实输出`,
        chunk_insights: [{ insight: 'retry test', source_url: 'https://example.com/retry' }],
        thinking_log: [
          { step: 'plan', content: '规划。' },
          { step: 'synthesize', content: '综合。' },
          { step: 'write', content: '写作。' },
        ],
        slides: firstChunk.pages.map(page => ({
          page_no: page.page_no,
          layout: page.recommended_layout,
          action_title: `${page.page_subtitle} retry test`,
          core_points: ['第一次', '第二次'],
          data_refs: [{ value: 'source', source: 'https://example.com/retry', type: 'quote' }],
          models_used: [page.concept_for_this_page || firstChunk.allowed_concepts[0]],
        })),
      },
    }
  },
  consultingReviewRunner: async () => ({
    chunk_id: firstChunk.chunk_id,
    verdict: 'RETRY',
    insight_depth_score: 6,
    consulting_tone_score: 6,
    page_efficiency_score: 6,
    data_credibility_score: 7,
    key_weakness: '需要更锐的 takeaway',
    must_fix_pages: [firstChunk.pages[0].page_no],
    deletable_pages: [],
  }),
})
assert.equal(retryResult.generated, 2)
assert.equal(retryRealRunCount, 2)
const retryChunk = JSON.parse(await fs.readFile(`outputs/${clientSlug}/_chunks/${firstChunk.chunk_id}.json`, 'utf8'))
assert.equal(retryChunk.metadata.consulting_review.verdict, 'RETRY')
assert.equal(retryChunk.metadata.consulting_review.key_weakness, '需要更锐的 takeaway')

await fs.mkdir(`outputs/${clientSlug}/_chunks`, { recursive: true })
await fs.writeFile(`outputs/${clientSlug}/_chunks/${firstChunk.chunk_id}.json`, JSON.stringify({
  agent_id: firstChunk.driving_sub_agent,
  blueprint_chunk_id: firstChunk.chunk_id,
  chunk_takeaway: '已有 chunk 需要在 skipExisting 后处理分支触发 RETRY 重生。',
  chunk_insights: [{ insight: 'skipExisting retry test', source_url: 'https://example.com/skip-retry' }],
  thinking_log: [
    { step: 'plan', content: '规划。' },
    { step: 'synthesize', content: '综合。' },
    { step: 'write', content: '写作。' },
  ],
  slides: firstChunk.pages.map(page => ({
    page_no: page.page_no,
    layout: page.recommended_layout,
    action_title: `${page.page_subtitle} skip retry test`,
    core_points: ['已有内容', '需要重跑'],
    data_refs: [{ value: 'source', source: 'https://example.com/skip-retry', type: 'quote' }],
    models_used: [page.concept_for_this_page || firstChunk.allowed_concepts[0]],
  })),
}, null, 2))
let skipRetryRealRunCount = 0
let skipRetryLayoutRunCount = 0
let skipRetryReviewRunCount = 0
const skipRetryResult = await runBlueprintSuite(clientSlug, 'brand_positioning_case', {
  onlyChunk: firstChunk.chunk_id,
  skipExisting: true,
  realLLM: true,
  withLayoutDesigner: true,
  withConsultingReview: true,
  realLLMRunner: async (agentId, slug, options) => {
    skipRetryRealRunCount += 1
    assert.equal(agentId, firstChunk.driving_sub_agent)
    assert.equal(slug, clientSlug)
    assert.equal(options.retryHint.verdict, 'RETRY')
    return {
      rawPath: `outputs/${clientSlug}/_chunks/${firstChunk.chunk_id}.json`,
      output: {
        agent_id: agentId,
        blueprint_chunk_id: firstChunk.chunk_id,
        chunk_takeaway: 'skipExisting RETRY 后重新生成的真实输出',
        chunk_insights: [{ insight: 'retry regenerated', source_url: 'https://example.com/skip-regenerated' }],
        thinking_log: [
          { step: 'plan', content: '规划。' },
          { step: 'synthesize', content: '综合。' },
          { step: 'write', content: '写作。' },
        ],
        slides: firstChunk.pages.map(page => ({
          page_no: page.page_no,
          layout: page.recommended_layout,
          action_title: `${page.page_subtitle} regenerated`,
          core_points: ['重跑内容', '保留审计'],
          data_refs: [{ value: 'source', source: 'https://example.com/skip-regenerated', type: 'quote' }],
          models_used: [page.concept_for_this_page || firstChunk.allowed_concepts[0]],
        })),
      },
    }
  },
  layoutDesignerRunner: async ({ chunkOutput }) => {
    skipRetryLayoutRunCount += 1
    return {
      thinking_log: [
        { step: 'read_content', content: '阅读已有或重跑内容。' },
        { step: 'classify_slide_intent', content: '识别页面用途。' },
        { step: 'choose_layouts', content: '选择 smart layout。' },
      ],
      layout_decisions: chunkOutput.slides.map(slide => ({
        page_no: slide.page_no,
        original_layout: slide.layout,
        smart_layout: 'split-statement',
        smart_layout_reason: '测试时基于标题与核心点选择 split-statement。',
        layout_variant_hints: {
          title_position: 'top-left',
          accent_data: 'test',
          secondary_data_format: 'small',
          diagram_type: 'split-statement',
        },
      })),
    }
  },
  consultingReviewRunner: async () => {
    skipRetryReviewRunCount += 1
    return {
      chunk_id: firstChunk.chunk_id,
      verdict: 'RETRY',
      insight_depth_score: 6,
      consulting_tone_score: 6,
      page_efficiency_score: 6,
      data_credibility_score: 7,
      key_weakness: 'skipExisting 分支需要重生',
      must_fix_pages: [firstChunk.pages[0].page_no],
      deletable_pages: [],
    }
  },
})
assert.equal(skipRetryResult.generated, 1)
assert.equal(skipRetryResult.reviewed, 1, 'RETRY 重生后本轮不做二次 review')
assert.equal(skipRetryRealRunCount, 1)
assert.equal(skipRetryLayoutRunCount, 2, '原 postprocess 和 retry 后各跑一次 layout')
assert.equal(skipRetryReviewRunCount, 1)
assert.ok(skipRetryResult.results.some(item => item.status === 'real_llm_retry_generated'))
assert.ok(skipRetryResult.results.some(item => item.status === 'layout_redesigned_after_retry'))
const skipRetryChunk = JSON.parse(await fs.readFile(`outputs/${clientSlug}/_chunks/${firstChunk.chunk_id}.json`, 'utf8'))
assert.equal(skipRetryChunk.metadata.consulting_review.verdict, 'RETRY')
assert.equal(skipRetryChunk.metadata.consulting_review.key_weakness, 'skipExisting 分支需要重生')

let autoRunIds = []
const secondChunk = chunks[1]
const autoRunResult = await runBlueprintSuite(clientSlug, 'brand_positioning_case', {
  onlyChunk: secondChunk.chunk_id,
  skipExisting: false,
  realLLM: true,
  realLLMRunner: async (agentId, slug, options) => {
    autoRunIds.push(options.runId)
    return {
      rawPath: `outputs/${clientSlug}/_chunks/${secondChunk.chunk_id}.json`,
      output: {
        agent_id: agentId,
        blueprint_chunk_id: secondChunk.chunk_id,
        chunk_takeaway: '自动 run_id 必须在 suite 内稳定。',
        chunk_insights: [{ insight: 'auto run id', source_url: 'https://example.com/auto-run' }],
        thinking_log: [
          { step: 'plan', content: '规划。' },
          { step: 'synthesize', content: '综合。' },
          { step: 'write', content: '写作。' },
        ],
        slides: secondChunk.pages.map(page => ({
          page_no: page.page_no,
          layout: page.recommended_layout,
          action_title: `${page.page_subtitle} auto run`,
          core_points: ['自动水印', '稳定 run_id'],
          data_refs: [{ value: 'source', source: 'https://example.com/auto-run', type: 'quote' }],
          models_used: [page.concept_for_this_page || secondChunk.allowed_concepts[0]],
        })),
      },
    }
  },
})
assert.equal(autoRunResult.generated, 1)
assert.equal(autoRunIds.length, 1)
assert.match(autoRunResult.runId, /^suite-/)
const autoRunChunk = JSON.parse(await fs.readFile(`outputs/${clientSlug}/_chunks/${secondChunk.chunk_id}.json`, 'utf8'))
assert.equal(autoRunChunk.metadata.run_id, autoRunResult.runId)

const blockChunk = chunks[2]
const blockResult = await runBlueprintSuite(clientSlug, 'brand_positioning_case', {
  onlyChunk: blockChunk.chunk_id,
  skipExisting: false,
  realLLM: true,
  withConsultingReview: true,
  runId: 'test-block-run',
  realLLMRunner: async (agentId) => ({
    rawPath: `outputs/${clientSlug}/_chunks/${blockChunk.chunk_id}.json`,
    output: {
      agent_id: agentId,
      blueprint_chunk_id: blockChunk.chunk_id,
      chunk_takeaway: '这段输出会被 BLOCK, 但 verdict 必须写回 chunk。',
      chunk_insights: [{ insight: 'block test', source_url: 'https://example.com/block' }],
      thinking_log: [
        { step: 'plan', content: '规划。' },
        { step: 'synthesize', content: '综合。' },
        { step: 'write', content: '写作。' },
      ],
      slides: blockChunk.pages.map(page => ({
        page_no: page.page_no,
        layout: page.recommended_layout,
        action_title: `${page.page_subtitle} blocked`,
        core_points: ['证据错配', '必须阻断'],
        data_refs: [{ value: 'source', source: 'https://example.com/block', type: 'quote' }],
        models_used: [page.concept_for_this_page || blockChunk.allowed_concepts[0]],
      })),
    },
  }),
  consultingReviewRunner: async () => ({
    chunk_id: blockChunk.chunk_id,
    verdict: 'BLOCK',
    insight_depth_score: 3,
    consulting_tone_score: 3,
    page_efficiency_score: 3,
    data_credibility_score: 2,
    key_weakness: '证据链错配, 必须阻断。',
    must_fix_pages: [blockChunk.pages[0].page_no],
    deletable_pages: [],
  }),
})
assert.equal(blockResult.failed, 1)
const blockedChunk = JSON.parse(await fs.readFile(`outputs/${clientSlug}/_chunks/${blockChunk.chunk_id}.json`, 'utf8'))
assert.equal(blockedChunk.metadata.run_id, 'test-block-run')
assert.equal(blockedChunk.metadata.consulting_review.verdict, 'BLOCK')
assert.equal(blockedChunk.metadata.consulting_review.key_weakness, '证据链错配, 必须阻断。')

await fs.rm(`inputs/${clientSlug}`, { recursive: true, force: true })
await fs.rm(`outputs/${clientSlug}`, { recursive: true, force: true })

console.log('✅ blueprint-suite test passed')
