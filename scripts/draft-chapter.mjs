import { ALLOWED_BLOCK_TYPES } from './process-locks.mjs'

function text(value) {
  return String(value ?? '').trim()
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

export function buildChapterPrompt({
  brief,
  outline,
  chapter,
  previousTakeaways = [],
  usedTitles = [],
  methodology,
  researchBrief,
  pageRange,
  generatedSlides = [],
} = {}) {
  const pageStart = Number(pageRange?.start || 1)
  const pageEnd = Number(pageRange?.end || chapter.pages_budget)
  const pageCount = pageEnd - pageStart + 1
  const isWholeChapter = pageStart === 1 && pageEnd === chapter.pages_budget
  const isFirstGroup = pageStart === 1
  const isLastGroup = pageEnd === chapter.pages_budget
  const conceptBlocks = (methodology?.concepts || []).map(concept =>
    `### [框架: ${concept.name}]\n${concept.content}`,
  )
  const findingLines = (researchBrief?.findings || []).map(finding =>
    `- ${finding.claim}（来源[${finding.source_id ?? '?'}] ${finding.source_url || ''}）`,
  )
  const system = [
    `你是资深品牌策略主笔，现在只写整本方案的第 ${chapter.chapter_no} 章「${chapter.title}」。`,
    isWholeChapter
      ? `本章正好 ${chapter.pages_budget} 页；第 1 页必须是章首页（layout 用 hero-statement，intent 写"章节导入"，用一个判断句导入本章）。`
      : `本次只写本章第 ${pageStart}-${pageEnd} 页，正好 ${pageCount} 页；page_no 必须使用章内真实页码 ${pageStart} 到 ${pageEnd}，不要从 1 重新编号。`,
    !isWholeChapter && isFirstGroup
      ? '本次包含第 1 页，所以第 1 页必须是章首页（layout 用 hero-statement，intent 写"章节导入"）。'
      : '',
    !isWholeChapter && !isFirstGroup
      ? '本次不包含章首页，不要再写章节导入页；直接承接本章已生成页面继续推进。'
      : '',
    '每页字段：page_no（章内 1 起）, intent, action_title, layout, core_points, data_refs, evidence_kind, validation_method, blocks。',
    `blocks[].type 只能使用：${ALLOWED_BLOCK_TYPES.join(', ')}。`,
    '跨章纪律：每页必须提供"已用标题清单"之外的新增信息，action_title 不得与已用标题语义重复；本章必须承接前章 takeaways 继续推进，不得重复论证前章已得出的结论。',
    '证据规则与短 deck 相同：empirical 必须有真实出处；缺证据标 hypothesis 并给 validation_method；引用研究发现时 data_refs.source 写完整 URL；不许编造 URL。',
    '运用框架时在 intent 或 core_points 以 "[框架: 名称]" 标注，禁止复述框架定义。',
    isLastGroup
      ? '除 slides 外必须输出 chapter_takeaways：本章 1-3 条核心结论（给后续章节当上下文）。'
      : '本次不是本章最后一组，只输出 slides，不要输出 chapter_takeaways。',
    '只输出 JSON：{"slides":[...],"chapter_takeaways":["..."]}。',
  ].filter(Boolean).join('\n')
  const user = [
    '# 整本叙事弧',
    text(outline?.narrative),
    '',
    `# 本章任务：第 ${chapter.chapter_no} 章`,
    JSON.stringify({ goal: chapter.goal, key_questions: chapter.key_questions, covers: chapter.covers }, null, 2),
    '',
    '# 前章 takeaways（必须承接，不许重复）',
    ...(previousTakeaways.length ? previousTakeaways.map(t => `- ${t}`) : ['（无，本章是第一章）']),
    '',
    '# 已用 action_title 清单（语义查重用，不得重复）',
    ...(usedTitles.length ? usedTitles.map(t => `- ${t}`) : ['（无）']),
    ...(generatedSlides.length
      ? [
        '',
        '# 本章已生成页面（必须承接，不得重复）',
        ...generatedSlides.map(slide => `- P${slide.page_no}: ${slide.action_title}`),
      ]
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
    ...(conceptBlocks.length ? ['', '# 可用方法论框架', ...conceptBlocks] : []),
    ...(findingLines.length ? ['', '# 已核实研究发现', ...findingLines] : []),
  ].join('\n')
  return { system, user }
}

export function parseChapterResponse(value, { requireTakeaways = true } = {}) {
  const parsed = extractJson(value)
  if (!Array.isArray(parsed?.slides) || parsed.slides.length === 0) {
    throw new Error('Chapter response must contain slides[]')
  }
  if (requireTakeaways && (!Array.isArray(parsed?.chapter_takeaways) || parsed.chapter_takeaways.length === 0)) {
    throw new Error('Chapter response must contain chapter_takeaways[]')
  }
  return {
    slides: parsed.slides,
    chapter_takeaways: Array.isArray(parsed?.chapter_takeaways)
      ? parsed.chapter_takeaways.map(text).filter(Boolean)
      : [],
  }
}

function assertPageGroup(parsed, chapter, { start, end }) {
  const expectedCount = end - start + 1
  if (parsed.slides.length !== expectedCount) {
    throw new Error(`第 ${chapter.chapter_no} 章页组 ${start}-${end} 页数 ${parsed.slides.length} 不等于预算 ${expectedCount}`)
  }
  const expectedPageNos = Array.from({ length: expectedCount }, (_, index) => start + index)
  const actualPageNos = parsed.slides.map(slide => Number(slide?.page_no))
  if (JSON.stringify(actualPageNos) !== JSON.stringify(expectedPageNos)) {
    throw new Error(`第 ${chapter.chapter_no} 章页组 page_no 必须为 ${expectedPageNos.join(', ')}，实际 ${actualPageNos.join(', ')}`)
  }
}

export async function draftChapter({
  brief,
  outline,
  chapter,
  previousTakeaways,
  usedTitles,
  methodology,
  researchBrief,
  callModel,
  maxPagesPerCall = Infinity,
} = {}) {
  if (typeof callModel !== 'function') throw new Error('draftChapter requires callModel')
  const groupSize = Math.max(1, Number(maxPagesPerCall || Infinity))
  if (Number.isFinite(groupSize) && chapter.pages_budget > groupSize) {
    const slides = []
    let chapterTakeaways = []
    for (let start = 1; start <= chapter.pages_budget; start += groupSize) {
      const end = Math.min(chapter.pages_budget, start + groupSize - 1)
      const isLastGroup = end === chapter.pages_budget
      const { system, user } = buildChapterPrompt({
        brief,
        outline,
        chapter,
        previousTakeaways,
        usedTitles,
        methodology,
        researchBrief,
        pageRange: { start, end },
        generatedSlides: slides,
      })
      const response = await callModel(system, user)
      const parsed = parseChapterResponse(typeof response === 'string' ? response : response?.text, {
        requireTakeaways: isLastGroup,
      })
      assertPageGroup(parsed, chapter, { start, end })
      slides.push(...parsed.slides)
      if (isLastGroup) chapterTakeaways = parsed.chapter_takeaways
    }
    return { chapter_no: chapter.chapter_no, title: chapter.title, slides, chapter_takeaways: chapterTakeaways }
  }
  const { system, user } = buildChapterPrompt({
    brief,
    outline,
    chapter,
    previousTakeaways,
    usedTitles,
    methodology,
    researchBrief,
  })
  const response = await callModel(system, user)
  const parsed = parseChapterResponse(typeof response === 'string' ? response : response?.text)
  if (parsed.slides.length !== chapter.pages_budget) {
    throw new Error(`第 ${chapter.chapter_no} 章页数 ${parsed.slides.length} 不等于预算 pages_budget=${chapter.pages_budget}`)
  }
  return { chapter_no: chapter.chapter_no, title: chapter.title, ...parsed }
}
