#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkMethodologyUsage } from './check-methodology-usage.mjs'
import { buildBriefFromInputs, generateDeck } from './generate-nonlocked-deck.mjs'
import { callClaude, DEFAULT_CLAUDE_MODEL } from './llm-clients/claude-client.mjs'
import { loadConceptBodies, loadConceptIndex, selectConcepts } from './methodology-kb.mjs'
import { deriveResearchQuestionsLLM, gatherResearch, normalizeSearchHits } from './research-worker.mjs'
import { loadCasePattern, loadNonlockedSchemeConfig, renderResearchAngles } from './scheme-nonlocked.mjs'
import { webSearch } from './web-search.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function parseArgs(argv) {
  const opts = {
    root: REPO_ROOT,
    dryRun: false,
    model: DEFAULT_CLAUDE_MODEL,
    maxTokens: 3000,
    temperature: 0,
    pages: 5,
    research: false,
    methodology: true,
    searchResults: 3,
  }
  const positional = []
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--root') {
      opts.root = path.resolve(argv[index + 1])
      index += 1
    } else if (arg.startsWith('--root=')) {
      opts.root = path.resolve(arg.slice('--root='.length))
    } else if (arg === '--output') {
      opts.outputDir = path.resolve(argv[index + 1])
      index += 1
    } else if (arg.startsWith('--output=')) {
      opts.outputDir = path.resolve(arg.slice('--output='.length))
    } else if (arg === '--dry-run') {
      opts.dryRun = true
    } else if (arg === '--research') {
      opts.research = true
    } else if (arg === '--no-methodology') {
      opts.methodology = false
    } else if (arg === '--model') {
      opts.model = argv[index + 1]
      index += 1
    } else if (arg.startsWith('--model=')) {
      opts.model = arg.slice('--model='.length)
    } else if (arg === '--max-tokens') {
      opts.maxTokens = Number(argv[index + 1])
      index += 1
    } else if (arg.startsWith('--max-tokens=')) {
      opts.maxTokens = Number(arg.slice('--max-tokens='.length))
    } else if (arg === '--pages') {
      opts.pages = Number(argv[index + 1])
      index += 1
    } else if (arg.startsWith('--pages=')) {
      opts.pages = Number(arg.slice('--pages='.length))
    } else if (arg === '--search-results') {
      opts.searchResults = Number(argv[index + 1])
      index += 1
    } else if (arg.startsWith('--search-results=')) {
      opts.searchResults = Number(arg.slice('--search-results='.length))
    } else {
      positional.push(arg)
    }
  }
  return { slug: positional[0], opts }
}

function writeOutput(outputDir, result) {
  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(path.join(outputDir, 'deck.json'), JSON.stringify(result.deck, null, 2))
  fs.writeFileSync(path.join(outputDir, 'process-locks.json'), JSON.stringify(result.locks, null, 2))
  fs.writeFileSync(path.join(outputDir, 'generation-run.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: result.deck.metadata?.generation_mode || 'unknown',
    inputSlug: result.deck.metadata?.input_slug || '',
    slideCount: result.deck.slides?.length || 0,
    locksOk: result.locks.ok,
  }, null, 2))
  fs.writeFileSync(path.join(outputDir, 'raw-response.txt'), result.rawText || '')
  fs.writeFileSync(path.join(outputDir, 'prompt-bundle.md'), [
    '# Nonlocked Deck Prompt Bundle',
    '',
    '## System',
    '',
    result.prompt.system,
    '',
    '## User',
    '',
    result.prompt.user,
  ].join('\n'))
}

