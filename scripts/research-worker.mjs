import { classifySource } from './source-tiers.mjs'

function text(value) {
  return String(value ?? '').trim()
}

function queryTokens(query) {
  return text(query)
    .split(/[\s,，、:：;；?？。()（）/]+/)
    .map(token => token.trim())
    .filter(Boolean)
}

function dedupe(values) {
  const seen = new Set()
  const result = []
  for (const value of values) {
    const normalized = text(value).replace(/\s+/g, ' ')
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

export function buildResearchQueryVariants(question, { retry = false, maxVariants = 3 } = {}) {
  const original = text(question).replace(/\s+/g, ' ')
  if (!original) return []
  const tokens = queryTokens(original)
  const stopwords = /^(如何|哪些|什么|为什么|是否|以及|应该|需要|支撑|判断|定位|差异化|价格|门店模型|会员体系|what|how|why|which|should|need|needs|and|or|the)$/i
  const keywords = tokens.filter(token => token.length >= 2 && !stopwords.test(token))
  const entityPrefix = keywords.slice(0, 4).join(' ')
  const variants = [original]
  if (original.length > 36 || retry) {
    variants.push(keywords.slice(0, 8).join(' '))
  }
  if (retry) {
    if (/竞品|竞争|对比|差异|定位/.test(original)) {
      variants.push(`${entityPrefix || original} competitor positioning`)
    }
    if (/市场|行业|规模|趋势|增长/.test(original)) {
      variants.push(`${entityPrefix || original} market report trend`)
    }
    if (/用户|人群|消费者|痛点|场景|会员/.test(original)) {
      variants.push(`${entityPrefix || original} consumer insight`)
    }
  }
  return dedupe(variants).slice(0, maxVariants)
}

function briefForm(brief = {}) {
  return brief.form && typeof brief.form === 'object' ? brief.form : brief
}

export function buildQuestionPrompt({ brief, angles } = {}) {
  const system = [
    '你是研究规划员。基于客户表单与根问题，产出 3-5 个可直接用于 web 搜索的研究问题。',
    '每个问题必须包含该客户的行业/品牌/人群等具体词，能搜出外部可引用证据（市场数字、竞品事实、人群行为数据）。',
    '不要使用 site: 过滤；不要预设竞品名单，竞品应从客户表单 competitors 字段与行业常识推导。',
    '只输出 JSON：{"questions":["..."]}。',
  ].join('\n')
  const user = [
    '# 客户表单',
    brief?.formText || JSON.stringify(briefForm(brief), null, 2),
    '',
    '# 根问题',
    brief?.strategicQuestion || '',
    '',
    '# 研究角度（必须覆盖）',
    ...(angles || []).map(angle => `- ${angle}`),
  ].join('\n')
  return { system, user }
}

export function parseQuestionResponse(value) {
  const rawText = String(value || '')
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = fenced ? fenced[1] : rawText
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object in question response: ${rawText.slice(0, 200)}`)
  }
  const parsed = JSON.parse(raw.slice(start, end + 1))
  const questions = (Array.isArray(parsed?.questions) ? parsed.questions : [])
    .map(question => text(question))
    .filter(Boolean)
  if (questions.length < 2) throw new Error(`研究问题至少 2 个，实际 ${questions.length}`)
  return questions.slice(0, 5)
}

export async function deriveResearchQuestionsLLM({ brief, angles, callModel } = {}) {
  if (typeof callModel !== 'function') throw new Error('deriveResearchQuestionsLLM requires callModel')
  const { system, user } = buildQuestionPrompt({ brief, angles })
  const response = await callModel(system, user)
  return parseQuestionResponse(typeof response === 'string' ? response : response?.text)
}

export function normalizeSearchHits(input = []) {
  const hits = Array.isArray(input) ? input : (Array.isArray(input?.results) ? input.results : [])
  return hits
    .map(result => ({
      url: text(result?.url || result?.link || result?.source),
      title: text(result?.title),
      content: text(result?.content || result?.snippet || result?.description),
    }))
    .filter(result => result.url)
}

export function buildResearchPrompt(questions = [], results = []) {
  const system = [
    '你是研究员。基于给定搜索结果片段，回答研究问题，只输出有真实出处的发现。',
    '逐条结论必须落到一个具体 source_url；保留精确数字/日期/实体；不要编造 URL。',
    '优先输出能支撑品牌策划 deck 的外部实证：市场规模、增长比例、预算变化、采用率、用户行为或竞品事实。',
    '只输出 JSON：{"findings":[{"claim":"...","evidence":"原文短证据","source_url":"https://...","confidence":"high|med|low"}]}。',
  ].join('\n')
  const context = normalizeSearchHits(results)
    .map((result, index) => `【${index + 1}】${result.title || '(untitled)'} ${result.url}\n${result.content.slice(0, 450)}`)
    .join('\n\n')
  const user = [
    '# 研究问题',
    ...(questions || []).map(question => `- ${question}`),
    '',
    '# 搜索结果片段',
    context || '(无)',
  ].join('\n')
  return { system, user }
}

export function parseResearchResponse(value) {
  const rawText = String(value || '')
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = fenced ? fenced[1] : rawText
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object in research response: ${rawText.slice(0, 200)}`)
  }
  const parsed = JSON.parse(raw.slice(start, end + 1))
  if (!Array.isArray(parsed?.findings)) {
    throw new Error('Research response JSON must contain findings[]')
  }
  return parsed
}

