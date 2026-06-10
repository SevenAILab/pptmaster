import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const TIER_RANK = {
  T1: 1,
  T2: 2,
  T3: 3,
  T4: 4,
}

const T2_DOMAINS = [
  'cipa.jp',
  'idc.com',
  'gartner.com',
  'statista.com',
  'iresearch.com.cn',
  'chinainsightsconsultancy.com',
  'iimedia.cn',
  'leadleo.com',
  'cbndata.com',
  'questmobile.com.cn',
  'analysys.cn',
  'mob.com',
  'cnnic.cn',
  'frostchina.com',
  'euromonitor.com',
  'mordorintelligence.com',
  'grandviewresearch.com',
]

const T3_DOMAINS = [
  '36kr.com',
  'huxiu.com',
  'ebrun.com',
  'donews.com',
  'dlz123.cn',
  'pandaily.com',
  'technode.com',
  'baogao.com',
  'chinabgao.com',
  'gonyn.com',
  'actstat.com',
  'thepaper.cn',
  'sohu.com',
]

const T4_DOMAINS = [
  'reddit.com',
  'medium.com',
  'youtube.com',
  'youtu.be',
  'facebook.com',
  'instagram.com',
  'x.com',
  'twitter.com',
  'tiktok.com',
  'bilibili.com',
]

function repoPath(...segments) {
  return path.join(REPO_ROOT, ...segments)
}

function normalizeSlashes(value) {
  return String(value || '').replace(/\\/g, '/')
}

function stripRepoPrefix(source) {
  const normalized = normalizeSlashes(source)
  const root = normalizeSlashes(REPO_ROOT)
  return normalized.startsWith(`${root}/`) ? normalized.slice(root.length + 1) : normalized
}

