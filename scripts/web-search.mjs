import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkEnv } from './load-env.mjs'
import { withCache, cacheStats } from './search-cache.mjs'
import { appendWebSearchAuditLog } from './audit-log.mjs'

const DISABLED_DOMESTIC_SOCIAL_PLATFORMS = new Set([
  'xiaohongshu',
  'xhs',
  '小红书',
  'wechat',
  'weixin',
  'weixin_articles',
  'wechat_articles',
  '公众号',
  '微信公众号',
  '微信',
])

const DOMESTIC_MEDIA_HOST_PATTERNS = [
  /(^|\.)mp\.weixin\.qq\.com$/i,
  /(^|\.)weixin\.qq\.com$/i,
  /(^|\.)wechat\.com$/i,
  /(^|\.)xiaohongshu\.com$/i,
  /(^|\.)xhslink\.com$/i,
]

const DOMESTIC_MEDIA_TEXT_PATTERN = /公众号|微信公众号|微信公众平台|微信|weixin|wechat|小红书|xiaohongshu|xhslink|xhs/i

const QUERY_REPLACEMENTS = [
  [/\bsite:\s*(?:www\.)?(?:xiaohongshu\.com|xhslink\.com|mp\.weixin\.qq\.com|weixin\.qq\.com)\b/gi, ''],
  [/微信公众号|微信公众平台|公众号/g, '公开内容平台'],
  [/微信社群|微信群|微信/g, '公开社群'],
  [/小红书/g, '公开用户社区'],
  [/xiaohongshu|xhslink|xhs/gi, 'public creator community'],
  [/wechat|weixin/gi, 'public community'],
]

export function isDomesticMediaUrl(url) {
  try {
    const parsed = new URL(String(url || ''))
    return DOMESTIC_MEDIA_HOST_PATTERNS.some(pattern => pattern.test(parsed.hostname))
  } catch {
    return false
  }
}

export function sanitizeDomesticMediaQuery(query) {
  let sanitized = String(query || '')
  for (const [pattern, replacement] of QUERY_REPLACEMENTS) {
    sanitized = sanitized.replace(pattern, replacement)
  }
  sanitized = sanitized
    .replace(/\s+/g, ' ')
    .replace(/\s+([,，、:：;；])/g, '$1')
    .replace(/([,，、:：;；]){2,}/g, '$1')
    .trim()
  return sanitized || '公开用户社区评价'
}

export function isDomesticMediaResult(result = {}) {
  if (isDomesticMediaUrl(result.url)) return true
  return DOMESTIC_MEDIA_TEXT_PATTERN.test(`${result.title || ''} ${result.snippet || ''}`)
}

export function filterDomesticMediaResults(results = []) {
  return (Array.isArray(results) ? results : []).filter(result => !isDomesticMediaResult(result))
}

function normalizeQueryShape(query) {
  return String(query || '').replace(/\s+/g, ' ').trim()
}

function wordTokens(query) {
  return normalizeQueryShape(query)
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean)
}

function isResearchQuery(query) {
  return /详细|完整|全文|报告|分析|论文|研究|证据|数据|来源|支撑|验证|洞察|case study|in-depth|deep research|report|research|evidence|analysis|source/i.test(query)
}

function isNaturalLanguageQuestion(query) {
  return /多少|是什么|怎么样|怎么做|如何|哪些|为何|为什么|是否|能否|应该|对比|预测|判断|支撑|证明|找\s*\d*\s*个|what|how|why|which|should|compare|forecast|predict/i.test(query)
}

function isShortKeywordQuery(query) {
  const normalized = normalizeQueryShape(query)
  if (!normalized) return false
  if (isNaturalLanguageQuestion(normalized)) return false
  if (/[？?。；;，,]/.test(normalized)) return false
  const tokens = wordTokens(normalized)
  if (/^[\x00-\x7F]+$/.test(normalized)) return tokens.length <= 8
  return normalized.length < 24
}

export function pickEngine(query, opts = {}) {
  if (opts.engine && opts.engine !== 'auto') return opts.engine
  const normalized = normalizeQueryShape(query)
  if (isResearchQuery(normalized)) return 'exa'
  if (normalized.length >= 40 && !isShortKeywordQuery(normalized)) return 'exa'
  if (isNaturalLanguageQuestion(normalized)) return 'tavily'
  if (opts.maxResults && opts.maxResults > 3 && isShortKeywordQuery(normalized)) return 'serper'
  return 'tavily'
}

