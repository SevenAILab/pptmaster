const FORBIDDEN_TAG_PATTERN = /<\s*(script|style|html|head|body|link|iframe|object|embed|base|meta|form|input|button)\b/i
const EVENT_ATTRIBUTE_PATTERN = /\son[a-z]+\s*=/i
const JAVASCRIPT_URL_PATTERN = /javascript\s*:/i
const EXTERNAL_ATTR_PATTERN = /\s(?:src|href)\s*=\s*(["'])?\s*(?:https?:)?\/\//i
const EXTERNAL_CSS_PATTERN = /(?:@import|url\()\s*(["'])?\s*(?:https?:)?\/\//i

function normalizeText(value) {
  return String(value ?? '').trim()
}

function formatList(items, formatter) {
  if (!Array.isArray(items) || items.length === 0) return '- (无)'
  return items.map(formatter).join('\n')
}

function formatDataRef(ref) {
  if (typeof ref === 'string') return `- ${ref}`
  const source = ref?.source || ref?.source_url || ref?.url || ''
  const tier = ref?.source_tier ? ` (${ref.source_tier})` : ''
  const type = ref?.type ? ` [${ref.type}]` : ''
  return `- ${source}${tier}${type}`
}

function formatBlock(block) {
  if (typeof block === 'string') return `- ${block}`
  return `- ${block?.type || 'block'}: ${block?.title || block?.text || JSON.stringify(block)}`
}

const KIND_GUIDANCE = {
  cover: '封面：大标题 + 副标题 + 品牌/项目锚点；大量留白；不要正文罗列，不要数据堆叠。',
  toc: '目录：清晰章节列表，突出阅读路径；不要解释章节内容；每项短、齐、可扫读。',
  brief: 'brief 开场：用 SCQA 讲清 situation / complication / question；信息少但张力强，核心问题要最大声。',
  section_intro: '章节过渡页：用 transition_question 引导本章；极简、强停顿、像咨询汇报里的章节幕布。',
  closing: '章节收束页：只放本章 closing_judgment 和 1-2 个承接信号；不要复述整章。',
  conclusion: '总结页：顶层结论最大，形成一眼可复述的判断；少量支撑，不做新分析。',
  action: '行动页：把 action_items 做成清晰步骤、优先级或路线图；强调下一步。',
  content: '内容页：一页一观点，action_title 是主判断；论据 ≤4 条，结构跟证据类型走。',
}

function guidanceForKind(kind) {
  return KIND_GUIDANCE[kind] || KIND_GUIDANCE.content
}

export function buildDesignPrompt(slide = {}, { skillGuidance } = {}) {
  const pageKind = normalizeText(slide.page_kind) || 'content'
  const system = [
    '你是 guizang / Swiss Style 信息设计师，为 PPTAgent 的短 deck 做每页自主排版。',
    'Swiss/guizang 是审美标尺，不是固定模板目录；不要套用每页相同的版式，结构必须跟内容走。',
    '内容结构映射：数据/数字页用大数字、矩阵或横向条；流程页用时间线、循环或系统图；对比页用左右对照；并列判断用等权卡片或网格；结论页可用 manifesto。',
    `当前 page_kind=${pageKind}。${guidanceForKind(pageKind)}`,
    '审美硬约束：无衬线字体；单一强调色；直角纯色；少阴影、少圆角、少渐变；12 列网格左对齐；极大字号对比；大幅留白；中文大标题用 min(vw,vh) 双约束防溢出。',
    '安全硬约束：只输出当前页的一个 <section class="slide ...">...</section>，不要输出解释文字，不要输出 <html>/<head>/<body>，不要脚本，不要 <style> 标签，不要外链资源，不要 iframe，不要 on* 事件属性，不要 javascript: URL。',
    '可以使用 shell 已有 class、CSS 变量、inline style 与 <i data-lucide="name"></i> 图标；只能写 inline style，所有样式必须限定在当前 section 内，不要写全局 CSS。',
    'section 必须保留 slide class；如能确定页码，写 data-page；页内内容要把 action_title 放在显著位置，并保留可追溯来源的简短标识。',
    skillGuidance,
  ].filter(Boolean).join('\n')

  const user = [
    `# page_no\n${normalizeText(slide.page_no) || '(无)'}`,
    `# page_kind\n${pageKind}`,
    `# intent\n${normalizeText(slide.intent || slide.page_intent) || '(无)'}`,
    `# action_title\n${normalizeText(slide.action_title) || '(无)'}`,
    `# layout_hint\n${normalizeText(slide.layout_hint || slide.layout) || '(无)'}`,
    `# core_points\n${formatList(slide.core_points, point => `- ${point}`)}`,
    `# data_refs\n${formatList(slide.data_refs, formatDataRef)}`,
    `# blocks\n${formatList(slide.blocks || slide.content_blocks, formatBlock)}`,
    `# extra\n${slide.extra ? JSON.stringify(slide.extra, null, 2) : '(无)'}`,
    '# output_contract\n只输出一个完整 section。不要 Markdown 围栏，不要解释。',
  ].join('\n\n')

  return { system, user }
}

function stripSingleFence(text) {
  const raw = String(text ?? '').trim()
  const fenced = raw.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i)
  return (fenced ? fenced[1] : raw).trim()
}

function assertSafeSectionHtml(html) {
  const forbiddenTag = html.match(FORBIDDEN_TAG_PATTERN)
  if (forbiddenTag) throw new Error(`Forbidden tag in section_html: <${forbiddenTag[1]}>`)
  if (EVENT_ATTRIBUTE_PATTERN.test(html)) throw new Error('Forbidden event attribute in section_html')
  if (JAVASCRIPT_URL_PATTERN.test(html)) throw new Error('Forbidden javascript: URL in section_html')
  if (EXTERNAL_ATTR_PATTERN.test(html)) throw new Error('Forbidden external src/href in section_html')
  if (EXTERNAL_CSS_PATTERN.test(html)) throw new Error('Forbidden external CSS resource in section_html')
}

function assertSlideClass(html) {
  const openTag = html.match(/^<section\b[^>]*>/i)?.[0] || ''
  const classMatch = openTag.match(/\sclass\s*=\s*(["'])(.*?)\1/i)
  if (!classMatch || !/\bslide\b/.test(classMatch[2])) {
    throw new Error('section_html must include class="slide ..."')
  }
}

function dataPageValue(html) {
  const match = html.match(/\sdata-page\s*=\s*(["'])(.*?)\1/i)
  return match ? match[2].trim() : ''
}

function injectDataPage(html, pageNo) {
  if (!pageNo) return html
  const expected = String(pageNo)
  const current = dataPageValue(html)
  if (current && current !== expected) {
    throw new Error(`section_html data-page must match page ${expected}; got ${current}`)
  }
  if (current) return html
  return html.replace(/^<section\b/i, `<section data-page="${expected}"`)
}

export function isWellFormedSection(html) {
  const value = String(html ?? '').trim()
  if (!value.startsWith('<section') || !value.endsWith('</section>')) return false
  const tokens = [...value.matchAll(/<\/?section\b[^>]*>/gi)]
  if (tokens.length < 2) return false
  if (tokens[0].index !== 0 || !/^<section\b/i.test(tokens[0][0])) return false

  let depth = 0
  for (const token of tokens) {
    depth += token[0].startsWith('</') ? -1 : 1
    if (depth < 0) return false
    const end = token.index + token[0].length
    if (depth === 0 && end !== value.length) return false
  }
  return depth === 0
}

export function parseSectionHtml(text, { pageNo } = {}) {
  const raw = stripSingleFence(text)
  if (!raw.includes('<section')) {
    throw new Error(`No <section> in design output: ${String(text ?? '').slice(0, 200)}`)
  }
  if (!isWellFormedSection(raw)) {
    throw new Error('Design output must contain exactly one top-level <section>...</section>')
  }
  assertSlideClass(raw)
  assertSafeSectionHtml(raw)
  return injectDataPage(raw, pageNo)
}

export async function designPage(slide, { callModel, maxAttempts = 2, skillGuidance } = {}) {
  if (typeof callModel !== 'function') throw new Error('designPage requires callModel')
  const { system, user } = buildDesignPrompt(slide, { skillGuidance })
  let lastError
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const attemptUser = attempt === 1
      ? user
      : [
        user,
        '',
        '# 上一次输出被拒绝',
        lastError?.message || 'section_html 不符合安全或结构规则',
        '请只输出修正后的一个 section，去掉所有违规标签、属性、外链和解释文字。',
      ].join('\n')
    const result = await callModel(system, attemptUser)
    const text = typeof result === 'string' ? result : result?.text
    try {
      return {
        ...slide,
        section_html: parseSectionHtml(text, { pageNo: slide?.page_no }),
      }
    } catch (error) {
      lastError = error
      lastError.rawOutput = String(text ?? '')
    }
  }
  throw lastError
}

export async function designDeck(deck, { callModel, maxAttempts = 2, onProgress, skillGuidance } = {}) {
  if (!Array.isArray(deck?.slides)) throw new Error('designDeck requires deck.slides[]')
  const slides = []
  for (const [index, slide] of deck.slides.entries()) {
    if (typeof onProgress === 'function') {
      onProgress({ type: 'start', index, total: deck.slides.length, pageNo: slide?.page_no })
    }
    slides.push(await designPage(slide, { callModel, maxAttempts, skillGuidance }))
    if (typeof onProgress === 'function') {
      onProgress({ type: 'done', index, total: deck.slides.length, pageNo: slide?.page_no })
    }
  }
  return {
    ...deck,
    slides,
  }
}
