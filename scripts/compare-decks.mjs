#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scoreDeck } from './deck-quality-score.mjs'

function number(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function maybeNumber(value) {
  if (value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function metric(a, b) {
  const left = maybeNumber(a)
  const right = maybeNumber(b)
  return {
    a: left,
    b: right,
    delta: left === null || right === null ? null : Number((right - left).toFixed(6)),
  }
}

function get(obj, pathText) {
  return pathText.split('.').reduce((current, part) => current?.[part], obj)
}

export function compareDecks(deckA, deckB, options = {}) {
  const labels = options.labels || ['deckA', 'deckB']
  const budgets = options.budgets || [{ min: 8, max: 60 }, { min: 5, max: 8 }]
  const scoreA = scoreDeck(deckA, { budget: budgets[0] })
  const scoreB = scoreDeck(deckB, { budget: budgets[1] })
  return {
    kind: 'decks',
    labels: { a: labels[0], b: labels[1] },
    pages: metric(scoreA.pages, scoreB.pages),
    pageBudget: {
      a: scoreA.pageDiscipline,
      b: scoreB.pageDiscipline,
    },
    repetition: metric(scoreA.repetition.repetitionRate, scoreB.repetition.repetitionRate),
    insightDensity: metric(scoreA.insightDensity.density, scoreB.insightDensity.density),
    actionability: metric(scoreA.actionability.ratio, scoreB.actionability.ratio),
    externalEmpiricalRatio: metric(scoreA.externalEvidence.externalEmpiricalRatio, scoreB.externalEvidence.externalEmpiricalRatio),
    sourcedRatio: metric(scoreA.evidenceRatio.sourcedRatio, scoreB.evidenceRatio.sourcedRatio),
    strongRatio: metric(scoreA.evidenceRatio.strongRatio, scoreB.evidenceRatio.strongRatio),
    scorecards: { a: scoreA, b: scoreB },
  }
}

export function compareScorecards(scoreA, scoreB, options = {}) {
  const labels = options.labels || ['scoreA', 'scoreB']
  return {
    kind: 'scorecards',
    labels: { a: labels[0], b: labels[1] },
    pages: metric(get(scoreA, 'pages'), get(scoreB, 'pages')),
    repetitionRate: metric(get(scoreA, 'repetition.repetitionRate'), get(scoreB, 'repetition.repetitionRate')),
    insightDensity: metric(get(scoreA, 'insightDensity.density'), get(scoreB, 'insightDensity.density')),
    actionability: metric(get(scoreA, 'actionability.ratio'), get(scoreB, 'actionability.ratio')),
    externalEmpiricalRatio: metric(get(scoreA, 'externalEvidence.externalEmpiricalRatio'), get(scoreB, 'externalEvidence.externalEmpiricalRatio')),
    sourcedRatio: metric(get(scoreA, 'evidenceRatio.sourcedRatio'), get(scoreB, 'evidenceRatio.sourcedRatio')),
    strongRatio: metric(get(scoreA, 'evidenceRatio.strongRatio'), get(scoreB, 'evidenceRatio.strongRatio')),
    semanticRepetitionRate: metric(get(scoreA, 'semantic.semanticRepetitionRate'), get(scoreB, 'semantic.semanticRepetitionRate')),
    newInsightRate: metric(get(scoreA, 'semantic.newInsightRate'), get(scoreB, 'semantic.newInsightRate')),
    empiricalRatio: metric(get(scoreA, 'semantic.empiricalRatio'), get(scoreB, 'semantic.empiricalRatio')),
    deductiveRate: metric(get(scoreA, 'semantic.deductiveRate'), get(scoreB, 'semantic.deductiveRate')),
    hypothesisRate: metric(get(scoreA, 'semantic.hypothesisRate'), get(scoreB, 'semantic.hypothesisRate')),
  }
}

export function readScorecard(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function formatValue(name, value) {
  if (value === null || value === undefined) return '-'
  if (name === 'pages') return String(value)
  return `${(number(value) * 100).toFixed(1)}%`
}

export function formatComparisonMarkdown(comparison) {
  const metricNames = Object.keys(comparison)
    .filter(key => comparison[key] && typeof comparison[key] === 'object' && 'delta' in comparison[key])
  const lines = [
    `# Deck Comparison (${comparison.labels.a} vs ${comparison.labels.b})`,
    '',
    '| metric | ' + comparison.labels.a + ' | ' + comparison.labels.b + ' | delta |',
    '|---|---:|---:|---:|',
  ]
  for (const name of metricNames) {
    const item = comparison[name]
    lines.push(`| ${name} | ${formatValue(name, item.a)} | ${formatValue(name, item.b)} | ${formatValue(name, item.delta)} |`)
  }
  return lines.join('\n')
}

function parseArgs(argv) {
  const opts = { scorecards: false, json: false, labels: undefined }
  const positional = []
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--scorecards') opts.scorecards = true
    else if (arg === '--json') opts.json = true
    else if (arg === '--labels') {
      opts.labels = argv[index + 1].split(',').map(s => s.trim())
      index += 1
    } else if (arg.startsWith('--labels=')) {
      opts.labels = arg.slice('--labels='.length).split(',').map(s => s.trim())
    } else {
      positional.push(arg)
    }
  }
  return { a: positional[0], b: positional[1], opts }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

async function cliMain() {
  const { a, b, opts } = parseArgs(process.argv.slice(2))
  if (!a || !b) {
    console.error('Usage: node scripts/compare-decks.mjs <a.json> <b.json> [--scorecards] [--labels a,b] [--json]')
    process.exit(2)
  }
  const comparison = opts.scorecards
    ? compareScorecards(readScorecard(a), readScorecard(b), opts)
    : compareDecks(readJson(a), readJson(b), opts)
  console.log(opts.json ? JSON.stringify(comparison, null, 2) : formatComparisonMarkdown(comparison))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
