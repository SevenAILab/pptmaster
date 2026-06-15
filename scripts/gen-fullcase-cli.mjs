#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { appendRunEvent } from '../core/runtime/event-ledger.mjs'
import { runAnalysisPass } from './analysis-pass.mjs'
import { loadCaseLogic } from './case-logic.mjs'
import { checkMethodologyUsage } from './check-methodology-usage.mjs'
import { runCriticLoop } from './critic-deck.mjs'
import { detectProposalType } from './detect-proposal-type.mjs'
import { repairDeck } from './design-repair.mjs'
import { renderFreeformDeck } from './freeform-renderer.mjs'
import { runFullcasePipeline } from './fullcase-pipeline.mjs'
import { buildBriefFromInputs } from './generate-nonlocked-deck.mjs'
import { callClaude, DEFAULT_CLAUDE_MODEL } from './llm-clients/claude-client.mjs'
import { loadConceptBodies, loadConceptIndex, selectConcepts } from './methodology-kb.mjs'
import { deriveResearchQuestionsLLM, gatherResearch, gatherResearchDeep, normalizeSearchHits } from './research-worker.mjs'
import { loadNonlockedSchemeConfig, renderResearchAngles } from './scheme-nonlocked.mjs'
import { loadSkillGuidance } from './skill-injector.mjs'
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

async function cliMain() {
  const { slug, opts } = parseArgs(process.argv.slice(2))
  if (!slug) {
    console.error('Usage: node scripts/gen-fullcase-cli.mjs <input-slug> [--no-research] [--critic] [--outline-only] [--no-design] [--research-rounds=2] [--outline-attempts=2] [--max-pages-per-chapter-call=2] [--pages=20,30] [--output=<dir>]')
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
        runDir,
        root: opts.root,
        accent: '#002fa7',
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
