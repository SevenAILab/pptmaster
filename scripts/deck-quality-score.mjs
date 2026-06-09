import { bestTier, findPreciseNumbers, hasSourcedRef } from './content-discipline.mjs'

const STRONG_TIERS = new Set(['T1', 'T2'])
const ACTION_RE = /(落地|执行|上线|投放|优先|步骤|动作|打法|启动|建立|推出|迭代|验证|收敛|复盘|第[一二三四五六七八九十\d]+(步|阶段))/
const TIME_RE = /(Q[1-4]|[第前]?[\d一二三四五六七八九十]+(周|月|天|季度|年)(内|度)?|短期|中期|长期|阶段)/

export function charNgrams(text, n = 3) {
  const value = String(text || '').replace(/\s+/g, '')
  const grams = new Set()
  for (let index = 0; index + n <= value.length; index += 1) {
    grams.add(value.slice(index, index + n))
  }
  return grams
}

export function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1
  let intersection = 0
  for (const gram of a) {
    if (b.has(gram)) intersection += 1
  }
  return intersection / (a.size + b.size - intersection)
}

export function pageDiscipline(deck, { min = 8, max = 60 } = {}) {
  const pages = Array.isArray(deck?.slides) ? deck.slides.length : 0
  return {
    pages,
    min,
    max,
    within: pages >= min && pages <= max,
    over: Math.max(0, pages - max),
    under: Math.max(0, min - pages),
  }
}

export function mergeChunkSlides(chunkDatas = []) {
  const byPage = new Map()
  const duplicatePages = new Set()
  let collected = 0

  for (const data of chunkDatas) {
    for (const slide of data.slides || []) {
      collected += 1
      if (byPage.has(slide.page_no)) duplicatePages.add(slide.page_no)
      byPage.set(slide.page_no, slide)
    }
  }

  const slides = [...byPage.values()].sort((a, b) => (a.page_no || 0) - (b.page_no || 0))
  return {
    slides,
    collapsedDuplicates: collected - slides.length,
    duplicatePages: [...duplicatePages].sort((a, b) => a - b),
  }
}

function slideTextForScore(slide = {}) {
  return [
    slide.action_title,
    slide.page_subtitle,
    ...(Array.isArray(slide.core_points) ? slide.core_points : []),
    ...(Array.isArray(slide.content_blocks) ? slide.content_blocks.map(block => block?.text || block?.title || '') : []),
  ]
    .filter(Boolean)
    .map(String)
    .join('  ')
}

export function evidenceRatio(deck, opts = {}) {
  const slides = Array.isArray(deck?.slides) ? deck.slides : []
  let sourced = 0
  let strong = 0
  let groundedNumbers = 0
  let numberSlides = 0
  const unsourcedPages = []
  const weakEvidencePages = []
  const unsourcedNumberPages = []

  for (const slide of slides) {
    const hasSource = hasSourcedRef(slide)
    if (hasSource) sourced += 1

    const best = bestTier(slide, opts)
    if (best && STRONG_TIERS.has(best.tier)) {
      strong += 1
    } else if (hasSource) {
      weakEvidencePages.push(slide.page_no)
    } else {
      unsourcedPages.push(slide.page_no)
    }

    if (findPreciseNumbers(slideTextForScore(slide)).length > 0) {
      numberSlides += 1
      if (hasSource) groundedNumbers += 1
      else unsourcedNumberPages.push(slide.page_no)
    }
  }

  const total = slides.length || 1
  return {
    slides: slides.length,
    sourcedRatio: sourced / total,
    strongRatio: strong / total,
    groundedNumberRatio: numberSlides ? groundedNumbers / numberSlides : 1,
    sourcedPages: sourced,
    strongEvidencePages: strong,
    numberSlides,
    unsourcedPages,
    weakEvidencePages,
    unsourcedNumberPages,
  }
}

function isExternalStrongRef(ref = {}) {
  const tier = ref.source_tier
  const type = String(ref.type || '')
  const source = String(ref.source || ref.source_url || ref.url || '')
  const localInput = source.startsWith('inputs/') || source.includes('/inputs/')
  return STRONG_TIERS.has(tier) &&
    type !== 'first_party' &&
    type !== 'client_input' &&
    !localInput
}

export function externalEvidenceRatio(deck) {
  const slides = Array.isArray(deck?.slides) ? deck.slides : []
  let numberSlides = 0
  let externalEmpiricalSlides = 0
  const externalEmpiricalPages = []
  const numberOnlyPages = []

  for (const slide of slides) {
    const hasNumber = findPreciseNumbers(slideTextForScore(slide)).length > 0
    if (!hasNumber) continue
    numberSlides += 1
    if ((slide.data_refs || []).some(ref => isExternalStrongRef(ref))) {
      externalEmpiricalSlides += 1
      externalEmpiricalPages.push(slide.page_no)
    } else {
      numberOnlyPages.push(slide.page_no)
    }
  }

  const total = slides.length || 1
  return {
    slides: slides.length,
    numberSlides,
    externalEmpiricalSlides,
    externalEmpiricalRatio: externalEmpiricalSlides / total,
    externalEmpiricalPages,
    numberOnlyPages,
  }
}

