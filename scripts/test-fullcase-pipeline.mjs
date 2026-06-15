import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runFullcasePipeline } from './fullcase-pipeline.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pptmaster-fullcase-'))
try {
  const brief = {
    slug: 'pipe-test',
    form: { name: 'LUMA', industry: '精品咖啡', target_audience: ['白领'], render_style: 'swiss' },
    formText: '{"name":"LUMA","industry":"精品咖啡"}',
    summary: '摘要',
    strategicQuestion: '# 根问题\n如何定位？',
  }
  const requiredConclusions = [{ id: 'root_answer', label: '根问题回答' }]
  const stubSkeleton = {
    cover: { title: 'LUMA 品牌定位方案', subtitle: '2026' },
    toc: ['第1章 诊断', '第2章 定位'],
    brief_opening: {
      situation: 'LUMA 已有 12 家店',
      complication: '增长放缓且精品咖啡认知模糊',
      question: 'LUMA 应占据什么差异化定位',
    },
    sections: [
      {
        section_no: 1,
        title: '诊断',
        transition_question: '增长真问题在哪？',
        covers: ['root_answer'],
        pages: [
          { governing_thought: '增长正从开店红利切到复购红利', points: ['门店增速放缓'], evidence_refs: ['ind-01'], layout_hint: 'metric' },
          { governing_thought: '复购红利要求重新定义门店角色', points: ['门店承担信任证明'], evidence_refs: ['self-01'], layout_hint: 'framework' },
        ],
        closing_judgment: '必须重新定位撬动复购',
      },
      {
        section_no: 2,
        title: '定位',
        transition_question: '该占哪个空位？',
        pages: [
          { governing_thought: 'LUMA 应占据日常可及的专业精品', points: ['竞品两端留下中间带'], evidence_refs: ['comp-01'], layout_hint: 'comparison' },
          { governing_thought: '专业精品必须被会员机制持续证明', points: ['会员机制让专业可感知'], evidence_refs: ['user-01'], layout_hint: 'steps' },
        ],
        closing_judgment: '定位锚点已立',
      },
    ],
    conclusion: {
      governing_thought: '日常可及的专业精品是 LUMA 最可执行的定位',
      action_items: ['统一门店表达', '重构会员复购机制'],
    },
  }
  const draftStub = section => JSON.stringify({
    pages: section.pages.map((page, index) => ({
      ...page,
      governing_thought: `${page.governing_thought}（深化${section.section_no}-${index + 1}）`,
      data_refs: [{ source: `inputs/pipe-test/summary.md#${section.section_no}-${index + 1}`, type: 'client_input', source_tier: 'T1' }],
      evidence_kind: 'deductive',
      validation_method: '访谈验证',
      blocks: [{ type: 'callout', text: `c${section.section_no}${index}` }],
    })),
    chapter_takeaways: [`第${section.section_no}章结论`],
  })
  let outlineCalls = 0
  const callModel = async (system, user) => {
    if (system.includes('完整方案的 deck 骨架')) {
      assert.match(system, /proposal-narrative 方法论指引/)
      assert.match(system, /契约 B/)
      outlineCalls += 1
      return JSON.stringify(stubSkeleton)
    }
    assert.match(system, /只填.*content 页/)
    assert.match(system, /proposal-narrative 方法论指引/)
    const match = user.match(/"section_no": (\d)/)
    const section = stubSkeleton.sections[Number(match[1]) - 1]
    return draftStub(section)
  }

  const runDir = path.join(tmp, 'run')
  const result = await runFullcasePipeline({
    brief,
    runDir,
    callModel,
    requiredConclusions,
    options: { root: REPO_ROOT, minPages: 4, maxPages: 6 },
  })
  assert.equal(outlineCalls, 1)
  assert.equal(result.deck.metadata.schema, 'fullcase-deck-v2')
  assert.deepEqual(result.deck.slides.map(slide => slide.page_no), Array.from({ length: result.deck.slides.length }, (_, i) => i + 1))
  assert.deepEqual(result.deck.slides.slice(0, 4).map(slide => slide.page_kind), ['cover', 'toc', 'brief', 'section_intro'])
  assert.equal(result.deck.slides.filter(slide => slide.page_kind === 'content').length, 4)
  assert.ok(result.deck.slides.some(slide => slide.page_kind === 'conclusion'))
  assert.ok(result.deck.slides.some(slide => slide.page_kind === 'action'))
  assert.equal(result.locks.ok, true, result.locks.violations?.join('; '))
  assert.ok(fs.existsSync(path.join(runDir, 'outline.json')))
  assert.ok(fs.existsSync(path.join(runDir, 'deck.skeleton.json')))
  assert.ok(fs.existsSync(path.join(runDir, 'chapters', 'ch-1.json')))
  assert.ok(fs.existsSync(path.join(runDir, 'chapters', 'ch-2.json')))
  const traces = fs.readdirSync(path.join(runDir, 'trace')).sort()
  assert.deepEqual(traces, ['01-outline.json', '02-draft.json'])
  const outlineTrace = JSON.parse(fs.readFileSync(path.join(runDir, 'trace', '01-outline.json'), 'utf8'))
  assert.equal(outlineTrace.injected.skill, 'proposal-narrative')
  const draftTrace = JSON.parse(fs.readFileSync(path.join(runDir, 'trace', '02-draft.json'), 'utf8'))
  assert.equal(draftTrace.output.content_pages, 4)

  let chapterCallCount = 0
  const resumed = await runFullcasePipeline({
    brief,
    runDir,
    callModel: async (system, user) => {
      if (system.includes('完整方案的 deck 骨架')) return JSON.stringify(stubSkeleton)
      chapterCallCount += 1
      const section = stubSkeleton.sections[0]
      return draftStub(section)
    },
    requiredConclusions,
    options: { root: REPO_ROOT, minPages: 4, maxPages: 6 },
  })
  assert.equal(resumed.deck.slides.filter(slide => slide.page_kind === 'content').length, 4)
  assert.equal(chapterCallCount, 0, 'resume 时已完成章不应再调模型')

  let outlineOnlyChapterCalls = 0
  const outlineOnlyRunDir = path.join(tmp, 'run-outline-only')
  const outlined = await runFullcasePipeline({
    brief,
    runDir: outlineOnlyRunDir,
    callModel: async (system, user) => {
      if (system.includes('完整方案的 deck 骨架')) return JSON.stringify(stubSkeleton)
      outlineOnlyChapterCalls += 1
      return draftStub(stubSkeleton.sections[0])
    },
    requiredConclusions,
    options: { root: REPO_ROOT, minPages: 4, maxPages: 6, outlineOnly: true },
  })
  assert.equal(outlined.skeleton.sections.length, 2)
  assert.equal(outlineOnlyChapterCalls, 0)
  assert.ok(fs.existsSync(path.join(outlineOnlyRunDir, 'outline.json')))
  assert.equal(fs.existsSync(path.join(outlineOnlyRunDir, 'deck.json')), false)

  const badModel = async system => system.includes('完整方案的 deck 骨架')
    ? JSON.stringify({ ...stubSkeleton, sections: stubSkeleton.sections.map(section => ({ ...section, covers: [] })) })
    : '{}'
  await assert.rejects(runFullcasePipeline({
    brief,
    runDir: path.join(tmp, 'run-bad'),
    callModel: badModel,
    requiredConclusions,
    options: { root: REPO_ROOT, minPages: 4, maxPages: 6 },
  }), /大纲骨架校验未通过/)

  let retryCalls = 0
  const retryModel = async (system, user) => {
    if (system.includes('完整方案的 deck 骨架')) {
      retryCalls += 1
      return retryCalls === 1
        ? JSON.stringify({ ...stubSkeleton, cover: { title: '' } })
        : JSON.stringify(stubSkeleton)
    }
    const match = user.match(/"section_no": (\d)/)
    return draftStub(stubSkeleton.sections[Number(match[1]) - 1])
  }
  const retried = await runFullcasePipeline({
    brief,
    runDir: path.join(tmp, 'run-retry'),
    callModel: retryModel,
    requiredConclusions,
    options: { root: REPO_ROOT, minPages: 4, maxPages: 6, outlineAttempts: 2 },
  })
  assert.equal(retried.deck.slides.filter(slide => slide.page_kind === 'content').length, 4)
  assert.equal(retryCalls, 2)
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}

console.log('✅ fullcase-pipeline: skeleton -> content pages -> flatten -> locks passed')