export function buildReflectionPrompt({ question, findings = [], strongSourceHint = false } = {}) {
  const systemLines = [
    '你是研究质量评估员。针对一个研究问题与已获发现，判断是否足够支撑一份咨询级方案引用。',
    '判定标准：有 3+ 独立来源、含精确数字/日期，即 sufficient=true；新搜索预计不会带来新事实也算 sufficient=true。宁停勿过投。',
    '不足时给出 gaps（缺什么）与 next_queries（最多 2 条更收窄的搜索词，不要重复已试过的角度）。',
    '只输出 JSON：{"sufficient":true|false,"gaps":["..."],"next_queries":["..."]}。',
  ]
  if (strongSourceHint) {
    systemLines.push('优先建议能命中强来源的下一查询：咨询机构报告、行业协会与统计局数据、行业研究院白皮书、上市公司年报；next_queries 中至少 1 条带“报告/白皮书/研究院/统计/年报”类词。')
  }
  const system = systemLines.join('\n')
  const findingLines = findings.map(finding =>
    `- ${finding.claim}（${finding.source_url || finding.source || '无来源'} / ${finding.confidence || 'med'}）`,
  )
  const user = [
    '# 研究问题',
    String(question || ''),
    '',
    '# 已获发现',
    ...(findingLines.length ? findingLines : ['（无）']),
  ].join('\n')
  return { system, user }
}

