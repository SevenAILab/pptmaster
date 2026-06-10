import { classifySource } from './source-tiers.mjs'

function text(value) {
  return String(value ?? '').trim()
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
