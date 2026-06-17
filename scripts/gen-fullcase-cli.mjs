#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { appendRunEvent } from '../core/runtime/event-ledger.mjs'
import { addModule, createBrandContent, writeContent } from '../core/content-model.mjs'
import { getTransformer } from '../core/output-registry.mjs'
import { runAnalysisPass } from './analysis-pass.mjs'
import { applyPaletteToContent, buildPalette } from './brand-profiler.mjs'
import { loadCaseLogic } from './case-logic.mjs'
import { checkMethodologyUsage } from './check-methodology-usage.mjs'
import { runCriticLoop } from './critic-deck.mjs'
import { detectBrandType } from './detect-brand-type.mjs'
import { detectProposalType } from './detect-proposal-type.mjs'
import { repairDeck } from './design-repair.mjs'
import { renderFreeformDeck } from './freeform-renderer.mjs'
import { runFullcasePipeline } from './fullcase-pipeline.mjs'
import { buildBriefFromInputs } from './generate-nonlocked-deck.mjs'
import { classifyVisibility } from '../core/visibility-classifier.mjs'
import { callClaude, DEFAULT_CLAUDE_MODEL } from './llm-clients/claude-client.mjs'
import { loadConceptBodies, loadConceptIndex, selectConcepts } from './methodology-kb.mjs'
import { deriveResearchQuestionsLLM, gatherResearch, gatherResearchDeep, normalizeSearchHits } from './research-worker.mjs'
import './renderers/render-brand-book.mjs'
import './renderers/render-independent-site.mjs'
import { loadNonlockedSchemeConfig, renderResearchAngles } from './scheme-nonlocked.mjs'
import { loadSkillGuidance } from './skill-injector.mjs'
import { assertCoherence } from '../validators/coherence-validator.mjs'
import { deterministicStrategyDirections, deriveStrategyDirections, lockChosenDirection } from './strategy-decider.mjs'
import { readTraces, writeTrace } from './trace-log.mjs'
import { webSearch } from './web-search.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function traceExists(runDir, step) {
  return readTraces(runDir).some(trace => trace.step === step)
}

function traceInjected(guidance) {
  return { skill: guidance.skill, refs: guidance.loaded }
}

function runVisualAudit({ root, htmlPath, runDir }) {
  const scriptPath = path.join(root, 'skills', 'deck-design-system', 'scripts', 'audit_visual.py')
  const audit = spawnSync(process.env.PYTHON || 'python3', [scriptPath, htmlPath], {
    encoding: 'utf8',
  })
  const report = [
    audit.stdout || '',
    audit.stderr || '',
    audit.error ? String(audit.error.stack || audit.error) : '',
  ].filter(Boolean).join('')
  const reportPath = path.join(runDir, 'audit-visual.txt')
  fs.writeFileSync(reportPath, report || '(audit produced no output)')
  return {
    passed: audit.status === 0,
    status: audit.status,
    reportPath,
    error: audit.error ? String(audit.error.message || audit.error) : null,
  }
}