export function actionability(deck) {
  const slides = Array.isArray(deck?.slides) ? deck.slides : []
  let actionable = 0
  const abstractPages = []

  for (const slide of slides) {
    const text = slideTextForScore(slide)
    const hasNumber = findPreciseNumbers(text).length > 0
    const hasActionCue = ACTION_RE.test(text)
    const hasTimeCue = TIME_RE.test(text)
    if (hasNumber || hasActionCue || hasTimeCue) {
      actionable += 1
    } else {
      abstractPages.push(slide.page_no)
    }
  }

  const total = slides.length || 1
  return {
    slides: slides.length,
    ratio: actionable / total,
    actionablePages: actionable,
    abstractPages,
    heuristicNote: 'Weak deterministic heuristic: abstract strategy pages may be undercounted, and generic action verbs may overcount actionability.',
  }
}

function titleGrams(deck, n = 3) {
  const slides = Array.isArray(deck?.slides) ? deck.slides : []
  return slides.map(slide => ({
    page_no: slide.page_no,
    grams: charNgrams(`${slide.action_title || ''} ${(slide.core_points || []).join(' ')}`, n),
  }))
}

export function crossPageRepetition(deck, { threshold = 0.5, n = 3 } = {}) {
  const items = titleGrams(deck, n)
  const duplicatePairs = []
  const duplicatePages = new Set()

  for (let left = 0; left < items.length; left += 1) {
    for (let right = left + 1; right < items.length; right += 1) {
      const similarity = jaccard(items[left].grams, items[right].grams)
      if (similarity >= threshold) {
        duplicatePairs.push({
          a: items[left].page_no,
          b: items[right].page_no,
          sim: Number(similarity.toFixed(2)),
        })
        duplicatePages.add(items[right].page_no)
      }
    }
  }

  const total = items.length || 1
  return {
    slides: items.length,
    repetitionRate: duplicatePages.size / total,
    duplicatePages: [...duplicatePages].sort((a, b) => a - b),
    duplicatePairs,
    threshold,
  }
}

export function insightDensity(deck, { threshold = 0.5, n = 3 } = {}) {
  const items = titleGrams(deck, n)
  const clusters = []

  for (const item of items) {
    const cluster = clusters.find(candidate => jaccard(candidate.grams, item.grams) >= threshold)
    if (cluster) {
      cluster.members.push(item.page_no)
    } else {
      clusters.push({ grams: item.grams, members: [item.page_no] })
    }
  }

  const total = items.length || 1
  return {
    pages: items.length,
    distinctInsights: clusters.length,
    density: clusters.length / total,
    clusters: clusters.map(cluster => ({ members: cluster.members })),
    threshold,
  }
}

function inputDiagnostics(deck, input = {}) {
  const slides = Array.isArray(deck?.slides) ? deck.slides : []
  const pageNumbers = slides
    .map(slide => slide.page_no)
    .filter(pageNo => Number.isFinite(Number(pageNo)))
    .map(Number)
  const seen = new Set()
  const duplicatePageSet = new Set()
  for (const pageNo of pageNumbers) {
    if (seen.has(pageNo)) duplicatePageSet.add(pageNo)
    seen.add(pageNo)
  }
  return {
    sourceType: input.sourceType || 'deck',
    sourcePath: input.sourcePath || '',
    sourceFiles: input.sourceFiles ?? 1,
    collapsedDuplicates: input.collapsedDuplicates || 0,
    collapsedDuplicatePages: input.collapsedDuplicatePages || [],
    slides: slides.length,
    minPage: pageNumbers.length ? Math.min(...pageNumbers) : null,
    maxPage: pageNumbers.length ? Math.max(...pageNumbers) : null,
    duplicatePageNumbers: duplicatePageSet.size,
    duplicatePages: [...duplicatePageSet].sort((a, b) => a - b),
  }
}

export function scoreDeck(deck, opts = {}) {
  return {
    pages: Array.isArray(deck?.slides) ? deck.slides.length : 0,
    inputDiagnostics: inputDiagnostics(deck, opts.input),
    pageDiscipline: pageDiscipline(deck, opts.budget),
    evidenceRatio: evidenceRatio(deck, opts),
    externalEvidence: externalEvidenceRatio(deck),
    actionability: actionability(deck),
    repetition: crossPageRepetition(deck, opts.similarity),
    insightDensity: insightDensity(deck, opts.similarity),
  }
}