export async function webSearch(query, opts = {}) {
  const env = checkEnv()
  const sanitizedQuery = sanitizeDomesticMediaQuery(query)
  const engine = pickEngine(sanitizedQuery, opts)

  const startedAt = Date.now()
  const fetchSearch = async () => {
    if (engine === 'tavily') return tavilySearch(sanitizedQuery, opts, env.tavily)
    if (engine === 'serper') return serperSearch(sanitizedQuery, opts, env.serper)
    if (engine === 'exa') return exaSearch(sanitizedQuery, opts, env.exa)
    if (engine === 'social') return socialSearch(sanitizedQuery, opts)
    if (engine.startsWith('social:')) return socialSearch(sanitizedQuery, {
      ...opts,
      platform: engine.split(':').slice(1).join(':'),
    })
    throw new Error(`Unknown engine: ${engine}`)
  }
  const result = opts.noCache
    ? { ...await fetchSearch(), _cacheHit: false }
    : await withCache(sanitizedQuery, { ...opts, engine }, fetchSearch)
  const filteredResult = {
    ...result,
    query: sanitizedQuery,
    results: filterDomesticMediaResults(result.results),
  }

  if (opts.slug) {
    await appendWebSearchAuditLog(opts.slug, {
      timestamp: new Date().toISOString(),
      provider: filteredResult.engine || engine,
      query: sanitizedQuery,
      result_count: filteredResult.results?.length || 0,
      results: (filteredResult.results || []).slice(0, opts.auditResultLimit || 5).map(item => ({
        url: item.url,
        title: item.title,
        snippet: (item.snippet || '').slice(0, 240),
      })),
      latency_ms: Date.now() - startedAt,
      cache_hit: Boolean(filteredResult._cacheHit),
    })
  }

  return filteredResult
}

export async function exaSearch(query, opts, apiKey) {
  if (!apiKey) throw new Error('EXA_API_KEY required for Exa search')

  const maxCharacters = opts.maxCharacters || opts.textMaxCharacters || 4000
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      query,
      type: opts.searchType || 'auto',
      numResults: opts.maxResults || 8,
      contents: {
        text: { maxCharacters },
        highlights: true,
      },
    }),
  })

  if (!response.ok) throw new Error(`Exa HTTP ${response.status}: ${await response.text()}`)

  const data = await response.json()
  return {
    engine: 'exa',
    answer: data.output?.content || null,
    results: (data.results || []).map(result => ({
      title: result.title || result.url,
      url: result.url,
      snippet: result.text || (result.highlights || []).join('\n') || '',
      highlights: result.highlights || [],
      published_date: result.publishedDate,
      score: result.score,
    })),
    cost_usd: 0,
    query,
  }
}

function normalizePlatform(value = 'reddit') {
  const platform = String(value || 'reddit').toLowerCase()
  if (DISABLED_DOMESTIC_SOCIAL_PLATFORMS.has(platform)) {
    throw new Error(`Domestic social search platform disabled by Step 2 scope update: ${platform}`)
  }
  if (['reddit'].includes(platform)) return 'reddit'
  throw new Error(`Unsupported social platform: ${platform}`)
}

function parseArgs(argv) {
  const opts = {}
  const positional = []
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('--')) {
      positional.push(arg)
      continue
    }
    const [rawKey, inlineValue] = arg.slice(2).split('=', 2)
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase())
    const value = inlineValue ?? (!argv[index + 1] || argv[index + 1].startsWith('--') ? true : argv[++index])
    opts[key] = value
  }
  if (!opts.query && positional.length > 0) opts.query = positional.join(' ')
  return opts
}

async function runCliSearch(opts) {
  if (!opts.query) throw new Error('--query is required')
  const slug = opts.slug || '_web-search-cli'
  const result = await webSearch(opts.query, {
    engine: opts.engine || 'auto',
    platform: opts.platform,
    maxResults: opts.maxResults ? Number(opts.maxResults) : undefined,
    maxCharacters: opts.maxCharacters ? Number(opts.maxCharacters) : undefined,
    searchType: opts.searchType,
    noCache: Boolean(opts.noCache),
    slug,
  })
  return {
    slug,
    engine: result.engine,
    provider: result.provider,
    count: result.results.length,
    first_url: result.results[0]?.url || '',
    first_snippet_length: (result.results[0]?.snippet || '').length,
    results: result.results,
  }
}

