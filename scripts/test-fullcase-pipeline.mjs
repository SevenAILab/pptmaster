import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { runFullcasePipeline } from './fullcase-pipeline.mjs'

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
  const stubOutline = {
    narrative: '弧',
    chapters: [1, 2, 3, 4].map(no => ({
      chapter_no: no,
      title: `章${no}`,
      goal: `g${no}`,
      pages_budget: 5,
      key_questions: ['q'],
      covers: no === 1 ? ['root_answer'] : [],
    })),
  }
  const chapterStub = chapter => JSON.stringify({
    slides: Array.from({ length: 5 }, (_, i) => ({
      page_no: i + 1,
      intent: i === 0 ? '章节导入' : `章${chapter.chapter_no} 页${i + 1} 的推进`,
      action_title: `章${chapter.chapter_no} 第 ${i + 1} 个不同判断：${'ABCDE'[i]}${chapter.chapter_no}`,
      layout: i === 0 ? 'hero-statement' : 'split-statement',
      core_points: [`章${chapter.chapter_no}-${i + 1} 论点`],
      data_refs: [{ source: 'inputs/pipe-test/summary.md', type: 'client_input', source_tier: 'T1' }],
      evidence_kind: 'deductive',
      validation_method: '访谈验证',
      blocks: [{ type: 'callout', text: `c${chapter.chapter_no}${i}` }],
    })),
    chapter_takeaways: [`章${chapter.chapter_no} 结论`],
  })
  let outlineCalls = 0
  const callModel = async (system, user) => {
    if (system.includes('叙事大纲')) {
      outlineCalls += 1
      return JSON.stringify(stubOutline)
    }
    const match = user.match(/第 (\d) 章/) || system.match(/第 (\d) 章/)
    const chapter = stubOutline.chapters[Number(match[1]) - 1]
    return chapterStub(chapter)
  }

  const runDir = path.join(tmp, 'run')
  const result = await runFullcasePipeline({
    brief,
    runDir,
    callModel,
    requiredConclusions,
    options: { minPages: 20, maxPages: 30 },
  })
  assert.equal(outlineCalls, 1)
  assert.equal(result.deck.slides.length, 20)
  assert.deepEqual(result.deck.slides.map(slide => slide.page_no), Array.from({ length: 20 }, (_, i) => i + 1))
  assert.equal(result.locks.ok, true, result.locks.violations?.join('; '))
  assert.equal(result.deck.metadata.schema, 'fullcase-deck-v1')
  assert.ok(fs.existsSync(path.join(runDir, 'outline.json')))
  assert.ok(fs.existsSync(path.join(runDir, 'chapters', 'ch-1.json')))
  assert.ok(fs.existsSync(path.join(runDir, 'chapters', 'ch-4.json')))

  let chapterCallCount = 0
  const countingModel = async (system, user) => {
    if (system.includes('叙事大纲')) return JSON.stringify(stubOutline)
    chapterCallCount += 1
    const match = user.match(/第 (\d) 章/) || system.match(/第 (\d) 章/)
    return chapterStub(stubOutline.chapters[Number(match[1]) - 1])
  }
  const resumed = await runFullcasePipeline({
    brief,
    runDir,
    callModel: countingModel,
    requiredConclusions,
    options: { minPages: 20, maxPages: 30 },
  })
  assert.equal(resumed.deck.slides.length, 20)
  assert.equal(chapterCallCount, 0, 'resume 时已完成章不应再调模型')

  let outlineOnlyChapterCalls = 0
  const outlineOnlyRunDir = path.join(tmp, 'run-outline-only')
  const outlined = await runFullcasePipeline({
    brief,
    runDir: outlineOnlyRunDir,
    callModel: async (system, user) => {
      if (system.includes('叙事大纲')) return JSON.stringify(stubOutline)
      outlineOnlyChapterCalls += 1
      return chapterStub(stubOutline.chapters[0])
    },
    requiredConclusions,
    options: { minPages: 20, maxPages: 30, outlineOnly: true },
  })
  assert.equal(outlined.outline.chapters.length, 4)
  assert.equal(outlineOnlyChapterCalls, 0)
  assert.ok(fs.existsSync(path.join(outlineOnlyRunDir, 'outline.json')))
  assert.equal(fs.existsSync(path.join(outlineOnlyRunDir, 'deck.json')), false)

  const badModel = async system => system.includes('叙事大纲')
    ? JSON.stringify({ narrative: 'x', chapters: [{ chapter_no: 1, title: 't', goal: 'g', pages_budget: 50, key_questions: [], covers: [] }] })
    : '{}'
  await assert.rejects(runFullcasePipeline({
    brief,
    runDir: path.join(tmp, 'run-bad'),
    callModel: badModel,
    requiredConclusions,
    options: { minPages: 20, maxPages: 30 },
  }), /大纲校验未通过/)

  let retryCalls = 0
  const retryModel = async (system, user) => {
    if (system.includes('叙事大纲')) {
      retryCalls += 1
      return retryCalls === 1
        ? JSON.stringify({ narrative: 'x', chapters: [{ chapter_no: 1, title: 't', goal: 'g', pages_budget: 12, key_questions: [], covers: ['root_answer'] }] })
        : JSON.stringify(stubOutline)
    }
    const match = user.match(/第 (\d) 章/) || system.match(/第 (\d) 章/)
    const chapter = stubOutline.chapters[Number(match[1]) - 1]
    return chapterStub(chapter)
  }
  const retried = await runFullcasePipeline({
    brief,
    runDir: path.join(tmp, 'run-retry'),
    callModel: retryModel,
    requiredConclusions,
    options: { minPages: 20, maxPages: 30, outlineAttempts: 2 },
  })
  assert.equal(retried.deck.slides.length, 20)
  assert.equal(retryCalls, 2)

  let groupedChapterCalls = 0
  let groupedSawPriorClaimSummary = false
  const groupedModel = async (system, user) => {
    if (system.includes('叙事大纲')) return JSON.stringify(stubOutline)
    groupedChapterCalls += 1
    const chapterNo = Number((user.match(/第 (\d) 章/) || system.match(/第 (\d) 章/))[1])
    const pageMatch = system.match(/第 (\d+)-(\d+) 页/)
    assert.ok(pageMatch, 'maxPagesPerChapterCall 应触发页组生成')
    assert.match(system, /本页新增|语义重复率/)
    if (chapterNo > 1 && user.includes('章1-1 论点')) groupedSawPriorClaimSummary = true
    const start = Number(pageMatch[1])
    const end = Number(pageMatch[2])
    return JSON.stringify({
      slides: Array.from({ length: end - start + 1 }, (_, idx) => {
        const pageNo = start + idx
        return {
          page_no: pageNo,
          intent: pageNo === 1 ? '章节导入' : `章${chapterNo} 页${pageNo} 的推进`,
          action_title: `章${chapterNo} 页组生成第 ${pageNo} 个不同判断`,
          layout: pageNo === 1 ? 'hero-statement' : 'split-statement',
          core_points: [`章${chapterNo}-${pageNo} 论点`],
          data_refs: [{ source: 'inputs/pipe-test/summary.md', type: 'client_input', source_tier: 'T1' }],
          evidence_kind: 'deductive',
          validation_method: '访谈验证',
          blocks: [{ type: 'callout', text: `g${chapterNo}${pageNo}` }],
        }
      }),
      ...(end === 5 ? { chapter_takeaways: [`章${chapterNo} 结论`] } : {}),
    })
  }
  const groupedRun = await runFullcasePipeline({
    brief,
    runDir: path.join(tmp, 'run-grouped'),
    callModel: groupedModel,
    requiredConclusions,
    options: { minPages: 20, maxPages: 30, maxPagesPerChapterCall: 2 },
  })
  assert.equal(groupedRun.deck.slides.length, 20)
  assert.equal(groupedChapterCalls, 12)
  assert.equal(groupedSawPriorClaimSummary, true)
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}

console.log('✅ fullcase-pipeline: outline -> chapters(resume) -> merge -> locks passed')
