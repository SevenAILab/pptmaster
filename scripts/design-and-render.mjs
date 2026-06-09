#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { designPage, isWellFormedSection } from './design-page.mjs'
import { assembleFreeformDeck } from './assemble-freeform-deck.mjs'
import { callClaude, DEFAULT_CLAUDE_MODEL } from './llm-clients/claude-client.mjs'

function parseArgs(argv) {
  const opts = {
    style: 'swiss',
    model: DEFAULT_CLAUDE_MODEL,
    maxTokens: 3000,
    temperature: 0.2,
    maxAttempts: 2,
  }
  const positional = []
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--style') {
      opts.style = argv[index + 1]
      index += 1
    } else if (arg.startsWith('--style=')) {
      opts.style = arg.slice('--style='.length)
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
    } else if (arg === '--temperature') {
      opts.temperature = Number(argv[index + 1])
      index += 1
    } else if (arg.startsWith('--temperature=')) {
      opts.temperature = Number(arg.slice('--temperature='.length))
    } else if (arg === '--max-attempts') {
      opts.maxAttempts = Number(argv[index + 1])
      index += 1
    } else if (arg.startsWith('--max-attempts=')) {
      opts.maxAttempts = Number(arg.slice('--max-attempts='.length))
    } else {
      positional.push(arg)
    }
  }
  return { inputJson: positional[0], outputHtml: positional[1], opts }
}

function designedPathFor(inputJson) {
  return path.resolve(inputJson).replace(/\.json$/i, '.designed.json')
}

async function readCheckpoint(filePath) {
  try {
    const checkpoint = JSON.parse(await fs.readFile(filePath, 'utf8'))
    return new Map((checkpoint.slides || [])
      .filter(slide => slide?.page_no && isWellFormedSection(slide.section_html))
      .map(slide => [String(slide.page_no), slide]))
  } catch (error) {
    if (error.code === 'ENOENT') return new Map()
    throw error
  }
}

async function writeCheckpoint(filePath, deck) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(deck, null, 2))
}

async function cliMain() {
  const { inputJson, outputHtml, opts } = parseArgs(process.argv.slice(2))
  if (!inputJson || !outputHtml) {
    console.error('Usage: node scripts/design-and-render.mjs <deck.json> <deck.freeform.html> [--style=swiss] [--model <model>] [--max-tokens 3000] [--temperature 0.2] [--max-attempts 2]')
    process.exit(2)
  }

  const deck = JSON.parse(await fs.readFile(path.resolve(inputJson), 'utf8'))
  console.log(`[freeform] designing ${deck.slides?.length || 0} slides, style=${opts.style}`)
  const checkpointPath = designedPathFor(inputJson)
  const checkpoint = await readCheckpoint(checkpointPath)
  const callModel = async (system, user) => {
    const response = await callClaude(system, user, {
      model: opts.model,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
    })
    return response.text
  }
  const designed = { ...deck, slides: [] }
  for (const [index, slide] of (deck.slides || []).entries()) {
    const label = `page ${slide.page_no || index + 1}/${deck.slides.length}`
    const cached = checkpoint.get(String(slide.page_no))
    if (cached) {
      console.log(`[freeform] design reuse ${label}`)
      designed.slides.push(cached)
    } else {
      console.log(`[freeform] design start ${label}`)
      designed.slides.push(await designPage(slide, { callModel, maxAttempts: opts.maxAttempts }))
      console.log(`[freeform] design done ${label}`)
    }
    await writeCheckpoint(checkpointPath, designed)
  }

  const malformed = designed.slides
    .filter(slide => !isWellFormedSection(slide.section_html))
    .map(slide => slide.page_no)
  if (malformed.length) throw new Error(`malformed section_html on pages: ${malformed.join(', ')}`)

  const html = await assembleFreeformDeck(designed, { style: opts.style })
  const resolvedOutput = path.resolve(outputHtml)
  await fs.mkdir(path.dirname(resolvedOutput), { recursive: true })
  await fs.writeFile(resolvedOutput, html)
  await writeCheckpoint(checkpointPath, designed)
  console.log(`[freeform] ${designed.slides.length} slides -> ${outputHtml}`)
  console.log(`[freeform] designed deck -> ${checkpointPath}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
