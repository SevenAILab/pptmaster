import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { addModule, createBrandContent } from '../core/content-model.mjs'
import { readRunEvents } from '../core/runtime/event-ledger.mjs'
import { runFullcasePipeline } from './fullcase-pipeline.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pptmaster-spine-pipeline-'))
try {
  const brief = {
    slug: 'spine-test',
    form: { name: 'LUMA', industry: '精品咖啡' },
    formText: '{"name":"LUMA","industry":"精品咖啡"}',
    summary: '摘要',
    strategicQuestion: '如何围绕品质便捷建立品牌？',
  }
  const analysisCards = {
    cards: [
      { id: 'comp-1', claim: '竞品只讲便捷', source: 'x', source_tier: 'T2', analysis_type: 'competitor' },
      { id: 'usr-1', claim: '用户愿为品质付费', source: 'y', source_tier: 'T1', analysis_type: 'user' },
    ],
  }
  const skeleton = {
    cover: { title: 'LUMA 品牌方案', subtitle: '2026' },
    toc: ['定位'],
    brief_opening: { situation: 's', complication: 'c', question: 'q' },
    sections: [{
      section_no: 1,
      title: '定位',
      transition_question: '为什么是品质便捷？',
      covers: ['root_answer'],
      pages: [{
        governing_thought: '品质便捷必须被体验证明',
        points: ['品质', '便捷'],
        evidence_refs: ['comp-1'],
        layout_hint: 'split-statement',
      }],
      closing_judgment: '品质便捷成立',
    }],
    conclusion: { governing_thought: '品质便捷是 LUMA 的主线', action_items: ['统一表达'] },
  }
  let strategyCalls = 0
  let outlineSawSpine = false
  let draftSawSpine = false
  const callModel = async (system, user) => {
    if (system.includes('恰好 3 个战略方向')) {
      strategyCalls += 1
      return JSON.stringify({ directions: [
        { id: 'd1', positioning: '品质便捷', tension: '用户要品质但市场只给便捷', mission: 'm', vision: 'v', proposition: 'p', niche_basis: 'n', evidence_refs: ['comp-1', 'usr-1'] },
        { id: 'd2', positioning: '社群品质', tension: '用户要归属但品牌只讲产品', mission: 'm', vision: 'v', proposition: 'p', niche_basis: 'n', evidence_refs: ['usr-1'] },
        { id: 'd3', positioning: '效率精品', tension: '精品难规模化', mission: 'm', vision: 'v', proposition: 'p', niche_basis: 'n', evidence_refs: ['comp-1'] },
      ] })
    }
    if (system.includes('完整方案的 deck 骨架')) {
      outlineSawSpine = system.includes('品质便捷') || user.includes('品质便捷')
      return JSON.stringify(skeleton)
    }
    draftSawSpine = system.includes('品质便捷') || user.includes('品质便捷')
    return JSON.stringify({
      pages: [{
        governing_thought: '品质便捷必须被体验证明',
        points: ['品质', '便捷'],
        evidence_refs: ['comp-1'],
        data_refs: [{ source: 'inputs/spine-test/summary.md', type: 'client_input', source_tier: 'T1' }],
        evidence_kind: 'deductive',
        validation_method: '访谈验证',
        layout_hint: 'split-statement',
        blocks: [{ type: 'callout', text: '品质便捷' }],
      }],
      chapter_takeaways: ['品质便捷成立'],
    })
  }

  let coherenceContent = createBrandContent({ brand_slug: 'spine-test', brand_type: 'new_consumer_full' })
  coherenceContent = {
    ...coherenceContent,
    strategic_spine: {
      positioning_statement: '品质便捷',
      mission: 'm',
      vision: 'v',
      proposition: 'p',
      locked: true,
      locked_at: 'now',
      chosen_direction_id: 'd1',
    },
  }
  coherenceContent = addModule(coherenceContent, {
    id: 'strategy',
    kind: 'strategy_core',
    visibility: 'external',
    depth_level: 'L3',
  content: { body: '品质便捷是本品牌的核心战略。' },
  spine_alignment: '品质便捷',
  evidence_refs: ['comp-1'],
})

  const runDir = path.join(tmp, 'run')
  const result = await runFullcasePipeline({
    brief,
    runDir,
    callModel,
    requiredConclusions: [{ id: 'root_answer', label: '根问题回答' }],
    analysisCards,
    options: {
      root: REPO_ROOT,
      minPages: 1,
      maxPages: 3,
      brandSystemContent: createBrandContent({ brand_slug: 'spine-test', brand_type: 'new_consumer_full' }),
      strategyPick: 'd1',
      coherenceContent,
    },
  })
  assert.equal(strategyCalls, 1)
  assert.equal(result.brandContent.strategic_spine.locked, true)
  assert.equal(result.brandContent.strategic_spine.positioning_statement, '品质便捷')
  assert.equal(outlineSawSpine, true)
  assert.equal(draftSawSpine, true)
  assert.equal(result.coherence.ok, true)
  const events = await readRunEvents(runDir)
  assert.ok(events.some(event => event.event_type === 'strategy_locked'))
  assert.ok(events.some(event => event.event_type === 'coherence_passed'))
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}

console.log('✅ pipeline-spine-wiring tests passed')
