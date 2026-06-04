import { classifySource, tierRank } from './source-tiers.mjs'

// 规则5：中文营销语气黑名单。仅收录 4-stage 设计文档逐字点名的空话词。
// 扩充必须经 Seven 显式批准（每个词都是策略判断，不由 AI 私自添加）。
export const DEFAULT_BLACKLIST = ['赋能', '打造闭环', '构建生态', '标志着', '里程碑', '业内认为']

export function findBlacklistHits(text, blacklist = DEFAULT_BLACKLIST) {
  const value = String(text == null ? '' : text)
  return blacklist.filter(word => word && value.includes(word))
}

// 规则4：精确数字 = 阿拉伯数字 + 量纲/货币单位。
// 仅匹配"阿拉伯数字+单位"，故"千万/一倍/2024年/第3页/S03/1080px"不会误报。
const PRECISE_NUMBER_RE = /\d+(?:\.\d+)?\s*%|\d+(?:\.\d+)?\s*(?:万|亿|倍|元|个百分点)|[¥￥$]\s*\d/g

// A 级证据门槛：tierRank ≤ 2，即 T1(一手)/T2(权威研究)。A/B/C↔T1-T4 精确映射 → Phase 2b。
const A_GRADE_MAX_RANK = 2

// 行动标题"结论性"启发标记：含判断/谓词即更像结论。
const PREDICATE_MARKERS = ['应', '要', '需', '将', '是', '不是', '比', '超过', '低于', '高于', '导致', '意味', '源于', '胜', '赢', '可', '能', '必须', '应该', '优于', '劣于', '取决']

function slideText(slide) {
  return [slide.action_title, slide.page_subtitle, ...(slide.core_points || [])]
    .filter(Boolean)
    .map(String)
    .join('  ')
}

export function findPreciseNumbers(text) {
  const value = String(text == null ? '' : text)
  return value.match(PRECISE_NUMBER_RE) || []
}

function safeClassify(source, opts) {
  try {
    return classifySource(source, opts)
  } catch {
    return { source_tier: 'T3' }
  }
}

export function hasSourcedRef(slide) {
  const refs = Array.isArray(slide.data_refs) ? slide.data_refs : []
  return refs.some(ref => ref && String(ref.source || ref.source_url || ref.url || '').trim())
}

export function bestTier(slide, opts = {}) {
  const refs = Array.isArray(slide.data_refs) ? slide.data_refs : []
  let best = null
  for (const ref of refs) {
    const source = String((ref && (ref.source || ref.source_url || ref.url)) || '').trim()
    if (!source) continue
    const tier = ref.source_tier || safeClassify(source, opts).source_tier
    const rank = tierRank(tier)
    if (best === null || rank < best.rank) best = { tier, rank }
  }
  return best
}

export function isTopicLikeTitle(title) {
  const value = String(title || '').trim()
  if (!value) return false
  if (/[，,：:；;。！!？?—-]/.test(value)) return false
  const cjkLen = (value.match(/[一-龥]/g) || []).length
  if (cjkLen > 6) return false
  return !PREDICATE_MARKERS.some(marker => value.includes(marker))
}

export function lintSlide(slide, opts = {}) {
  const blacklist = opts.blacklist || DEFAULT_BLACKLIST
  const page = slide.page_no != null ? slide.page_no : '?'
  const violations = []
  const warnings = []
  const text = slideText(slide)

  // 规则1 槽位存在性（可干净映射的 3 槽位；第4槽"含义建议"需上游 schema → Phase 2b）
  if (!String(slide.action_title || '').trim()) {
    violations.push(`page ${page}: 缺「行动标题」槽位`)
  }
  if (!(Array.isArray(slide.core_points) && slide.core_points.length)) {
    violations.push(`page ${page}: 缺「主证据」槽位（core_points 为空）`)
  }
  if (!(Array.isArray(slide.data_refs) && slide.data_refs.length)) {
    violations.push(`page ${page}: 缺「出处」槽位（data_refs 为空）`)
  }

  // 规则5 营销黑名单（硬违规）
  for (const word of findBlacklistHits(text, blacklist)) {
    violations.push(`page ${page}: 命中营销黑名单词「${word}」`)
  }

  // 规则4 精确数字必须可追溯（硬违规）+ A 级出处（警告 → Phase 2b 升级硬约束）
  const numbers = findPreciseNumbers(text)
  if (numbers.length) {
    if (!hasSourcedRef(slide)) {
      violations.push(`page ${page}: 出现精确数字「${numbers.join('、')}」但 data_ref 无任何出处`)
    } else {
      const best = bestTier(slide, opts)
      if (!best || best.rank > A_GRADE_MAX_RANK) {
        warnings.push(`page ${page}: 精确数字「${numbers.join('、')}」最佳出处仅 ${best ? best.tier : '无'}，建议补 A 级(T1/T2)来源`)
      }
    }
  }

  // 规则2 行动标题=结论（启发式 → 仅警告，硬判定交 LLM 关 / Phase 2b）
  const title = String(slide.action_title || '').trim()
  if (title && isTopicLikeTitle(title)) {
    warnings.push(`page ${page}: 行动标题「${title}」疑似话题而非结论，建议复核`)
  }

  return { page_no: slide.page_no, violations, warnings }
}

export function lintDeck(deck, opts = {}) {
  const slides = Array.isArray(deck && deck.slides) ? deck.slides : []
  const perSlide = slides.map(slide => lintSlide(slide, opts))
  return {
    violations: perSlide.flatMap(result => result.violations),
    warnings: perSlide.flatMap(result => result.warnings),
    perSlide,
  }
}

export function assertDeckDiscipline(deck, opts = {}) {
  const result = lintDeck(deck, opts)
  if (result.violations.length) {
    throw new Error(['内容纪律红线违规（失败必抛错，不静默兜底）：', ...result.violations.map(v => `  - ${v}`)].join('\n'))
  }
  return result
}
