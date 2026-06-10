import fs from 'node:fs'
import path from 'node:path'
import { appendRunEvent } from '../core/runtime/event-ledger.mjs'
import {
  ensureRunState,
  markChunkCompleted,
  markChunkFailed,
  markChunkStarted,
  markRunCompleted,
  readRunState,
  shouldSkipCompletedChunk,
} from '../core/runtime/run-state.mjs'
import { draftChapter } from './draft-chapter.mjs'
import { normalizeGeneratedDeck } from './generate-nonlocked-deck.mjs'
import { buildOutlinePrompt, parseOutline, validateOutline } from './outline-fullcase.mjs'
import { validateProcessLocks } from './process-locks.mjs'

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
}

export async function runFullcasePipeline({
  brief,
  runDir,
  callModel,
  requiredConclusions = [],
  methodology,
  researchBrief,
  options = {},
} = {}) {
  if (!brief) throw new Error('runFullcasePipeline requires brief')
  if (!runDir) throw new Error('runFullcasePipeline requires runDir')
  if (typeof callModel !== 'function') throw new Error('runFullcasePipeline requires callModel')
  const minPages = Number(options.minPages ?? 20)
  const maxPages = Number(options.maxPages ?? 30)
  const outlineAttempts = Number(options.outlineAttempts ?? 1)
  const maxPagesPerChapterCall = Number(options.maxPagesPerChapterCall || Infinity)
  const runId = `fullcase-${brief.slug}`

  const outlinePath = path.join(runDir, 'outline.json')
  let outline
  if (fs.existsSync(outlinePath)) {
    outline = JSON.parse(fs.readFileSync(outlinePath, 'utf8'))
    console.log(`[fullcase] reuse existing outline.json (${outline.chapters.length} 章)`)
  } else {
    let lastCheck
    let lastPrompt
    for (let attempt = 1; attempt <= outlineAttempts; attempt += 1) {
      const prompt = buildOutlinePrompt(brief, {
        requiredConclusions,
        minPages,
        maxPages,
        methodology,
        researchBrief,
      })
      const user = attempt === 1
        ? prompt.user
        : [
          prompt.user,
          '',
          '# 上一次大纲校验失败',
          ...(lastCheck?.violations || []).map(violation => `- ${violation}`),
          '',
          `请重新输出满足 ${minPages}-${maxPages} 页、4-8 章、覆盖全部 covers 的 JSON 大纲。`,
        ].join('\n')
      lastPrompt = { system: prompt.system, user }
      outline = parseOutline(await callModel(prompt.system, user))
      lastCheck = validateOutline(outline, { requiredConclusions, minPages, maxPages })
      if (lastCheck.ok) break
    }
    if (!lastCheck?.ok) {
      throw new Error(['大纲校验未通过：', ...(lastCheck?.violations || []).map(violation => `  - ${violation}`)].join('\n'))
    }
    if (!lastPrompt) throw new Error('Outline prompt was not built')
    writeJson(outlinePath, outline)
  }

  await ensureRunState({
    runDir,
    runId,
    clientSlug: brief.slug,
    schemeType: 'fullcase',
    totalChunks: outline.chapters.length,
  })
  await appendRunEvent({
    runDir,
    runId,
    eventType: 'outline_ready',
    metadata: { chapters: outline.chapters.length },
  })

  const chapterResults = []
  const takeaways = []
  const usedTitles = []
  for (const chapter of outline.chapters) {
    const chunkId = `ch-${chapter.chapter_no}`
    const chapterPath = path.join(runDir, 'chapters', `${chunkId}.json`)
    const state = await readRunState(runDir)
    if (shouldSkipCompletedChunk(state, chunkId) && fs.existsSync(chapterPath)) {
      const cached = JSON.parse(fs.readFileSync(chapterPath, 'utf8'))
      console.log(`[fullcase] reuse ${chunkId} (${cached.slides.length} 页)`)
      chapterResults.push(cached)
      takeaways.push(...cached.chapter_takeaways)
      usedTitles.push(...cached.slides.map(slide => slide.action_title))
      continue
    }
    await markChunkStarted({ runDir, chunkId, workerId: 'draft-chapter' })
    try {
      const result = await draftChapter({
        brief,
        outline,
        chapter,
        previousTakeaways: [...takeaways],
        usedTitles: [...usedTitles],
        methodology,
        researchBrief,
        callModel,
        maxPagesPerCall: maxPagesPerChapterCall,
      })
      writeJson(chapterPath, result)
      await markChunkCompleted({ runDir, chunkId, workerId: 'draft-chapter', outputPath: chapterPath })
      await appendRunEvent({ runDir, runId, eventType: 'chapter_completed', chunkId, outputPath: chapterPath })
      chapterResults.push(result)
      takeaways.push(...result.chapter_takeaways)
      usedTitles.push(...result.slides.map(slide => slide.action_title))
    } catch (error) {
      await markChunkFailed({
        runDir,
        chunkId,
        workerId: 'draft-chapter',
        errorMessage: String(error?.message || error),
        terminationReason: 'chapter_draft_failed',
      })
      await appendRunEvent({
        runDir,
        runId,
        eventType: 'chapter_failed',
        chunkId,
        errorMessage: String(error?.message || error),
        terminationReason: 'chapter_draft_failed',
      })
      throw error
    }
  }

  let pageNo = 0
  const mergedSlides = chapterResults.flatMap(chapter => chapter.slides.map(slide => {
    pageNo += 1
    return {
      ...slide,
      page_no: pageNo,
      chapter_no: chapter.chapter_no,
      chapter_title: chapter.title,
    }
  }))
  const deck = normalizeGeneratedDeck({ slides: mergedSlides }, { brief, generationMode: 'model' })
  deck.metadata.schema = 'fullcase-deck-v1'
  deck.metadata.narrative = outline.narrative
  deck.metadata.chapters = outline.chapters.map(chapter => ({
    chapter_no: chapter.chapter_no,
    title: chapter.title,
    pages_budget: chapter.pages_budget,
  }))
  const locks = validateProcessLocks(deck, { minPages, maxPages })
  writeJson(path.join(runDir, 'deck.json'), deck)
  writeJson(path.join(runDir, 'process-locks.json'), locks)
  if (!locks.ok) {
    throw new Error(['全局过程锁未通过：', ...locks.violations.map(violation => `  - ${violation}`)].join('\n'))
  }
  await markRunCompleted(runDir)
  await appendRunEvent({
    runDir,
    runId,
    eventType: 'fullcase_completed',
    metadata: { pages: deck.slides.length },
  })
  return { deck, outline, locks, runDir }
}
