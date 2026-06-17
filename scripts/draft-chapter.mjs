const EVIDENCE_KINDS = new Set(['empirical', 'deductive', 'hypothesis'])

function text(value) {
  return String(value ?? '').trim()
}

function asArray(value) {
  if (Array.isArray(value)) return value
  if (value === null || value === undefined || value === '') return []
  return [value]
}

function textArray(value) {
  return asArray(value).map(text).filter(Boolean)
}

function extractJson(value) {
  const rawText = String(value || '')
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = fenced ? fenced[1] : rawText
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object in chapter response: ${rawText.slice(0, 200)}`)
  }
  return JSON.parse(raw.slice(start, end + 1))
}

function analysisCardMap(analysisCards) {
  const cards = Array.isArray(analysisCards?.cards) ? analysisCards.cards : []
  return new Map(cards.filter(card => card?.id).map(card => [String(card.id), card]))
}

function refToDataRef(ref, cardsById) {
  const id = text(ref)
  const card = cardsById.get(id)
  if (card) {
    return {
      source: card.source || `analysis-card:${id}`,
      source_label: id,
      source_tier: card.source_tier || 'T3',
      type: card.analysis_type || 'analysis_card',
    }
  }
  return {
    source: id.startsWith('http') || id.startsWith('inputs/') ? id : `analysis-card:${id}`,
    source_label: id,
    source_tier: id.startsWith('http') ? 'T2' : 'T3',
    type: id.startsWith('http') ? 'external' : 'analysis_card',
  }
}

function normalizeDataRefs(rawRefs, evidenceRefs, cardsById) {
  const refs = asArray(rawRefs)
    .map(ref => {
      if (typeof ref === 'string') return refToDataRef(ref, cardsById)
      const source = text(ref?.source || ref?.source_url || ref?.url)
      if (!source) return null
      return {
        ...ref,
        source,
        source_tier: text(ref?.source_tier) || 'T3',
        type: text(ref?.type) || 'analysis_card',
      }
    })
    .filter(Boolean)
  if (refs.length) return refs
  return evidenceRefs.map(ref => refToDataRef(ref, cardsById))
}

function inferEvidenceKind(raw, dataRefs) {
  const kind = text(raw).toLowerCase()
  if (EVIDENCE_KINDS.has(kind)) return kind
  if (kind.includes('hypothesis')) return 'hypothesis'
  if (kind.includes('empirical')) return 'empirical'
  if (kind.includes('deductive')) return 'deductive'
  return dataRefs.some(ref => /^https?:\/\//i.test(ref.source || '')) ? 'empirical' : 'deductive'
}

function normalizePage(page, seed, { cardsById } = {}) {
  const evidenceRefs = textArray(page?.evidence_refs).length
    ? textArray(page.evidence_refs)
    : textArray(seed?.evidence_refs)
  const dataRefs = normalizeDataRefs(page?.data_refs, evidenceRefs, cardsById)
  const points = textArray(page?.points || page?.core_points).length
    ? textArray(page?.points || page?.core_points)
    : textArray(seed?.points)
  const governingThought = text(page?.governing_thought || page?.action_title || seed?.governing_thought)
  return {
    governing_thought: governingThought,
    points,
    evidence_refs: evidenceRefs,
    data_refs: dataRefs,
    evidence_kind: inferEvidenceKind(page?.evidence_kind || seed?.evidence_kind, dataRefs),
    validation_method: text(page?.validation_method || seed?.validation_method),
    layout_hint: text(page?.layout_hint || page?.layout || seed?.layout_hint) || 'statement',
    blocks: Array.isArray(page?.blocks) ? page.blocks : [],
  }
}

function assertPageSchema(pages) {
  for (const [index, page] of pages.entries()) {
    const label = `content page ${index + 1}`
    if (!text(page.governing_thought)) throw new Error(`${label}: governing_thought 为空`)
    if (!Array.isArray(page.points) || page.points.length === 0) throw new Error(`${label}: points 为空`)
    if (page.points.length > 4) throw new Error(`${label}: points 超过 4`)
    if (!Array.isArray(page.evidence_refs) || page.evidence_refs.length === 0) throw new Error(`${label}: evidence_refs 为空`)
    if (!EVIDENCE_KINDS.has(page.evidence_kind)) {
      throw new Error(`${label}: evidence_kind 必须是 empirical/deductive/hypothesis`)
    }
    if (page.evidence_kind === 'hypothesis' && !text(page.validation_method)) {
      throw new Error(`${label}: hypothesis 必须给 validation_method`)
    }
  }
}

export function buildChapterPrompt({
  brief,
  skeleton,
  outline,
  section,
  chapter,
  previousTakeaways = [],
  usedTitles = [],
  usedPageClaims = [],
  methodology,
  researchBrief,
  analysisCards,
  caseLogic,
  generatedPages = [],
  strategicSpine,
  skillGuidance,
} = {}) {
  const target = section || chapter
  const sectionNo = Number(target?.section_no || target?.chapter_no || 1)
  const title = text(target?.title)
  const seedPages = Array.isArray(target?.pages) ? target.pages : []
  const legacyQuestions = Array.isArray(target?.key_questions) ? target.key_questions : []
  const conceptBlocks = (methodology?.concepts || []).map(concept =>
    `### [框架: ${concept.name}]\n${concept.content}`,
  )
  const cardLines = Array.isArray(analysisCards?.cards)
    ? analysisCards.cards.map(card => `- ${card.id}: ${card.claim} → ${card.implication || ''}（${card.source || ''}）`)
    : []
  const findingLines = (researchBrief?.findings || []).map(finding =>
    `- ${finding.claim}（来源[${finding.source_id ?? '?'}] ${finding.source_url || ''}）`,
  )
  const system = [
    `你是资深品牌策略主笔，现在只填整本方案第 ${sectionNo} 章「${title}」的 content 页。`,
    '只填本章内容页：不要写封面、目录、brief 开场、章节过渡页、章节收束页、总结页或行动页；这些结构件由 deck 骨架契约管理。',
    '一页一观点：每页一个 governing_thought，写成判断句；points 最多 4 条；按需拆页，不要为了凑固定页数注水。',
    '优先覆盖骨架给出的 page seeds；可以把一个复杂 seed 拆成多页，但每页必须贡献新变量/新证据/新取舍/新机制。',
    '证据规则：evidence_refs 必须引用分析卡 id、研究来源 id 或真实 URL；empirical 必须有真实来源；缺证据标 hypothesis 并给 validation_method；禁止编造 URL。',
    '跨章纪律：承接 previousTakeaways，避开 usedTitles 与 usedPageClaims；不要把同一定位结论换一种说法反复讲。',
    strategicSpine?.positioning_statement
      ? `全局战略主线已锁定：${strategicSpine.positioning_statement}。本章每个 content 页必须用 governing_thought 或 points 回扣这条主线。`
      : '',
    '只输出 JSON：{"pages":[{"governing_thought","points":[≤4],"evidence_refs":[...],"data_refs":[...],"evidence_kind","validation_method","layout_hint","blocks":[...]}],"chapter_takeaways":["..."]}。',
    skillGuidance,
    caseLogic,
  ].filter(Boolean).join('\n')
  const user = [
    '# 整本骨架上下文',
    JSON.stringify({
      brief_question: skeleton?.brief_opening?.question || outline?.narrative || '',
      toc: skeleton?.toc || [],
      section: {
        section_no: sectionNo,
        title,
        transition_question: target?.transition_question || legacyQuestions.join(' / '),
        closing_judgment: target?.closing_judgment || target?.goal || '',
        covers: target?.covers || [],
        page_seeds: seedPages,
      },
    }, null, 2),
    '',
    '# 前章 takeaways（必须承接，不许重复）',
    ...(previousTakeaways.length ? previousTakeaways.map(item => `- ${item}`) : ['（无，本章是第一章）']),
    '',
    '# 已用 action_title / governing_thought 清单（不得重复）',
    ...(usedTitles.length ? usedTitles.map(item => `- ${item}`) : ['（无）']),
    '',
    '# 已用页面主张摘要（标题 + 要点，必须避开实质重复）',
    ...(usedPageClaims.length ? usedPageClaims.map(item => `- ${item}`) : ['（无）']),
    ...(generatedPages.length
      ? ['', '# 本章已生成 content 页（必须承接，不得重复）', ...generatedPages.map(page => `- ${page.governing_thought} / ${(page.points || []).join(' / ')}`)]
      : []),
    '',
    '# 客户表单',
    brief?.formText || '',
    '',
    '# 资料摘要',
    brief?.summary || '',
    '',
    '# 根问题',
    text(brief?.strategicQuestion),
    ...(strategicSpine?.positioning_statement
      ? ['', '# 已锁战略主线（必须贯穿）', JSON.stringify(strategicSpine, null, 2)]
      : []),
    ...(conceptBlocks.length ? ['', '# 可用方法论框架', ...conceptBlocks] : []),
    ...(cardLines.length ? ['', '# 分析卡（优先引用 card id）', ...cardLines] : []),
    ...(findingLines.length ? ['', '# 已核实研究发现', ...findingLines] : []),
  ].join('\n')
  return { system, user }
}

