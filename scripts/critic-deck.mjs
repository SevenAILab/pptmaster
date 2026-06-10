import { selectConceptsForQuery } from './methodology-kb.mjs'
import { validateProcessLocks } from './process-locks.mjs'

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

export function buildRevisionPrompt({ deck, brief, critique, extraConcepts = [] } = {}) {
  const revisePages = (critique?.pages || [])
    .filter(page => page.verdict === 'revise')
    .map(page => ({
      page_no: page.page_no,
      issues: page.issues || [],
      ...(text(page.needs_framework) ? { needs_framework: text(page.needs_framework) } : {}),
    }))
  const system = [
    '你是资深品牌策略主笔。评审指出了若干页的问题，请只重写这些页。',
    '只输出 JSON：{"slides":[...]}，slides 里只包含需要修订的页，page_no 保持不变。',
    '每页字段与原 deck 相同：page_no, intent, action_title, layout, core_points, data_refs, evidence_kind, validation_method, blocks。',
    '修订要求：直接解决评审指出的 issues；保持与未修订页的叙事衔接；运用补充框架时在 intent 或 core_points 以 "[框架: 名称]" 标注，但禁止复述框架定义。',
    '证据规则不变：empirical 必须有真实出处；缺证据就标 hypothesis 并给 validation_method；不许编造 URL。',
  ].join('\n')
  const user = [
    '# 根问题',
    text(brief?.strategicQuestion),
    '',
    '# 评审意见（只修这些页）',
    JSON.stringify({ pages: revisePages, overall_issues: critique?.overall_issues || [] }, null, 2),
    '',
    ...(extraConcepts.length
      ? ['# 补充方法论框架（按需运用）', ...extraConcepts.map(concept => `### [框架: ${concept.name}]\n${concept.content}`), '']
      : []),
    '# 当前 Deck 全文（JSON，提供上下文，未点名的页不要动）',
    JSON.stringify({ slides: deck?.slides || [] }, null, 2),
  ].join('\n')
  return { system, user }
}

export function mergeRevisedSlides(deck, revisedSlides, critique) {
  const slides = deck?.slides || []
  const knownPages = new Set(slides.map(slide => slide.page_no))
  const expected = new Set((critique?.pages || [])
    .filter(page => page.verdict === 'revise')
    .map(page => page.page_no))
  const byPage = new Map()
  for (const slide of revisedSlides || []) {
    if (!knownPages.has(slide?.page_no)) {
      throw new Error(`Revised slide references unknown page: ${slide?.page_no}`)
    }
    byPage.set(slide.page_no, slide)
  }
  const missing = [...expected].filter(pageNo => !byPage.has(pageNo))
  if (missing.length) throw new Error(`Revision missing revised pages: ${missing.join(', ')}`)
  return {
    ...deck,
    slides: slides.map(slide => byPage.has(slide.page_no) ? { ...slide, ...byPage.get(slide.page_no) } : slide),
  }
}

export async function runCriticLoop({
  deck,
  brief,
  index,
  callModel,
  loadBodies,
  maxRounds = 2,
  processLockOptions = {},
} = {}) {
  if (typeof callModel !== 'function') throw new Error('runCriticLoop requires callModel')
  if (typeof loadBodies !== 'function') throw new Error('runCriticLoop requires loadBodies')
  let current = deck
  const rounds = []
  let finalVerdict = 'revise'

  for (let round = 1; round <= maxRounds; round += 1) {
    const locks = validateProcessLocks(current, processLockOptions)
    const criticPrompt = buildCriticPrompt({ deck: current, brief, locksSummary: locks.summary })
    const critique = parseCriticResponse(await callModel(criticPrompt.system, criticPrompt.user), current)
    if (critique.verdict === 'pass') {
      rounds.push({ round, critique, pulledSlugs: [], revised: false })
      finalVerdict = 'pass'
      break
    }

    const gaps = critique.pages.map(page => page.needs_framework).filter(Boolean)
    let pulledSlugs = []
    let extraConcepts = []
    if (gaps.length && Array.isArray(index) && index.length) {
      pulledSlugs = await selectConceptsForQuery({
        query: gaps.join('；'),
        index,
        callModel,
        max: 2,
      })
      extraConcepts = loadBodies(pulledSlugs)
    }

    const revisionPrompt = buildRevisionPrompt({ deck: current, brief, critique, extraConcepts })
    const revisedRaw = extractJson(await callModel(revisionPrompt.system, revisionPrompt.user))
    if (!Array.isArray(revisedRaw?.slides)) throw new Error('Revision response must contain slides[]')
    current = mergeRevisedSlides(current, revisedRaw.slides, critique)
    const postLocks = validateProcessLocks(current, processLockOptions)
    if (!postLocks.ok) {
      throw new Error(['修订后过程锁未通过：', ...postLocks.violations.map(violation => `  - ${violation}`)].join('\n'))
    }
    rounds.push({ round, critique, pulledSlugs, revised: true })
  }

  return { deck: current, rounds, finalVerdict }
}
