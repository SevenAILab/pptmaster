import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { flattenSkeleton, parseSkeleton, validateSkeleton } from './deck-skeleton.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const good = {
  cover: { title: 'LUMA 品牌定位方案', subtitle: '2026' },
  toc: ['第1章 诊断', '第2章 定位'],
  brief_opening: {
    situation: 'LUMA 已有 12 家直营网点',
    complication: '增长放缓且精品咖啡认知模糊',
    question: 'LUMA 应占据什么差异化定位',
  },
  sections: [
    {
      section_no: 1,
      title: '诊断',
      transition_question: '增长真问题到底在哪？',
      covers: ['root_answer'],
      pages: [{
        governing_thought: '增长正从开店红利切到复购红利',
        points: ['门店增速放缓', '复购见顶'],
        evidence_refs: ['ind-03'],
        data_refs: [{ source: 'analysis-card:ind-03', type: 'analysis_card', source_tier: 'T2' }],
        evidence_kind: 'deductive',
        validation_method: '用会员复购数据验证',
        layout_hint: 'metric',
      }],
      closing_judgment: '必须重新定位撬动复购',
    },
    {
      section_no: 2,
      title: '定位',
      transition_question: 'LUMA 该占据哪个心智空位？',
      pages: [{
        governing_thought: 'LUMA 应占据日常可及的专业精品',
        points: ['竞品两端留下中间带'],
        evidence_refs: ['comp-02'],
        data_refs: [{ source: 'analysis-card:comp-02', type: 'analysis_card', source_tier: 'T2' }],
        evidence_kind: 'deductive',
        layout_hint: 'comparison',
      }],
      closing_judgment: '定位锚点已立',
    },
  ],
  conclusion: {
    governing_thought: '日常可及的专业精品是 LUMA 最可执行的心智位置',
    action_items: ['统一门店表达', '重构会员复购机制'],
  },
}

const parsed = parseSkeleton(JSON.stringify(good))
assert.equal(parsed.sections.length, 2)
assert.deepEqual(validateSkeleton(parsed, { requiredConclusions: [{ id: 'root_answer', label: '根问题回答' }] }).violations, [])

const slides = flattenSkeleton(parsed)
const kinds = slides.map(slide => slide.page_kind)
assert.deepEqual(kinds.slice(0, 4), ['cover', 'toc', 'brief', 'section_intro'])
assert.ok(kinds.includes('content'))
assert.ok(kinds.includes('closing'))
assert.equal(kinds.at(-2), 'conclusion')
assert.equal(kinds.at(-1), 'action')
assert.deepEqual(slides.map(slide => slide.page_no), slides.map((_, index) => index + 1))
assert.equal(slides[0].action_title, 'LUMA 品牌定位方案')

const content = slides.find(slide => slide.page_kind === 'content')
assert.equal(content.action_title, '增长正从开店红利切到复购红利')
assert.deepEqual(content.core_points, ['门店增速放缓', '复购见顶'])
assert.deepEqual(content.evidence_refs, ['ind-03'])
assert.equal(content.layout, 'metric')
assert.equal(content.layout_hint, 'metric')

const noCover = { ...good, cover: { title: '' } }
assert.ok(validateSkeleton(parseSkeleton(noCover)).violations.some(v => v.includes('cover')))

const topicOnly = JSON.parse(JSON.stringify(good))
topicOnly.sections[0].pages[0].governing_thought = '品牌定位'
assert.ok(validateSkeleton(parseSkeleton(topicOnly)).violations.some(v => v.includes('话题词')))

const noEvidenceRefs = JSON.parse(JSON.stringify(good))
noEvidenceRefs.sections[0].pages[0].evidence_refs = []
assert.ok(validateSkeleton(parseSkeleton(noEvidenceRefs)).violations.some(v => v.includes('evidence_refs')))

const over = JSON.parse(JSON.stringify(good))
over.sections[0].pages[0].points = ['a', 'b', 'c', 'd', 'e']
assert.ok(validateSkeleton(parseSkeleton(over)).violations.some(v => v.includes('超过 4')))

const uncovered = JSON.parse(JSON.stringify(good))
uncovered.sections[0].covers = []
assert.ok(validateSkeleton(parseSkeleton(uncovered), { requiredConclusions: [{ id: 'root_answer', label: '根问题回答' }] })
  .violations.some(v => v.includes('必备结论未被覆盖')))

assert.throws(() => parseSkeleton('no json'), /No JSON/)

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pptmaster-skeleton-'))
try {
  const skeletonPath = path.join(tmp, 'deck.skeleton.json')
  fs.writeFileSync(skeletonPath, JSON.stringify(parsed, null, 2))
  const check = spawnSync(process.env.PYTHON || 'python3', [
    path.join(REPO_ROOT, 'skills/proposal-narrative/scripts/check_deck_skeleton.py'),
    skeletonPath,
  ], { encoding: 'utf8' })
  assert.equal(check.status, 0, check.stdout + check.stderr)
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}

console.log('✅ deck-skeleton: parse + validate + flatten + python gate passed')
