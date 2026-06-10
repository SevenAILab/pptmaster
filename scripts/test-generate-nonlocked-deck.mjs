import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  buildBriefFromInputs,
  buildGenerationPrompt,
  generateDeck,
  normalizeGeneratedDeck,
  parseGeneratedDeck,
} from './generate-nonlocked-deck.mjs'
import { validateProcessLocks } from './process-locks.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pptmaster-nonlocked-'))
try {
  const inputRoot = path.join(tmp, 'inputs')
  const slug = 'same-source'
  const inputDir = path.join(inputRoot, slug)
  fs.mkdirSync(inputDir, { recursive: true })
  fs.writeFileSync(path.join(inputDir, 'form.json'), JSON.stringify({
    name: 'PPTAgent',
    industry: 'AI Agent / 品牌策划工具',
    target_audience: ['甲方品牌方', '独立品牌策划顾问'],
    render_style: 'swiss',
  }, null, 2))
  fs.writeFileSync(path.join(inputDir, 'summary.md'), '# 摘要\nPPTAgent 要避免被误认为通用 AI PPT 工具。')
  fs.writeFileSync(path.join(inputDir, 'strategic-question.md'), '# 根问题\nPPTAgent 如何被清晰识别为品牌策划方案 Agent？')

  const brief = buildBriefFromInputs({ root: tmp, slug, inputRoot })
  assert.equal(brief.slug, slug)
  assert.match(brief.formText, /PPTAgent/)
  assert.match(brief.summary, /避免被误认为/)
  assert.match(brief.strategicQuestion, /根问题/)
  assert.match(brief.strategicQuestion, /品牌策划方案 Agent/)

  const { system, user } = buildGenerationPrompt(brief)
  assert.match(system, /5-8 页/)
  assert.match(system, /data_refs/)
  assert.match(system, /evidence_kind/)
  assert.match(system, /validation_method/)
  assert.match(system, /可执行动作|具体动作/)
  assert.match(system, /数字|比例|量化/)
  assert.match(system, /时间窗口|时限|周期/)
  assert.match(system, /外部 T1\/T2|真实来源/)
  assert.match(user, /strategic-question\.md/)
  assert.match(user, /PPTAgent 如何被清晰识别/)
  assert.match(user, /每页都必须回扣/)

  const researchBrief = {
    findings: [
      {
        claim: 'B2B 内容营销团队 2025 年计划增加 AI 工具预算 32%',
        evidence: '32% plan to increase AI tooling budget',
        source_id: 1,
        source_url: 'https://www.gartner.com/en/marketing/research/report.pdf',
        source_tier: 'T2',
        confidence: 'high',
      },
    ],
    sources: [
      { id: 1, url: 'https://www.gartner.com/en/marketing/research/report.pdf', source_tier: 'T2', type: 'industry_report' },
    ],
  }
  const withResearch = buildGenerationPrompt(brief, { researchBrief })
  assert.match(withResearch.user, /已核实的外部研究发现/)
  assert.match(withResearch.user, /AI 工具预算 32%/)
  assert.match(withResearch.user, /gartner\.com/)
  assert.match(withResearch.system, /data_refs.*真实来源|真实来源.*data_refs/)

  const withMethodology = buildGenerationPrompt(brief, {
    methodology: {
      concepts: [{ slug: 'jtbd', name: 'JTBD', content: 'JTBD：用户雇佣产品完成任务……' }],
      casePattern: { name: 'brand-positioning-case-pattern', content: '定位案推导结构……' },
    },
  })
  assert.match(withMethodology.user, /Seven 方法论框架/)
  assert.match(withMethodology.user, /\[框架: JTBD\]/)
  assert.match(withMethodology.user, /范例 pattern/)
  assert.match(withMethodology.system, /\[框架: 名称\]/)
  assert.match(withMethodology.system, /禁止.*复述/)
  assert.ok(!buildGenerationPrompt(brief).user.includes('Seven 方法论框架'))

  const response = '```json\n{"slides":[{"page_no":1,"intent":"回答根问题","action_title":"PPTAgent 应先占据品牌策划方案 Agent 心智","layout":"split-statement","core_points":["不是更快做页面，而是替代基础品牌策划提案","先服务高频提案人群"],"data_refs":[{"source":"inputs/same-source/summary.md","type":"client_input","source_tier":"T1"}],"evidence_kind":"deductive","validation_method":"访谈 5 位目标用户验证说法是否清晰","blocks":[{"type":"bullet_list","items":["a"]}]}]}\n```'
  const parsed = parseGeneratedDeck(response)
  assert.equal(parsed.slides.length, 1)
  assert.equal(parsed.slides[0].page_no, 1)
  assert.throws(() => parseGeneratedDeck('没有 JSON'), /No JSON object/)
  assert.throws(() => parseGeneratedDeck('{"slides":"nope"}'), /slides/)

  const normalized = normalizeGeneratedDeck({
    slides: Array.from({ length: 5 }, (_, index) => ({
      page_no: index + 1,
      intent: `intent ${index + 1}`,
      action_title: `第 ${index + 1} 页不同判断`,
      layout: 'framework-grid',
      core_points: [`论点 ${index + 1}`],
      data_refs: [{ source: 'inputs/same-source/summary.md', type: 'client_input', source_tier: 'T1' }],
      evidence_kind: 'deductive',
      validation_method: '用户访谈验证',
      blocks: [{ type: 'callout', text: 'x' }],
    })),
  }, { brief })
  assert.equal(normalized.client_profile.name, 'PPTAgent')
  assert.equal(normalized.client_profile.render_style, 'swiss')
  assert.equal(normalized.metadata.input_slug, slug)
  assert.deepEqual(normalized.slides.map(slide => slide.page_no), [1, 2, 3, 4, 5])
  assert.equal(normalized.slides[0].page_intent, normalized.slides[0].intent)
  assert.deepEqual(normalized.slides[0].content_blocks, normalized.slides[0].blocks)

  const httpTierNormalized = normalizeGeneratedDeck({
    slides: [{
      page_no: 1,
      intent: '验证来源分级',
      action_title: '模型自报 T1 的普通网页应被本地分类覆盖',
      layout: 'split-statement',
      core_points: ['引用普通网页'],
      data_refs: [{ source: 'https://gamma.app/products/presentations', source_tier: 'T1', type: 'official_case' }],
      evidence_kind: 'empirical',
      validation_method: '',
      blocks: [{ type: 'callout', text: 'x' }],
    }],
  }, { brief })
  assert.equal(httpTierNormalized.slides[0].data_refs[0].source_tier, 'T3')
  assert.equal(httpTierNormalized.slides[0].data_refs[0].model_source_tier, 'T1')

  const mixedEvidence = normalizeGeneratedDeck({
    slides: [{
      page_no: 1,
      intent: '验证混合证据',
      action_title: '混合证据必须收敛到 hypothesis 合同',
      layout: 'split-statement',
      core_points: ['a'],
      data_refs: [{ source: 'https://example.com/report' }],
      evidence_kind: 'mixed: empirical context + hypothesis recommendation',
      validation_method: '后续用用户访谈验证',
      blocks: [{ type: 'callout', text: 'x' }],
    }],
  }, { brief })
  assert.equal(mixedEvidence.slides[0].evidence_kind, 'hypothesis')
  assert.equal(mixedEvidence.slides[0].model_evidence_kind, 'mixed: empirical context + hypothesis recommendation')

  const unsourced = normalizeGeneratedDeck({
    slides: [{
      page_no: 1,
      intent: '验证红线',
      action_title: '无来源引用不能被伪造成可追溯',
      layout: 'split-statement',
      core_points: ['a'],
      data_refs: [{ type: 'industry_report' }],
      evidence_kind: 'empirical',
      validation_method: '',
      blocks: [{ type: 'callout', text: 'x' }],
    }],
  }, { brief })
  assert.deepEqual(unsourced.slides[0].data_refs, [])
  const unsourcedLocks = validateProcessLocks(unsourced, { minPages: 1, maxPages: 8 })
  assert.equal(unsourcedLocks.ok, false)
  assert.ok(unsourcedLocks.violations.some(v => v.includes('缺可追溯 data_refs')))

  const stubDeck = {
    slides: Array.from({ length: 5 }, (_, index) => ({
      page_no: index + 1,
      intent: `intent ${index + 1}`,
      action_title: `第 ${index + 1} 页不同判断`,
      layout: 'split-statement',
      core_points: [`论点 ${index + 1}`],
      data_refs: [{ source: 'inputs/same-source/summary.md', type: 'client_input', source_tier: 'T1' }],
      evidence_kind: 'empirical',
      validation_method: '',
      blocks: [{ type: 'bullet_list', items: ['x'] }],
    })),
  }
  const generated = await generateDeck({ brief, callModel: async (stubSystem, stubUser) => {
    assert.match(stubSystem, /只输出 JSON/)
    assert.match(stubUser, /strategic-question\.md/)
    return JSON.stringify(stubDeck)
  }, options: { researchBrief } })
  assert.equal(generated.deck.slides.length, 5)
  assert.equal(generated.locks.ok, true)
  assert.match(generated.prompt.user, /已核实的外部研究发现/)

  const cli = spawnSync('node', [
    path.join(REPO_ROOT, 'scripts/gen-deck-cli.mjs'),
    slug,
    '--root', tmp,
    '--dry-run',
  ], { encoding: 'utf8' })
  assert.equal(cli.status, 0, cli.stderr)
  const outputDeck = path.join(tmp, 'outputs', `${slug}-nonlocked`, 'deck.json')
  assert.equal(fs.existsSync(outputDeck), true)
  const data = JSON.parse(fs.readFileSync(outputDeck, 'utf8'))
  assert.equal(data.slides.length, 5)
  assert.equal(data.metadata.input_slug, slug)
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}

console.log('✅ generate-nonlocked-deck: prompt, parser, generation and CLI passed')
