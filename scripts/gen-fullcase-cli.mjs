#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkMethodologyUsage } from './check-methodology-usage.mjs'
import { runCriticLoop } from './critic-deck.mjs'
import { runFullcasePipeline } from './fullcase-pipeline.mjs'
import { buildBriefFromInputs } from './generate-nonlocked-deck.mjs'
import { callClaude, DEFAULT_CLAUDE_MODEL } from './llm-clients/claude-client.mjs'
import { loadConceptBodies, loadConceptIndex, selectConcepts } from './methodology-kb.mjs'
import { deriveResearchQuestionsLLM, gatherResearch, gatherResearchDeep, normalizeSearchHits } from './research-worker.mjs'
import { loadCasePattern, loadNonlockedSchemeConfig, renderResearchAngles } from './scheme-nonlocked.mjs'
import { webSearch } from './web-search.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

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
    } else if (arg === '--model') {
      opts.model = argv[++index]
    } else if (arg.startsWith('--model=')) {
      opts.model = arg.slice('--model='.length)
    } else if (arg === '--max-tokens') {
      opts.maxTokens = Number(argv[++index])
    } else if (arg.startsWith('--max-tokens=')) {
      opts.maxTokens = Number(arg.slice('--max-tokens='.length))
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
    console.error('Usage: node scripts/gen-fullcase-cli.mjs <input-slug> [--no-research] [--critic] [--outline-only] [--research-rounds=2] [--outline-attempts=2] [--max-pages-per-chapter-call=2] [--pages=20,30] [--output=<dir>]')
    process.exit(2)
  }
  const runDir = opts.outputDir || path.join(opts.root, 'outputs', `${slug}-fullcase`)
  const brief = buildBriefFromInputs({ root: opts.root, slug })
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
  }

  const selectionPath = path.join(runDir, 'methodology-selection.json')
  let selection
  if (fs.existsSync(selectionPath)) {
    selection = JSON.parse(fs.readFileSync(selectionPath, 'utf8'))
    console.log(`[fullcase] reuse methodology -> ${selection.slugs.join(', ')}`)
  } else {
    const index = loadConceptIndex({ root: opts.root })
    const slugs = await selectConcepts({ brief, index, callModel: cheapCall, max: 4 })
    const casePattern = loadCasePattern({ root: opts.root, file: schemeConfig.case_patterns[0], maxChars: 1200 })
    const concepts = loadConceptBodies({ slugs, root: opts.root, maxCharsPerConcept: 1200 })
    selection = {
      slugs,
      concepts: concepts.map(concept => ({ slug: concept.slug, name: concept.name })),
      case_pattern: casePattern.file,
    }
    fs.writeFileSync(selectionPath, JSON.stringify(selection, null, 2))
    console.log(`[fullcase] methodology -> ${slugs.join(', ')}`)
  }

  const concepts = loadConceptBodies({ slugs: selection.slugs, root: opts.root, maxCharsPerConcept: 1200 })
  const casePattern = loadCasePattern({ root: opts.root, file: schemeConfig.case_patterns[0], maxChars: 1200 })
  const methodology = { concepts, casePattern }

  try {
    const result = await runFullcasePipeline({
      brief,
      runDir,
      callModel: call,
      requiredConclusions: schemeConfig.required_conclusions,
      methodology,
      researchBrief,
      options: {
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
      if (loop.finalVerdict !== 'pass') process.exit(1)
    }
  } catch (error) {
    fs.writeFileSync(path.join(runDir, 'generation-error.txt'), String(error?.stack || error))
    throw error
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