export function parseReflectionResponse(value) {
  const rawText = String(value || '')
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = fenced ? fenced[1] : rawText
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object in reflection response: ${rawText.slice(0, 200)}`)
  }
  const parsed = JSON.parse(raw.slice(start, end + 1))
  if (typeof parsed?.sufficient !== 'boolean') {
    throw new Error('Reflection response requires boolean sufficient')
  }
  return {
    sufficient: parsed.sufficient,
    gaps: (Array.isArray(parsed.gaps) ? parsed.gaps : []).map(text).filter(Boolean),
    next_queries: (Array.isArray(parsed.next_queries) ? parsed.next_queries : []).map(text).filter(Boolean).slice(0, 2),
  }
}

export function tagSources(findings = [], opts = {}) {
  const sources = []
  const idByUrl = new Map()
  const tagged = []

  for (const finding of findings || []) {
    const url = text(finding?.source_url || finding?.source || finding?.url)
    if (!url) continue
    if (!idByUrl.has(url)) {
      const meta = classifySource(url, opts)
      const id = sources.length + 1
      idByUrl.set(url, id)
      sources.push({
        id,
        url,
        source_tier: meta.source_tier,
        source_label: meta.source_label,
        type: meta.type,
        tier_inferred: meta.tier_inferred,
      })
    }
    const id = idByUrl.get(url)
    const source = sources[id - 1]
    tagged.push({
      claim: text(finding?.claim),
      evidence: text(finding?.evidence),
      source_url: url,
      confidence: text(finding?.confidence) || 'med',
      source_id: id,
      source_tier: source.source_tier,
      source_label: source.source_label,
      type: source.type,
    })
  }

  if (tagged.length === 0) {
    throw new Error('No traceable research findings with source_url')
  }
  return { findings: tagged, sources }
}

export async function gatherResearch({ questions, search, callModel, sourceOptions, maxResultsPerQuestion = 3 } = {}) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('gatherResearch requires questions[]')
  }
  if (typeof search !== 'function') throw new Error('gatherResearch requires search')
  if (typeof callModel !== 'function') throw new Error('gatherResearch requires callModel')

  const results = []
  for (const question of questions) {
    const hits = normalizeSearchHits(await search(question))
    results.push(...hits.slice(0, maxResultsPerQuestion))
  }
  if (results.length === 0) throw new Error('No search results for research questions')

  const { system, user } = buildResearchPrompt(questions, results)
  const response = await callModel(system, user)
  const parsed = parseResearchResponse(typeof response === 'string' ? response : response?.text)
  return tagSources(parsed.findings || [], sourceOptions)
}

export async function researchQuestionWithReflection({
  question,
  search,
  callModel,
  maxRounds = 3,
  maxResultsPerQuery = 3,
  strongSourceHint = false,
} = {}) {
  if (typeof search !== 'function') throw new Error('researchQuestionWithReflection requires search')
  if (typeof callModel !== 'function') throw new Error('researchQuestionWithReflection requires callModel')
  const findings = []
  const seenClaims = new Set()
  const seenUrls = new Set()
  let queries = [String(question || '')]
  let roundsUsed = 0
  let searchCallsUsed = 0

  for (let round = 1; round <= maxRounds; round += 1) {
    roundsUsed = round
    const hits = []
    for (const query of queries) {
      searchCallsUsed += 1
      hits.push(...normalizeSearchHits(await search(query)).slice(0, maxResultsPerQuery))
    }
    if (round === 1 && hits.length === 0) {
      const retryQueries = buildResearchQueryVariants(question, { retry: true, maxVariants: 3 })
        .filter(query => !queries.includes(query))
      for (const query of retryQueries) {
        searchCallsUsed += 1
        const retryHits = normalizeSearchHits(await search(query)).slice(0, maxResultsPerQuery)
        hits.push(...retryHits)
        if (hits.length > 0) break
      }
    }
    if (round === 1 && hits.length === 0) {
      throw new Error(`No search results for question: ${question}`)
    }

    let newCount = 0
    if (hits.length > 0) {
      const { system, user } = buildResearchPrompt([question], hits)
      const response = await callModel(system, user)
      const parsed = parseResearchResponse(typeof response === 'string' ? response : response?.text)
      for (const finding of parsed.findings || []) {
        const claim = text(finding?.claim)
        const url = text(finding?.source_url || finding?.source || finding?.url)
        const key = `${claim}@@${url}`
        if (!claim || !url || seenClaims.has(key)) continue
        seenClaims.add(key)
        seenUrls.add(url)
        findings.push({ ...finding, claim, source_url: url })
        newCount += 1
      }
    }
    if (round > 1 && newCount === 0) break
    if (round >= maxRounds) break

    const reflectionPrompt = buildReflectionPrompt({ question, findings, strongSourceHint })
    const reflectionResponse = await callModel(reflectionPrompt.system, reflectionPrompt.user)
    const reflection = parseReflectionResponse(
      typeof reflectionResponse === 'string' ? reflectionResponse : reflectionResponse?.text,
    )
    if (reflection.sufficient || reflection.next_queries.length === 0) break
    queries = reflection.next_queries
  }

  if (findings.length === 0) {
    throw new Error(`No traceable research findings for question: ${question}`)
  }
  return { question, findings, rounds_used: roundsUsed, search_calls_used: searchCallsUsed }
}

function summarizeStrongSources(sources = []) {
  const total = Array.isArray(sources) ? sources.length : 0
  const strong = (sources || []).filter(source => source.source_tier === 'T1' || source.source_tier === 'T2').length
  return {
    strong_source_sources: strong,
    strong_source_total_sources: total,
    strong_source_ratio: total > 0 ? strong / total : 0,
  }
}

export async function gatherResearchDeep({
  questions,
  search,
  callModel,
  sourceOptions,
  maxRounds = 2,
  maxResultsPerQuery = 3,
  strongSourceMinRatio = 0.3,
} = {}) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('gatherResearchDeep requires questions[]')
  }
  if (typeof search !== 'function') throw new Error('gatherResearchDeep requires search')
  if (typeof callModel !== 'function') throw new Error('gatherResearchDeep requires callModel')
  const allFindings = []
  const perQuestion = []
  let searchCallsUsed = 0
  for (const question of questions) {
    const result = await researchQuestionWithReflection({
      question,
      search,
      callModel,
      maxRounds,
      maxResultsPerQuery,
      strongSourceHint: true,
    })
    allFindings.push(...result.findings)
    searchCallsUsed += result.search_calls_used
    perQuestion.push({
      question,
      rounds_used: result.rounds_used,
      search_calls_used: result.search_calls_used,
      findings: result.findings.length,
    })
  }
  let tagged = tagSources(allFindings, sourceOptions)
  let strongSummary = summarizeStrongSources(tagged.sources)
  let strongSourceFollowup = false

  if (strongSourceMinRatio > 0 && strongSummary.strong_source_ratio < strongSourceMinRatio) {
    strongSourceFollowup = true
    console.log('[research] strong-source followup triggered')
    for (const question of questions) {
      const targetedQuery = `${question} 行业报告 研究院 统计 白皮书`
      const result = await researchQuestionWithReflection({
        question: targetedQuery,
        search,
        callModel,
        maxRounds: 1,
        maxResultsPerQuery,
        strongSourceHint: true,
      })
      allFindings.push(...result.findings)
      searchCallsUsed += result.search_calls_used
      perQuestion.push({
        question,
        followup_query: targetedQuery,
        rounds_used: result.rounds_used,
        search_calls_used: result.search_calls_used,
        findings: result.findings.length,
        strong_source_followup: true,
      })
    }
    tagged = tagSources(allFindings, sourceOptions)
    strongSummary = summarizeStrongSources(tagged.sources)
  }

  return {
    ...tagged,
    search_calls_used: searchCallsUsed,
    per_question: perQuestion,
    strong_source_followup: strongSourceFollowup,
    ...strongSummary,
  }
}