async function redditSearch(query, opts) {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=${opts.maxResults || 8}`
  const response = await fetch(url, {
    headers: { 'User-Agent': 'pptagent-social-search/1.0' },
  })
  if (!response.ok) throw new Error(`Reddit HTTP ${response.status}: ${await response.text()}`)
  const data = await response.json()
  const queryTokens = searchTokens(query)
  const results = (data.data?.children || []).map(child => {
    const item = child.data || {}
    return {
      title: item.title || 'Reddit UGC',
      url: item.permalink ? `https://www.reddit.com${item.permalink}` : item.url,
      snippet: item.selftext || item.subreddit_name_prefixed || '',
      score: item.score,
    }
  }).filter(result => /^https?:\/\//.test(result.url))
    .filter(result => isRelevantSocialResult(result, queryTokens))

  return {
    engine: 'social:reddit',
    answer: null,
    results,
    cost_usd: 0,
    query,
  }
}

function searchTokens(query) {
  return String(query || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map(token => token.trim())
    .filter(token => token.length >= 4)
}

function isRelevantSocialResult(result, queryTokens) {
  if (queryTokens.length === 0) return true
  const haystack = `${result.title || ''} ${result.snippet || ''} ${result.url || ''}`.toLowerCase()
  const brandTokens = queryTokens.filter(token => token === 'smallrig')
  if (brandTokens.length > 0) {
    return brandTokens.every(token => haystack.includes(token))
  }
  return queryTokens.some(token => haystack.includes(token))
}

export async function socialSearch(query, opts = {}) {
  const platform = normalizePlatform(opts.platform)
  if (platform === 'reddit') return redditSearch(query, opts)
  throw new Error(`Unsupported social platform: ${platform}`)
}

async function tavilySearch(query, opts, apiKey) {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: opts.searchDepth || 'basic',
      include_answer: opts.includeAnswer !== false,
      max_results: opts.maxResults || 5,
    }),
  })

  if (!response.ok) throw new Error(`Tavily HTTP ${response.status}: ${await response.text()}`)

  const data = await response.json()
  return {
    answer: data.answer,
    results: (data.results || []).map(result => ({
      title: result.title,
      url: result.url,
      snippet: result.content || '',
      score: result.score,
    })),
    engine: 'tavily',
    cost_usd: 0.0001,
    query,
  }
}

async function serperSearch(query, opts, apiKey) {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      num: opts.maxResults || 10,
      hl: 'zh-cn',
      gl: 'cn',
    }),
  })

  if (!response.ok) throw new Error(`Serper HTTP ${response.status}: ${await response.text()}`)

  const data = await response.json()
  return {
    results: (data.organic || []).map(result => ({
      title: result.title,
      url: result.link,
      snippet: result.snippet || '',
      score: 1,
    })),
    answerBox: data.answerBox,
    engine: 'serper',
    cost_usd: 0.0003,
    query,
  }
}

async function cliMain() {
  const args = process.argv.slice(2)
  if (args[0] === '--test') {
    console.log('Testing both engines with 1 query each...\n')

    console.log('1. Tavily test: "新能源汽车 2025 中国市场规模"')
    const tavily = await webSearch('新能源汽车 2025 中国市场规模', { engine: 'tavily' })
    console.log(`   Engine: ${tavily.engine}, cache_hit: ${tavily._cacheHit}, results: ${tavily.results.length}`)
    if (tavily.answer) console.log(`   Answer: ${tavily.answer.slice(0, 150)}...`)
    console.log()

    console.log('2. Serper test: "SmallRig 斯莫格 最近动态"')
    const serper = await webSearch('SmallRig 斯莫格 最近动态', { engine: 'serper', maxResults: 5 })
    console.log(`   Engine: ${serper.engine}, cache_hit: ${serper._cacheHit}, results: ${serper.results.length}`)
    if (serper.results[0]) console.log(`   First result: ${serper.results[0].title}`)
    console.log()

    const stats = await cacheStats()
    console.log(`Cache: ${stats.entries} entries, ${stats.sizeKB} KB`)
    console.log('\n✅ Both engines passed')
    return
  }

  const opts = parseArgs(args)
  if (!opts.query) {
    console.error('Usage: node scripts/web-search.mjs <query>')
    console.error('       node scripts/web-search.mjs --engine=<tavily|serper|exa|social> --platform=<reddit> --query="<query>"')
    console.error('       node scripts/web-search.mjs --test')
    process.exit(1)
  }

  console.log(JSON.stringify(await runCliSearch(opts), null, 2))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
