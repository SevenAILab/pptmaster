import assert from 'node:assert/strict'
import { runAnnualDeepResearch } from './sub-agents/annual-planning-deepresearch.mjs'
import { runBuildingDeepResearch } from './sub-agents/brand-building-deepresearch.mjs'
import { runCompetitorDeepResearch } from './sub-agents/competitor-analysis-deepresearch.mjs'
import { runConsumerDeepResearch } from './sub-agents/consumer-insight-deepresearch.mjs'
import { normalizeQuestions as normalizeIndustryQuestions, normalizeSlides as normalizeIndustrySlides, readLocalIndustryEvidence } from './sub-agents/industry-analysis-deepresearch.mjs'
import { runPositioningDeepResearch } from './sub-agents/brand-positioning-deepresearch.mjs'
import fs from 'node:fs/promises'

const form = {
  name: 'SmallRig 斯莫格',
  industry: '摄影摄像配件',
  core_products: ['相机笼组', '三脚架'],
  competitors: ['Ulanzi', 'Tilta'],
  target_audience: ['视频创作者'],
}

const pptAgentForm = {
  name: 'PPTAgent',
  industry: 'AI Agent / 品牌策划工具 / AI 生成 PPT',
  core_products: ['客户资料 + 表单输入', '6 个品牌策略 Sub-Agent', '咨询级品牌全案 HTML 横向翻页 PPT'],
  competitors: ['Gamma', 'WPS AIslides', 'AiPPT', 'ChatPPT', 'Beautiful.ai'],
  target_audience: ['甲方品牌方', '市场部人员', '独立品牌策划顾问', '品牌咨询团队'],
}

const upstreamChunksSummary = JSON.stringify([
  {
    chunk_id: 'p2-c1-market-scan',
    chunk_takeaway: '行业机会来自创作者工作流升级。',
    chunk_insights: [
      { insight: '无反相机与视频创作需求提升配件复杂度。', source_url: 'https://example.com/market' },
      { insight: '创作者需要可组合的工具平台。', source_url: 'https://example.com/creator' },
    ],
  },
])

await fs.rm('inputs/phase-a-local-evidence-test', { recursive: true, force: true })
await fs.mkdir('inputs/phase-a-local-evidence-test/first-party', { recursive: true })
await fs.writeFile('inputs/phase-a-local-evidence-test/first-party/customer.md', '客户自有行业数据: 已服务 128 家付费团队。')
const localIndustryEvidence = await readLocalIndustryEvidence('phase-a-local-evidence-test')
assert.equal(localIndustryEvidence.length, 1)
assert.equal(localIndustryEvidence[0].file, 'inputs/phase-a-local-evidence-test/first-party/customer.md')
assert.ok(localIndustryEvidence.every(item => !item.file.startsWith('assets/_raw/cases/')))
await fs.rm('inputs/phase-a-local-evidence-test', { recursive: true, force: true })

{
  const searched = normalizeIndustryQuestions([], pptAgentForm).join('\n')
  assert.ok(!/SmallRig|Ulanzi|Tilta|camera|摄影摄像配件|创作者经济/i.test(searched), searched)
  assert.ok(/PPTAgent|AI Agent|品牌策划|AI 生成 PPT|Gamma|AiPPT/i.test(searched), searched)
}

{
  const chunk = makeChunk('p2-c1-market-scan', 'industry_analysis', ['MECE', 'Industry-Lifecycle', 'Porter-5-Forces', 'PESTEL'], [14, 15, 16, 17, 18])
  const slides = normalizeIndustrySlides(
    chunk.pages.map(page => ({
      page_no: page.page_no,
      layout: page.recommended_layout,
      action_title: 'PPTAgent 行业机会判断',
      core_points: ['通用 AI PPT 已经拥挤', '品牌策划 Agent 仍需验证'],
      data_refs: [{ value: 'AI presentation evidence', source: 'https://example.com/ai-presentation', type: 'industry_report' }],
      models_used: [page.concept_for_this_page],
    })),
    chunk,
    [{ statement: 'AI presentation evidence', source_url: 'https://example.com/ai-presentation' }],
    [{ insight: '通用 AI PPT 已经拥挤', source_url: 'https://example.com/ai-presentation' }],
    { slug: 'phase-a-test-industry-normalize-pptagent', form: pptAgentForm },
  )
  const normalizedText = JSON.stringify(slides)
  assert.ok(!/SmallRig|Ulanzi|Tilta|Manfrotto|camera|摄影摄像|创作者经济/i.test(normalizedText), normalizedText)
  assert.ok(/Gamma|WPS AIslides|AiPPT|ChatPPT|Beautiful\.ai|主要替代方案/.test(normalizedText), normalizedText)
}

function makeChunk(chunkId, agentId, allowedConcepts, pages) {
  return {
    chunk_id: chunkId,
    driving_sub_agent: agentId,
    chunk_intent: `${agentId} 测试 chunk`,
    chunk_insight_question: `${agentId} 应该回答什么关键问题？`,
    allowed_concepts: allowedConcepts,
    expected_insights_count: 3,
    pages: pages.map((pageNo, index) => ({
      page_no: pageNo,
      page_intent: `${agentId} 第 ${index + 1} 页`,
      page_subtitle: '测试页',
      recommended_layout: index % 2 === 0 ? 'S05' : 'S03',
      concept_for_this_page: allowedConcepts[index % allowedConcepts.length],
      required_fields: ['action_title', 'core_points', 'data_refs'],
    })),
  }
}

function makeCompetitionMapSummaryChunk(pages = [23, 24]) {
  const chunk = makeChunk('p2-c2-competition-status', 'competitor_analysis', ['Competitor-Matrix', 'Perceptual-Map', 'SWOT'], pages)
  return {
    ...chunk,
    pages: chunk.pages.map(page => {
      if (page.page_no === 23) {
        return {
          ...page,
          page_intent: '竞争态势：感知地图或心智坐标，指出可验证的差异化方向',
          concept_for_this_page: 'Perceptual-Map',
        }
      }
      if (page.page_no === 24) {
        return {
          ...page,
          page_intent: '竞争小结：已证明、未证明与下一步验证动作',
          page_subtitle: '小结',
          concept_for_this_page: 'SWOT',
        }
      }
      return page
    }),
  }
}

