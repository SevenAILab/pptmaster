// scripts/ingest/ingest-methodologies.mjs
// Register 14 external methodology articles and optionally fetch raw markdown locally.

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../..')
const OUT_DIR = path.join(REPO_ROOT, 'assets/_raw/methodologies')
const RAW_DIR = path.join(OUT_DIR, 'raw')
const SUMMARY_DIR = path.join(OUT_DIR, 'summaries')
const SOURCES_PATH = path.join(OUT_DIR, 'SOURCES.md')
const DEFAULT_LOCAL_DIR = '/Users/seven/Documents/文档/PPT方案大师/文章方法论Markdown'

const METHODOLOGY_SOURCES = [
  {
    id: 1,
    slug: 'essence',
    url: 'https://mp.weixin.qq.com/s/i3_8kR-xCmLbLe_0tE4L2g',
    title: '如何找到本质？',
    applicable: '横切方法论'
  },
  {
    id: 2,
    slug: 'industry-analysis',
    url: 'https://mp.weixin.qq.com/s/iHsY5E4MJ_QU-i_UAPENLA',
    title: '如何做行业分析？',
    applicable: 'Sub-Agent ②'
  },
  {
    id: 3,
    slug: 'competitor-analysis',
    url: 'https://mp.weixin.qq.com/s/kaEPfz9fcbUoRLZ8GsrfCA',
    title: '如何做竞品分析',
    applicable: 'Sub-Agent ③'
  },
  {
    id: 4,
    slug: 'self-analysis',
    url: 'https://mp.weixin.qq.com/s/8IyxKvL-yRYeq20ahhxpBQ',
    title: '如何做自身分析？',
    applicable: 'Sub-Agent ④'
  },
  {
    id: 5,
    slug: 'user-analysis',
    url: 'https://mp.weixin.qq.com/s/v8-iJNg3FuQIaStz-CeUsw',
    title: '如何做用户分析？',
    applicable: 'Sub-Agent ①'
  },
  {
    id: 6,
    slug: 'user-insight',
    url: 'https://mp.weixin.qq.com/s/ynaQFgWSqs5aFBRk7Orzhg',
    title: '如何做用户洞察？',
    applicable: 'Sub-Agent ①'
  },
  {
    id: 7,
    slug: 'swot',
    url: 'https://mp.weixin.qq.com/s/AlgJkurM3b4dlLeMzIvG_g',
    title: '探讨 SWOT 分析',
    applicable: '横切方法论'
  },
  {
    id: 8,
    slug: 'business-model',
    url: 'https://mp.weixin.qq.com/s/hie-KEwip4UaPAsrxdh77Q',
    title: '探讨商业模式',
    applicable: 'Sub-Agent ④ + ⑥'
  },
  {
    id: 9,
    slug: 'brand-strategy',
    url: 'https://mp.weixin.qq.com/s/-xTIROhKKPIahl-eHvg5Wg',
    title: '探讨品牌策略',
    applicable: 'Sub-Agent ④'
  },
  {
    id: 10,
    slug: 'brand-slogan',
    url: 'https://mp.weixin.qq.com/s/tmR0y7G_fiCFcyq0w4xPfw',
    title: '如何写品牌口号？',
    applicable: 'Sub-Agent ⑤'
  },
  {
    id: 11,
    slug: 'product-strategy',
    url: 'https://mp.weixin.qq.com/s/Rg4wBDqm7zY3Xs7ePBK0LA',
    title: '如何做产品策略？',
    applicable: 'Sub-Agent ⑤ + ⑥'
  },
  {
    id: 12,
    slug: 'product-house',
    url: 'https://mp.weixin.qq.com/s/Ixt0GbW80PSnlY9OHIMzdQ',
    title: '如何搭建产品屋？',
    applicable: 'Sub-Agent ⑤'
  },
  {
    id: 13,
    slug: 'brand-house',
    url: 'https://mp.weixin.qq.com/s/9LPMY8CJTXh4qtkqaQPEWg',
    title: '如何搭建品牌屋？',
    applicable: 'Sub-Agent ⑤'
  },
  {
    id: 14,
    slug: '34-communication-theories',
    url: 'https://mp.weixin.qq.com/s/yFKXDtxrtCC26iZYnvz5BQ',
    title: '策略人必备的 34 个传播学理论',
    applicable: '横切方法论'
  }
]

function rawFilename(source) {
  return `${String(source.id).padStart(2, '0')}-${source.slug}.md`
}

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

