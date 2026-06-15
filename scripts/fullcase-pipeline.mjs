import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
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
import { flattenSkeleton, validateSkeleton } from './deck-skeleton.mjs'
import { draftChapter } from './draft-chapter.mjs'
import { normalizeGeneratedDeck } from './generate-nonlocked-deck.mjs'
import { buildOutlinePrompt, parseOutline, validateOutline } from './outline-fullcase.mjs'
import { validateProcessLocks } from './process-locks.mjs'
import { loadSkillGuidance } from './skill-injector.mjs'
import { readTraces, writeTrace } from './trace-log.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
}

function traceExists(runDir, step) {
  return readTraces(runDir).some(trace => trace.step === step)
}

function traceInjected(guidance) {
  return { skill: guidance.skill, refs: guidance.loaded }
}

function normalizeSkeletonForPython(skeleton) {
  return {
    ...skeleton,
    sections: (skeleton.sections || []).map(section => ({
      ...section,
      pages: (section.pages || []).map((page, index) => ({
        page_no: index + 1,
        ...page,
      })),
    })),
  }
}

function runSkeletonGate({ root, skeletonPath }) {
  const scriptPath = path.join(root, 'skills/proposal-narrative/scripts/check_deck_skeleton.py')
  const result = spawnSync(process.env.PYTHON || 'python3', [scriptPath, skeletonPath], {
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error([
      'deck 骨架质量门未通过：',
      result.stdout || '',
      result.stderr || '',
      result.error ? String(result.error.message || result.error) : '',
    ].filter(Boolean).join('\n'))
  }
  return {
    ok: true,
    stdout: result.stdout,
  }
}

function draftedSkeleton(baseSkeleton, chapterResults) {
  const pagesBySection = new Map(chapterResults.map(result => [Number(result.section_no || result.chapter_no), result.pages]))
  return {
    ...baseSkeleton,
    sections: baseSkeleton.sections.map(section => ({
      ...section,
      pages: pagesBySection.get(Number(section.section_no)) || section.pages,
    })),
  }
}

export async function runFullcasePipeline({
  brief,
  runDir,
  callModel,
  requiredConclusions = [],
  methodology,
  researchBrief,
  analysisCards,
  caseLogic,
  options = {},
} = {}) {
  if (!brief) throw new Error('runFullcasePipeline requires brief')
  if (!runDir) throw new Error('runFullcasePipeline requires runDir')
  if (typeof callModel !== 'function') throw new Error('runFullcasePipeline requires callModel')
  const minPages = Number(options.minPages ?? 20)
  const maxPages = Number(options.maxPages ?? 30)
  const outlineAttempts = Number(options.outlineAttempts ?? 1)
  const outlineOnly = Boolean(options.outlineOnly)
  const root = options.root || REPO_ROOT
  const runId = `fullcase-${brief.slug}`
  const outlineGuidance = loadSkillGuidance({ root, stage: 'outline' })

  const outlinePath = path.join(runDir, 'outline.json')
  let skeleton
  if (fs.existsSync(outlinePath)) {
    skeleton = JSON.parse(fs.readFileSync(outlinePath, 'utf8'))
    console.log(`[fullcase] reuse existing outline.json (${skeleton.sections?.length || 0} 章)`)
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
        analysisCards,
        caseLogic,
        skillGuidance: outlineGuidance.text,
      })
      const user = attempt === 1
        ? prompt.user
        : [
          prompt.user,
          '',
          '# 上一次骨架校验失败',
          ...(lastCheck?.violations || []).map(violation => `- ${violation}`),
          '',
          `请重新输出满足 ${minPages}-${maxPages} 个内容页、结构件齐全、覆盖全部必备结论的契约 B JSON。`,
        ].join('\n')
      lastPrompt = { system: prompt.system, user }
      skeleton = parseOutline(await callModel(prompt.system, user))
      lastCheck = validateOutline(skeleton, { requiredConclusions, minPages, maxPages })
      if (lastCheck.ok) break
    }
    if (!lastCheck?.ok) {
      throw new Error(['大纲骨架校验未通过：', ...(lastCheck?.violations || []).map(violation => `  - ${violation}`)].join('\n'))
    }
    if (!lastPrompt) throw new Error('Outline prompt was not built')
    writeJson(outlinePath, skeleton)
  }
  if (!traceExists(runDir, 'outline')) {
    writeTrace({
      runDir,
      step: 'outline',
      injected: traceInjected(outlineGuidance),
      output: { sections: skeleton.sections.length, content_pages: validateSkeleton(skeleton).totalContentPages },
      note: '注入 proposal-narrative 叙事方法论，生成契约 B deck 骨架',
    })
  }

  await ensureRunState({
    runDir,
    runId,
    clientSlug: brief.slug,
    schemeType: 'fullcase',
    totalChunks: skeleton.sections.length,
  })
  await appendRunEvent({
    runDir,
    runId,
    eventType: 'outline_ready',
    metadata: { sections: skeleton.sections.length },
  })
  if (outlineOnly) {
    return { outline: skeleton, skeleton, runDir }
  }

  const draftGuidance = loadSkillGuidance({ root, stage: 'draft' })

  const chapterResults = []
  const takeaways = []
  const usedTitles = []
  const usedPageClaims = []
  for (const section of skeleton.sections) {
    const chunkId = `ch-${section.section_no}`
    const chapterPath = path.join(runDir, 'chapters', `${chunkId}.json`)
    const state = await readRunState(runDir)
    if (shouldSkipCompletedChunk(state, chunkId) && fs.existsSync(chapterPath)) {
      const cached = JSON.parse(fs.readFileSync(chapterPath, 'utf8'))
      console.log(`[fullcase] reuse ${chunkId} (${cached.pages?.length || cached.slides?.length || 0} 页)`)
      chapterResults.push(cached)
      takeaways.push(...(cached.chapter_takeaways || []))
      usedTitles.push(...(cached.pages || cached.slides || []).map(page => page.governing_thought || page.action_title))
      usedPageClaims.push(...(cached.pages || cached.slides || []).map(page =>
        `${page.governing_thought || page.action_title || ''} / ${(page.points || page.core_points || []).join(' / ')}`,
      ))
      continue
    }
    await markChunkStarted({ runDir, chunkId, workerId: 'draft-chapter' })
    try {
      const result = await draftChapter({
        brief,
        skeleton,
        section,
        previousTakeaways: [...takeaways],
        usedTitles: [...usedTitles],
        usedPageClaims: [...usedPageClaims],
        methodology,
        researchBrief,
        analysisCards,
        caseLogic,
        callModel,
        skillGuidance: draftGuidance.text,
      })
      writeJson(chapterPath, result)
      await markChunkCompleted({ runDir, chunkId, workerId: 'draft-chapter', outputPath: chapterPath })
      await appendRunEvent({ runDir, runId, eventType: 'chapter_completed', chunkId, outputPath: chapterPath })
      chapterResults.push(result)
      takeaways.push(...result.chapter_takeaways)
      usedTitles.push(...result.pages.map(page => page.governing_thought))
      usedPageClaims.push(...result.pages.map(page =>
        `${page.governing_thought || ''} / ${(page.points || []).join(' / ')}`,
      ))
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

  const finalSkeleton = draftedSkeleton(skeleton, chapterResults)
  const finalSkeletonCheck = validateSkeleton(finalSkeleton, {
    requiredConclusions,
    minContentPages: minPages,
    maxContentPages: maxPages,
  })
  if (!finalSkeletonCheck.ok) {
    throw new Error(['最终 deck 骨架校验未通过：', ...finalSkeletonCheck.violations.map(violation => `  - ${violation}`)].join('\n'))
  }
  const skeletonForGate = normalizeSkeletonForPython(finalSkeleton)
  const skeletonPath = path.join(runDir, 'deck.skeleton.json')
  writeJson(skeletonPath, skeletonForGate)
  runSkeletonGate({ root, skeletonPath })

  const flatSlides = flattenSkeleton(skeletonForGate)
  const deck = normalizeGeneratedDeck({ slides: flatSlides }, { brief, generationMode: 'model' })
  deck.metadata.schema = 'fullcase-deck-v2'
  deck.metadata.sections = finalSkeleton.sections.map(section => ({
    section_no: section.section_no,
    title: section.title,
    content_pages: section.pages.length,
  }))
  const locks = validateProcessLocks(deck, { minPages, maxPages: maxPages + finalSkeleton.sections.length * 2 + 5 })
  writeJson(path.join(runDir, 'deck.json'), deck)
  writeJson(path.join(runDir, 'process-locks.json'), locks)
  if (!locks.ok) {
    throw new Error(['全局过程锁未通过：', ...locks.violations.map(violation => `  - ${violation}`)].join('\n'))
  }
  if (!traceExists(runDir, 'draft')) {
    writeTrace({
      runDir,
      step: 'draft',
      injected: traceInjected(draftGuidance),
      output: { sections: chapterResults.length, content_pages: finalSkeleton.sections.reduce((sum, section) => sum + section.pages.length, 0), total_pages: deck.slides.length },
      note: '注入 proposal-narrative 逐章撰写方法论，只填 content 页，再摊平成结构件完整 deck',
    })
  }
  await markRunCompleted(runDir)
  await appendRunEvent({
    runDir,
    runId,
    eventType: 'fullcase_completed',
    metadata: { pages: deck.slides.length },
  })
  return { deck, outline: finalSkeleton, skeleton: finalSkeleton, locks, runDir }
}
