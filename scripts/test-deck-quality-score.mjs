import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  actionability,
  charNgrams,
  crossPageRepetition,
  evidenceRatio,
  insightDensity,
  jaccard,
  pageDiscipline,
  scoreDeck,
} from './deck-quality-score.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

assert.deepEqual([...charNgrams('品牌定位', 3)], ['品牌定', '牌定位'])
assert.deepEqual([...charNgrams('a b c', 3)], ['abc'])
assert.equal(charNgrams('短', 3).size, 0)
assert.equal(jaccard(new Set(['a', 'b']), new Set(['a', 'b'])), 1)
assert.equal(jaccard(new Set(['a', 'b']), new Set(['c', 'd'])), 0)
assert.equal(jaccard(new Set(), new Set()), 1)
assert.equal(jaccard(charNgrams('品牌定位升级', 3), charNgrams('品牌定位升级', 3)), 1)

const deck13 = { slides: Array.from({ length: 13 }, (_, i) => ({ page_no: i + 1 })) }
let pd = pageDiscipline(deck13, { min: 8, max: 12 })
assert.equal(pd.pages, 13)
assert.equal(pd.within, false)
assert.equal(pd.over, 1)
assert.equal(pd.under, 0)
pd = pageDiscipline(deck13, { min: 8, max: 60 })
assert.equal(pd.within, true)
assert.deepEqual(pageDiscipline({ slides: [] }, { min: 8, max: 60 }), {
  pages: 0,
  min: 8,
  max: 60,
  within: false,
  over: 0,
  under: 8,
})

const evDeck = {
  slides: [
    {
      page_no: 1,
      action_title: '复购率达到 8.6%',
      core_points: [],
      data_refs: [{ source: 'inputs/demo/first-party/a.md' }],
    },
    {
      page_no: 2,
      action_title: '应建立品牌护城河',
      core_points: [],
      data_refs: [],
    },
  ],
}
const er = evidenceRatio(evDeck, { slug: 'demo' })
assert.equal(er.slides, 2)
assert.equal(er.sourcedRatio, 0.5)
assert.equal(er.strongRatio, 0.5)
assert.equal(er.groundedNumberRatio, 1)
assert.deepEqual(er.unsourcedNumberPages, [])

const actDeck = {
  slides: [
    { page_no: 1, action_title: '第一步：3 个月内上线投放', core_points: [] },
    { page_no: 2, action_title: '品牌应具备差异化心智', core_points: [] },
    { page_no: 3, action_title: '客单价提升至 199元', core_points: [] },
  ],
}
const ab = actionability(actDeck)
assert.equal(ab.slides, 3)
assert.equal(Math.round(ab.ratio * 100), 67)
assert.deepEqual(ab.abstractPages, [2])

const repDeck = {
  slides: [
    { page_no: 1, action_title: '从 AI PPT 工具升级为品牌策划方案 Agent', core_points: [] },
    { page_no: 2, action_title: '从 AI PPT 工具升级为品牌策划方案 Agent', core_points: [] },
    { page_no: 3, action_title: '消费者洞察：原点人群是独立品牌顾问', core_points: [] },
  ],
}
const rep = crossPageRepetition(repDeck, { threshold: 0.5, n: 3 })
assert.equal(rep.slides, 3)
assert.equal(rep.duplicatePairs.length, 1)
assert.deepEqual({ a: rep.duplicatePairs[0].a, b: rep.duplicatePairs[0].b }, { a: 1, b: 2 })
assert.equal(Math.round(rep.repetitionRate * 100), 33)
assert.deepEqual(rep.duplicatePages, [2])

const den = insightDensity(repDeck, { threshold: 0.5, n: 3 })
assert.equal(den.pages, 3)
assert.equal(den.distinctInsights, 2)
assert.equal(Math.round(den.density * 100), 67)

const full = scoreDeck(repDeck, { budget: { min: 8, max: 60 }, slug: 'demo' })
assert.equal(full.pages, 3)
assert.ok('inputDiagnostics' in full)
assert.ok('pageDiscipline' in full)
assert.ok('evidenceRatio' in full)
assert.ok('actionability' in full)
assert.ok('repetition' in full)
assert.ok('insightDensity' in full)
assert.equal(full.repetition.duplicatePairs.length, 1)
assert.equal(full.insightDensity.distinctInsights, 2)

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pptmaster-quality-'))
try {
  const deckFile = path.join(tmp, 'deck.json')
  fs.writeFileSync(deckFile, JSON.stringify({
    slides: [
      {
        page_no: 1,
        action_title: '第一步：3 个月内上线 199元 套餐',
        core_points: [],
        data_refs: [{ source: 'inputs/demo/first-party/a.md' }],
      },
      {
        page_no: 2,
        action_title: '第一步：3 个月内上线 199元 套餐',
        core_points: [],
        data_refs: [],
      },
    ],
  }))
  const cli = path.join(REPO_ROOT, 'scripts/score-deck.mjs')
  const r = spawnSync('node', [cli, deckFile, '--json'], { encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  const out = JSON.parse(r.stdout)
  assert.equal(out.pages, 2)
  assert.equal(out.repetition.duplicatePairs.length, 1)

  const chunkDir = path.join(tmp, 'chunks')
  fs.mkdirSync(chunkDir)
  fs.writeFileSync(path.join(chunkDir, 'b.json'), JSON.stringify({
    slides: [{ page_no: 2, action_title: 'B', core_points: [] }],
  }))
  fs.writeFileSync(path.join(chunkDir, 'a.json'), JSON.stringify({
    slides: [{ page_no: 1, action_title: 'A', core_points: [] }],
  }))
  fs.writeFileSync(path.join(chunkDir, 'a.prompt-bundle.json'), JSON.stringify({
    slides: [{ page_no: 99, action_title: 'ignored', core_points: [] }],
  }))
  const r2 = spawnSync('node', [cli, chunkDir, '--chunks', '--json'], { encoding: 'utf8' })
  assert.equal(r2.status, 0, r2.stderr)
  const out2 = JSON.parse(r2.stdout)
  assert.equal(out2.pages, 2)
  assert.equal(out2.inputDiagnostics.sourceFiles, 2)
  assert.equal(out2.inputDiagnostics.minPage, 1)
  assert.equal(out2.inputDiagnostics.maxPage, 2)
  assert.equal(out2.inputDiagnostics.duplicatePageNumbers, 0)
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}

console.log('✅ deck-quality-score: all metrics + CLI passed')