function normalizeForMatch(value) {
  return String(value || '')
    .replace(/[？?：:，,\s「」《》“”"']/g, '')
    .toLowerCase()
}

function findLocalArticleFile(source, fileNames) {
  const idPrefix = `${String(source.id).padStart(2, '0')}_`
  const titleKey = normalizeForMatch(source.title)
  const exact = fileNames.find(file => {
    const base = path.basename(file, path.extname(file))
    return base.startsWith(idPrefix) && normalizeForMatch(base.slice(3)) === titleKey
  })
  if (exact) return exact

  return fileNames.find(file => {
    const base = path.basename(file, path.extname(file))
    return base.startsWith(idPrefix) && normalizeForMatch(base).includes(titleKey)
  })
}

function stripHtml(html) {
  const articleMatch = /<div[^>]+id=["']js_content["'][^>]*>([\s\S]*?)<\/div>\s*<script/i.exec(html)
  const content = articleMatch?.[1] || html
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|section|div|h\d|blockquote|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

async function fetchArticle(source) {
  const response = await fetch(source.url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 PPTAgentLocalIngest/0.1',
      accept: 'text/html,application/xhtml+xml'
    }
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const html = await response.text()
  const text = stripHtml(html)
  if (text.length < 500) throw new Error(`Fetched content too short (${text.length} chars)`)
  return `---\nid: ${source.id}\nslug: ${source.slug}\ntitle: ${source.title}\nsource_url: ${source.url}\napplicable: ${source.applicable}\nraw_external: true\n---\n\n# ${source.title}\n\n${text}\n`
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n*/, '').trim()
}

function extractHeadings(markdown) {
  return [...markdown.matchAll(/^#{2,3}\s+(.+)$/gm)]
    .map(match => match[1].trim())
    .filter(heading => !/^文章目录$/.test(heading))
}

function extractKeyModels(markdown, source) {
  const candidates = [
    'SWOT',
    'PEST',
    '3C',
    'STP',
    '5W',
    '第一性原理',
    '黄金圈',
    '费曼学习法',
    '商业模式',
    '品牌屋',
    '产品屋',
    'RTB',
    'POD',
    'POP',
    '用户画像',
    '用户洞察',
    '竞品分析',
    '价值主张',
    '传播学理论'
  ]
  const hits = candidates.filter(item => markdown.includes(item))
  if (source.slug === '34-communication-theories') hits.push('34 个传播学理论')
  return [...new Set(hits)].slice(0, 8)
}

function firstParagraphs(markdown, maxChars = 900) {
  const body = stripFrontmatter(markdown)
    .replace(/^#\s+.+$/m, '')
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(part => part && !part.startsWith('|') && !/^[-*]\s/.test(part))

  let result = ''
  for (const paragraph of body) {
    if ((result + '\n\n' + paragraph).length > maxChars && result.length > 200) break
    result += `${result ? '\n\n' : ''}${paragraph}`
  }
  return result.slice(0, maxChars).trim()
}

function buildSummaryMarkdown(source, rawMarkdown) {
  const content = stripFrontmatter(rawMarkdown)
  const headings = extractHeadings(content).slice(0, 8)
  const keyModels = extractKeyModels(content, source)
  const methodIntro = firstParagraphs(content, 900)
  const summaryCharCount = methodIntro.length + headings.join('').length

  let md = `---\n`
  md += `id: ${source.id}\n`
  md += `slug: ${source.slug}\n`
  md += `title: ${source.title}\n`
  md += `source_url: ${source.url}\n`
  md += `applicable: ${source.applicable}\n`
  md += `read_time: ~${Math.max(3, Math.ceil(content.length / 650))} min\n`
  md += `summary_char_count: ${summaryCharCount}\n`
  md += `curation_note: Seven-provided local markdown, structured for Phase 1 MVP ingestion\n`
  md += `---\n\n`
  md += `# ${source.title} · 摘要\n\n`
  md += `## 核心方法\n\n`
  md += `${methodIntro}\n\n`
  if (headings.length) {
    md += `## 适用场景\n\n`
    for (const heading of headings.slice(0, 5)) {
      md += `- ${heading.replace(/^\d+[.、]\s*/, '')}\n`
    }
    md += '\n'
  }
  md += `## 关键模型/工具\n\n`
  if (keyModels.length) {
    for (const model of keyModels) md += `- ${model}\n`
  } else {
    md += `- ${source.title.replace(/[？?]/g, '')}方法论\n`
  }
  md += `\n## Seven 评注\n\n`
  md += `本摘要来自 Seven 已整理到本地的 Markdown 方法论资料，Phase 1 先用于概念抽取和 Sub-Agent prompt 参考；后续可继续人工精修为 1000-2000 字黄金摘要。\n`
  return md
}

function buildSourcesMarkdown(sources, results = new Map()) {
  let md = '# 外部方法论文章 · 来源登记\n\n'
  md += '> 注意：raw/ 原文目录不入 git，仅 Seven 本地学习使用。\n'
  md += '> 摘要进 git: see summaries/。\n\n'
  md += '按 spec §3.2 + §3.3 (v1.1) 处理:\n'
  md += '- 14 篇文章不是 Seven 原创\n'
  md += '- 灵活运用方法论模型搭建我方 Skill 和系统，不刻意标版权\n'
  md += '- 收到原作者投诉立即下架对应摘要\n\n'
  md += '| # | URL | 标题 | 映射归属 | 抓取时间 | 字数 | 内容哈希 |\n'
  md += '|---|---|---|---|---|---:|---|\n'

  for (const source of sources) {
    const result = results.get(source.id)
    const fetchedAt = result?.status === 'ok' ? result.fetchedAt : '_TBD_'
    const charCount = result?.status === 'ok' ? result.charCount : ''
    const hash = result?.status === 'ok' ? `\`${result.hash}\`` : ''
    md += `| ${source.id} | ${source.url} | ${source.title} | ${source.applicable} | ${fetchedAt} | ${charCount} | ${hash} |\n`
  }

  const failed = [...results.entries()]
    .filter(([, result]) => result.status === 'failed')
    .map(([id, result]) => {
      const source = sources.find(item => item.id === id)
      return { source, result }
    })
    .filter(item => item.source)

  if (failed.length) {
    md += '\n## Failed URLs\n\n'
    for (const { source, result } of failed) {
      md += `- #${source.id} ${source.url} — ${result.error}\n`
    }
  }

  return md
}

function summarizeFetchResults(results) {
  const values = [...results.values()]
  return {
    ok: values.filter(result => result.status === 'ok').length,
    failed: values.filter(result => result.status === 'failed').length
  }
}

async function ingestMethodologies({ fetchRaw = false } = {}) {
  await fs.mkdir(RAW_DIR, { recursive: true })
  await fs.mkdir(SUMMARY_DIR, { recursive: true })

  const results = new Map()
  if (fetchRaw) {
    for (const source of METHODOLOGY_SOURCES) {
      const fetchedAt = new Date().toISOString()
      try {
        const markdown = await fetchArticle(source)
        const outPath = path.join(RAW_DIR, rawFilename(source))
        await fs.writeFile(outPath, markdown)
        results.set(source.id, {
          status: 'ok',
          fetchedAt,
          charCount: markdown.length,
          hash: hashContent(markdown)
        })
        console.log(`[ingest-methodologies] ok #${source.id} ${source.slug}`)
      } catch (error) {
        results.set(source.id, {
          status: 'failed',
          fetchedAt,
          error: error.message
        })
        console.warn(`[ingest-methodologies] failed #${source.id} ${source.slug}: ${error.message}`)
      }
    }
  }

  await fs.writeFile(SOURCES_PATH, buildSourcesMarkdown(METHODOLOGY_SOURCES, results))
  const summary = summarizeFetchResults(results)
  console.log(`[ingest-methodologies] SOURCES.md written (${summary.ok} fetched, ${summary.failed} failed)`)
  return { sources: METHODOLOGY_SOURCES, results, sourcesPath: SOURCES_PATH }
}

async function ingestFromLocalDir(localDir = DEFAULT_LOCAL_DIR) {
  await fs.mkdir(RAW_DIR, { recursive: true })
  await fs.mkdir(SUMMARY_DIR, { recursive: true })

  const fileNames = (await fs.readdir(localDir)).filter(file => file.endsWith('.md'))
  const results = new Map()
  const fetchedAt = new Date().toISOString()

  for (const source of METHODOLOGY_SOURCES) {
    const fileName = findLocalArticleFile(source, fileNames)
    if (!fileName) {
      results.set(source.id, {
        status: 'failed',
        fetchedAt,
        error: `Local markdown not found for ${source.title}`
      })
      continue
    }

    const sourcePath = path.join(localDir, fileName)
    const rawBody = await fs.readFile(sourcePath, 'utf8')
    const rawMarkdown = `---\nid: ${source.id}\nslug: ${source.slug}\ntitle: ${source.title}\nsource_url: ${source.url}\napplicable: ${source.applicable}\nraw_external: true\nlocal_source_file: ${fileName}\n---\n\n${rawBody.trim()}\n`
    const rawOut = path.join(RAW_DIR, rawFilename(source))
    const summaryOut = path.join(SUMMARY_DIR, rawFilename(source))
    await fs.writeFile(rawOut, rawMarkdown)
    await fs.writeFile(summaryOut, buildSummaryMarkdown(source, rawMarkdown))
    results.set(source.id, {
      status: 'ok',
      fetchedAt,
      charCount: rawMarkdown.length,
      hash: hashContent(rawMarkdown)
    })
    console.log(`[ingest-methodologies] local #${source.id} ${fileName} -> ${rawFilename(source)}`)
  }

  await fs.writeFile(SOURCES_PATH, buildSourcesMarkdown(METHODOLOGY_SOURCES, results))
  const summary = summarizeFetchResults(results)
  console.log(`[ingest-methodologies] SOURCES.md written (${summary.ok} local, ${summary.failed} failed)`)
  return { sources: METHODOLOGY_SOURCES, results, sourcesPath: SOURCES_PATH }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const fetchRaw = process.argv.includes('--fetch')
  const fromDirIndex = process.argv.indexOf('--from-dir')
  const runner = fromDirIndex >= 0
    ? ingestFromLocalDir(process.argv[fromDirIndex + 1] || DEFAULT_LOCAL_DIR)
    : ingestMethodologies({ fetchRaw })

  runner.catch(error => {
    console.error(error)
    process.exit(1)
  })
}

export {
  buildSourcesMarkdown,
  buildSummaryMarkdown,
  findLocalArticleFile,
  hashContent,
  ingestFromLocalDir,
  ingestMethodologies,
  METHODOLOGY_SOURCES,
  normalizeForMatch,
  rawFilename,
  summarizeFetchResults
}
