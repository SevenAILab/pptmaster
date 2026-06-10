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
    throw new Error(`No JSON object in outline response: ${rawText.slice(0, 200)}`)
  }
  return JSON.parse(raw.slice(start, end + 1))
}

export function buildOutlinePrompt(brief, {
  requiredConclusions = [],
  minPages = 20,
  maxPages = 30,
  methodology,
  researchBrief,
} = {}) {
  const conclusionLines = requiredConclusions.map(item => `- ${item.id}: ${item.label}`)
  const conceptLines = (methodology?.concepts || []).map(concept =>
    `- ${concept.name}（slug: ${concept.slug}）`,
  )
  const findingLines = (researchBrief?.findings || []).map(finding =>
    `- ${finding.claim}（来源[${finding.source_id ?? '?'}] ${finding.source_url || ''}）`,
  )
  const system = [
    '你是顶级品牌咨询公司的项目总监，为这个客户设计一份完整方案的叙事大纲。',
    `总规模 ${minPages}-${maxPages} 页，分 4-8 章。这是参考骨架不是锁页：你只定每章的目标、页数预算与关键问题，每页写什么由后续撰写阶段在章内自由决定。`,
    '叙事必须是一条递进的论证主线（诊断→判断→结论→配称→落地），禁止并列铺陈互不咬合的章节。',
    '每章字段：chapter_no, title, goal（这一章要让读者接受的判断）, pages_budget（含 1 页章首页）, key_questions[], covers[]（本章负责落实的必备结论 id，可为空）。',
    '所有必备结论 id 必须被至少一章 covers；每章第 1 页固定为章首页（章节导入）。',
    '可用方法论框架与研究发现见输入；把框架分配到最相关的章（在 key_questions 里体现），不要堆砌。',
    '只输出 JSON：{"narrative":"一句话叙事弧","chapters":[...]}。',
  ].join('\n')
  const user = [
    '# 客户表单',
    brief?.formText || '',
    '',
    '# 资料摘要',
    brief?.summary || '',
    '',
    '# 根问题',
    text(brief?.strategicQuestion),
    '',
    '# 必备结论清单（type 级，必须全部被某章 covers）',
    ...conclusionLines,
    ...(conceptLines.length ? ['', '# 已选方法论框架', ...conceptLines] : []),
    ...(findingLines.length ? ['', '# 已核实研究发现', ...findingLines] : []),
  ].join('\n')
  return { system, user }
}

export function parseOutline(value) {
  const parsed = extractJson(value)
  if (!Array.isArray(parsed?.chapters) || parsed.chapters.length === 0) {
    throw new Error('Outline JSON must contain chapters[]')
  }
  return {
    narrative: text(parsed.narrative),
    chapters: parsed.chapters.map((chapter, idx) => ({
      chapter_no: Number(chapter?.chapter_no || idx + 1),
      title: text(chapter?.title),
      goal: text(chapter?.goal),
      pages_budget: Number(chapter?.pages_budget || 0),
      key_questions: Array.isArray(chapter?.key_questions)
        ? chapter.key_questions.map(text).filter(Boolean)
        : [],
      covers: Array.isArray(chapter?.covers)
        ? chapter.covers.map(text).filter(Boolean)
        : [],
    })),
  }
}

export function validateOutline(outline, {
  requiredConclusions = [],
  minPages = 20,
  maxPages = 30,
  minChapters = 4,
  maxChapters = 8,
} = {}) {
  const violations = []
  const chapters = outline?.chapters || []
  if (chapters.length < minChapters || chapters.length > maxChapters) {
    violations.push(`章数必须在 ${minChapters}-${maxChapters}，当前 ${chapters.length}`)
  }
  const total = chapters.reduce((sum, chapter) => sum + chapter.pages_budget, 0)
  if (total < minPages || total > maxPages) {
    violations.push(`总页数预算必须在 ${minPages}-${maxPages}，当前 ${total}`)
  }
  for (const chapter of chapters) {
    if (!chapter.title || !chapter.goal) violations.push(`第 ${chapter.chapter_no} 章缺 title/goal`)
    if (chapter.pages_budget < 2) violations.push(`第 ${chapter.chapter_no} 章 pages_budget 至少 2（含章首页）`)
  }
  const knownIds = new Set(requiredConclusions.map(item => item.id))
  const covered = new Set()
  for (const chapter of chapters) {
    for (const id of chapter.covers) {
      if (!knownIds.has(id)) violations.push(`第 ${chapter.chapter_no} 章 covers 未知结论 id: ${id}`)
      covered.add(id)
    }
  }
  for (const item of requiredConclusions) {
    if (!covered.has(item.id)) violations.push(`必备结论未被任何章覆盖: ${item.id}（${item.label}）`)
  }
  return { ok: violations.length === 0, violations, totalPages: total }
}
