import { externalModules } from '../core/content-model.mjs'

const KEY_KINDS = new Set(['brand_definition', 'strategy_core', 'product_system', 'narrative_system'])
const STOP_WORDS = new Set(['的', '和', '与', '为', '是', '在', '品牌', '用户', '市场', '产品'])

function text(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(text).join(' ')
  if (typeof value === 'object') return Object.values(value).map(text).join(' ')
  return String(value)
}

function anchorWords(positioning) {
  const value = text(positioning)
  const latin = value.match(/[A-Za-z0-9][A-Za-z0-9_-]{1,}/g) || []
  const cjkPairs = value.match(/[\u4e00-\u9fff]{2}/g) || []
  const cjkLong = value.match(/[\u4e00-\u9fff]{3,}/g) || []
  return [...new Set([...latin, ...cjkLong, ...cjkPairs]
    .map(word => word.trim())
    .filter(word => word && !STOP_WORDS.has(word)))]
}

function hasAnchor(value, anchors) {
  const haystack = text(value)
  return anchors.some(anchor => haystack.includes(anchor))
}

function numberClaims(value) {
  const body = text(value)
  const claims = []
  const re = /([\u4e00-\u9fffA-Za-z]{2,12})\s*(\d+(?:\.\d+)?)\s*(亿元|万元|元|%|家|杯|人|天|月|年)/g
  let match = re.exec(body)
  while (match) {
    claims.push({ metric: match[1], value: `${match[2]}${match[3]}` })
    match = re.exec(body)
  }
  return claims
}

function normalizedBodyWithoutAnchors(value, anchors) {
  let body = text(value).replace(/\s+/g, '')
  for (const anchor of anchors) body = body.replaceAll(anchor, '')
  return body
    .replace(/[A-Za-z]+-\d+/g, '')
    .replace(/[A-Za-z][A-Za-z0-9._-]+/g, '')
    .replace(/[。！？,.，、；;:：]/g, '')
}

function longestCommonSubstringLength(a, b) {
  const left = String(a || '')
  const right = String(b || '')
  let best = 0
  const dp = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0))
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      if (left[i - 1] === right[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
        if (dp[i][j] > best) best = dp[i][j]
      }
    }
  }
  return best
}

export function validateCoherence(content) {
  const positioning = content?.strategic_spine?.positioning_statement || ''
  const anchors = anchorWords(positioning)
  const violations = []
  const metrics = new Map()
  const normalizedTexts = []

  for (const module of externalModules(content)) {
    const moduleText = text(module.content)
    const alignment = text(module.spine_alignment)
    const normalized = normalizedBodyWithoutAnchors(`${alignment} ${moduleText}`, anchors)

    if (KEY_KINDS.has(module.kind) && (!Array.isArray(module.evidence_refs) || module.evidence_refs.length === 0)) {
      violations.push({ id: module.id, rule: 'evidence_refs', reason: '证据缺失：关键模块必须引用 analysis-card evidence_refs' })
    }

    if (KEY_KINDS.has(module.kind) && normalized.length < 8) {
      violations.push({ id: module.id, rule: 'boilerplate', reason: 'boilerplate 套话：模块几乎只是在复读定位语' })
    }

    if (module.kind !== 'brand_entry') {
      for (const previous of normalizedTexts) {
        if (normalized.length >= 18 && previous.normalized.length >= 18 && longestCommonSubstringLength(normalized, previous.normalized) >= 18) {
          violations.push({ id: module.id, rule: 'template_repeat', reason: `模板重复：与 ${previous.id} 存在大段相同表达` })
          break
        }
      }
    }
    if (module.kind !== 'brand_entry') normalizedTexts.push({ id: module.id, normalized })

    if (!alignment) {
      violations.push({ id: module.id, rule: 'spine_alignment', reason: 'spine_alignment 为空，主线断层' })
    } else if (anchors.length && !hasAnchor(`${alignment} ${moduleText}`, anchors)) {
      violations.push({ id: module.id, rule: 'spine_alignment', reason: 'spine_alignment 未命中战略主线锚词' })
    }

    if (KEY_KINDS.has(module.kind) && !['L3', 'L4'].includes(module.depth_level)) {
      violations.push({ id: module.id, rule: 'depth_level', reason: '深度不足，关键模块必须是 L3/L4' })
    }

    if (anchors.length && !hasAnchor(moduleText, anchors) && !hasAnchor(alignment, anchors)) {
      violations.push({ id: module.id, rule: 'interchangeability', reason: '可互换：模块文本与战略主线锚词零交集' })
    }

    for (const claim of numberClaims(module.content)) {
      const previous = metrics.get(claim.metric)
      if (previous && previous.value !== claim.value) {
        violations.push({
          id: module.id,
          rule: 'assumption_conflict',
          reason: `假设冲突：${claim.metric} 同时出现 ${previous.value} 与 ${claim.value}`,
        })
      } else {
        metrics.set(claim.metric, { value: claim.value, id: module.id })
      }
    }
  }

  return { ok: violations.length === 0, violations }
}

export function assertCoherence(content) {
  const result = validateCoherence(content)
  if (!result.ok) {
    const summary = result.violations.map(item => `${item.id}:${item.reason}`).join('; ')
    throw new Error(`coherence gate failed: ${summary}`)
  }
  return result
}
