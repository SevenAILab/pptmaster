// scripts/ingest/ingest-models.mjs
// Parse 策略人必备的132个营销模型.docx into individual markdown cards.

import { execSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../..')
const SRC = '/Users/seven/Documents/文档/PPT方案大师/策略人必备的132个营销模型.docx'
const OUT_DIR = path.join(REPO_ROOT, 'assets/_raw/models')

const ENGLISH_NAME_MAP = {
  'SWOT 分析': 'swot',
  'SWOT分析': 'swot',
  '4P 营销组合': '4p-marketing-mix',
  '4P营销理论': '4p-marketing-mix',
  'STP 模型': 'stp',
  'STP': 'stp',
  '商业模式画布': 'business-model-canvas',
  '价值主张画布': 'value-prop-canvas',
  '波特五力': 'porter-5-forces',
  '波特五力竞争模型': 'porter-5-forces',
  '波特五力模型': 'porter-5-forces',
  'BCG 矩阵': 'bcg-matrix',
  '波士顿矩阵': 'bcg-matrix',
  '安索夫矩阵': 'ansoff-matrix',
  '用户旅程地图': 'user-journey',
  'JTBD': 'jtbd',
  '价值主张': 'value-proposition',
  '金字塔原理': 'pyramid-principle',
  '5W2H分析': '5w2h',
  'PDCA循环': 'pdca',
  'OKR': 'okr',
  'PEST': 'pest',
  'AARRR': 'aarrr',
  'RFM': 'rfm',
  'SCQA模型': 'scqa',
  '卡诺KANO模型': 'kano',
  '奥美品牌定位三角模型': 'brand-positioning-triangle-ogilvy',
  '奥美品牌定位三角形': 'brand-positioning-triangle-ogilvy',
  '波特价值链': 'value-chain',
  '精益画布': 'lean-canvas',
  'VRIO': 'vrio',
  'HOOK上瘾模型': 'hook-model',
  '福格行为模型': 'fogg-behavior-model',
  '5why分析法': '5-why',
  '平衡计分卡': 'balanced-scorecard',
  '英雄之旅模型': 'hero-journey',
  '峰终定律': 'peak-end-rule'
}

const ASCII_FALLBACK = [
  ['金字塔', 'pyramid'],
  ['黄金圈', 'golden-circle'],
  ['营销', 'marketing'],
  ['品牌', 'brand'],
  ['定位', 'positioning'],
  ['模型', 'model'],
  ['理论', 'theory'],
  ['矩阵', 'matrix'],
  ['分析', 'analysis'],
  ['战略', 'strategy'],
  ['用户', 'user'],
  ['产品', 'product'],
  ['传播', 'communication'],
  ['价值', 'value'],
  ['价格', 'price'],
  ['竞争', 'competition'],
  ['增长', 'growth'],
  ['复盘', 'retro'],
]

function normalizeSpaces(text) {
  return text.replace(/\u00a0/g, ' ').replace(/\u2028/g, '\n').replace(/\r/g, '')
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function looksLikeModelHeader(body, pos) {
  const window = body.slice(pos, pos + 220)
  return /适用场景|理论来源/.test(window)
}

function findSequentialHeadings(body, maxNum) {
  const positions = []
  let searchFrom = 0

  for (let num = 1; num <= maxNum; num++) {
    const pattern = new RegExp(`(?:^|\\n)\\s*${num}\\.\\s*([^\\n]+)`, 'g')
    pattern.lastIndex = searchFrom

    let match
    let chosen = null
    while ((match = pattern.exec(body)) !== null) {
      const pos = match.index + match[0].indexOf(String(num))
      if (looksLikeModelHeader(body, pos)) {
        chosen = {
          num,
          name: match[1].trim().replace(/\s+/g, ' '),
          pos
        }
        break
      }
    }

    if (!chosen) {
      continue
    }

    positions.push(chosen)
    searchFrom = chosen.pos + 1
  }

  return positions
}

export function slugify(name) {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  if (ENGLISH_NAME_MAP[trimmed]) return ENGLISH_NAME_MAP[trimmed]

  let slug = trimmed.toLowerCase()
  for (const [zh, en] of ASCII_FALLBACK) slug = slug.replaceAll(zh, `-${en}-`)
  slug = slug
    .replace(/&/g, ' and ')
    .replace(/[^\p{Script=Han}a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 50)
  return slug || 'model'
}

function parseCatalog(fullText) {
  const marker = '目录如下'
  const start = fullText.indexOf(marker)
  if (start < 0) return { items: [], end: -1 }

  const afterMarker = fullText.slice(start + marker.length)
  const lines = afterMarker.split('\n')
  const catalogLines = []
  let consumed = 0
  for (const line of lines) {
    catalogLines.push(line)
    consumed += line.length + 1
    if (line.includes('132.')) break
  }

  const catalogText = catalogLines
    .join('\n')
    .replace(/(\d+)\.\s*/g, '\n$1. ')

  const items = catalogText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => /^(\d+)\.\s*(.+)$/.exec(line))
    .filter(Boolean)
    .map(m => ({
      num: Number(m[1]),
      name: m[2].trim().replace(/\s+/g, ' ')
    }))
    .filter(item => item.num >= 1 && item.num <= 132)

  return { items, end: start + marker.length + consumed }
}

export function splitModels(fullText) {
  const normalized = normalizeSpaces(fullText)
  const { items: catalog, end: catalogEnd } = parseCatalog(normalized)

  if (catalog.length >= 100) {
    const bodyStartMatch = /\n1\.\s*金字塔原理/.exec(normalized.slice(catalogEnd))
    const body = bodyStartMatch ? normalized.slice(catalogEnd + bodyStartMatch.index) : normalized.slice(catalogEnd)
    const bodyHeadings = findSequentialHeadings(body, catalog.length)
    const positions = bodyHeadings.map(heading => {
      const catalogItem = catalog.find(item => item.num === heading.num)
      return {
        ...catalogItem,
        bodyName: heading.name,
        pos: heading.pos
      }
    })

    positions.sort((a, b) => a.pos - b.pos)
    const byNum = new Map(positions.map(item => [item.num, item]))
    return catalog.map((catalogItem, index) => {
      const item = byNum.get(catalogItem.num)
      if (!item) {
        return {
          num: catalogItem.num,
          name: catalogItem.name,
          slug: slugify(catalogItem.name),
          content: `${catalogItem.num}. ${catalogItem.name}\n\n[正文锚点未找到，请人工回查源 docx]`
        }
      }
      const start = item.pos
      const next = positions.find(candidate => candidate.num > item.num)
      const end = next ? next.pos : body.length
      const content = body.slice(start, end).trim()
      return {
        num: item.num,
        name: item.name,
        slug: slugify(item.name),
        content
      }
    })
  }

  const header = /^\s*(\d+)\s*[.、]\s*(.+?)\s*$/gm
  const positions = []
  let m
  while ((m = header.exec(normalized)) !== null) {
    positions.push({ num: Number(m[1]), name: m[2].trim(), pos: m.index })
  }
  return positions.map((item, index) => {
    const end = index + 1 < positions.length ? positions[index + 1].pos : normalized.length
    return {
      ...item,
      slug: slugify(item.name),
      content: normalized.slice(item.pos, end).trim()
    }
  })
}

async function main() {
  console.log('[ingest-models] Converting docx to text')
  const txtPath = '/tmp/_pptmaster_models.txt'
  execSync(`textutil -convert txt -output "${txtPath}" "${SRC}"`)
  const raw = await fs.readFile(txtPath, 'utf8')

  const models = splitModels(raw)
  console.log(`[ingest-models] Parsed ${models.length} models`)
  if (models.length < 130) {
    console.error(`❌ Expected ~132 models, got ${models.length}. Check the header parser.`)
    process.exit(1)
  }

  await fs.mkdir(OUT_DIR, { recursive: true })

  const usedSlugs = new Map()
  const written = []
  for (const model of models) {
    const baseSlug = model.slug
    const seen = usedSlugs.get(baseSlug) || 0
    usedSlugs.set(baseSlug, seen + 1)
    const slug = seen === 0 ? baseSlug : `${baseSlug}-${seen + 1}`

    const frontmatter = `---\nnum: ${model.num}\nname: ${model.name}\nslug: ${slug}\nsource: 策略人必备的132个营销模型.docx\nchar_count: ${model.content.length}\n---\n\n# ${model.name}\n\n`
    await fs.writeFile(path.join(OUT_DIR, `${slug}.md`), frontmatter + model.content)
    written.push({ ...model, slug })
  }

  const indexLines = written
    .sort((a, b) => a.num - b.num)
    .map(m => `- ${m.num.toString().padStart(3, '0')}. [${m.name}](${m.slug}.md)`)
  await fs.writeFile(
    path.join(OUT_DIR, 'INDEX.md'),
    `# 132 个营销模型索引\n\n共 ${models.length} 个模型\n\n${indexLines.join('\n')}\n`
  )
  console.log(`[ingest-models] Done. ${models.length} cards written to ${OUT_DIR}`)
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(e => { console.error(e); process.exit(1) })
}
