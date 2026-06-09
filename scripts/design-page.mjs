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

export function buildDesignPrompt(slide = {}) {
  const system = [
    '你是 guizang / Swiss Style 信息设计师，为 PPTAgent 的短 deck 做每页自主排版。',
    'Swiss/guizang 是审美标尺，不是固定模板目录；不要套用每页相同的版式，结构必须跟内容走。',
    '内容结构映射：数据/数字页用大数字、矩阵或横向条；流程页用时间线、循环或系统图；对比页用左右对照；并列判断用等权卡片或网格；结论页可用 manifesto。',
    '审美硬约束：无衬线字体；单一强调色；直角纯色；少阴影、少圆角、少渐变；12 列网格左对齐；极大字号对比；大幅留白；中文大标题用 min(vw,vh) 双约束防溢出。',
    '安全硬约束：只输出当前页的一个 <section class="slide ...">...</section>，不要输出解释文字，不要输出 <html>/<head>/<body>，不要脚本，不要 <style> 标签，不要外链资源，不要 iframe，不要 on* 事件属性，不要 javascript: URL。',
    '可以使用 shell 已有 class、CSS 变量、inline style 与 <i data-lucide="name"></i> 图标；只能写 inline style，所有样式必须限定在当前 section 内，不要写全局 CSS。',
    'section 必须保留 slide class；如能确定页码，写 data-page；页内内容要把 action_title 放在显著位置，并保留可追溯来源的简短标识。',
  ].join('\n')

  const user = [
    `# page_no\n${normalizeText(slide.page_no) || '(无)'}`,
    `# intent\n${normalizeText(slide.intent || slide.page_intent) || '(无)'}`,
    `# action_title\n${normalizeText(slide.action_title) || '(无)'}`,
    `# layout_hint\n${normalizeText(slide.layout) || '(无)'}`,
    `# core_points\n${formatList(slide.core_points, point => `- ${point}`)}`,
    `# data_refs\n${formatList(slide.data_refs, formatDataRef)}`,
    `# blocks\n${formatList(slide.blocks || slide.content_blocks, formatBlock)}`,
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
  const opens = value.match(/<section\b/gi) || []
  const closes = value.match(/<\/section>/gi) || []
  return opens.length === 1 && closes.length === 1
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

export async function designPage(slide, { callModel, maxAttempts = 2 } = {}) {
  if (typeof callModel !== 'function') throw new Error('designPage requires callModel')
  const { system, user } = buildDesignPrompt(slide)
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
    }
  }
  throw lastError
}

export async function designDeck(deck, { callModel, maxAttempts = 2, onProgress } = {}) {
  if (!Array.isArray(deck?.slides)) throw new Error('designDeck requires deck.slides[]')
  const slides = []
  for (const [index, slide] of deck.slides.entries()) {
    if (typeof onProgress === 'function') {
      onProgress({ type: 'start', index, total: deck.slides.length, pageNo: slide?.page_no })
    }
    slides.push(await designPage(slide, { callModel, maxAttempts }))
    if (typeof onProgress === 'function') {
      onProgress({ type: 'done', index, total: deck.slides.length, pageNo: slide?.page_no })
    }
  }
  return {
    ...deck,
    slides,
  }
}