export function parseChapterResponse(value, { section, analysisCards, requireTakeaways = true } = {}) {
  const parsed = extractJson(value)
  const rawPages = Array.isArray(parsed?.pages) ? parsed.pages : parsed?.slides
  if (!Array.isArray(rawPages) || rawPages.length === 0) {
    throw new Error('Chapter response must contain pages[]')
  }
  if (requireTakeaways && (!Array.isArray(parsed?.chapter_takeaways) || parsed.chapter_takeaways.length === 0)) {
    throw new Error('Chapter response must contain chapter_takeaways[]')
  }
  const cardsById = analysisCardMap(analysisCards)
  const seeds = Array.isArray(section?.pages) ? section.pages : []
  const pages = rawPages.map((page, index) => normalizePage(page, seeds[index], { cardsById }))
  assertPageSchema(pages)
  return {
    pages,
    slides: pages.map((page, index) => ({
      page_no: Number(rawPages[index]?.page_no || index + 1),
      action_title: page.governing_thought,
      core_points: page.points,
      layout: page.layout_hint,
      ...page,
    })),
    chapter_takeaways: textArray(parsed?.chapter_takeaways),
  }
}

async function callAndParseChapter({
  system,
  user,
  callModel,
  section,
  analysisCards,
  requireTakeaways,
} = {}) {
  const response = await callModel(system, user)
  try {
    return parseChapterResponse(typeof response === 'string' ? response : response?.text, {
      section,
      analysisCards,
      requireTakeaways,
    })
  } catch (error) {
    const retryUser = [
      user,
      '',
      error instanceof SyntaxError ? '# 上一次 JSON 解析失败' : '# 上一次章节输出校验失败',
      String(error?.message || error),
      '',
      '只重新输出合法 JSON，不要解释，不要 markdown fence；保持 pages[] schema；evidence_kind 只能是 empirical/deductive/hypothesis；每页必须有 evidence_refs。',
    ].join('\n')
    const retryResponse = await callModel(system, retryUser)
    return parseChapterResponse(typeof retryResponse === 'string' ? retryResponse : retryResponse?.text, {
      section,
      analysisCards,
      requireTakeaways,
    })
  }
}

export async function draftChapter({
  brief,
  skeleton,
  outline,
  section,
  chapter,
  previousTakeaways = [],
  usedTitles = [],
  usedPageClaims = [],
  methodology,
  researchBrief,
  analysisCards,
  caseLogic,
  callModel,
  skillGuidance,
  strategicSpine,
} = {}) {
  if (typeof callModel !== 'function') throw new Error('draftChapter requires callModel')
  const target = section || chapter
  if (!target) throw new Error('draftChapter requires section')
  const { system, user } = buildChapterPrompt({
    brief,
    skeleton,
    outline,
    section: target,
    previousTakeaways,
    usedTitles,
    usedPageClaims,
    methodology,
    researchBrief,
    analysisCards,
    caseLogic,
    strategicSpine,
    skillGuidance,
  })
  const parsed = await callAndParseChapter({
    system,
    user,
    callModel,
    section: target,
    analysisCards,
    requireTakeaways: true,
  })
  return {
    section_no: Number(target.section_no || target.chapter_no || 1),
    chapter_no: Number(target.section_no || target.chapter_no || 1),
    title: target.title,
    pages: parsed.pages,
    slides: parsed.slides,
    chapter_takeaways: parsed.chapter_takeaways,
  }
}