function parseArgs(argv) {
  const opts = {
    root: REPO_ROOT,
    model: DEFAULT_CLAUDE_MODEL,
    maxTokens: 4000,
    temperature: 0,
    research: true,
    critic: false,
    outlineOnly: false,
    minPages: 20,
    maxPages: 30,
    outlineAttempts: 2,
    maxPagesPerChapterCall: 2,
    searchResults: 3,
    researchRounds: 2,
    design: true,
    designMaxTokens: 3000,
    designMaxAttempts: 2,
    mode: 'deck',
    intake: false,
    noModel: false,
    pick: 'd1',
  }
  const positional = []
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--root') {
      opts.root = path.resolve(argv[++index])
    } else if (arg.startsWith('--root=')) {
      opts.root = path.resolve(arg.slice('--root='.length))
    } else if (arg === '--output') {
      opts.outputDir = path.resolve(argv[++index])
    } else if (arg.startsWith('--output=')) {
      opts.outputDir = path.resolve(arg.slice('--output='.length))
    } else if (arg === '--no-research') {
      opts.research = false
    } else if (arg === '--critic') {
      opts.critic = true
    } else if (arg === '--outline-only') {
      opts.outlineOnly = true
    } else if (arg === '--no-design') {
      opts.design = false
    } else if (arg === '--intake') {
      opts.intake = true
    } else if (arg === '--no-model' || arg === '--dry-run') {
      opts.noModel = true
    } else if (arg === '--mode') {
      opts.mode = argv[++index]
    } else if (arg.startsWith('--mode=')) {
      opts.mode = arg.slice('--mode='.length)
    } else if (arg === '--pick') {
      opts.pick = argv[++index]
    } else if (arg.startsWith('--pick=')) {
      opts.pick = arg.slice('--pick='.length)
    } else if (arg === '--outputs') {
      opts.outputs = argv[++index].split(',').map(item => item.trim()).filter(Boolean)
    } else if (arg.startsWith('--outputs=')) {
      opts.outputs = arg.slice('--outputs='.length).split(',').map(item => item.trim()).filter(Boolean)
    } else if (arg === '--model') {
      opts.model = argv[++index]
    } else if (arg.startsWith('--model=')) {
      opts.model = arg.slice('--model='.length)
    } else if (arg === '--max-tokens') {
      opts.maxTokens = Number(argv[++index])
    } else if (arg.startsWith('--max-tokens=')) {
      opts.maxTokens = Number(arg.slice('--max-tokens='.length))
    } else if (arg === '--design-max-tokens') {
      opts.designMaxTokens = Number(argv[++index])
    } else if (arg.startsWith('--design-max-tokens=')) {
      opts.designMaxTokens = Number(arg.slice('--design-max-tokens='.length))
    } else if (arg === '--design-max-attempts') {
      opts.designMaxAttempts = Number(argv[++index])
    } else if (arg.startsWith('--design-max-attempts=')) {
      opts.designMaxAttempts = Number(arg.slice('--design-max-attempts='.length))
    } else if (arg === '--search-results') {
      opts.searchResults = Number(argv[++index])
    } else if (arg.startsWith('--search-results=')) {
      opts.searchResults = Number(arg.slice('--search-results='.length))
    } else if (arg === '--research-rounds') {
      opts.researchRounds = Number(argv[++index])
    } else if (arg.startsWith('--research-rounds=')) {
      opts.researchRounds = Number(arg.slice('--research-rounds='.length))
    } else if (arg === '--outline-attempts') {
      opts.outlineAttempts = Number(argv[++index])
    } else if (arg.startsWith('--outline-attempts=')) {
      opts.outlineAttempts = Number(arg.slice('--outline-attempts='.length))
    } else if (arg === '--max-pages-per-chapter-call') {
      opts.maxPagesPerChapterCall = Number(argv[++index])
    } else if (arg.startsWith('--max-pages-per-chapter-call=')) {
      opts.maxPagesPerChapterCall = Number(arg.slice('--max-pages-per-chapter-call='.length))
    } else if (arg === '--pages') {
      const [min, max] = String(argv[++index]).split(',').map(Number)
      opts.minPages = min
      opts.maxPages = max
    } else if (arg.startsWith('--pages=')) {
      const [min, max] = arg.slice('--pages='.length).split(',').map(Number)
      opts.minPages = min
      opts.maxPages = max
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}`)
    } else {
      positional.push(arg)
    }
  }
  return { slug: positional[0], opts }
}

function text(value) {
  return String(value ?? '').trim()
}

function brandTypeInputFromBrief(brief) {
  const form = brief.form || {}
  return {
    category: form.category || form.industry || '',
    stage: form.stage || '',
    delivery_goal: form.delivery_goal || form.goal || 'external_intro',
    has_visual: Boolean(form.has_visual || form.render_style),
    has_ops_data: Boolean(form.has_ops_data || form.expected_pages),
    audience: form.target_audience || [],
  }
}

function moduleText(content) {
  return Object.values(content || {}).map(value => Array.isArray(value) ? value.join(' ') : String(value || '')).join(' ')
}

function addClassifiedModule(content, module) {
  const classified = classifyVisibility({
    kind: module.kind,
    text: moduleText(module.content),
    evidence_refs: module.evidence_refs || [],
  })
  return addModule(content, {
    evidence_refs: [],
    depth_level: 'L3',
    spine_alignment: content.strategic_spine.positioning_statement,
    ...module,
    visibility: module.visibility || classified.visibility,
  })
}

function deterministicAnalysisCards(brief) {
  const form = brief.form || {}
  const source = `inputs/${brief.slug}/summary.md`
  return {
    cards: [
      { id: 'ind-1', claim: `${form.industry || '品类'} 正在从供给竞争进入心智竞争`, source, source_tier: 'T1', implication: '需要清晰定位主线', analysis_type: 'industry' },
      { id: 'comp-1', claim: `主要竞品留下品质与便捷之间的表达空位`, source, source_tier: 'T1', implication: '可占据品质便捷生态位', analysis_type: 'competitor' },
      { id: 'usr-1', claim: `目标用户需要可理解、可复述的选择理由`, source, source_tier: 'T1', implication: '对外表达要降低理解成本', analysis_type: 'user' },
      { id: 'self-1', claim: `${form.name || brief.slug} 已有产品和运营资产可支撑主线`, source, source_tier: 'T1', implication: '用现有资产证明定位', analysis_type: 'self' },
    ],
  }
}

function buildBrandModules(content, brief) {
  const form = brief.form || {}
  const name = form.name || brief.slug
  const industry = form.industry || '所在行业'
  const audience = Array.isArray(form.target_audience) ? form.target_audience.join('、') : text(form.target_audience)
  const products = Array.isArray(form.core_products) ? form.core_products : []
  const spine = content.strategic_spine.positioning_statement
  const base = `${spine}。`
  let next = content
  next = addClassifiedModule(next, {
    id: 'brand-entry',
    kind: 'brand_entry',
    visibility: 'external',
    content: {
      name,
      slogan: spine,
      one_liner: content.strategic_spine.proposition,
    },
  })
  next = addClassifiedModule(next, {
    id: 'market-context',
    kind: 'market_context',
    content: {
      title: '市场背景',
      body: `${base}${industry} 的竞争正在从单点产品走向清晰心智和稳定体验。`,
      points: ['用户需要更容易复述的选择理由', '品牌需要把产品资产转成信任资产'],
    },
  })
  next = addClassifiedModule(next, {
    id: 'brand-definition',
    kind: 'brand_definition',
    content: {
      title: '品牌定义',
      positioning: spine,
      body: `${base}${name} 不只提供产品，而是把专业能力包装成用户能感知的日常选择。`,
    },
  })
  next = addClassifiedModule(next, {
    id: 'audience-scenarios',
    kind: 'audience_scenarios',
    content: {
      title: '人群与场景',
      body: `${base}核心人群先锁定 ${audience || '最早愿意付费的人'}，优先解决高频、具体、可验证的使用时刻。`,
      scenarios: ['第一次选择时需要被说服', '重复购买时需要被证明', '推荐给他人时需要一句话说清楚'],
    },
  })
  next = addClassifiedModule(next, {
    id: 'strategy-core',
    kind: 'strategy_core',
    content: {
      title: '战略核心',
      body: `${base}所有对外表达、产品组织和增长动作都必须回扣这条主线。`,
      points: [content.strategic_spine.mission, content.strategic_spine.vision, content.strategic_spine.proposition],
    },
  })
  next = addClassifiedModule(next, {
    id: 'narrative-system',
    kind: 'narrative_system',
    content: {
      title: '叙事系统',
      body: `${base}叙事顺序应从旧问题进入新认知，再用产品和证据证明为什么是 ${name}。`,
      points: ['旧问题：用户难以判断谁可信', '新认知：品质和便捷可以被同一套系统交付', '证明：用真实产品与运营资产承接'],
    },
  })
  next = addClassifiedModule(next, {
    id: 'product-system',
    kind: 'product_system',
    content: {
      title: '产品体系',
      body: `${base}${products.length ? products.join('、') : '核心产品'} 应被组织成从认知到信任再到复购的产品梯队。`,
      products,
    },
  })
  next = addClassifiedModule(next, {
    id: 'visual-direction',
    kind: 'visual_direction',
    content: {
      title: '视觉方向',
      body: `${base}视觉应服务于清晰、可信和可持续表达，先做文字级方向，不生成实物 VI。`,
      points: ['色彩来自调性', '字体保持专业克制', '符号概念围绕主线展开'],
    },
  })
  next = addClassifiedModule(next, {
    id: 'proof-growth',
    kind: 'proof_growth',
    content: {
      title: '证明与增长',
      body: `${base}增长证明应优先使用可公开事实和可验证体验，而不是夸大行业话术。`,
      proof_points: ['现有客户/门店/试点事实', '用户复购或推荐线索', '产品稳定交付证据'],
    },
  })
  next = addClassifiedModule(next, {
    id: 'personality-statement',
    kind: 'personality_statement',
    content: {
      title: '品牌人格',
      body: `${base}人格表达应专业、可靠、有温度，少制造焦虑，多给确定性。`,
    },
  })
  next = addClassifiedModule(next, {
    id: 'personality-playbook',
    kind: 'personality_playbook',
    visibility: 'internal',
    content: {
      title: '内部话术边界',
      body: '客服话术：不可说绝对化承诺；遇到未验证效果必须标注假设。',
    },
  })
  next = addClassifiedModule(next, {
    id: 'risk-check',
    kind: 'risk_check',
    visibility: 'internal',
    content: {
      title: '内部风险',
      body: '单店回本测算、毛利、未发布战略只进入内部模块，不出现在对外手册或独立站。',
    },
  })
  return next
}

export async function runBrandBookMode({ slug, opts = {}, callModel } = {}) {
  if (!slug) throw new Error('runBrandBookMode requires slug')
  const root = opts.root || REPO_ROOT
  const outputDir = opts.outputDir || path.join(root, 'outputs', `${slug}-brandbook`)
  const brief = buildBriefFromInputs({ root, slug })
  const brandTypeInput = brandTypeInputFromBrief(brief)
  const detected = detectBrandType(brandTypeInput)
  const outputs = opts.outputs || ['brand-book']
  let content = createBrandContent({
    brand_slug: brief.form?.name || slug,
    brand_type: detected.brand_type,
    audience: ['consumer'],
    output_types_selected: outputs,
    intake_sufficiency: 8,
    tonality: {
      keywords: String(brief.form?.tonality || '').split(/[、,，\s]+/).filter(Boolean),
      reference_brands: [],
      source: 'qa',
    },
  })
  let researchBrief = null
  let analysisCards = deterministicAnalysisCards(brief)
  if (!opts.noModel && opts.research !== false) {
    if (typeof callModel !== 'function') throw new Error('brand-book mode requires callModel unless --no-model')
    const schemeConfig = loadNonlockedSchemeConfig({ root })
    const angles = renderResearchAngles(schemeConfig.research_angles, brief.form)
    const questions = await deriveResearchQuestionsLLM({ brief, angles, callModel })
    const search = async question => normalizeSearchHits(await webSearch(question, {
      maxResults: opts.searchResults,
      slug,
    }))
    researchBrief = await gatherResearchDeep({
      questions,
      search,
      callModel,
      maxRounds: opts.researchRounds,
      maxResultsPerQuery: opts.searchResults,
    })
    analysisCards = await runAnalysisPass({
      brief,
      researchBrief,
      root,
      callModel,
    })
  }
  const strategyDirections = opts.noModel
    ? deterministicStrategyDirections({ brief, analysisCards })
    : await deriveStrategyDirections({ analysisCards, brief, callModel })
  content = lockChosenDirection(content, strategyDirections.directions, opts.pick || 'd1')
  content = buildBrandModules(content, brief)
  const palette = await buildPalette({
    tonality: content.tonality,
    callModel: opts.noModel ? undefined : callModel,
  })
  content = applyPaletteToContent(content, palette)
  assertCoherence(content)

  fs.mkdirSync(outputDir, { recursive: true })
  await writeContent(path.join(outputDir, 'brand-system-content.json'), content)
  if (researchBrief) fs.writeFileSync(path.join(outputDir, 'research-brief.json'), JSON.stringify(researchBrief, null, 2))
  fs.writeFileSync(path.join(outputDir, 'analysis-cards.json'), JSON.stringify(analysisCards, null, 2))
  fs.writeFileSync(path.join(outputDir, 'strategy-directions.json'), JSON.stringify(strategyDirections, null, 2))
  await appendRunEvent({
    runDir: outputDir,
    runId: `brandbook-${slug}`,
    eventType: 'intake_done',
    metadata: { source: 'inputs', slug },
  })
  await appendRunEvent({
    runDir: outputDir,
    runId: `brandbook-${slug}`,
    eventType: 'strategy_locked',
    metadata: { chosen_direction_id: content.strategic_spine.chosen_direction_id },
  })
  await appendRunEvent({
    runDir: outputDir,
    runId: `brandbook-${slug}`,
    eventType: 'coherence_passed',
    metadata: { modules: content.modules.length },
  })
  const artifacts = []
  for (const outputType of outputs) {
    const artifact = getTransformer(outputType).render(content)
    const fileName = outputType === 'brand-book' ? 'brand-book.html' : `${outputType}.html`
    const artifactPath = path.join(outputDir, fileName)
    fs.writeFileSync(artifactPath, artifact.html)
    artifacts.push({ type: outputType, path: artifactPath, ...artifact })
    await appendRunEvent({
      runDir: outputDir,
      runId: `brandbook-${slug}`,
      eventType: 'rendered',
      metadata: { type: outputType, path: artifactPath },
    })
  }
  return { brief, content, artifacts, outputDir, strategyDirections }
}

async function cliMain() {
  const { slug, opts } = parseArgs(process.argv.slice(2))
  if (!slug) {
    console.error('Usage: node scripts/gen-fullcase-cli.mjs <input-slug> [--mode=deck|brand-book] [--no-research] [--critic] [--outline-only] [--no-design] [--research-rounds=2] [--outline-attempts=2] [--max-pages-per-chapter-call=2] [--pages=20,30] [--output=<dir>]')
    process.exit(2)
  }
  const runDir = opts.outputDir || path.join(opts.root, 'outputs', `${slug}-fullcase`)
  const brief = buildBriefFromInputs({ root: opts.root, slug })
  const runId = `fullcase-${brief.slug}`
  const schemeConfig = loadNonlockedSchemeConfig({ root: opts.root })
  const call = async (system, user, callOpts = {}) => (await callClaude(system, user, {
    model: opts.model,
    maxTokens: callOpts.maxTokens || opts.maxTokens,
    temperature: callOpts.temperature ?? opts.temperature,
  })).text
  const cheapCall = async (system, user) => call(system, user, { maxTokens: 800, temperature: 0 })

  if (opts.mode === 'brand-book') {
    const result = await runBrandBookMode({
      slug,
      opts,
      callModel: call,
    })
    console.log(`[brand-book] ${result.artifacts.map(item => `${item.type} -> ${item.path}`).join(' / ')}`)
    return
  }

  fs.mkdirSync(runDir, { recursive: true })
  let researchBrief
  const researchPath = path.join(runDir, 'research-brief.json')
  if (opts.research) {
    if (fs.existsSync(researchPath)) {
      researchBrief = JSON.parse(fs.readFileSync(researchPath, 'utf8'))
      console.log(`[fullcase] reuse research-brief.json (${researchBrief.findings?.length || 0} findings)`)
    } else {
      const angles = renderResearchAngles(schemeConfig.research_angles, brief.form)
      const questions = await deriveResearchQuestionsLLM({ brief, angles, callModel: cheapCall })
      const search = async question => normalizeSearchHits(await webSearch(question, {
          maxResults: opts.searchResults,
          slug,
        }))
      const researchCallModel = async (system, user) => call(system, user, {
          maxTokens: Math.min(Math.max(opts.maxTokens, 2000), 3000),
          temperature: 0,
        })
      researchBrief = opts.researchRounds > 1
        ? await gatherResearchDeep({
          questions,
          search,
          callModel: researchCallModel,
          maxRounds: opts.researchRounds,
          maxResultsPerQuery: opts.searchResults,
        })
        : await gatherResearch({
          questions,
          search,
          callModel: researchCallModel,
          maxResultsPerQuestion: opts.searchResults,
        })
      fs.writeFileSync(researchPath, JSON.stringify({ questions, ...researchBrief }, null, 2))
      console.log(`[fullcase] research -> ${researchBrief.findings.length} findings / ${researchBrief.sources.length} sources`)
    }
    await appendRunEvent({
      runDir,
      runId,
      eventType: 'research_completed',
      metadata: {
        findings: researchBrief.findings?.length || 0,
        sources: researchBrief.sources?.length || 0,
        search_calls_used: researchBrief.search_calls_used || 0,
      },
    })
  }

  let analysisCards
  const analysisCardsPath = path.join(runDir, 'analysis-cards.json')
  if (opts.research) {
    if (fs.existsSync(analysisCardsPath)) {
      analysisCards = JSON.parse(fs.readFileSync(analysisCardsPath, 'utf8'))
      console.log(`[fullcase] reuse analysis-cards.json (${analysisCards.cards?.length || 0} cards)`)
    } else {
      analysisCards = await runAnalysisPass({
        brief,
        researchBrief,
        root: opts.root,
        callModel: call,
      })
      fs.writeFileSync(analysisCardsPath, JSON.stringify(analysisCards, null, 2))
      console.log(`[fullcase] analysis cards -> ${analysisCards.cards.length} cards`)
    }
    await appendRunEvent({
      runDir,
      runId,
      eventType: 'analysis_completed',
      metadata: {
        cards: analysisCards.cards?.length || 0,
        types: Object.keys(analysisCards.byType || {}),
      },
    })
    if (!traceExists(runDir, 'analysis')) {
      writeTrace({
        runDir,
        step: 'analysis',
        injected: Object.fromEntries(Object.entries(analysisCards.byType || {}).map(([type, value]) => [type, value.injected])),
        output: { cards: analysisCards.cards?.length || 0, file: path.basename(analysisCardsPath) },
        note: '研究发现经过 industry/competitor/self/user 四类分析 skill，产出契约 A 分析卡',
      })
    }
  }

  const selectionPath = path.join(runDir, 'methodology-selection.json')
  let selection
  if (fs.existsSync(selectionPath)) {
    selection = JSON.parse(fs.readFileSync(selectionPath, 'utf8'))
    console.log(`[fullcase] reuse methodology -> ${selection.slugs.join(', ')}`)
  } else {
    const index = loadConceptIndex({ root: opts.root })
    const slugs = await selectConcepts({ brief, index, callModel: cheapCall, max: 4 })
    const concepts = loadConceptBodies({ slugs, root: opts.root, maxCharsPerConcept: 1200 })
    selection = {
      slugs,
      concepts: concepts.map(concept => ({ slug: concept.slug, name: concept.name })),
    }
    fs.writeFileSync(selectionPath, JSON.stringify(selection, null, 2))
    console.log(`[fullcase] methodology -> ${slugs.join(', ')}`)
  }
  await appendRunEvent({
    runDir,
    runId,
    eventType: 'methodology_selected',
    metadata: {
      slugs: selection.slugs || [],
      count: selection.slugs?.length || 0,
    },
  })

  const concepts = loadConceptBodies({ slugs: selection.slugs, root: opts.root, maxCharsPerConcept: 1200 })
  const methodology = { concepts }
  const caseLogicPath = path.join(runDir, 'case-logic.json')
  let caseLogic
  if (fs.existsSync(caseLogicPath)) {
    caseLogic = JSON.parse(fs.readFileSync(caseLogicPath, 'utf8'))
    console.log(`[fullcase] reuse case-logic -> ${caseLogic.proposalType}`)
  } else {
    const proposalType = await detectProposalType({ brief, callModel: cheapCall })
    caseLogic = loadCaseLogic({ root: opts.root, proposalType })
    fs.writeFileSync(caseLogicPath, JSON.stringify({
      proposalType: caseLogic.proposalType,
      file: caseLogic.file,
      source: caseLogic.source,
      text: caseLogic.text,
    }, null, 2))
    console.log(`[fullcase] case-logic -> ${caseLogic.proposalType} (${caseLogic.source})`)
  }
  if (!traceExists(runDir, 'case-logic')) {
    writeTrace({
      runDir,
      step: 'case-logic',
      injected: {
        proposalType: caseLogic.proposalType,
        file: caseLogic.file,
        source: caseLogic.source,
      },
      output: null,
      note: `按方案类型(${caseLogic.proposalType})注入案例推导逻辑，学推导不抄模板`,
    })
  }

  try {
    const result = await runFullcasePipeline({
      brief,
      runDir,
      callModel: call,
      requiredConclusions: schemeConfig.required_conclusions,
      methodology,
      researchBrief,
      analysisCards,
      caseLogic: caseLogic.text,
      options: {
        root: opts.root,
        minPages: opts.minPages,
        maxPages: opts.maxPages,
        outlineAttempts: opts.outlineAttempts,
        maxPagesPerChapterCall: opts.maxPagesPerChapterCall,
        outlineOnly: opts.outlineOnly,
      },
    })
    if (opts.outlineOnly) {
      console.log(`[fullcase] outline ready -> ${path.join(runDir, 'outline.json')}`)
      return
    }
    const usage = checkMethodologyUsage(result.deck, { minPages: Math.max(4, Math.ceil(result.deck.slides.length / 5)) })
    fs.writeFileSync(path.join(runDir, 'methodology-usage.json'), JSON.stringify(usage, null, 2))
    console.log(`[fullcase] methodology usage: ${usage.ok ? 'PASS' : 'FAIL'} (${usage.usedPageCount}/${usage.totalPages})`)
    if (!usage.ok) {
      console.error(usage.violations.map(v => `- ${v}`).join('\n'))
      process.exit(1)
    }
    if (opts.critic) {
      const index = loadConceptIndex({ root: opts.root })
      const loop = await runCriticLoop({
        deck: result.deck,
        brief,
        index,
        loadBodies: slugs => loadConceptBodies({ slugs, root: opts.root, maxCharsPerConcept: 1200 }),
        callModel: call,
        maxRounds: 2,
        processLockOptions: { minPages: opts.minPages, maxPages: opts.maxPages },
      })
      fs.writeFileSync(path.join(runDir, 'critic-rounds.json'), JSON.stringify(loop.rounds, null, 2))
      fs.writeFileSync(path.join(runDir, 'deck.json'), JSON.stringify(loop.deck, null, 2))
      console.log(`[fullcase] critic loop: ${loop.finalVerdict} (${loop.rounds.length} 轮)`)
      await appendRunEvent({
        runDir,
        runId,
        eventType: 'critic_completed',
        metadata: { finalVerdict: loop.finalVerdict, rounds: loop.rounds.length },
      })
      if (loop.finalVerdict !== 'pass') process.exit(1)
      result.deck = loop.deck
    }
    if (opts.design) {
      const designGuidance = loadSkillGuidance({ root: opts.root, stage: 'design' })
      const designCall = async (system, user) => call(system, user, {
        maxTokens: opts.designMaxTokens,
        temperature: 0.2,
      })
      const freeform = await renderFreeformDeck(result.deck, {
        runDir,
        root: opts.root,
        style: brief.form?.render_style || 'swiss',
        callModel: designCall,
        maxAttempts: opts.designMaxAttempts,
        skillGuidance: designGuidance.text,
        onProgress: event => {
          if (event.type === 'reuse') console.log(`[freeform] design reuse ${event.label}`)
          if (event.type === 'start') console.log(`[freeform] design start ${event.label}`)
          if (event.type === 'done') console.log(`[freeform] design done ${event.label}`)
        },
      })
      await appendRunEvent({
        runDir,
        runId,
        eventType: 'design_completed',
        metadata: { slides: freeform.designed.slides.length, htmlPath: freeform.htmlPath },
      })
      if (!traceExists(runDir, 'design')) {
        writeTrace({
          runDir,
          step: 'design',
          injected: traceInjected(designGuidance),
          output: { slides: freeform.designed.slides.length, html: freeform.htmlPath },
          note: '注入 deck-design-system 逐页设计',
        })
      }
      const repair = await repairDeck({
        htmlPath: freeform.htmlPath,
        designedPath: freeform.designedPath,
        runDir,
        root: opts.root,
        accent: '#002fa7',
        callModel: designCall,
        style: brief.form?.render_style || 'swiss',
        skillGuidance: designGuidance.text,
      })
      if (!traceExists(runDir, 'visual-repair')) {
        writeTrace({
          runDir,
          step: 'visual-repair',
          injected: null,
          output: {
            rounds: repair.rounds.length,
            finalPass: repair.finalPass,
            report: 'visual-repair.json',
          },
          note: '视觉返修：统一强调色并移除渐变，再跑视觉审计',
        })
      }
      const audit = runVisualAudit({ root: opts.root, htmlPath: freeform.htmlPath, runDir })
      if (!traceExists(runDir, 'visual-audit')) {
        writeTrace({
          runDir,
          step: 'visual-audit',
          injected: null,
          output: {
            passed: audit.passed,
            status: audit.status,
            report: path.basename(audit.reportPath),
            error: audit.error,
          },
          note: '视觉审计：单一强调色、SVG 禁文字、渐变与安全视觉约束',
        })
      }
      console.log(`[freeform] visual audit: ${audit.passed ? 'PASS' : 'FAIL（见 audit-visual.txt）'}`)
      console.log(`[freeform] ${freeform.designed.slides.length} slides -> ${freeform.htmlPath}`)
    }
  } catch (error) {
    const details = [
      String(error?.stack || error),
      error?.rawOutput ? `\n\n# Raw model output\n${error.rawOutput}` : '',
    ].join('')
    fs.writeFileSync(path.join(runDir, 'generation-error.txt'), details)
    throw error
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
