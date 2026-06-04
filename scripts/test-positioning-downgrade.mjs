import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { downgradePositioningSlides } from './sub-agents/deepresearch-common.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// A) 缺独立需求证据 + sourcePool 也没有 -> 降级成 hypothesis, 去行动词, 补依据/方法
{
  const [slide] = downgradePositioningSlides([
    {
      page_no: 20,
      action_title: 'PPTAgent 应成为咨询级品牌策划方案 AI Agent',
      core_points: ['Gamma 强在通用生成', 'WPS 强在 Office 兼容'],
      data_refs: [
        { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
        { value: '100% Office-compatible', source: 'https://ai.wps.com/zh-CN/', type: 'product_matrix' },
      ],
    },
  ], { sourcePool: [] })

  assert.equal(slide.evidence_status, 'hypothesis')
  assert.ok(slide.hypothesis_basis, '应有 hypothesis_basis')
  assert.ok(slide.validation_method, '应有 validation_method')
  const text = [slide.action_title, ...slide.core_points].join(' ')
  assert.ok(/待验证|进入验证清单|假设/.test(text), '应出现假设标记')
  assert.ok(!/应成为|应以|应该|抢占|切入|定位为/.test(slide.action_title), `行动词应被去除: ${slide.action_title}`)
}

// B) 缺独立需求证据, 但 sourcePool 有可补的真证据 -> 挂上去, 不降级(保持 evidenced)
{
  const [slide] = downgradePositioningSlides([
    {
      page_no: 20,
      action_title: 'PPTAgent 应成为咨询级品牌策划方案 AI Agent',
      core_points: ['Gamma 强在通用生成'],
      data_refs: [
        { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
      ],
    },
  ], {
    sourcePool: [
      { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
    ],
  })

  assert.notEqual(slide.evidence_status, 'hypothesis', '补到真证据后不应降级')
  assert.ok(
    slide.data_refs.some(r => /idc\.com/.test(String(r.source || ''))),
    '应把 sourcePool 的独立需求证据挂上 data_refs',
  )
}

// C) 已有独立需求证据 -> 原样不动
{
  const input = [
    {
      page_no: 20,
      action_title: 'PPTAgent 专业 Agent 空位',
      core_points: ['竞品覆盖通用生成', '企业关注业务成果'],
      data_refs: [
        { value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' },
        { value: '66%的中国企业偏好按业务成果计费', source: 'https://mfe-prod.idc.com/getdoc.jsp?containerId=prCHC53669525', type: 'procurement_signal' },
      ],
    },
  ]
  const [slide] = downgradePositioningSlides(input, { sourcePool: [] })
  assert.notEqual(slide.evidence_status, 'hypothesis')
  assert.equal(slide.data_refs.length, 2, '不应改动 data_refs')
}

// D) 非定位跃迁页 -> 原样不动
{
  const input = [{ page_no: 1, action_title: '市场背景概述', core_points: ['行业规模增长'], data_refs: [] }]
  const [slide] = downgradePositioningSlides(input, { sourcePool: [] })
  assert.deepEqual(slide, input[0])
}

// E) 幂等：对已降级页再跑一次，不得重复追加 core_points
{
  const once = downgradePositioningSlides([
    {
      page_no: 20,
      action_title: 'PPTAgent 应成为咨询级品牌策划方案 AI Agent',
      core_points: ['Gamma 强在通用生成'],
      data_refs: [{ value: 'x', source: 'https://gamma.app/products/presentations', type: 'product_matrix' }],
    },
  ], { sourcePool: [] })
  const twice = downgradePositioningSlides(once, { sourcePool: [] })
  assert.equal(twice[0].core_points.length, once[0].core_points.length, '幂等：不得重复追加')
  assert.equal(twice[0].evidence_status, 'hypothesis')
}

// F) 点名竞品但无来源 -> 删名，不抛错
{
  const [slide] = downgradePositioningSlides([
    {
      page_no: 19,
      action_title: '竞品矩阵：Gamma、Canva 的能力差异（抢占策略空位）',
      core_points: ['Gamma 覆盖通用生成', 'Canva 强在模板生态'],
      data_refs: [{ value: 'AI Presentation Maker', source: 'https://gamma.app/products/presentations', type: 'product_matrix' }],
    },
  ], { sourcePool: [] })
  const text = [slide.action_title, ...slide.core_points].join(' ')
  assert.ok(!/Canva/.test(text), `无来源的 Canva 应被删除: ${text}`)
  assert.ok(/Gamma/.test(text), '有来源的 Gamma 应保留')
}

// G) runWriteStep 必须在 assertCompetitorPositioningEvidence 之前调用降级 Pass
{
  const src = fs.readFileSync(path.join(REPO_ROOT, 'scripts/sub-agents/deepresearch-common.mjs'), 'utf8')
  const writeStepBody = src.slice(src.indexOf('async function runWriteStep'), src.indexOf('async function runBatchedWriteStep'))
  const downgradeIdx = writeStepBody.indexOf('downgradePositioningSlides')
  const assertIdx = writeStepBody.indexOf('assertCompetitorPositioningEvidence')
  assert.ok(downgradeIdx !== -1, 'runWriteStep 必须调用 downgradePositioningSlides')
  assert.ok(assertIdx !== -1, 'runWriteStep 仍应保留 assertCompetitorPositioningEvidence tripwire')
  assert.ok(downgradeIdx < assertIdx, '降级 Pass 必须在 assert tripwire 之前执行')
}

console.log('✅ Task1 positioning-downgrade core passed')
