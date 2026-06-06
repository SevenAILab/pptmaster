import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertCompetitorPositioningEvidence, assertWebSearchEvidence, buildSearchQueryVariants, normalizeSlides } from './sub-agents/deepresearch-common.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function deckWith(dataRefs) {
  return { slides: [{ page_no: 1, action_title: 'T', core_points: ['a', 'b'], data_refs: dataRefs }] }
}

const httpRef = [{ value: 'x', source: 'https://www.idc.com/report/123' }]
const localRef = [{ value: 'x', source: 'assets/_raw/cases/标杆案例/smallrig/page-036.md', source_tier: 'T1' }]

// 1) required + 有 http 来源 → 不抛错
assert.doesNotThrow(() => assertWebSearchEvidence(deckWith(httpRef), { webSearchRequirement: 'required', agentId: 'industry_analysis' }))

// 2) required + 只有本地来源 → 抛错（被要求联网却 0 条 http）
assert.throws(
  () => assertWebSearchEvidence(deckWith(localRef), { webSearchRequirement: 'required', agentId: 'industry_analysis' }),
  /NO-FALLBACK violation: webSearch=required/,
)

// 3) required + 完全没有 data_refs → 抛错
assert.throws(
  () => assertWebSearchEvidence(deckWith([]), { webSearchRequirement: 'required', agentId: 'competitor_analysis' }),
  /produced 0 web/,
)

// 4) optional + 只有本地来源 → 不抛错（optional 允许纯本地一手）
assert.doesNotThrow(() => assertWebSearchEvidence(deckWith(localRef), { webSearchRequirement: 'optional', agentId: 'consumer_insight' }))

// 5) false + 只有本地来源 → 不抛错
assert.doesNotThrow(() => assertWebSearchEvidence(deckWith(localRef), { webSearchRequirement: false, agentId: 'brand_positioning' }))

// 6) source_url / url 字段也算 http 来源
assert.doesNotThrow(() => assertWebSearchEvidence(deckWith([{ value: 'x', source_url: 'http://example.org/a' }]), { webSearchRequirement: 'required', agentId: 'industry_analysis' }))

// 7) 三种来源字段命名都能被识别为 http
for (const key of ['source', 'source_url', 'url']) {
  assert.doesNotThrow(
    () => assertWebSearchEvidence({ slides: [{ data_refs: [{ [key]: 'https://idc.com/x' }] }] }, { webSearchRequirement: 'required', agentId: 'a' }),
    `字段 ${key} 应被识别为 http 来源`,
  )
}

// 8) finalize 接线必须存在：两个 deep-research finalize 点都要调用护栏，run-sub-agent 要透传 SUB_AGENTS 的 webSearch 配置
const deepResearchCommon = fs.readFileSync(path.join(REPO_ROOT, 'scripts/sub-agents/deepresearch-common.mjs'), 'utf8')
assert.equal(
  (deepResearchCommon.match(/assertWebSearchEvidence\(result, \{ webSearchRequirement: args\.webSearchRequirement, agentId: config\.agentId \}\)/g) || []).length,
  2,
  '两个 finalize 点都必须调用 assertWebSearchEvidence',
)
const runSubAgent = fs.readFileSync(path.join(REPO_ROOT, 'scripts/run-sub-agent.mjs'), 'utf8')
assert.ok(runSubAgent.includes('webSearchRequirement: bundleResult.webSearch'), 'runRealLLMSubAgent 必须透传 bundleResult.webSearch')

// 9) common retry variants must not inject SmallRig/camera defaults for non-SmallRig clients.
const pptAgentRetryVariants = buildSearchQueryVariants(
  'PPTAgent 品牌策划 Agent 市场规模 趋势 报告 证据',
  { retry: true, maxVariants: 8 },
)
assert.ok(pptAgentRetryVariants.some(query => /PPTAgent|品牌策划|Agent/i.test(query)), pptAgentRetryVariants.join('\n'))
assert.ok(
  pptAgentRetryVariants.every(query => !/SmallRig|camera accessories|camera rig/i.test(query)),
  pptAgentRetryVariants.join('\n'),
)