async function cliMain() {
  const { slug, opts } = parseArgs(process.argv.slice(2))
  if (!slug) {
    console.error('Usage: node scripts/gen-deck-cli.mjs <input-slug> [--root <repo-root>] [--output <dir>] [--dry-run] [--research] [--no-methodology]')
    process.exit(2)
  }
  const outputDir = opts.outputDir || path.join(opts.root, 'outputs', `${slug}-nonlocked`)
  const brief = buildBriefFromInputs({ root: opts.root, slug })
  let researchBrief
  if (opts.research) {
    fs.mkdirSync(outputDir, { recursive: true })
    const schemeConfig = loadNonlockedSchemeConfig({ root: opts.root })
    const angles = renderResearchAngles(schemeConfig.research_angles, brief.form)
    const questions = await deriveResearchQuestionsLLM({
      brief,
      angles,
      callModel: async (system, user) => {
        const response = await callClaude(system, user, {
          model: opts.model,
          maxTokens: 800,
          temperature: 0,
        })
        return response.text
      },
    })
    researchBrief = await gatherResearch({
      questions,
      search: async question => normalizeSearchHits(await webSearch(question, {
        maxResults: opts.searchResults,
        slug,
      })),
      callModel: async (system, user) => {
        const response = await callClaude(system, user, {
          model: opts.model,
          maxTokens: Math.min(Math.max(opts.maxTokens, 2000), 3000),
          temperature: 0,
        })
        return response.text
      },
      maxResultsPerQuestion: opts.searchResults,
    })
    fs.writeFileSync(path.join(outputDir, 'research-brief.json'), JSON.stringify({
      questions,
      ...researchBrief,
    }, null, 2))
    console.log(`[nonlocked] research -> ${researchBrief.findings.length} findings / ${researchBrief.sources.length} sources`)
  }
  let methodology
  if (opts.methodology && !opts.dryRun) {
    const schemeConfig = loadNonlockedSchemeConfig({ root: opts.root })
    const index = loadConceptIndex({ root: opts.root })
    const cheapCall = async (system, user) => {
      const response = await callClaude(system, user, {
        model: opts.model,
        maxTokens: 800,
        temperature: 0,
      })
      return response.text
    }
    const slugs = await selectConcepts({ brief, index, callModel: cheapCall, max: 4 })
    const concepts = loadConceptBodies({ slugs, root: opts.root, maxCharsPerConcept: 1200 })
    const casePattern = loadCasePattern({ root: opts.root, file: schemeConfig.case_patterns[0], maxChars: 1200 })
    methodology = { concepts, casePattern }
    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(path.join(outputDir, 'methodology-selection.json'), JSON.stringify({
      slugs,
      concepts: concepts.map(concept => ({ slug: concept.slug, name: concept.name })),
      case_pattern: casePattern.file,
    }, null, 2))
    console.log(`[nonlocked] methodology -> ${slugs.join(', ')}`)
  }
  let result
  try {
    result = await generateDeck({
      brief,
      callModel: async (system, user) => callClaude(system, user, {
        model: opts.model,
        maxTokens: opts.maxTokens,
        temperature: opts.temperature,
      }),
      options: { dryRun: opts.dryRun, pages: opts.pages, researchBrief, methodology },
    })
  } catch (error) {
    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(path.join(outputDir, 'generation-error.txt'), String(error?.stack || error))
    throw error
  }
  writeOutput(outputDir, result)
  console.log(`[nonlocked] deck -> ${path.join(outputDir, 'deck.json')}`)
  console.log(`[nonlocked] process locks: ${result.locks.ok ? 'PASS' : 'FAIL'}`)
  if (!result.locks.ok) {
    console.error(result.locks.violations.map(v => `- ${v}`).join('\n'))
    process.exit(1)
  }
  if (methodology) {
    const usage = checkMethodologyUsage(result.deck)
    fs.writeFileSync(path.join(outputDir, 'methodology-usage.json'), JSON.stringify(usage, null, 2))
    console.log(`[nonlocked] methodology usage: ${usage.ok ? 'PASS' : 'FAIL'} (${usage.usedPageCount}/${usage.totalPages}: ${usage.frameworks.join('、')})`)
    if (!usage.ok) {
      console.error(usage.violations.map(violation => `- ${violation}`).join('\n'))
      process.exit(1)
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
