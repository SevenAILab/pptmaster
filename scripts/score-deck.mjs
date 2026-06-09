#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { scoreDeck } from './deck-quality-score.mjs'

function parseArgs(argv) {
  const opts = { chunks: false, json: false, budget: undefined }
  const positional = []
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--chunks') {
      opts.chunks = true
    } else if (arg === '--json') {
      opts.json = true
    } else if (arg === '--budget') {
      const [min, max] = String(argv[index + 1] || '').split(',').map(Number)
      opts.budget = { min, max }
      index += 1
    } else if (arg.startsWith('--budget=')) {
      const [min, max] = arg.slice('--budget='.length).split(',').map(Number)
      opts.budget = { min, max }
    } else {
      positional.push(arg)
    }
  }
  return { target: positional[0], opts }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function loadDeck(target, opts) {
  if (opts.chunks) {
    const files = fs.readdirSync(target)
      .filter(file => file.endsWith('.json') && !file.includes('prompt-bundle'))
      .sort()
    const slides = []
    for (const file of files) {
      const data = readJson(path.join(target, file))
      for (const slide of data.slides || []) {
        slides.push({ ...slide, _source_chunk: file })
      }
    }
    slides.sort((a, b) => (a.page_no || 0) - (b.page_no || 0))
    return {
      deck: { slides },
      input: {
        sourceType: 'chunks',
        sourcePath: target,
        sourceFiles: files.length,
      },
    }
  }

  return {
    deck: readJson(target),
    input: {
      sourceType: 'deck',
      sourcePath: target,
      sourceFiles: 1,
    },
  }
}

function percent(value) {
  return `${Math.round(value * 100)}%`
}

function toMarkdown(score) {
  return [
    `# Deck 质量评分卡（${score.pages} 页）`,
    '',
    `输入：${score.inputDiagnostics.sourceType} · ${score.inputDiagnostics.sourcePath}`,
    `文件数：${score.inputDiagnostics.sourceFiles} · 页码范围：${score.inputDiagnostics.minPage ?? '-'}-${score.inputDiagnostics.maxPage ?? '-'} · 重复页码数：${score.inputDiagnostics.duplicatePageNumbers}`,
    '',
    '| 维度 | 值 |',
    '|---|---|',
    `| 页数纪律 | ${score.pages} 页，预算[${score.pageDiscipline.min},${score.pageDiscipline.max}]，达标=${score.pageDiscipline.within} |`,
    `| 实证比例 | 有出处页 ${percent(score.evidenceRatio.sourcedRatio)}；强证据(T1/T2) ${percent(score.evidenceRatio.strongRatio)}；带数字页中带出处 ${percent(score.evidenceRatio.groundedNumberRatio)} |`,
    `| 落地性 | ${percent(score.actionability.ratio)}（抽象页：${score.actionability.abstractPages.join(', ') || '无'}） |`,
    `| 跨页重复率 | ${percent(score.repetition.repetitionRate)}（近重复对：${score.repetition.duplicatePairs.length}） |`,
    `| 洞察密度 | ${percent(score.insightDensity.density)}（${score.insightDensity.distinctInsights}/${score.insightDensity.pages} 不同洞察） |`,
    '',
    `备注：${score.actionability.heuristicNote}`,
  ].join('\n')
}

function main() {
  const { target, opts } = parseArgs(process.argv.slice(2))
  if (!target) {
    console.error('Usage: node scripts/score-deck.mjs <deck.json | dir --chunks> [--json] [--budget min,max]')
    process.exit(2)
  }
  const { deck, input } = loadDeck(target, opts)
  const score = scoreDeck(deck, { budget: opts.budget, input })
  console.log(opts.json ? JSON.stringify(score, null, 2) : toMarkdown(score))
}

main()