function makeFakeCallStep() {
  const calls = []
  const writeAttempts = new Map()
  const fakeCallStep = async (args, options) => {
    calls.push(options.purpose)
    if (options.purpose.endsWith('.plan')) {
      return {
        text: JSON.stringify({
          sub_questions: [
            'SmallRig 用户是谁',
            'SmallRig 竞品是谁',
            'SmallRig 差异化在哪里',
            'SmallRig 触点怎么排',
            'SmallRig 年度节奏怎么做',
          ],
          needs_ugc_search: true,
          positioning_questions: ['抢哪个心智词', 'RTB 是什么', '反方是谁'],
          building_questions: ['看点是什么', '燃点是什么', '触点是什么'],
          planning_questions: ['Q1-Q4 如何排布', '预算怎么分', 'KPI 怎么复盘'],
          needs_search: false,
        }),
      }
    }
    if (options.purpose.endsWith('.read')) {
      return {
        text: JSON.stringify({
          facts: [
            {
              statement: '真实外部信号显示创作者对模块化摄影配件有持续需求。',
              source_url: 'https://example.com/research-a',
              type: 'industry_report',
              confidence: 'high',
            },
            {
              statement: '用户评价反复提到安装效率和兼容性。',
              source_url: 'https://example.com/research-b',
              type: 'ugc_signal',
              confidence: 'medium',
            },
            {
              statement: '竞品在入门性价比和高端电影设备两端分化。',
              source_url: 'https://example.com/research-c',
              type: 'official_data',
              confidence: 'medium',
            },
          ],
        }),
      }
    }
    if (options.purpose.endsWith('.synthesize')) {
      return {
        text: JSON.stringify({
          chunk_takeaway: 'SmallRig 应把专业硬件优势翻译成创作者工作流效率，而不是继续讲泛配件齐全。',
          chunk_insights: [
            { insight: '主力人群在意搭建效率。', source_url: 'https://example.com/research-a' },
            { insight: '竞争空位在开放工具生态。', source_url: 'https://example.com/research-b' },
            { insight: '年度动作要围绕场景资产重复出现。', source_url: 'https://example.com/research-c' },
          ],
        }),
      }
    }
    if (options.purpose.includes('.write')) {
      const currentAttempts = (writeAttempts.get(options.purpose) || 0) + 1
      writeAttempts.set(options.purpose, currentAttempts)
      if (options.purpose.endsWith('.json-retry1')) {
        assert.ok(args.user.includes('上一次 write 输出 JSON 解析失败'))
      }
      return {
        text: JSON.stringify({
          slides: [
            {
              page_no: 1,
              layout: 'S05',
              action_title: 'SmallRig 应优先服务高频视频创作者',
              core_points: [
                { point: '人群画像有明确 5W2H' },
                { label: 'JTBD', value: '快速搭建稳定拍摄系统' },
              ],
              data_refs: [{ value: 'Research A', source: 'https://example.com/research-a', type: 'quote' }],
              models_used: ['Persona-5W2H'],
            },
            {
              page_no: 2,
              layout: 'S03',
              action_title: '差异化来自开放工具生态而非单件配件',
              core_points: ['核心痛点是兼容性', '核心收益是节省拍摄准备时间'],
              data_refs: [{ value: 'Research B', source: 'https://example.com/research-b', type: 'quote' }],
              models_used: ['JTBD'],
            },
          ],
        }),
      }
    }
    throw new Error(`Unhandled fake purpose ${options.purpose}`)
  }
  return { fakeCallStep, calls }
}

function makeMalformedThenValidCallStep() {
  const { fakeCallStep, calls } = makeFakeCallStep()
  let malformedReturned = false
  return {
    calls,
    fakeCallStep: async (args, options) => {
      if (options.purpose.includes('.write') && !malformedReturned) {
        malformedReturned = true
        calls.push(options.purpose)
        return { text: '{"slides":[{"page_no":1,"layout":"S05"' }
      }
      return fakeCallStep(args, options)
    },
  }
}

function makeMalformedReadThenValidCallStep() {
  const { fakeCallStep, calls } = makeFakeCallStep()
  let malformedReturned = false
  return {
    calls,
    fakeCallStep: async (args, options) => {
      if (options.purpose.endsWith('.read') && !malformedReturned) {
        malformedReturned = true
        calls.push(options.purpose)
        return { text: '{"facts":[{"statement":"broken"' }
      }
      if (options.purpose.endsWith('.read.json-retry1')) {
        calls.push(options.purpose)
        assert.ok(args.user.includes('上一次 read 输出 JSON 解析失败'))
        return {
          text: JSON.stringify({
            facts: [
              {
                statement: '真实外部信号显示创作者对模块化摄影配件有持续需求。',
                source_url: 'https://example.com/research-a',
                type: 'industry_report',
                confidence: 'high',
              },
              {
                statement: '用户评价反复提到安装效率和兼容性。',
                source_url: 'https://example.com/research-b',
                type: 'ugc_signal',
                confidence: 'medium',
              },
              {
                statement: '竞品在入门性价比和高端电影设备两端分化。',
                source_url: 'https://example.com/research-c',
                type: 'official_data',
                confidence: 'medium',
              },
            ],
          }),
        }
      }
      return fakeCallStep(args, options)
    },
  }
}

function makeFakeSearch() {
  const queries = []
  const fakeSearch = async (query, opts) => {
    queries.push({ query, opts })
    if (/transient 502/i.test(query)) {
      throw new Error('OpenAI-compatible chat completion failed: 502')
    }
    if (opts.engine?.startsWith('social:') && /blocked social/i.test(query)) {
      throw new Error('Reddit HTTP 403: blocked by network security')
    }
    if (/zero result/i.test(query)) {
      return {
        engine: opts.engine || 'tavily',
        query,
        results: [],
      }
    }
    if (opts.engine?.startsWith('social:')) {
      return {
        engine: opts.engine,
        query,
        results: [
          {
            title: `UGC for ${query}`,
            url: `https://www.reddit.com/r/videography/search?q=${encodeURIComponent(query)}`,
            snippet: '真实 Reddit UGC 搜索摘要，包含可追溯 URL 和用户评价信号。',
          },
        ],
      }
    }
    return {
      engine: opts.engine || 'tavily',
      query,
      results: [
        {
          title: `Result for ${query}`,
          url: `https://example.com/${encodeURIComponent(query).slice(0, 30)}`,
          snippet: '真实搜索摘要，包含可追溯 URL 和研究信号。',
        },
      ],
    }
  }
  return { fakeSearch, queries }
}

