// scripts/ingest/ingest-pdf-doc.mjs
// Generic: parse a PDF document and split by chapter/section headings.
// Usage: node scripts/ingest/ingest-pdf-doc.mjs <src.pdf> <out_dir> <split_mode>
//   split_mode: flat | chapter | section

import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SPLITTERS = {
  flat: () => null,
  chapter: text => {
    const roleHeadings = splitByRoleHeadings(text)
    if (roleHeadings.length > 0) return roleHeadings

    const formalChapters = splitByPattern(text, /^第\s*[一二三四五六七八九十0-9]+\s*[章节部分]/)
    return formalChapters.length > 0 ? formalChapters : splitByCatalog(text)
  },
  section: text => {
    const decimalSections = splitByPattern(text, /^[0-9]+\.[0-9]+(\.[0-9]+)?\s/)
    return decimalSections.length > 0 ? decimalSections : splitPageNumberedSections(text)
  }
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const OCR_SLICE_HEIGHT = 5000

function splitByPattern(text, pattern) {
  const lines = text.split('\n')
  const segments = []
  let current = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (pattern.test(trimmed)) {
      if (current) segments.push(current)
      current = { title: trimmed, lines: [line] }
    } else if (current) {
      current.lines.push(line)
    }
  }

  if (current) segments.push(current)
  return segments.map(segment => ({
    title: segment.title,
    content: segment.lines.join('\n').trim()
  }))
}

