#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildBriefFromInputs, generateDeck } from './generate-nonlocked-deck.mjs'
import { callClaude, DEFAULT_CLAUDE_MODEL } from './llm-clients/claude-client.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function parseArgs(argv) {
  const opts = {
    root: REPO_ROOT,
    dryRun: false,
    model: DEFAULT_CLAUDE_MODEL,
    maxTokens: 3000,
    temperature: 0,
    pages: 5,
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
    console.error('Usage: node scripts/gen-deck-cli.mjs <input-slug> [--root <repo-root>] [--output <dir>] [--dry-run]')
    process.exit(2)
  }
  const outputDir = opts.outputDir || path.join(opts.root, 'outputs', `${slug}-nonlocked`)
  const brief = buildBriefFromInputs({ root: opts.root, slug })
  let result
  try {
    result = await generateDeck({
      brief,
      callModel: async (system, user) => callClaude(system, user, {
        model: opts.model,
        maxTokens: opts.maxTokens,
        temperature: opts.temperature,
      }),
      options: { dryRun: opts.dryRun, pages: opts.pages },
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
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
