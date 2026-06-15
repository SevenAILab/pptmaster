const STRUCTURAL_PAGE_KINDS = new Set([
  'cover',
  'toc',
  'brief',
  'section_intro',
  'closing',
  'conclusion',
  'action',
])

export const PAGE_KINDS = new Set([...STRUCTURAL_PAGE_KINDS, 'content'])

function text(value) {
  return String(value ?? '').trim()
}

function textArray(value) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : []
}

function objectArray(value) {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : []
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

function extractJson(value) {
  if (value && typeof value === 'object') return cloneJson(value)
  const rawText = String(value || '')
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = fenced ? fenced[1] : rawText
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object in skeleton response: ${rawText.slice(0, 200)}`)
  }
  return JSON.parse(raw.slice(start, end + 1))
}

function effectiveLen(value) {
  return text(value).replace(/[ 　]/g, '').length
}

function normalizeDataRef(ref) {
  if (typeof ref === 'string') {
    const source = text(ref)
    return source ? { source, type: 'unknown', source_tier: 'T3' } : null
  }
  if (!ref || typeof ref !== 'object') return null
  const source = text(ref.source || ref.source_url || ref.url)
  if (!source) return null
  return {
    ...ref,
    source,
    type: text(ref.type) || 'unknown',
    source_tier: text(ref.source_tier) || 'T3',
  }
}

function fallbackDataRefs(evidenceRefs) {
  return evidenceRefs.map(ref => ({
    source: ref.startsWith('http') || ref.startsWith('inputs/') ? ref : `analysis-card:${ref}`,
    type: ref.startsWith('http') ? 'external' : 'analysis_card',
    source_tier: ref.startsWith('http') ? 'T2' : 'T3',
  }))
}

function parsePage(page) {
  const evidenceRefs = textArray(page?.evidence_refs)
  const dataRefs = (Array.isArray(page?.data_refs) ? page.data_refs : [])
    .map(normalizeDataRef)
    .filter(Boolean)
  return {
    governing_thought: text(page?.governing_thought || page?.action_title),
    points: textArray(page?.points || page?.core_points),
    evidence_refs: evidenceRefs,
    data_refs: dataRefs,
    evidence_kind: text(page?.evidence_kind),
    validation_method: text(page?.validation_method),
    blocks: Array.isArray(page?.blocks) ? page.blocks : [],
    layout_hint: text(page?.layout_hint || page?.layout) || 'statement',
    covers: textArray(page?.covers),
  }
}

export function parseSkeleton(value) {
  const parsed = extractJson(value)
  return {
    cover: {
      title: text(parsed.cover?.title),
      subtitle: text(parsed.cover?.subtitle),
    },
    toc: textArray(parsed.toc),
    brief_opening: {
      situation: text(parsed.brief_opening?.situation),
      complication: text(parsed.brief_opening?.complication),
      question: text(parsed.brief_opening?.question),
    },
    sections: objectArray(parsed.sections).map((section, index) => ({
      section_no: Number(section?.section_no || index + 1),
      title: text(section?.title),
      transition_question: text(section?.transition_question),
      closing_judgment: text(section?.closing_judgment),
      covers: textArray(section?.covers),
      pages: objectArray(section?.pages).map(parsePage),
    })),
    conclusion: {
      governing_thought: text(parsed.conclusion?.governing_thought),
      action_items: textArray(parsed.conclusion?.action_items),
    },
  }
}

export function validateSkeleton(skeleton, {
  requiredConclusions = [],
  minContentPages = 1,
  maxContentPages = Infinity,
} = {}) {
  const violations = []
  const requiredIds = new Set(requiredConclusions.map(item => item.id).filter(Boolean))
  const covered = new Set()

  if (!text(skeleton?.cover?.title)) violations.push('缺结构件 cover.title')
  if (!Array.isArray(skeleton?.toc) || skeleton.toc.length === 0) violations.push('缺结构件 toc')
  for (const segment of ['situation', 'complication', 'question']) {
    if (!text(skeleton?.brief_opening?.[segment])) {
      violations.push(`brief_opening.${segment} 为空（SCQA 开场不完整）`)
    }
  }

  const sections = Array.isArray(skeleton?.sections) ? skeleton.sections : []
  if (sections.length === 0) violations.push('缺 sections')
  let contentPages = 0
  for (const [sectionIndex, section] of sections.entries()) {
    const sectionNo = Number(section?.section_no || sectionIndex + 1)
    for (const id of textArray(section?.covers)) covered.add(id)
    if (!text(section?.title)) violations.push(`第${sectionNo}章缺 title`)
    if (!text(section?.transition_question)) violations.push(`第${sectionNo}章缺 transition_question（过渡页）`)
    if (!text(section?.closing_judgment)) violations.push(`第${sectionNo}章缺 closing_judgment`)
    const pages = Array.isArray(section?.pages) ? section.pages : []
    if (pages.length === 0) violations.push(`第${sectionNo}章无 content 页`)
    contentPages += pages.length
    for (const page of pages) {
      const thought = text(page?.governing_thought)
      for (const id of textArray(page?.covers)) covered.add(id)
      if (!thought) {
        violations.push(`第${sectionNo}章有页缺 governing_thought（违反一页一观点）`)
      } else if (effectiveLen(thought) < 8) {
        violations.push(`第${sectionNo}章 governing_thought 过短，疑似话题词而非判断句:「${thought}」`)
      }
      const points = textArray(page?.points)
      if (points.length === 0) violations.push(`第${sectionNo}章「${thought || '(空)'}」points 为空（缺支撑论据）`)
      if (points.length > 4) violations.push(`第${sectionNo}章「${thought || '(空)'}」points=${points.length} 超过 4（应拆页）`)
      if (textArray(page?.evidence_refs).length === 0) {
        violations.push(`第${sectionNo}章「${thought || '(空)'}」evidence_refs 为空（未挂分析卡）`)
      }
    }
  }

  if (contentPages < minContentPages || contentPages > maxContentPages) {
    violations.push(`内容页数必须在 ${minContentPages}-${maxContentPages}，当前 ${contentPages}`)
  }

  for (const item of requiredConclusions) {
    if (item?.id && !covered.has(item.id)) {
      violations.push(`必备结论未被覆盖: ${item.id}（${item.label || ''}）`)
    }
  }

  if (!text(skeleton?.conclusion?.governing_thought)) {
    violations.push('缺 conclusion.governing_thought（顶层结论）')
  }
  if (!Array.isArray(skeleton?.conclusion?.action_items) || skeleton.conclusion.action_items.length === 0) {
    violations.push('缺 conclusion.action_items（行动）')
  }

  return { ok: violations.length === 0, violations, totalContentPages: contentPages }
}

function pushSlide(slides, pageKind, layoutHint, fields) {
  if (!PAGE_KINDS.has(pageKind)) throw new Error(`Unknown page_kind: ${pageKind}`)
  slides.push({
    page_kind: pageKind,
    layout_hint: layoutHint,
    layout: layoutHint,
    intent: pageKind,
    ...fields,
  })
}

export function flattenSkeleton(skeleton) {
  const slides = []
  pushSlide(slides, 'cover', 'cover', {
    action_title: skeleton.cover.title,
    extra: { subtitle: skeleton.cover.subtitle },
  })
  pushSlide(slides, 'toc', 'toc', {
    action_title: '目录',
    extra: { toc_items: skeleton.toc },
  })
  pushSlide(slides, 'brief', 'brief', {
    action_title: skeleton.brief_opening.question,
    extra: { ...skeleton.brief_opening },
  })
  for (const section of skeleton.sections) {
    pushSlide(slides, 'section_intro', 'section-intro', {
      section_no: section.section_no,
      section_title: section.title,
      action_title: section.title,
      extra: { transition_question: section.transition_question },
    })
    for (const page of section.pages) {
      const evidenceRefs = textArray(page.evidence_refs)
      const dataRefs = (Array.isArray(page.data_refs) && page.data_refs.length)
        ? page.data_refs.map(normalizeDataRef).filter(Boolean)
        : fallbackDataRefs(evidenceRefs)
      pushSlide(slides, 'content', page.layout_hint || 'statement', {
        section_no: section.section_no,
        section_title: section.title,
        action_title: page.governing_thought,
        governing_thought: page.governing_thought,
        core_points: textArray(page.points),
        points: textArray(page.points),
        evidence_refs: evidenceRefs,
        data_refs: dataRefs,
        evidence_kind: text(page.evidence_kind) || 'deductive',
        validation_method: text(page.validation_method),
        blocks: Array.isArray(page.blocks) && page.blocks.length ? page.blocks : [],
      })
    }
    pushSlide(slides, 'closing', 'closing', {
      section_no: section.section_no,
      section_title: section.title,
      action_title: section.closing_judgment,
      extra: { closing_judgment: section.closing_judgment },
    })
  }
  pushSlide(slides, 'conclusion', 'conclusion', {
    action_title: skeleton.conclusion.governing_thought,
    extra: { governing_thought: skeleton.conclusion.governing_thought },
  })
  pushSlide(slides, 'action', 'action', {
    action_title: '行动建议',
    core_points: textArray(skeleton.conclusion.action_items),
    extra: { action_items: skeleton.conclusion.action_items },
  })
  return slides.map((slide, index) => ({ page_no: index + 1, ...slide }))
}