function makeEssayQuestionCallStep() {
  const { fakeCallStep, calls } = makeFakeCallStep()
  return {
    calls,
    fakeCallStep: async (args, options) => {
      if (options.purpose.endsWith('.plan')) {
        return {
          text: JSON.stringify({
            sub_questions: [
              'SmallRig 应该优先服务哪些视频创作者人群，如何用真实证据判断他们在购买相机笼、快装、补光、三脚架等摄影摄像配件时最看重的工作流痛点、决策触点和价值收益？',
              'zero result oversized essay question about creator workflow report evidence and market validation needs retry',
              'SmallRig 用户旅程与购买决策触点',
              '摄影摄像配件 用户痛点 兼容性 稳定性 快装',
              'SmallRig reviews creators compatibility quick release pain gain',
            ],
            needs_ugc_search: false,
            positioning_questions: ['抢哪个心智词', 'RTB 是什么', '反方是谁'],
            building_questions: ['看点是什么', '燃点是什么', '触点是什么'],
            planning_questions: ['Q1-Q4 如何排布', '预算怎么分', 'KPI 怎么复盘'],
            needs_search: false,
          }),
        }
      }
      return fakeCallStep(args, options)
    },
  }
}

async function runFiveStepCase(label, runner, chunk) {
  const { fakeCallStep, calls } = makeFakeCallStep()
  const { fakeSearch, queries } = makeFakeSearch()
  const output = await runner({
    chunk,
    form,
    clientSummary: 'SmallRig 正在从配件供应商升级为创作工具平台。',
    strategicQuestion: '如何抢占创作者工作流效率心智？',
    upstreamChunksSummary,
    slug: `phase-a-test-${label}`,
    callStep: fakeCallStep,
    searchFn: fakeSearch,
    skipCostGuard: true,
  })

  assert.equal(output.agent_id, chunk.driving_sub_agent)
  assert.equal(output.thinking_log.length, 5)
  assert.ok(calls.some(purpose => purpose.endsWith('.plan')))
  assert.ok(calls.some(purpose => purpose.endsWith('.read')))
  assert.ok(calls.some(purpose => purpose.endsWith('.synthesize')))
  assert.ok(calls.some(purpose => purpose.includes('.write')))
  assert.ok(queries.length >= 5)
  assert.ok(queries.some(item => item.opts.engine === 'social:reddit'))
  assert.ok(queries.some(item => item.opts.engine === 'social:reddit' && /camera|review|reddit/i.test(item.query)))
  assert.ok(queries.every(item => !/小红书|公众号|微信|xiaohongshu|wechat|weixin/i.test(item.query)))
  assert.ok(output.slides.every(slide => slide.data_refs.some(ref => /^https?:\/\//.test(ref.source))))
  assert.ok(output.slides.every(slide => slide.core_points.every(point => !point.includes('[object Object]'))))
}

async function runThreeStepCase(label, runner, chunk) {
  const { fakeCallStep, calls } = makeFakeCallStep()
  const { fakeSearch, queries } = makeFakeSearch()
  const output = await runner({
    chunk,
    form,
    clientSummary: 'SmallRig 正在从配件供应商升级为创作工具平台。',
    strategicQuestion: '如何抢占创作者工作流效率心智？',
    upstreamChunksSummary,
    slug: `phase-a-test-${label}`,
    callStep: fakeCallStep,
    searchFn: fakeSearch,
    skipCostGuard: true,
  })

  assert.equal(output.agent_id, chunk.driving_sub_agent)
  assert.equal(output.thinking_log.length, 3)
  assert.ok(calls.some(purpose => purpose.endsWith('.plan')))
  assert.ok(calls.some(purpose => purpose.endsWith('.synthesize')))
  assert.ok(calls.some(purpose => purpose.includes('.write')))
  assert.equal(queries.length, 0)
  assert.ok(output.chunk_takeaway.includes('SmallRig'))
  assert.ok(output.slides.every(slide => slide.data_refs.some(ref => /^https?:\/\//.test(ref.source))))
}

await runFiveStepCase(
  'consumer',
  runConsumerDeepResearch,
  makeChunk('p2-c3-consumer-portraits', 'consumer_insight', ['Persona-5W2H', 'Consumer-Lifecycle', 'JTBD', 'Pain-Gain-Map'], [1, 2]),
)

{
  const slug = 'phase3-test-methodology-runner-injection'
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
      industry_questions: ['AI PPT 行业怎么赚钱', '品牌策划预算怎么流'],
      competitor_targets: ['Gamma', 'WPS AIslides'],
      consumer_segments: ['甲方品牌负责人', '独立品牌顾问'],
      positioning_hypotheses_to_test: ['咨询级品牌方案 Agent 是否成立'],
    },
  }, null, 2))
  const { fakeCallStep } = makeFakeCallStep()
  const { fakeSearch } = makeFakeSearch()
  let planSystem = ''
  let planUser = ''
  let writeSystem = ''
  let writeUser = ''
  try {
    await runConsumerDeepResearch({
      chunk: makeChunk('p2-c3-consumer-portraits', 'consumer_insight', ['Persona-5W2H', 'Consumer-Lifecycle', 'JTBD', 'Pain-Gain-Map'], [1, 2]),
      form: pptAgentForm,
      clientSummary: 'PPTAgent 正在把品牌策划工作流产品化。',
      strategicQuestion: '如何避开通用 AI PPT 战场并验证品牌策划 Agent 空位？',
      upstreamChunksSummary,
      slug,
      callStep: async (args, options) => {
        if (options.purpose.endsWith('.plan')) {
          planSystem = args.system
          planUser = args.user
        }
        if (options.purpose.includes('.write')) {
          writeSystem = args.system
          writeUser = args.user
        }
        return fakeCallStep(args, options)
      },
      searchFn: fakeSearch,
      skipCostGuard: true,
    })
  } finally {
    await fs.rm(`outputs/${slug}`, { recursive: true, force: true })
  }
  assert.match(planSystem, /调研方法论框架/)
  assert.match(writeSystem, /调研方法论框架/)
  assert.match(planUser, /品类研究蓝图/)
  assert.match(planUser, /AI 品牌策划方案 Agent/)
  assert.match(planUser, /甲方品牌负责人/)
  assert.match(writeUser, /品类研究蓝图/)
}

{
  const { fakeCallStep } = makeEssayQuestionCallStep()
  const { fakeSearch, queries } = makeFakeSearch()
  const chunk = makeChunk('p2-c3-consumer-portraits', 'consumer_insight', ['Persona-5W2H', 'Consumer-Lifecycle', 'JTBD', 'Pain-Gain-Map'], [1, 2])
  await runConsumerDeepResearch({
    chunk,
    form,
    clientSummary: 'SmallRig 正在从配件供应商升级为创作工具平台。',
    strategicQuestion: '如何抢占创作者工作流效率心智？',
    upstreamChunksSummary,
    slug: 'phase-a-test-consumer-query-expansion',
    callStep: fakeCallStep,
    searchFn: fakeSearch,
    skipCostGuard: true,
  })
  assert.ok(queries.some(item => item.opts.engine === 'auto'), 'DeepResearch should let pickEngine route semantic queries')
  assert.ok(queries.some(item => item.opts.engine === 'exa'), 'Long report/evidence variants should explicitly use Exa')
  assert.ok(queries.every(item => item.opts.engine !== 'serper' || item.query.length < 40), 'Long questions must not be forced to Serper')
  assert.ok(queries.some(item => /retry/i.test(item.query) && !/zero result/i.test(item.query)), '0-result searches should retry with a shortened variant')
}

{
  const { fakeCallStep } = makeEssayQuestionCallStep()
  const { fakeSearch, queries } = makeFakeSearch()
  const chunk = makeChunk('p2-c2-competition-status', 'competitor_analysis', ['Competitor-Matrix', 'Perceptual-Map', 'Porter-5-Forces', 'SWOT'], [1, 2])
  await runCompetitorDeepResearch({
    chunk,
    form,
    clientSummary: 'SmallRig 正在从配件供应商升级为创作工具平台。',
    strategicQuestion: '如何抢占创作者工作流效率心智？',
    upstreamChunksSummary,
    slug: 'phase-a-test-competitor-transient-search',
    callStep: async (args, options) => {
      if (options.purpose.endsWith('.plan')) {
        return {
          text: JSON.stringify({
            sub_questions: [
              'transient 502 competitor matrix evidence',
              'blocked social creator reviews',
              'SmallRig Ulanzi Tilta competitor matrix camera rig accessories',
              'Manfrotto Ulanzi Tilta PolarPro public positioning',
              'camera rig accessories market competitor report',
              'SmallRig competitors pricing positioning',
            ],
            needs_ugc_search: true,
          }),
        }
      }
      return fakeCallStep(args, options)
    },
    searchFn: fakeSearch,
    skipCostGuard: true,
    webSearchRequirement: 'required',
  })
  assert.ok(queries.some(item => item.query.includes('transient 502')), 'transient failure query should be attempted')
  assert.ok(queries.length > 6, 'transient and blocked social failures should not abort the full required chunk search loop')
}

{
  const { fakeCallStep, calls } = makeMalformedThenValidCallStep()
  const { fakeSearch } = makeFakeSearch()
  const chunk = makeChunk('p2-c3-consumer-portraits', 'consumer_insight', ['Persona-5W2H', 'Consumer-Lifecycle', 'JTBD', 'Pain-Gain-Map'], [1, 2])
  const output = await runConsumerDeepResearch({
    chunk,
    form,
    clientSummary: 'SmallRig 正在从配件供应商升级为创作工具平台。',
    strategicQuestion: '如何抢占创作者工作流效率心智？',
    upstreamChunksSummary,
    slug: 'phase-a-test-consumer-json-retry',
    callStep: fakeCallStep,
    searchFn: fakeSearch,
    skipCostGuard: true,
  })
  assert.equal(output.slides.length, 2)
  assert.ok(calls.some(purpose => purpose.endsWith('.write.json-retry1')))
}

{
  const { fakeCallStep, calls } = makeMalformedReadThenValidCallStep()
  const { fakeSearch } = makeFakeSearch()
  const chunk = makeChunk('p2-c2-competition-status', 'competitor_analysis', ['Competitor-Matrix', 'Perceptual-Map', 'Porter-5-Forces', 'SWOT'], [1, 2])
  const output = await runCompetitorDeepResearch({
    chunk,
    form,
    clientSummary: 'SmallRig 正在从配件供应商升级为创作工具平台。',
    strategicQuestion: '如何抢占创作者工作流效率心智？',
    upstreamChunksSummary,
    slug: 'phase-a-test-competitor-read-json-retry',
    callStep: fakeCallStep,
    searchFn: fakeSearch,
    skipCostGuard: true,
    webSearchRequirement: 'required',
  })
  assert.equal(output.slides.length, 2)
  assert.ok(calls.some(purpose => purpose.endsWith('.read.json-retry1')))
}

{
  const slug = 'phase-a-test-competitor-upstream-source-pool'
  const chunkDir = `outputs/${slug}/_chunks`
  await fs.rm(`outputs/${slug}`, { recursive: true, force: true })
  await fs.mkdir(chunkDir, { recursive: true })
  await fs.writeFile(`${chunkDir}/p2-c1-market-scan.json`, JSON.stringify({
    blueprint_chunk_id: 'p2-c1-market-scan',
    chunk_takeaway: '专业场景结果成为 PPTAgent 的上游机会判断。',
    chunk_insights: [],
    slides: [
      {
        page_no: 16,
        data_refs: [
          {
            value: '66%的中国企业偏好按业务成果计费',
            source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525',
            source_tier: 'T2',
            source_label: '权威二手研究来源',
            type: 'procurement_signal',
          },
          {
            value: 'Gamma AI Presentation Maker',
            source: 'https://gamma.app/products/presentations',
            source_tier: 'T3',
            source_label: '未分级公开网页来源',
            type: 'product_matrix',
          },
        ],
      },
    ],
  }, null, 2))

  let writePrompt = ''
  try {
    const { fakeCallStep } = makeFakeCallStep()
    const { fakeSearch } = makeFakeSearch()
    const chunk = makeChunk('p2-c2-competition-status', 'competitor_analysis', ['Competitor-Matrix', 'Perceptual-Map', 'Porter-5-Forces', 'SWOT'], [1, 2])
    await runCompetitorDeepResearch({
      chunk,
      form: pptAgentForm,
      clientSummary: 'PPTAgent 正在把品牌策划工作流产品化。',
      strategicQuestion: '如何避开通用 AI PPT 战场并验证品牌策划 Agent 空位？',
      upstreamChunksSummary,
      slug,
      callStep: async (args, options) => {
        if (options.purpose.includes('.write')) writePrompt = args.user
        return fakeCallStep(args, options)
      },
      searchFn: fakeSearch,
      skipCostGuard: true,
      webSearchRequirement: 'required',
    })
  } finally {
    await fs.rm(`outputs/${slug}`, { recursive: true, force: true })
  }

  assert.match(writePrompt, /"source_pool":\s*\[\s*\{/)
  assert.match(writePrompt, /66%的中国企业偏好按业务成果计费/)
  assert.match(writePrompt, /"source_chunk_id":\s*"p2-c1-market-scan"/)
}

{
  const slug = 'phase-a-test-competitor-write-payload-repo-filter'
  const chunkDir = `outputs/${slug}/_chunks`
  await fs.rm(`outputs/${slug}`, { recursive: true, force: true })
  await fs.mkdir(chunkDir, { recursive: true })
  await fs.writeFile(`${chunkDir}/p2-c1-market-scan.json`, JSON.stringify({
    blueprint_chunk_id: 'p2-c1-market-scan',
    chunk_takeaway: '专业场景结果成为 PPTAgent 的上游机会判断。',
    chunk_insights: [],
    slides: [
      {
        page_no: 16,
        data_refs: [
          {
            value: 'PPTAgent has 4084 stars and 494 forks',
            source: 'https://github.com/icip-cas/PPTAgent',
            source_tier: 'T3',
            source_label: '开源仓库',
            type: 'user_reputation',
          },
          {
            value: '66%的中国企业偏好按业务成果计费',
            source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525',
            source_tier: 'T2',
            source_label: '权威二手研究来源',
            type: 'industry_report',
          },
        ],
      },
    ],
  }, null, 2))
  let writePrompt = ''
  try {
    const { fakeCallStep } = makeFakeCallStep()
    const { fakeSearch } = makeFakeSearch()
    const chunk = makeCompetitionMapSummaryChunk([23, 24])
    await runCompetitorDeepResearch({
      chunk,
      form: pptAgentForm,
      clientSummary: 'PPTAgent 正在把品牌策划工作流产品化。',
      strategicQuestion: '如何避开通用 AI PPT 战场并验证品牌策划 Agent 空位？',
      upstreamChunksSummary,
      slug,
      callStep: async (args, options) => {
        if (options.purpose.includes('.write')) writePrompt = args.user
        return fakeCallStep(args, options)
      },
      searchFn: fakeSearch,
      skipCostGuard: true,
      webSearchRequirement: 'required',
    })
  } finally {
    await fs.rm(`outputs/${slug}`, { recursive: true, force: true })
  }

  assert.match(writePrompt, /66%的中国企业偏好按业务成果计费/)
  assert.doesNotMatch(writePrompt, /4084 stars|494 forks|github\.com\/icip-cas\/PPTAgent/i)
}

{
  let writePrompt = ''
  const { fakeCallStep } = makeFakeCallStep()
  const { fakeSearch } = makeFakeSearch()
  const chunk = {
    ...makeChunk('p2-c2-competition-status', 'competitor_analysis', ['Competitor-Matrix', 'Perceptual-Map', 'Porter-5-Forces', 'SWOT'], [19, 20, 21, 22, 23, 24]),
    pages: [
      { page_no: 19, page_intent: '竞争态势：整体格局和玩家流派分层', page_subtitle: '「竞争态势」', recommended_layout: 'S13', concept_for_this_page: 'Porter-5-Forces', required_fields: ['action_title', 'core_points', 'data_refs'] },
      { page_no: 20, page_intent: '竞争态势：头部品牌流派与主张', page_subtitle: '「竞争态势」', recommended_layout: 'S05', concept_for_this_page: 'Competitor-Matrix', required_fields: ['action_title', 'core_points', 'data_refs'] },
      { page_no: 21, page_intent: '竞争态势：挑战者或新锐品牌流派与主张', page_subtitle: '「竞争态势」', recommended_layout: 'S05', concept_for_this_page: 'Competitor-Matrix', required_fields: ['action_title', 'core_points', 'data_refs'] },
      { page_no: 22, page_intent: '竞争态势：按关键价值维度形成竞品对比矩阵', page_subtitle: '「竞争态势」', recommended_layout: 'S17', concept_for_this_page: 'Competitor-Matrix', required_fields: ['action_title', 'core_points', 'data_refs'] },
      { page_no: 23, page_intent: '竞争态势：感知地图或心智坐标，指出可抢占空位', page_subtitle: '「竞争态势」', recommended_layout: 'S17', concept_for_this_page: 'Perceptual-Map', required_fields: ['action_title', 'core_points'] },
      { page_no: 24, page_intent: '竞争小结：客户应从哪个竞争方向切入', page_subtitle: '小结', recommended_layout: 'S12', concept_for_this_page: null, required_fields: ['action_title'] },
    ],
  }
  await runCompetitorDeepResearch({
    chunk,
    form: pptAgentForm,
    clientSummary: 'PPTAgent 正在把品牌策划工作流产品化。',
    strategicQuestion: '如何避开通用 AI PPT 战场并验证品牌策划 Agent 空位？',
    upstreamChunksSummary,
    slug: 'phase-a-test-competitor-dynamic-page-instructions',
    callStep: async (args, options) => {
      if (options.purpose.includes('.write')) writePrompt = args.user
      return fakeCallStep(args, options)
    },
    searchFn: fakeSearch,
    skipCostGuard: true,
    webSearchRequirement: 'required',
  })

  assert.match(writePrompt, /Page 19-21 只能输出竞争流派和玩家事实/)
  assert.match(writePrompt, /Page 22 只能输出 Competitor-Matrix/)
  assert.match(writePrompt, /Page 23 才输出 Perceptual-Map/)
  assert.match(writePrompt, /Page 24 输出 SWOT\/竞争小结/)
  assert.doesNotMatch(writePrompt, /必须明确 PPTAgent 应避开的战场和可抢占空位/)
  assert.match(writePrompt, /必须明确 PPTAgent 应避开的同质化战场和可验证的差异化方向/)
  assert.match(writePrompt, /证据不足时只能写“待验证假设”或“进入验证清单”/)
}

{
  const slug = 'phase-a-test-competitor-evidence-retry'
  const chunkDir = `outputs/${slug}/_chunks`
  await fs.rm(`outputs/${slug}`, { recursive: true, force: true })
  await fs.mkdir(chunkDir, { recursive: true })
  await fs.writeFile(`${chunkDir}/p2-c1-market-scan.json`, JSON.stringify({
    blueprint_chunk_id: 'p2-c1-market-scan',
    chunk_takeaway: '专业场景结果成为 PPTAgent 的上游机会判断。',
    chunk_insights: [],
    slides: [
      {
        page_no: 16,
        data_refs: [
          {
            value: '66%的中国企业偏好按业务成果计费',
            source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525',
            source_tier: 'T2',
            source_label: '权威二手研究来源',
            type: 'procurement_signal',
          },
        ],
      },
    ],
  }, null, 2))
  const { fakeCallStep } = makeFakeCallStep()
  const { fakeSearch } = makeFakeSearch()
  const calls = []
  let evidenceRetryPrompt = ''
  let firstWrite = true
  const chunk = makeChunk('p2-c2-competition-status', 'competitor_analysis', ['Competitor-Matrix', 'Perceptual-Map', 'Porter-5-Forces', 'SWOT'], [1, 2])
  let output
  try {
    output = await runCompetitorDeepResearch({
      chunk,
      form: pptAgentForm,
      clientSummary: 'PPTAgent 正在把品牌策划工作流产品化。',
      strategicQuestion: '如何避开通用 AI PPT 战场并验证品牌策划 Agent 空位？',
      upstreamChunksSummary,
      slug,
      callStep: async (args, options) => {
        calls.push(options.purpose)
        if (options.purpose.includes('.write')) {
          if (firstWrite) {
            firstWrite = false
            return {
              text: JSON.stringify({
                slides: [
                  {
                    page_no: 1,
                    layout: 'S05',
                    action_title: 'PPTAgent 应抢占品牌策划方案 AI Agent 心智空位',
                    core_points: ['Gamma 占通用生成', 'WPS 占办公兼容', 'PPTAgent 抢专业 Agent'],
                    data_refs: [
                      { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
                      { value: '100% Office-compatible', source: 'https://ai.wps.com/en-GB/', type: 'product_matrix' },
                    ],
                    models_used: ['Competitor-Matrix'],
                  },
                  {
                    page_no: 2,
                    layout: 'S03',
                    action_title: 'PPTAgent 的空位仍需验证',
                    core_points: ['竞品覆盖通用生成', '需求证据需要继续补强'],
                    data_refs: [{ value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' }],
                    models_used: ['Perceptual-Map'],
                  },
                ],
              }),
            }
          }
          assert.ok(args.user.includes('上一次 write 输出违反硬护栏'))
          evidenceRetryPrompt = args.user
          return {
            text: JSON.stringify({
              slides: [
                {
                  page_no: 1,
                  layout: 'S05',
                  action_title: '竞品矩阵：Gamma 与 WPS 在生成、兼容、价格维度存在差异',
                  core_points: ['Gamma 偏通用演示生成', 'WPS 偏 Office 兼容', '矩阵页只呈现竞品事实'],
                  data_refs: [
                    { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
                    { value: '100% Office-compatible', source: 'https://ai.wps.com/en-GB/', type: 'product_matrix' },
                  ],
                  models_used: ['Competitor-Matrix'],
                },
                {
                  page_no: 2,
                  layout: 'S03',
                  action_title: 'PPTAgent 不宜直接宣称已占心智，应先验证专业 Agent 假设',
                  core_points: ['竞品覆盖通用生成', '需求证据指向业务成果', '仍需客户访谈验证'],
                  data_refs: [
                    { value: '100% Office-compatible', source: 'https://ai.wps.com/en-GB/', type: 'product_matrix' },
                    { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
                  ],
                  models_used: ['Perceptual-Map'],
                },
              ],
            }),
          }
        }
        return fakeCallStep(args, options)
      },
      searchFn: fakeSearch,
      skipCostGuard: true,
      webSearchRequirement: 'required',
    })
  } finally {
    await fs.rm(`outputs/${slug}`, { recursive: true, force: true })
  }

  // Phase 6: Competitor-Matrix 页如果漂移成心智空位页，不能靠补证通过，必须触发 hard-guard 重写。
  assert.ok(evidenceRetryPrompt.includes('page 22 must stay a competitor matrix') || evidenceRetryPrompt.includes('上一次 write 输出违反硬护栏'))
  assert.ok(
    calls.some(purpose => purpose.endsWith('.write.evidence-retry1')),
    'Competitor-Matrix 结构漂移必须触发 evidence retry 重写',
  )
  const isCompetitorOwned = src => /gamma\.app|wps\.com|canva\.com|aippt|chatppt|beautiful\.ai/i.test(String(src))
  for (const slide of output.slides) {
    const text = [slide.action_title, ...slide.core_points].join(' ')
    if (!/咨询级|品牌策划|策略工作流|专业工作流|空位|心智|占位|抢占|定位为/.test(text)) continue
    const hasIndependentEvidence = slide.data_refs.some(ref => {
      const src = String(ref.source || ref.source_url || '')
      return /^https?:\/\//.test(src) && !isCompetitorOwned(src)
    })
    const isHonestHypothesis = slide.evidence_status === 'hypothesis'
      && Boolean(slide.hypothesis_basis) && Boolean(slide.validation_method)
    assert.ok(
      hasIndependentEvidence || isHonestHypothesis,
      `定位页(page ${slide.page_no})应补上非竞品独立证据或诚实降级为假设，实际: ${JSON.stringify({ evidence_status: slide.evidence_status, sources: slide.data_refs.map(r => r.source || r.source_url) })}`,
    )
  }
  assert.equal(output.slides.length, 2)
}

{
  const slug = 'phase-a-test-competitor-repo-popularity-retry'
  const chunkDir = `outputs/${slug}/_chunks`
  await fs.rm(`outputs/${slug}`, { recursive: true, force: true })
  await fs.mkdir(chunkDir, { recursive: true })
  await fs.writeFile(`${chunkDir}/p2-c1-market-scan.json`, JSON.stringify({
    blueprint_chunk_id: 'p2-c1-market-scan',
    chunk_takeaway: '专业场景结果成为 PPTAgent 的上游机会判断。',
    chunk_insights: [],
    slides: [
      {
        page_no: 16,
        data_refs: [
          {
            value: '66%的中国企业偏好按业务成果计费',
            source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525',
            source_tier: 'T2',
            source_label: '权威二手研究来源',
            type: 'procurement_signal',
          },
        ],
      },
    ],
  }, null, 2))
  const { fakeCallStep } = makeFakeCallStep()
  const { fakeSearch } = makeFakeSearch()
  let evidenceRetryPrompt = ''
  let firstWrite = true
  const chunk = makeCompetitionMapSummaryChunk([23, 24])
  try {
    await runCompetitorDeepResearch({
      chunk,
      form: pptAgentForm,
      clientSummary: 'PPTAgent 正在把品牌策划工作流产品化。',
      strategicQuestion: '如何避开通用 AI PPT 战场并验证品牌策划 Agent 空位？',
      upstreamChunksSummary,
      slug,
      callStep: async (args, options) => {
        if (options.purpose.includes('.write')) {
          if (firstWrite) {
            firstWrite = false
            return {
              text: JSON.stringify({
                slides: [
                  {
                    page_no: 23,
                    layout: 'S05',
                    action_title: '感知地图：反思式质量控制是 PPTAgent 可抢占空位',
                    core_points: ['Gamma 偏通用生成', 'WPS 偏办公兼容', 'GitHub stars 证明专业 Agent 需求'],
                    data_refs: [
                      { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
                      { value: '100% Office-compatible', source: 'https://ai.wps.com/en-GB/', type: 'product_matrix' },
                      { value: '4084 stars and 494 forks', source: 'https://github.com/icip-cas/PPTAgent', type: 'user_reputation' },
                    ],
                    models_used: ['Perceptual-Map'],
                  },
                  {
                    page_no: 24,
                    layout: 'S03',
                    action_title: '竞争小结：专业工作流方向进入验证清单',
                    core_points: ['已证明通用生成拥挤', '未证明付费案例', '下一步做客户访谈'],
                    data_refs: [
                      { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
                      { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
                    ],
                    models_used: ['SWOT'],
                  },
                ],
              }),
            }
          }
          evidenceRetryPrompt = args.user
          return {
            text: JSON.stringify({
              slides: [
                {
                  page_no: 23,
                  layout: 'S05',
                  action_title: '感知地图：专业工作流空位只能作为待验证假设',
                  core_points: ['Gamma 偏通用生成', 'WPS 偏办公兼容', '需求证据只支持验证方向'],
                  data_refs: [
                    { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
                    { value: '100% Office-compatible', source: 'https://ai.wps.com/en-GB/', type: 'product_matrix' },
                    { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
                  ],
                  models_used: ['Perceptual-Map'],
                },
                {
                  page_no: 24,
                  layout: 'S03',
                  action_title: '竞争小结：专业工作流方向进入验证清单',
                  core_points: ['已证明通用生成拥挤', '未证明付费案例', '下一步做客户访谈'],
                  data_refs: [
                    { value: '100% Office-compatible', source: 'https://ai.wps.com/en-GB/', type: 'product_matrix' },
                    { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
                  ],
                  models_used: ['SWOT'],
                },
              ],
            }),
          }
        }
        return fakeCallStep(args, options)
      },
      searchFn: fakeSearch,
      skipCostGuard: true,
      webSearchRequirement: 'required',
    })
  } finally {
    await fs.rm(`outputs/${slug}`, { recursive: true, force: true })
  }

  assert.match(evidenceRetryPrompt, /GitHub\/repo\/stars\/forks 不能作为 page 23 的需求、心智占位或可抢空位 data_refs/)
  assert.match(evidenceRetryPrompt, /如果只剩 GitHub\/repo 热度，必须移除或软化定位跃迁，只能写成验证问题/)
  assert.match(evidenceRetryPrompt, /每个被点名竞品都必须有同页来源/)
  assert.match(evidenceRetryPrompt, /没有来源就删掉该竞品名/)
  assert.match(evidenceRetryPrompt, /待验证.*不得同时写行动定论/)
  assert.match(evidenceRetryPrompt, /删掉“应以|应该|切入|抢占|占据|定位为|成为|主打|发力”/)
  assert.match(evidenceRetryPrompt, /标题和 core_points 都不得出现行动定论/)
  assert.match(evidenceRetryPrompt, /把“.*应以.*切入.*”改成“进入验证清单”或“下一步验证”/)
  assert.match(evidenceRetryPrompt, /Page 24.*没有独立需求证据.*必须写成待验证假设或进入验证清单/)
  assert.match(evidenceRetryPrompt, /上一次违规页面片段/)
}

{
  const { fakeCallStep } = makeFakeCallStep()
  const { fakeSearch } = makeFakeSearch()
  const calls = []
  let evidenceRetryPrompt = ''
  let firstWrite = true
  const chunk = makeChunk('p2-c2-competition-status', 'competitor_analysis', ['Competitor-Matrix', 'Perceptual-Map', 'SWOT'], [22, 23])
  const output = await runCompetitorDeepResearch({
    chunk,
    form: pptAgentForm,
    clientSummary: 'PPTAgent 正在把品牌策划工作流产品化。',
    strategicQuestion: '如何避开通用 AI PPT 战场并验证品牌策划 Agent 空位？',
    upstreamChunksSummary,
    slug: 'phase-a-test-competitor-named-ref-retry',
    callStep: async (args, options) => {
      calls.push(options.purpose)
      if (options.purpose.includes('.write')) {
        if (firstWrite) {
          firstWrite = false
          return {
            text: JSON.stringify({
              slides: [
                {
                  page_no: 22,
                  layout: 'S05',
                  action_title: '竞品矩阵：Gamma、WPS、Canva 的能力差异',
                  core_points: ['Gamma 覆盖通用生成', 'WPS 强调办公兼容', 'Canva 强在视觉生态'],
                  data_refs: [
                    { value: '100% Office-compatible', source: 'https://ai.wps.com/en-GB/', type: 'product_matrix' },
                    { value: 'Create presentations with AI', source: 'https://www.canva.com/create/ai-presentations/', type: 'product_matrix' },
                  ],
                  models_used: ['Competitor-Matrix'],
                },
                {
                  page_no: 23,
                  layout: 'S03',
                  action_title: '感知地图：专业工作流空位只能作为待验证假设',
                  core_points: ['Gamma 偏通用生成', 'WPS 偏办公兼容', '需求证据只支持验证方向'],
                  data_refs: [
                    { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
                    { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
                  ],
                  models_used: ['Perceptual-Map'],
                },
              ],
            }),
          }
        }
        evidenceRetryPrompt = args.user
        return {
          text: JSON.stringify({
            slides: [
              {
                page_no: 22,
                layout: 'S05',
                action_title: '竞品矩阵：WPS、Canva 的能力差异',
                core_points: ['WPS 强调办公兼容', 'Canva 强在视觉生态', '缺来源竞品不点名'],
                data_refs: [
                  { value: '100% Office-compatible', source: 'https://ai.wps.com/en-GB/', type: 'product_matrix' },
                  { value: 'Create presentations with AI', source: 'https://www.canva.com/create/ai-presentations/', type: 'product_matrix' },
                ],
                models_used: ['Competitor-Matrix'],
              },
              {
                page_no: 23,
                layout: 'S03',
                action_title: '感知地图：专业工作流空位只能作为待验证假设',
                core_points: ['Gamma 偏通用生成', 'WPS 偏办公兼容', '需求证据只支持验证方向'],
                data_refs: [
                  { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
                  { value: '100% Office-compatible', source: 'https://ai.wps.com/en-GB/', type: 'product_matrix' },
                  { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
                ],
                models_used: ['Perceptual-Map'],
              },
            ],
          }),
        }
      }
      return fakeCallStep(args, options)
    },
    searchFn: fakeSearch,
    skipCostGuard: true,
    webSearchRequirement: 'required',
  })

  // Phase 2e: 首轮 write 点名了无同页来源的竞品（page 22 的 Gamma）时，downgrade Pass
  // 直接删掉无出处的竞品名，不再退化到旧的 evidence-retry 机械重试。
  void evidenceRetryPrompt
  assert.ok(
    !calls.some(purpose => purpose.endsWith('.write.evidence-retry1')),
    'Phase 2e 应在首轮 write 删掉无出处竞品名，不应触发 evidence retry',
  )
  const page22Text = [output.slides[0].action_title, ...output.slides[0].core_points].join(' ')
  assert.ok(!/Gamma/.test(page22Text), `page 22 无同页来源的 Gamma 应被删名: ${page22Text}`)
  assert.ok(/WPS|Canva/.test(page22Text), 'page 22 有来源的 WPS/Canva 应保留')
  assert.equal(output.slides.length, 2)
}

{
  const { fakeCallStep } = makeFakeCallStep()
  const { fakeSearch } = makeFakeSearch()
  const calls = []
  let evidenceRetryPrompt = ''
  let firstWrite = true
  const chunk = makeCompetitionMapSummaryChunk([23, 24])
  const output = await runCompetitorDeepResearch({
    chunk,
    form: pptAgentForm,
    clientSummary: 'PPTAgent 正在把品牌策划工作流产品化。',
    strategicQuestion: '如何避开通用 AI PPT 战场并验证品牌策划 Agent 空位？',
    upstreamChunksSummary,
    slug: 'phase-a-test-competitor-hypothesis-action-retry',
    callStep: async (args, options) => {
      calls.push(options.purpose)
      if (options.purpose.includes('.write')) {
        if (firstWrite) {
          firstWrite = false
          return {
            text: JSON.stringify({
              slides: [
                {
                  page_no: 23,
                  layout: 'S05',
                  action_title: '感知地图：专业工作流空位仍待验证，但 PPTAgent 应以此切入',
                  core_points: ['Gamma 偏通用生成', 'WPS 偏办公兼容', '专业 Agent 空位仍需验证'],
                  data_refs: [
                    { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
                    { value: '100% Office-compatible', source: 'https://ai.wps.com/en-GB/', type: 'product_matrix' },
                    { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
                  ],
                  models_used: ['Perceptual-Map'],
                },
                {
                  page_no: 24,
                  layout: 'S03',
                  action_title: '竞争小结：专业工作流方向进入验证清单',
                  core_points: ['已证明通用生成拥挤', '未证明付费案例', '下一步做客户访谈'],
                  data_refs: [
                    { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
                    { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
                  ],
                  models_used: ['SWOT'],
                },
              ],
            }),
          }
        }
        evidenceRetryPrompt = args.user
        return {
          text: JSON.stringify({
            slides: [
              {
                page_no: 23,
                layout: 'S05',
                action_title: '感知地图：专业工作流空位进入验证问题',
                core_points: ['Gamma 偏通用生成', 'WPS 偏办公兼容', '仍需访谈验证付费场景'],
                data_refs: [
                  { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
                  { value: '100% Office-compatible', source: 'https://ai.wps.com/en-GB/', type: 'product_matrix' },
                  { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
                ],
                models_used: ['Perceptual-Map'],
              },
              {
                page_no: 24,
                layout: 'S03',
                action_title: '竞争小结：专业工作流方向进入验证清单',
                core_points: ['已证明通用生成拥挤', '未证明付费案例', '下一步做客户访谈'],
                data_refs: [
                  { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
                  { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
                ],
                models_used: ['SWOT'],
              },
            ],
          }),
        }
      }
      return fakeCallStep(args, options)
    },
    searchFn: fakeSearch,
    skipCostGuard: true,
    webSearchRequirement: 'required',
  })

  void evidenceRetryPrompt
  assert.ok(
    !calls.some(purpose => purpose.endsWith('.write.evidence-retry1')),
    '待验证假设中的行动定论应由 downgrade Pass 首轮剥离，不应触发机械 retry',
  )
  const page23 = output.slides.find(slide => slide.page_no === 23)
  assert.equal(page23.evidence_status, 'hypothesis')
  assert.ok(page23.hypothesis_basis)
  assert.ok(page23.validation_method)
  assert.doesNotMatch([page23.action_title, ...page23.core_points].join(' '), /应以|应该|切入|抢占|占据|定位为|成为|主打|发力/)
}

await runFiveStepCase(
  'competitor',
  runCompetitorDeepResearch,
  makeChunk('p2-c2-competition-status', 'competitor_analysis', ['Competitor-Matrix', 'Perceptual-Map', 'Porter-5-Forces', 'SWOT'], [1, 2]),
)

await runThreeStepCase(
  'positioning',
  runPositioningDeepResearch,
  makeChunk('p3-c1-positioning-statement', 'brand_positioning', ['STP', 'Brand-Positioning-Triangle', 'Aaker-Brand-Personality', 'Slogan-7-Principles'], [1, 2]),
)

{
  const slug = 'phase3-test-no-upstream-summary-urls'
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
      industry_questions: ['AI PPT 行业怎么赚钱', '品牌策划预算怎么流', '企业采购看什么', '专业方案交付如何计费'],
      competitor_targets: ['Gamma', 'WPS AIslides'],
      consumer_segments: ['甲方品牌负责人', '独立品牌顾问'],
      positioning_hypotheses_to_test: ['咨询级品牌方案 Agent 是否成立'],
    },
  }, null, 2))
  const { fakeCallStep } = makeFakeCallStep()
  let synthesizePrompt = ''
  let writePrompt = ''
  try {
    const output = await runPositioningDeepResearch({
      chunk: makeChunk('p1-c1-brief-and-status', 'brand_positioning', ['STP', 'Brand-Positioning-Triangle'], [1, 2]),
      form: pptAgentForm,
      clientSummary: '公开竞品资料: Gamma https://gamma.app/products/presentations ; WPS https://ai.wps.com/zh-CN/',
      strategicQuestion: 'PPTAgent 如何避开通用 AI PPT 工具？',
      upstreamChunksSummary: '',
      slug,
      callStep: async (args, options) => {
        if (options.purpose.endsWith('.synthesize')) synthesizePrompt = args.user
        if (options.purpose.includes('.write')) writePrompt = args.user
        return fakeCallStep(args, options)
      },
      skipCostGuard: true,
    })
    assert.equal(output.slides.length, 2)
  } finally {
    await fs.rm(`outputs/${slug}`, { recursive: true, force: true })
  }
  assert.match(synthesizePrompt, /https:\/\/gamma\.app\/products\/presentations/)
  assert.match(writePrompt, /https:\/\/gamma\.app\/products\/presentations/)
}

await runThreeStepCase(
  'building',
  runBuildingDeepResearch,
  makeChunk('p3-c4-marketing-strategy', 'brand_building', ['Marketing-Funnel', 'AIDA', 'Slogan-7-Principles', '4P-Rhythm'], [1, 2]),
)

await runThreeStepCase(
  'annual',
  runAnnualDeepResearch,
  makeChunk('p3-c5-marketing-execution', 'annual_planning', ['Marketing-Calendar', 'AARRR-Funnel', '4P-Rhythm', 'Marketing-Funnel'], [1, 2]),
)

console.log('✅ Phase A DeepResearch runner contracts passed')
