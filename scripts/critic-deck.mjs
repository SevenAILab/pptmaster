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
    throw new Error(`No JSON object in response: ${rawText.slice(0, 200)}`)
  }
  return JSON.parse(raw.slice(start, end + 1))
}

export function buildCriticPrompt({ deck, brief, locksSummary } = {}) {
  const system = [
    '你是顶级品牌咨询公司的方案评审合伙人，对这份 deck 做内容与逻辑评审（不评视觉）。',
    '逐页检查 5 件事：① 论点是否明确且是判断句；② 证据是否支撑论点（empirical 必须有真实出处，hypothesis 必须有验证方法）；③ 逻辑链是否递进（相对前页有新增信息，不原地打转）；④ 是否在复述方法论定义而非应用到客户；⑤ 是否死板套用案例结构而非按客户情况推导。',
    '整体检查：叙事是否回答根问题、章节间是否递进。',
    '宁可指出问题也不要客气；但 pass 的页不要硬挑刺。',
    '某页问题源于"缺一个合适的分析框架"时，在该页填 needs_framework（一句话描述需要什么样的框架）；否则省略该字段。',
    '只输出 JSON：{"verdict":"pass|revise","pages":[{"page_no":1,"verdict":"pass|revise","issues":["..."],"needs_framework":"可选"}],"overall_issues":["..."]}。',
  ].join('\n')
  const user = [
    '# 根问题',
    text(brief?.strategicQuestion),
    '',
    '# 客户表单',
    brief?.formText || '',
    '',
    '# 过程锁摘要（确定性信号）',
    JSON.stringify(locksSummary || {}, null, 2),
    '',
    '# Deck 全文（JSON）',
    JSON.stringify({ slides: deck?.slides || [] }, null, 2),
  ].join('\n')
  return { system, user }
}

export function parseCriticResponse(value, deck) {
  const parsed = extractJson(value)
  if (!['pass', 'revise'].includes(parsed?.verdict)) {
    throw new Error(`Critic verdict must be pass|revise, got: ${parsed?.verdict}`)
  }
  const pages = Array.isArray(parsed.pages) ? parsed.pages : []
  const knownPages = new Set((deck?.slides || []).map(slide => slide.page_no))
  for (const page of pages) {
    if (!['pass', 'revise'].includes(page?.verdict)) {
      throw new Error(`page ${page?.page_no}: verdict must be pass|revise`)
    }
    if (deck && !knownPages.has(page.page_no)) {
      throw new Error(`Critic referenced unknown page: ${page.page_no}`)
    }
  }
  return {
    verdict: parsed.verdict,
    pages: pages.map(page => ({
      page_no: page.page_no,
      verdict: page.verdict,
      issues: Array.isArray(page.issues) ? page.issues.map(text).filter(Boolean) : [],
      ...(text(page.needs_framework) ? { needs_framework: text(page.needs_framework) } : {}),
    })),
    overall_issues: Array.isArray(parsed.overall_issues)
      ? parsed.overall_issues.map(text).filter(Boolean)
      : [],
  }
}