// 10) Competitor gaps must not jump from product-feature refs to positioning claims without user/procurement/business-demand evidence.
assert.throws(
  () => assertCompetitorPositioningEvidence({
    slides: [
      {
        action_title: 'PPTAgent 应成为咨询级品牌策划方案 AI Agent',
        core_points: ['Gamma 强在通用生成', 'WPS 强在 Office 兼容', 'PPTAgent 空位是策略工作流'],
        data_refs: [
          { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
          { value: '100% Office-compatible', source: 'https://ai.wps.com/en-GB/', type: 'product_matrix' },
        ],
      },
    ],
  }),
  /competitor positioning evidence/i,
)

assert.doesNotThrow(
  () => assertCompetitorPositioningEvidence({
    slides: [
      {
        action_title: 'PPTAgent 的专业 Agent 空位仍需用采购需求验证',
        core_points: ['竞品覆盖通用生成', '用户需求证据显示企业关注业务成果', '结论标记为待验证假设'],
        data_refs: [
          { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
          { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
        ],
      },
    ],
  }),
)

assert.doesNotThrow(
  () => assertCompetitorPositioningEvidence({
    slides: [
      {
        page_no: 23,
        action_title: 'PPTAgent 的专业 Agent 空位仍需验证',
        core_points: ['Gamma 覆盖通用生成', '结论标记为待验证假设'],
        data_refs: [
          { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
          { value: 'pitch decks and sales proposals', source: 'https://gamma.app/products/presentations', type: 'demand_signal' },
        ],
        evidence_status: 'hypothesis',
        hypothesis_basis: '基于竞品能力证据的类比推理，不能直接证明本品的真实付费需求',
        validation_method: '需向目标用户/采购方访谈并索取真实需求与付费数据才能验证',
      },
    ],
  }, {
    sourcePool: [
      { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
    ],
  }),
)

assert.throws(
  () => assertCompetitorPositioningEvidence({
    slides: [
      {
        page_no: 23,
        action_title: '感知地图：从快速生成转向反思式质量控制，是可抢占空位',
        core_points: ['Gamma、WPS 偏快速生成', '空位：反思式专业 Agent'],
        data_refs: [
          { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
          { value: '4084 stars and 494 forks', source: 'https://github.com/icip-cas/PPTAgent', type: 'user_reputation' },
        ],
      },
    ],
  }, {
    sourcePool: [
      { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
    ],
  }),
  /GitHub\/repo popularity cannot prove user demand/i,
)

assert.throws(
  () => assertCompetitorPositioningEvidence({
    slides: [
      {
        page_no: 23,
        action_title: '感知地图：可抢占空位在策略深度与可审计流程',
        core_points: ['避开 Gamma 一键生成', 'Manus 验证企业策略稿需求', '空位：策略深度与流程可审计'],
        data_refs: [
          { value: 'Gamma AI Presentation Maker', source: 'https://gamma.app/?lng=en', type: 'product_matrix' },
          { value: 'Manus 面向 business professionals 和 enterprise teams，主张把战略目标转化为有研究支持的幻灯片', source: 'https://manus.im/zh-cn/tools/ai-ppt-maker', type: 'procurement_signal' },
        ],
      },
    ],
  }, {
    sourcePool: [
      { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
    ],
  }),
  /competitor-owned demand snippets/i,
)

assert.throws(
  () => assertCompetitorPositioningEvidence({
    slides: [
      {
        page_no: 23,
        action_title: 'PPTAgent 的专业 Agent 空位仍需验证',
        core_points: ['Gamma 覆盖通用生成', '结论标记为待验证假设'],
        data_refs: [
          { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
          { value: 'pitch decks and sales proposals', source: 'https://gamma.app/products/presentations', type: 'demand_signal' },
        ],
      },
    ],
  }, {
    sourcePool: [
      { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
    ],
  }),
  /competitor positioning evidence/i,
)

assert.throws(
  () => assertCompetitorPositioningEvidence({
    slides: [
      {
        page_no: 22,
        action_title: '竞品矩阵显示 PPTAgent 的专业 Agent 空位为待验证假设',
        core_points: ['Gamma 占通用生成', 'PPTAgent 可试探策略工作流空位'],
        data_refs: [
          { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
          { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
        ],
      },
    ],
  }, {
    sourcePool: [
      { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
    ],
  }),
  /page 22 must stay a competitor matrix/i,
)

assert.throws(
  () => assertCompetitorPositioningEvidence({
    slides: [
      {
        page_no: 22,
        action_title: '竞品矩阵：PPTAgent 的专业 Agent 心智空位仍为待验证假设',
        core_points: ['Gamma 覆盖通用生成', '策略工作流空位只能进入验证清单'],
        data_refs: [
          { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
          { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
        ],
        evidence_status: 'hypothesis',
        hypothesis_basis: '基于竞品能力证据的类比推理，不能直接证明本品的真实付费需求',
        validation_method: '需向目标用户/采购方访谈并索取真实需求与付费数据才能验证',
      },
    ],
  }, {
    pageConcepts: { 22: 'Competitor-Matrix' },
  }),
  /page 22 must stay a competitor matrix/i,
)

assert.doesNotThrow(
  () => assertCompetitorPositioningEvidence({
    slides: [
      {
        page_no: 22,
        action_title: '感知地图：PPTAgent 的专业 Agent 心智空位仍为待验证假设',
        core_points: ['Gamma 覆盖通用生成', '策略工作流空位只能进入验证清单'],
        data_refs: [
          { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
          { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
        ],
        evidence_status: 'hypothesis',
        hypothesis_basis: '基于竞品能力证据的类比推理，不能直接证明本品的真实付费需求',
        validation_method: '需向目标用户/采购方访谈并索取真实需求与付费数据才能验证',
      },
    ],
  }, {
    pageConcepts: { 22: 'Perceptual-Map' },
  }),
)

assert.throws(
  () => assertCompetitorPositioningEvidence({
    slides: [
      {
        page_no: 24,
        action_title: '竞争小结：PPTAgent 应以专业工作流切入，但付费案例仍待验证',
        core_points: ['S：多 Agent 串联策略产出', 'W：品牌信任仍需案例', 'O：从工具转向工作流'],
        data_refs: [
          { value: 'AI One-Click Slide Generation', source: 'https://ai.wps.com/en-GB/', type: 'product_matrix' },
          { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
        ],
      },
    ],
  }, {
    sourcePool: [
      { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
    ],
  }),
  /cannot turn validation hypotheses into action recommendations/i,
)

assert.doesNotThrow(
  () => assertCompetitorPositioningEvidence({
    slides: [
      {
        page_no: 24,
        action_title: '竞争小结：竞品证据只能证明通用 AI PPT 拥挤，专业工作流方向进入验证清单',
        core_points: ['已证明：通用生成拥挤', '未证明：付费意愿与案例', '下一步验证客户痛点'],
        data_refs: [
          { value: 'AI One-Click Slide Generation', source: 'https://ai.wps.com/en-GB/', type: 'product_matrix' },
          { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
        ],
      },
    ],
  }, {
    sourcePool: [
      { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
    ],
  }),
)

assert.throws(
  () => assertCompetitorPositioningEvidence({
    slides: [
      {
        page_no: 22,
        action_title: '竞品矩阵：Gamma、WPS、Canva、AiPPT、ChatPPT、Beautiful.ai 的能力差异',
        core_points: ['Gamma 覆盖演示与网页', 'AiPPT 主打一键成稿', 'ChatPPT 强调对话生成', 'Beautiful.ai 聚焦智能排版'],
        data_refs: [
          { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
          { value: 'AI One-Click Slide Generation', source: 'https://ai.wps.com/en-GB/', type: 'product_matrix' },
        ],
      },
    ],
  }),
  /named competitor lacks page-level evidence/i,
)

{
  const slides = normalizeSlides([
    {
      page_no: 1,
      layout: 'S05',
      action_title: '模型不能把普通竞品官网伪标成 T2',
      core_points: ['Gamma 是普通公开网页来源', 'source_tier 必须由系统判定'],
      data_refs: [
        {
          value: 'AI Presentation Maker',
          source: 'https://gamma.app/products/presentations',
          source_tier: 'T2',
          source_label: '权威二手研究来源',
          type: 'product_matrix',
        },
      ],
      models_used: ['Competitor-Matrix'],
    },
  ], {
    pages: [{ page_no: 1, recommended_layout: 'S05', page_subtitle: '测试', page_intent: '测试', concept_for_this_page: 'Competitor-Matrix' }],
    allowed_concepts: ['Competitor-Matrix'],
  })
  assert.equal(slides[0].data_refs[0].source_tier, 'T3')
  assert.equal(slides[0].data_refs[0].source_label, '未分级公开网页来源')
}

{
  const slides = normalizeSlides([
    {
      page_no: 2,
      layout: 'S05',
      action_title: '建议专业 Agent 空位进入验证清单（待验证假设）',
      core_points: [
        '基于 Gamma/WPS 通用生成证据的类比推理，不能直接证明 PPTAgent 的付费需求',
        '需要访谈品牌市场部用户并索取真实采购/活跃数据才能验证',
      ],
      data_refs: [
        {
          value: 'AI Presentation Maker',
          source: 'https://gamma.app/products/presentations',
          type: 'product_matrix',
        },
      ],
      models_used: ['Competitor-Matrix'],
    },
  ], {
    pages: [{ page_no: 2, recommended_layout: 'S05', page_subtitle: '测试', page_intent: '测试', concept_for_this_page: 'Competitor-Matrix' }],
    allowed_concepts: ['Competitor-Matrix'],
  })
  assert.equal(slides[0].evidence_status, 'hypothesis')
  assert.ok(slides[0].hypothesis_basis)
  assert.ok(slides[0].validation_method)
}

{
  const slides = normalizeSlides([
    {
      page_no: 3,
      layout: 'S05',
      action_title: '专业 Agent 空位仍是待验证假设',
      core_points: [
        '基于竞品通用生成证据的类比推理，不能直接证明 PPTAgent 的付费需求',
        '结论标记为待验证假设',
      ],
      data_refs: [
        {
          value: 'AI Presentation Maker',
          source: 'https://gamma.app/products/presentations',
          type: 'product_matrix',
        },
      ],
      models_used: ['Competitor-Matrix'],
    },
  ], {
    pages: [{ page_no: 3, recommended_layout: 'S05', page_subtitle: '测试', page_intent: '测试', concept_for_this_page: 'Competitor-Matrix' }],
    allowed_concepts: ['Competitor-Matrix'],
  })
  assert.equal(slides[0].evidence_status, 'hypothesis')
  assert.ok(slides[0].hypothesis_basis)
  assert.ok(slides[0].validation_method)
}

{
  const slides = normalizeSlides([
    {
      page_no: 4,
      layout: 'S17',
      action_title: 'Competitor-Matrix：六类 AI PPT 玩家主要差异仍集中在输入、编辑、视觉与价格',
      core_points: [
        '输入：Gamma/WPS/AiPPT更宽',
        '策略深度：多为待验证维度',
      ],
      data_refs: [
        {
          value: 'AI Presentation Maker',
          source: 'https://gamma.app/products/presentations',
          type: 'product_matrix',
        },
      ],
      evidence_status: 'hypothesis',
      hypothesis_basis: '',
      validation_method: '',
      models_used: ['Competitor-Matrix'],
    },
  ], {
    pages: [{ page_no: 4, recommended_layout: 'S17', page_subtitle: '测试', page_intent: '测试', concept_for_this_page: 'Competitor-Matrix' }],
    allowed_concepts: ['Competitor-Matrix'],
  })
  assert.equal(slides[0].evidence_status, 'hypothesis')
  assert.ok(slides[0].hypothesis_basis)
  assert.ok(slides[0].validation_method)
}

{
  const slides = normalizeSlides([
    {
      page_no: 5,
      layout: 'S17',
      action_title: 'Perceptual-Map：策略深度象限仅为待验证假设，进入验证清单',
      core_points: [
        'T2 行业资料只能证明企业偏好业务成果，不能直接证明 PPTAgent 专业策略工作流存在付费需求',
        '独立付费需求仍需验证',
      ],
      data_refs: [
        {
          value: '66%的中国企业偏好按业务成果计费',
          source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525',
          source_tier: 'T2',
          type: 'procurement_signal',
        },
        {
          value: 'AI Presentation Maker',
          source: 'https://gamma.app/products/presentations',
          type: 'product_matrix',
        },
      ],
      evidence_status: 'evidenced',
      hypothesis_basis: '',
      validation_method: '',
      models_used: ['Perceptual-Map'],
    },
  ], {
    pages: [{ page_no: 5, recommended_layout: 'S17', page_subtitle: '测试', page_intent: '测试', concept_for_this_page: 'Perceptual-Map' }],
    allowed_concepts: ['Perceptual-Map'],
  })
  assert.equal(slides[0].evidence_status, 'hypothesis')
  assert.ok(slides[0].hypothesis_basis)
  assert.ok(slides[0].validation_method)
  assert.equal(slides[0].data_refs.length, 2)
}

console.log('✅ test-deepresearch-guardrail passed')
