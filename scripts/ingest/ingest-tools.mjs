// scripts/ingest/ingest-tools.mjs
// Parse the 402 planning tools xlsx without adding runtime dependencies.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../..')
const DEFAULT_SRC_XLSX = '/Users/seven/Documents/文档/PPT方案大师/402个策划工具（附网址）.xlsx'
const OUT = path.join(REPO_ROOT, 'assets/_raw/tools/index.md')

function unzipEntry(xlsxPath, entry) {
  return execFileSync('unzip', ['-p', xlsxPath, entry], {
    encoding: 'utf8',
    maxBuffer: 40 * 1024 * 1024
  })
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function parseSharedStrings(xml) {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(match => {
    return [...match[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
      .map(textMatch => decodeXml(textMatch[1]))
      .join('')
  })
}

function parseRelationships(xml) {
  const relationships = {}
  for (const match of xml.matchAll(/<Relationship\b([^>]*)\/>/g)) {
    const attrs = parseAttrs(match[1])
    if (attrs.Id && attrs.Target) relationships[attrs.Id] = decodeXml(attrs.Target)
  }
  return relationships
}

function parseAttrs(attrText) {
  return Object.fromEntries(
    [...attrText.matchAll(/([\w:]+)="([^"]*)"/g)].map(match => [match[1], match[2]])
  )
}

function parseHyperlinks(sheetXml, rels) {
  const hyperlinks = {}
  for (const match of sheetXml.matchAll(/<hyperlink\b([^>]*)\/>/g)) {
    const attrs = parseAttrs(match[1])
    const ref = attrs.ref
    const target = attrs['r:id'] ? rels[attrs['r:id']] : attrs.location
    if (ref && target) hyperlinks[ref] = target
  }
  return hyperlinks
}

function columnFromRef(ref) {
  return /^[A-Z]+/.exec(ref)?.[0] ?? ''
}

function cellValue(cellXml, attrs, sharedStrings) {
  if (attrs.t === 'inlineStr') {
    return decodeXml([...cellXml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(match => match[1]).join('')).trim()
  }

  const value = /<v>([\s\S]*?)<\/v>/.exec(cellXml)?.[1]
  if (value === undefined) return ''
  if (attrs.t === 's') return (sharedStrings[Number.parseInt(value, 10)] ?? '').trim()
  return decodeXml(value).trim()
}

function parseSheetRows(sheetXml, sharedStrings, hyperlinks = {}) {
  const rows = []
  for (const rowMatch of sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = {}
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = parseAttrs(cellMatch[1] ?? '')
      if (!attrs.r) continue
      const col = columnFromRef(attrs.r)
      const raw = cellValue(cellMatch[2] ?? '', attrs, sharedStrings)
      row[col] = hyperlinks[attrs.r] || raw
    }
    if (Object.values(row).some(Boolean)) rows.push(row)
  }
  return rows
}

function normalizeCategory(value) {
  return String(value || '')
    .replace(/\s*[\r\n]+\s*/g, ' / ')
    .replace(/\/\s*\//g, '/')
    .replace(/\/\s*/g, '/')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ')
    .trim()
}

function rowsToTools(rows) {
  const tools = []
  const notes = {
    inferredNumbers: 0,
    inferredRows: [],
    skippedBlankNames: 0,
    skippedRows: []
  }
  let currentCategory = ''
  let inferredCounter = 0

  for (const row of rows) {
    const category = normalizeCategory(row.C)
    const name = String(row.E || '').trim()
    const url = String(row.F || '').trim()
    const globalNo = String(row.B || '').trim()
    const categoryNo = String(row.D || '').trim()

    if (category && category !== '分类') currentCategory = category
    if (name === '名称' || globalNo === '序号') continue
    if (!name) {
      const looksLikeNumberedBlankTool = /^\d+$/.test(globalNo) || categoryNo || url
      if (looksLikeNumberedBlankTool) {
        notes.skippedBlankNames += 1
        notes.skippedRows.push({
          no: globalNo || '',
          categoryNo,
          category: currentCategory || '未分类'
        })
      }
      continue
    }

    let no = globalNo
    if (!no) {
      inferredCounter += 1
      no = `inferred-${String(inferredCounter).padStart(3, '0')}`
      notes.inferredNumbers += 1
      notes.inferredRows.push({
        no,
        categoryNo,
        category: currentCategory || '未分类',
        name
      })
    }

    tools.push({
      no,
      categoryNo,
      category: currentCategory || '未分类',
      name,
      url
    })
  }

  return { tools, notes }
}

function escapePipe(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
}

function buildMarkdown(tools, notes = {}) {
  const byCategory = new Map()
  for (const tool of tools) {
    if (!byCategory.has(tool.category)) byCategory.set(tool.category, [])
    byCategory.get(tool.category).push(tool)
  }

  let md = '# 402 个策划工具 · 索引\n\n'
  md += `共 ${tools.length} 个工具，按 ${byCategory.size} 个分类整理。\n\n`
  if (notes.inferredNumbers || notes.skippedBlankNames) {
    md += '## 导入说明\n\n'
    if (notes.inferredNumbers) {
      md += `- 源表有 ${notes.inferredNumbers} 行缺全局编号，已保留为推断编号。\n`
    }
    if (notes.skippedBlankNames) {
      md += `- 源表有 ${notes.skippedBlankNames} 行名称为空，已跳过。\n`
    }
    md += '\n'
  }
  md += '## 分类目录\n\n'
  for (const [category, items] of byCategory) {
    md += `- ${category}: ${items.length} 个\n`
  }

  md += '\n'
  for (const [category, items] of byCategory) {
    md += `## ${category} (${items.length})\n\n`
    md += '| 全局编号 | 分类内编号 | 工具名 | 网址 |\n|---|---:|---|---|\n'
    for (const tool of items) {
      const link = tool.url ? `[link](${tool.url})` : ''
      md += `| ${escapePipe(tool.no)} | ${escapePipe(tool.categoryNo)} | ${escapePipe(tool.name)} | ${link} |\n`
    }
    md += '\n'
  }

  return md
}

async function ingestTools(srcXlsx = DEFAULT_SRC_XLSX, out = OUT) {
  const sharedStrings = parseSharedStrings(unzipEntry(srcXlsx, 'xl/sharedStrings.xml'))
  const sheetXml = unzipEntry(srcXlsx, 'xl/worksheets/sheet1.xml')
  const rels = parseRelationships(unzipEntry(srcXlsx, 'xl/worksheets/_rels/sheet1.xml.rels'))
  const hyperlinks = parseHyperlinks(sheetXml, rels)
  const rows = parseSheetRows(sheetXml, sharedStrings, hyperlinks)
  const { tools, notes } = rowsToTools(rows)

  if (tools.length < 399) {
    throw new Error(`Expected at least 399 tools, got ${tools.length}`)
  }

  await fs.mkdir(path.dirname(out), { recursive: true })
  await fs.writeFile(out, buildMarkdown(tools, notes))
  console.log(`[ingest-tools] ${tools.length} tools -> ${out}`)
  if (notes.inferredNumbers || notes.skippedBlankNames) {
    console.warn(`[ingest-tools] notes: ${notes.inferredNumbers} inferred numbers, ${notes.skippedBlankNames} blank-name rows skipped`)
  }
  return { rows, tools, notes, out }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [srcXlsx = DEFAULT_SRC_XLSX] = process.argv.slice(2)
  ingestTools(srcXlsx).catch(error => {
    console.error(error)
    process.exit(1)
  })
}

export {
  buildMarkdown,
  ingestTools,
  normalizeCategory,
  parseSharedStrings,
  parseSheetRows,
  rowsToTools
}