function splitByCatalog(text) {
  const lines = text.split('\n').map(line => line.trim())
  const startIndex = lines.findIndex(line => line.startsWith('目录：') && line.includes('/'))
  if (startIndex < 0) return []

  const catalogParts = []
  for (const line of lines.slice(startIndex)) {
    if (catalogParts.length > 0 && !line.includes('/') && /^[^\s]+$/.test(line)) break
    catalogParts.push(line)
    if (line.includes('文章总结提炼')) break
  }

  const titles = catalogParts.join('')
    .replace(/^目录：/, '')
    .split('/')
    .map(title => title.trim())
    .filter(Boolean)

  if (titles.length < 2) return []

  const matches = []
  for (const title of titles) {
    const escaped = escapeRegExp(title)
    const match = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*(?:\\n|$)`).exec(text)
    if (match) {
      matches.push({
        title,
        start: match.index + match[0].indexOf(title)
      })
    }
  }

  return matches
    .sort((a, b) => a.start - b.start)
    .map((match, index) => {
      const next = matches[index + 1]
      return {
        title: match.title,
        content: text.slice(match.start, next?.start ?? text.length).trim()
      }
    })
    .filter(segment => segment.content.length > segment.title.length)
}

function splitByRoleHeadings(text) {
  const matches = [...text.matchAll(/(?:^|\n)([^\n\f][^\n]{1,38})\s*\n\s*\f?\[(?:角色|角色定位|背景及目标)\]/g)]
    .map(match => ({
      title: match[1].trim(),
      start: match.index + match[0].indexOf(match[1])
    }))
    .filter(match => !/[。；，,]/.test(match.title))

  if (matches.length < 2) return []

  return matches
    .map((match, index) => {
      const next = matches[index + 1]
      return {
        title: match.title,
        content: text.slice(match.start, next?.start ?? text.length).trim()
      }
    })
    .filter(segment => /\[(?:角色|角色定位|背景及目标)\]/.test(segment.content))
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function slugify(zh, idx) {
  const base = zh
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)

  return base || `section-${String(idx).padStart(3, '0')}`
}

function isSparseText(text) {
  const content = text.replace(/\s|\f/g, '')
  return content.length < 100
}

function shouldPreferOcr(text) {
  const contentLength = text.replace(/\s|\f/g, '').length
  const compact = text.replace(/\s|\f/g, '')
  const phraseWatermarks = (compact.match(/公众号|策略人|藏锋/g) ?? []).length
  if (phraseWatermarks >= 40 || (phraseWatermarks >= 10 && phraseWatermarks / Math.max(contentLength, 1) > 0.03)) {
    return true
  }

  const watermarkChars = ['公', '众', '号', '策', '略', '人', '藏', '锋']
  const charHits = watermarkChars.reduce((sum, char) => sum + (compact.match(new RegExp(char, 'g')) ?? []).length, 0)
  return charHits >= 300 && charHits / Math.max(contentLength, 1) > 0.18
}

function getPdfPageCount(srcPdf) {
  const info = execFileSync('pdfinfo', [srcPdf], { encoding: 'utf8' })
  const match = /Pages:\s+(\d+)/.exec(info)
  if (!match) throw new Error(`Could not read PDF page count: ${srcPdf}`)
  return Number.parseInt(match[1], 10)
}

function pdfToText(srcPdf) {
  return execFileSync('pdftotext', ['-layout', srcPdf, '-'], {
    encoding: 'utf8',
    maxBuffer: 80 * 1024 * 1024
  })
}

async function pdfToTextWithOcr(srcPdf) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pptagent-pdf-ocr-'))
  const imagePrefix = path.join(tmpDir, 'page')
  try {
    execFileSync('pdftoppm', ['-png', '-r', '180', srcPdf, imagePrefix], {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    })

    const images = (await fs.readdir(tmpDir))
      .filter(name => name.endsWith('.png'))
      .sort()
      .map(image => path.join(tmpDir, image))

    const ocrImages = []
    for (const imagePath of images) {
      const metadata = getImageSize(imagePath)
      if (shouldSliceImage(metadata)) {
        ocrImages.push(...sliceImage(imagePath, metadata, tmpDir))
      } else {
        ocrImages.push(imagePath)
      }
    }

    return execFileSync('swift', [path.join(SCRIPT_DIR, 'ocr-image.swift'), ...ocrImages], {
      encoding: 'utf8',
      maxBuffer: 120 * 1024 * 1024
    }).trim()
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

function getImageSize(imagePath) {
  const output = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', imagePath], {
    encoding: 'utf8'
  })
  const width = Number.parseInt(/pixelWidth:\s+(\d+)/.exec(output)?.[1] ?? '0', 10)
  const height = Number.parseInt(/pixelHeight:\s+(\d+)/.exec(output)?.[1] ?? '0', 10)
  if (!width || !height) throw new Error(`Could not read image size: ${imagePath}`)
  return { width, height }
}

function shouldSliceImage({ height }) {
  return height > OCR_SLICE_HEIGHT * 1.4
}

function sliceImage(imagePath, metadata, tmpDir) {
  const slices = []
  const totalSlices = Math.ceil(metadata.height / OCR_SLICE_HEIGHT)
  const basename = path.basename(imagePath, '.png')

  for (let i = 0; i < totalSlices; i++) {
    const offsetY = i * OCR_SLICE_HEIGHT
    const height = Math.min(OCR_SLICE_HEIGHT, metadata.height - offsetY)
    const outPath = path.join(tmpDir, `${basename}-slice-${String(i + 1).padStart(3, '0')}.png`)
    execFileSync('sips', [
      '-c',
      String(height),
      String(metadata.width),
      '--cropOffset',
      String(offsetY),
      '0',
      imagePath,
      '--out',
      outPath
    ], { encoding: 'utf8' })
    slices.push(outPath)
  }

  return slices
}

async function readPdfText(srcPdf) {
  const raw = pdfToText(srcPdf)
  if (!isSparseText(raw) && !shouldPreferOcr(raw)) return { text: raw, extraction: 'pdftotext' }

  const reason = isSparseText(raw) ? 'sparse' : 'watermark-heavy'
  console.log(`  pdftotext output is ${reason}; using local Apple Vision OCR fallback`)
  const text = await pdfToTextWithOcr(srcPdf)
  if (isSparseText(text)) {
    throw new Error(`OCR fallback produced sparse text for ${srcPdf}`)
  }
  return { text, extraction: 'apple-vision-ocr' }
}

function splitPageNumberedSections(text) {
  const pages = text.split('\f')
  const segments = []

  for (const pageText of pages) {
    const normalized = pageText.trim()
    if (!normalized || /^CONTENTS\b/m.test(normalized)) continue

    const match = normalized.match(/(?:^|\n)\s*((?:\d{3})(?:\s+[^\n]{1,40})?)\s*(?:\n|$)/)
    if (!match) continue

    segments.push({
      title: match[1].trim(),
      content: normalized
    })
  }

  return segments
}

function segmentByPage(srcPdf, raw, splitMode) {
  return raw.split('\f')
    .map((content, index) => ({
      title: `Page ${String(index + 1).padStart(3, '0')}`,
      content: content.trim()
    }))
    .filter(segment => segment.content.length > 0)
    .map((segment, index) => ({
      ...segment,
      title: splitMode === 'chapter' ? `Chapter OCR ${String(index + 1).padStart(3, '0')}` : segment.title,
      sourcePage: index + 1,
      sourcePdf: path.basename(srcPdf)
    }))
}

async function writeMarkdown(target, frontmatter, body) {
  await fs.writeFile(target, `${frontmatter}\n\n${body.trim()}\n`)
}

async function ingestDoc(srcPdf, outDir, splitMode = 'chapter') {
  if (!SPLITTERS[splitMode]) {
    throw new Error(`Unsupported split_mode: ${splitMode}`)
  }

  console.log(`[ingest-pdf-doc] ${srcPdf} -> ${outDir} (${splitMode})`)
  await fs.mkdir(outDir, { recursive: true })

  const totalPages = getPdfPageCount(srcPdf)
  const { text: raw, extraction } = await readPdfText(srcPdf)
  const fileBase = path.basename(srcPdf, '.pdf')

  if (splitMode === 'flat') {
    const target = path.join(outDir, `${slugify(fileBase, 0)}.md`)
    const frontmatter = `---\nsource: ${path.basename(srcPdf)}\nsplit_mode: flat\nextraction: ${extraction}\ntotal_pages: ${totalPages}\nchar_count: ${raw.length}\n---`
    await writeMarkdown(target, frontmatter, `# ${fileBase}\n\n${raw}`)
    console.log(`  ✓ ${path.basename(target)} (flat, ${raw.length} chars)`)
    return { mode: splitMode, files: [target], charCount: raw.length }
  }

  let segments = SPLITTERS[splitMode](raw)
  if (segments.length === 0 && extraction === 'apple-vision-ocr') {
    segments = segmentByPage(srcPdf, raw, splitMode)
  }

  if (segments.length === 0) {
    throw new Error(`No ${splitMode} segments found in ${srcPdf}`)
  }

  const files = []
  console.log(`  ${segments.length} segments`)
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const slug = `${String(i + 1).padStart(2, '0')}-${slugify(segment.title, i + 1)}`
    const target = path.join(outDir, `${slug}.md`)
    const escapedTitle = segment.title.replace(/"/g, '\\"')
    const sourcePage = segment.sourcePage ? `\nsource_page: ${segment.sourcePage}` : ''
    const frontmatter = `---\nsource: ${path.basename(srcPdf)}\nsplit_mode: ${splitMode}\nextraction: ${extraction}\ntotal_pages: ${totalPages}\nsegment_index: ${i + 1}${sourcePage}\nsegment_title: "${escapedTitle}"\nchar_count: ${segment.content.length}\n---`
    await writeMarkdown(target, frontmatter, `# ${segment.title}\n\n${segment.content}`)
    files.push(target)
  }

  console.log('[ingest-pdf-doc] Done.')
  return { mode: splitMode, files, charCount: raw.length }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [srcPdf, outDir, splitMode = 'chapter'] = process.argv.slice(2)
  if (!srcPdf || !outDir) {
    console.error('Usage: node scripts/ingest/ingest-pdf-doc.mjs <src.pdf> <out_dir> <split_mode>')
    process.exit(1)
  }

  ingestDoc(srcPdf, outDir, splitMode).catch(error => {
    console.error(error)
    process.exit(1)
  })
}

export {
  ingestDoc,
  isSparseText,
  shouldSliceImage,
  shouldPreferOcr,
  splitByCatalog,
  splitByPattern,
  splitPageNumberedSections,
  splitByRoleHeadings,
  slugify
}
