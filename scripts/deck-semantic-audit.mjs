const EVIDENCE_KINDS = new Set(['empirical', 'deductive', 'hypothesis'])

export function buildAuditPrompt(deck) {
  const system = [
    '你是资深咨询方案质检员。给你一份方案的逐页大纲。逐页判断：',
    '1. restates_page：这页核心主张是否与更早某页实质重复，换说法重述也算。是则填更早页码，否填 null。',
    '2. is_new_insight：这页是否引入了上文没有的新洞察，填 true 或 false。',
    '3. evidence_kind：这页论证主要是 "empirical"（有外部真实数字、调研发现、用户原话）、"deductive"（逻辑推演）还是 "hypothesis"（未验证假设）。',
    '只输出 JSON 数组，每页一个对象 {page_no, restates_page, is_new_insight, evidence_kind}。不要编造，不要多余文字。',
  ].join('\n')
  const user = (deck.slides || [])
    .map(slide => [
      `页 ${slide.page_no}: ${slide.action_title || ''}`,
      `要点: ${(slide.core_points || []).join(' / ')}`,
      `出处摘要: ${formatRefs(slide)}`,
    ].join('\n'))
    .join('\n\n')
  return { system, user }
}

function formatRefs(slide) {
  const refs = Array.isArray(slide.data_refs) ? slide.data_refs : []
  if (!refs.length) return '无'
  return refs.slice(0, 5).map(ref => {
    const tier = ref.source_tier || 'unknown'
    const type = ref.type || 'unknown'
    const source = ref.source || ref.source_url || ref.url || ''
    return `${tier}/${type}/${source}`.slice(0, 180)
  }).join(' | ')
}

function normalizeAuditItem(item) {
  if (!Number.isFinite(Number(item?.page_no))) {
    throw new Error(`Invalid page_no in semantic audit item: ${JSON.stringify(item)}`)
  }
  const restates = item.restates_page
  if (restates !== null && restates !== undefined && !Number.isFinite(Number(restates))) {
    throw new Error(`Invalid restates_page in semantic audit item: ${JSON.stringify(item)}`)
  }
  if (typeof item.is_new_insight !== 'boolean') {
    throw new Error(`Invalid is_new_insight in semantic audit item: ${JSON.stringify(item)}`)
  }
  if (!EVIDENCE_KINDS.has(item.evidence_kind)) {
    throw new Error(`Invalid evidence_kind in semantic audit item: ${JSON.stringify(item)}`)
  }
  return {
    page_no: Number(item.page_no),
    restates_page: restates === null || restates === undefined ? null : Number(restates),
    is_new_insight: item.is_new_insight,
    evidence_kind: item.evidence_kind,
  }
}

export function parseAuditResponse(text) {
  const value = String(text || '')
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = fenced ? fenced[1] : value
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON array in audit response: ${value.slice(0, 200)}`)
  }
  const parsed = JSON.parse(raw.slice(start, end + 1))
  if (!Array.isArray(parsed)) {
    throw new Error('Semantic audit response JSON must be an array')
  }
  return parsed.map(normalizeAuditItem)
}

export function aggregateSemanticAudit(perPage) {
  const total = perPage.length || 1
  let restates = 0
  let newInsight = 0
  let empirical = 0
  let deductive = 0
  let hypothesis = 0
  const restatementPairs = []

  for (const page of perPage) {
    if (page.restates_page !== null && page.restates_page !== undefined) {
      restates += 1
      restatementPairs.push({ page: page.page_no, restates: page.restates_page })
    }
    if (page.is_new_insight) newInsight += 1
    if (page.evidence_kind === 'empirical') empirical += 1
    else if (page.evidence_kind === 'deductive') deductive += 1
    else if (page.evidence_kind === 'hypothesis') hypothesis += 1
  }

  return {
    pages: perPage.length,
    semanticRepetitionRate: restates / total,
    newInsightRate: newInsight / total,
    empiricalRatio: empirical / total,
    deductiveRate: deductive / total,
    hypothesisRate: hypothesis / total,
    restatementPairs,
  }
}

export function assertAuditCoversDeck(deck, perPage) {
  const expected = (deck.slides || []).map(slide => Number(slide.page_no)).sort((a, b) => a - b)
  const actual = perPage.map(page => Number(page.page_no)).sort((a, b) => a - b)
  if (expected.length !== actual.length) {
    throw new Error(`Semantic audit page count mismatch: expected ${expected.length}, got ${actual.length}`)
  }
  const expectedText = expected.join(',')
  const actualText = actual.join(',')
  if (expectedText !== actualText) {
    throw new Error(`Semantic audit page mismatch: expected [${expectedText}], got [${actualText}]`)
  }
}

export async function semanticAudit(deck, { callModel } = {}) {
  if (typeof callModel !== 'function') throw new Error('semanticAudit requires callModel')
  const { system, user } = buildAuditPrompt(deck)
  const text = await callModel(system, user)
  const perPage = parseAuditResponse(text)
  assertAuditCoversDeck(deck, perPage)
  return { perPage, ...aggregateSemanticAudit(perPage) }
}