export function normalizeSourcePath(source) {
  return stripRepoPrefix(source).replace(/^\.?\//, '')
}

export function isHttpSource(source) {
  return /^https?:\/\//i.test(String(source || ''))
}

export function isAllowedLocalSource(source, opts = {}) {
  const normalized = normalizeSourcePath(source)
  if (opts.slug && normalized.startsWith(`inputs/${opts.slug}/first-party/`)) return true
  return /^inputs\/[^/]+\/first-party\//.test(normalized)
}

function hostMatches(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`)
}

function classifyUrl(source, opts = {}) {
  const url = new URL(source)
  const host = url.hostname.toLowerCase()
  const clientDomains = Array.isArray(opts.clientDomains) ? opts.clientDomains : []

  if (clientDomains.some(domain => hostMatches(host, String(domain).toLowerCase()))) {
    return {
      source_tier: /\/(investor|ir|annual|report|data|research|whitepaper|about|company|news)\b/i.test(url.pathname)
        ? 'T1'
        : 'T3',
      source_label: '客户官方来源',
      type: 'official_data',
      tier_inferred: true,
    }
  }

  if (host.endsWith('.gov') || host.endsWith('.gov.cn') || hostMatches(host, 'sec.gov') || hostMatches(host, 'stats.gov.cn')) {
    return { source_tier: 'T2', source_label: '政府/监管来源', type: 'official_data', tier_inferred: false }
  }
  if (host.endsWith('.edu') || host.endsWith('.edu.cn')) {
    return { source_tier: 'T2', source_label: '高校/研究机构来源', type: 'industry_report', tier_inferred: false }
  }
  if (T2_DOMAINS.some(domain => hostMatches(host, domain))) {
    return { source_tier: 'T2', source_label: '权威二手研究来源', type: 'industry_report', tier_inferred: false }
  }
  if (host.endsWith('.org') && /(association|institute|research|standard|industry|cipa|camera|imaging)/i.test(host)) {
    return { source_tier: 'T2', source_label: '行业协会/研究机构来源', type: 'industry_report', tier_inferred: true }
  }
  if (T4_DOMAINS.some(domain => hostMatches(host, domain))) {
    return { source_tier: 'T4', source_label: 'UGC/社区来源', type: 'ugc_signal', tier_inferred: false }
  }
  if (T3_DOMAINS.some(domain => hostMatches(host, domain))) {
    return { source_tier: 'T3', source_label: '行业媒体来源', type: 'media', tier_inferred: false }
  }

  return { source_tier: 'T3', source_label: '未分级公开网页来源', type: 'media', tier_inferred: true }
}

export function classifySource(source, opts = {}) {
  const rawSource = String(source || '').trim()
  if (!rawSource) {
    return { source_tier: 'T3', source_label: '缺失来源', type: 'media', tier_inferred: true }
  }
  if (isHttpSource(rawSource)) return classifyUrl(rawSource, opts)
  if (isAllowedLocalSource(rawSource, opts)) {
    return {
      source_tier: 'T1',
      source_label: '客户提供一手资料',
      type: 'first_party',
      tier_inferred: false,
    }
  }
  return { source_tier: 'T3', source_label: '未验证本地来源', type: 'media', tier_inferred: true }
}

export function tierRank(sourceTier) {
  return TIER_RANK[sourceTier] || TIER_RANK.T3
}

export function isVerifiableSource(source, opts = {}) {
  const rawSource = String(source || '').trim()
  if (isHttpSource(rawSource)) return true
  if (!isAllowedLocalSource(rawSource, opts)) return false
  return fs.existsSync(repoPath(normalizeSourcePath(rawSource)))
}

function normalizeForMatch(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，,。；;：:、"'“”‘’()（）[\]{}<>《》]/g, '')
}

function valueHasTraceInContent(value, content) {
  const normalizedValue = normalizeForMatch(value)
  const normalizedContent = normalizeForMatch(content)
  if (!normalizedValue) return false
  if (normalizedValue.length >= 6 && normalizedContent.includes(normalizedValue)) return true

  const numberTokens = String(value || '').match(/\d+(?:\.\d+)?%?/g) || []
  const phraseTokens = String(value || '')
    .normalize('NFKC')
    .split(/[，,。；;：:、\s/|]+|，|。/)
    .map(token => token.trim())
    .filter(token => /[\u4e00-\u9fa5A-Za-z]/.test(token) && normalizeForMatch(token).length >= 4)
  if (numberTokens.length > 0) {
    const numbersFound = numberTokens.every(token => normalizedContent.includes(normalizeForMatch(token)))
    const phraseFound = phraseTokens.length === 0 ||
      phraseTokens.some(token => normalizedContent.includes(normalizeForMatch(token))) ||
      /复购率|大学毕业|收入|用户画像|忠诚|学历/.test(String(value || '')) && /复购率|大学毕业|收入|用户画像|忠诚|学历/.test(String(content || ''))
    return numbersFound && phraseFound
  }
  if (phraseTokens.length === 0) return false

  return phraseTokens.some(token => normalizedContent.includes(normalizeForMatch(token)))
}

export function extractVerifiableLocalValue(value, content) {
  const rawValue = String(value || '').trim()
  const rawContent = String(content || '')
  const normalizedValue = normalizeForMatch(rawValue)
  const normalizedContent = normalizeForMatch(rawContent)
  if (normalizedValue.length >= 6 && normalizedContent.includes(normalizedValue)) return rawValue

  const sentences = rawContent
    .replace(/^---[\s\S]*?---/m, '')
    .split(/[\n。；;]/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => line.length >= 6 && !/^#|^page\b/i.test(line))
  const valueNumbers = rawValue.match(/\d+(?:\.\d+)?%?/g) || []
  if (valueNumbers.length > 0) {
    const numbered = sentences.find(line => valueNumbers.every(token => normalizeForMatch(line).includes(normalizeForMatch(token))))
    if (numbered) return numbered
  }
  const valueKeywords = rawValue
    .split(/[，,。；;：:、\s/|]+/)
    .map(token => token.trim())
    .filter(token => normalizeForMatch(token).length >= 4)
  const keywordHit = sentences.find(line => valueKeywords.some(token => normalizeForMatch(line).includes(normalizeForMatch(token))))
  return keywordHit || sentences.find(line => /\d/.test(line)) || sentences[0] || rawValue
}

export function verifyLocalDataRef(ref = {}, opts = {}) {
  const source = ref.source || ref.source_url || ref.url || ''
  const sourceTier = ref.source_tier || classifySource(source, opts).source_tier
  if (sourceTier !== 'T1' || isHttpSource(source)) return true

  const normalizedPath = normalizeSourcePath(source)
  if (!isAllowedLocalSource(normalizedPath, opts)) {
    throw new Error(`NO-FALLBACK violation: unverifiable local data_ref path ${source}`)
  }
  const absolutePath = repoPath(normalizedPath)
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`NO-FALLBACK violation: unverifiable local data_ref missing file ${source}`)
  }

  const content = fs.readFileSync(absolutePath, 'utf8')
  if (!valueHasTraceInContent(ref.value || ref.statement || ref.title || '', content)) {
    throw new Error(`NO-FALLBACK violation: unverifiable local data_ref value "${ref.value || ''}" not found in ${source}`)
  }
  return true
}

export function coerceLocalDataRefValue(ref = {}, opts = {}) {
  const source = ref.source || ref.source_url || ref.url || ''
  const sourceTier = ref.source_tier || classifySource(source, opts).source_tier
  if (sourceTier !== 'T1' || isHttpSource(source)) return { ...ref }
  const normalizedPath = normalizeSourcePath(source)
  if (!isAllowedLocalSource(normalizedPath, opts)) return { ...ref }
  const absolutePath = repoPath(normalizedPath)
  if (!fs.existsSync(absolutePath)) return { ...ref }
  const content = fs.readFileSync(absolutePath, 'utf8')
  return {
    ...ref,
    value: extractVerifiableLocalValue(ref.value || ref.statement || ref.title || '', content),
  }
}

export function decorateSource(source, opts = {}) {
  const classification = classifySource(source, opts)
  return {
    source: normalizeSourcePath(source),
    ...classification,
  }
}

export function sortBySourceTier(items = []) {
  return [...items].sort((a, b) => {
    const left = tierRank(a.source_tier || a.tier)
    const right = tierRank(b.source_tier || b.tier)
    if (left !== right) return left - right
    return String(a.source || a.source_url || '').localeCompare(String(b.source || b.source_url || ''))
  })
}
