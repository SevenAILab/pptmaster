import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  compareDecks,
  compareScorecards,
  formatComparisonMarkdown,
  readScorecard,
} from './compare-decks.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const blueprintDeck = {
  slides: Array.from({ length: 8 }, (_, index) => ({
    page_no: index + 1,
    action_title: index < 4 ? '重复判断：PPTAgent 不是 AI PPT 工具' : `判断 ${index + 1}`,
    core_points: index < 4 ? ['重复论据'] : [`论据 ${index + 1}`],
    data_refs: [{ source: 'inputs/demo/summary.md', type: 'client_input', source_tier: 'T1' }],
  })),
}
const nonlockedDeck = {
  slides: [
    ['PPTAgent 应抢占品牌策划方案 Agent 心智', '品类心智先行'],
    ['核心人群先锁定高频提案的顾问与小团队', '人群选择收窄'],
    ['RTB 来自 Sub-Agent 分工和 Seven 方法论资产', '可信度来源'],
    ['HTML 横向翻页 PPT 只是交付载体不是价值本体', '产品表达降噪'],
    ['增长验证要看用户能否复述品牌策划方案 Agent', '验证动作明确'],
  ].map(([title, point], index) => ({
    page_no: index + 1,
    action_title: title,
    core_points: [point],
    data_refs: [{ source: 'inputs/demo/summary.md', type: 'client_input', source_tier: 'T1' }],
  })),
}

const deckComparison = compareDecks(blueprintDeck, nonlockedDeck, {
  labels: ['blueprint', 'nonlocked'],
  budgets: [{ min: 8, max: 60 }, { min: 5, max: 8 }],
})
assert.equal(deckComparison.labels.a, 'blueprint')
assert.equal(deckComparison.labels.b, 'nonlocked')
assert.equal(deckComparison.pages.a, 8)
assert.equal(deckComparison.pages.b, 5)
assert.equal(deckComparison.pages.delta, -3)
assert.ok(deckComparison.repetition.a > deckComparison.repetition.b)
assert.ok(deckComparison.insightDensity.b >= deckComparison.insightDensity.a)

const scoreA = {
  pages: 80,
  repetition: { repetitionRate: 0.075 },
  insightDensity: { density: 0.925 },
  actionability: { ratio: 0.675 },
  externalEvidence: { externalEmpiricalRatio: 0.0125 },
  semantic: {
    semanticRepetitionRate: 0.35,
    newInsightRate: 0.7,
    empiricalRatio: 0.25,
    deductiveRate: 0.6,
    hypothesisRate: 0.15,
  },
}
const scoreB = {
  pages: 6,
  repetition: { repetitionRate: 0 },
  insightDensity: { density: 1 },
  actionability: { ratio: 1 },
  externalEvidence: { externalEmpiricalRatio: 0.1 },
  semantic: {
    semanticRepetitionRate: 0.1,
    newInsightRate: 0.9,
    empiricalRatio: 0.4,
    deductiveRate: 0.5,
    hypothesisRate: 0.1,
  },
}
const scoreComparison = compareScorecards(scoreA, scoreB, { labels: ['blueprint', 'nonlocked'] })
assert.equal(scoreComparison.pages.delta, -74)
assert.equal(scoreComparison.semanticRepetitionRate.delta, -0.25)
assert.equal(scoreComparison.newInsightRate.delta, 0.2)
assert.equal(scoreComparison.empiricalRatio.delta, 0.15)
assert.equal(scoreComparison.deductiveRate.delta, -0.1)

const md = formatComparisonMarkdown(scoreComparison)
assert.match(md, /semanticRepetitionRate/)
assert.match(md, /newInsightRate/)
assert.match(md, /blueprint/)
assert.match(md, /nonlocked/)

const partialSemantic = compareScorecards(scoreA, { pages: 6, repetition: { repetitionRate: 0 } })
assert.equal(partialSemantic.semanticRepetitionRate.b, null)
assert.equal(partialSemantic.semanticRepetitionRate.delta, null)
assert.match(formatComparisonMarkdown(partialSemantic), /semanticRepetitionRate \| 35\.0% \| - \| -/)

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pptmaster-compare-'))
try {
  const a = path.join(tmp, 'a-score.json')
  const b = path.join(tmp, 'b-score.json')
  fs.writeFileSync(a, JSON.stringify(scoreA))
  fs.writeFileSync(b, JSON.stringify(scoreB))
  assert.equal(readScorecard(a).pages, 80)

  const cli = spawnSync('node', [
    path.join(REPO_ROOT, 'scripts/compare-decks.mjs'),
    a,
    b,
    '--scorecards',
    '--labels', 'blueprint,nonlocked',
  ], { encoding: 'utf8' })
  assert.equal(cli.status, 0, cli.stderr)
  assert.match(cli.stdout, /semanticRepetitionRate/)
  assert.match(cli.stdout, /newInsightRate/)
  assert.match(cli.stdout, /blueprint/)
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}

console.log('✅ compare-decks: deterministic and semantic scorecard comparison passed')
