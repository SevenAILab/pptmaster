// scripts/ingest/ingest-pptx.mjs
// PPTX -> per-slide markdown. Extracts XML text and OCR text from embedded slide images.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))

function decodeXml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function parseAttrs(attrText) {
  return Object.fromEntries(
    [...String(attrText || '').matchAll(/([\w:]+)="([^"]*)"/g)]
      .map(match => [match[1], decodeXml(match[2])])
  )
}

function extractTextFromSlideXml(xml) {
  return [...xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)]
    .map(match => decodeXml(match[1]).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function extractImageEmbedIds(xml) {
  return [...xml.matchAll(/<a:blip\b([^>]*)\/?>/g)]
    .map(match => parseAttrs(match[1])['r:embed'])
    .filter(Boolean)
}

function parseRelationships(xml) {
  const relationships = {}
  for (const match of xml.matchAll(/<Relationship\b([^>]*)\/>/g)) {
    const attrs = parseAttrs(match[1])
    if (!attrs.Id) continue
    relationships[attrs.Id] = {
      type: attrs.Type || '',
      target: attrs.Target || ''
    }
  }
  return relationships
}

function resolveRelationshipTarget(baseDir, target) {
  return path.posix.normalize(path.posix.join(baseDir, target))
}

function sortSlideFiles(files) {
  return files
    .filter(file => /^slide\d+\.xml$/.test(file))
    .sort((a, b) => {
      const na = Number.parseInt(/(\d+)/.exec(a)?.[1] ?? '0', 10)
      const nb = Number.parseInt(/(\d+)/.exec(b)?.[1] ?? '0', 10)
      return na - nb
    })
}

function safeYaml(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').slice(0, 120)
}

function buildSlideMarkdown({ slideNum, totalSlides, caseSlug, sourceName, texts, imageFiles, ocrText }) {
  const title = texts[0] || ocrText.split('\n').map(line => line.trim()).find(Boolean) || `Slide ${slideNum}`
  const extraction = [
    texts.length ? 'pptx-xml' : '',
    ocrText.trim() ? 'image-ocr' : ''
  ].filter(Boolean).join('+') || 'none'

  let md = `---\n`
  md += `slide: ${slideNum}\n`
  md += `total_slides: ${totalSlides}\n`
  md += `case_slug: ${caseSlug}\n`
  md += `source: ${sourceName}\n`
  md += `title: "${safeYaml(title)}"\n`
  md += `extraction: ${extraction}\n`
  md += `image_count: ${imageFiles.length}\n`
  md += `char_count: ${texts.join('\\n').length + ocrText.length}\n`
  md += `---\n\n`
  md += `# Slide ${slideNum} · ${title}\n\n`

  if (texts.length) {
    md += `## PPTX XML 文本\n\n${texts.join('\n')}\n\n`
  }

  if (imageFiles.length) {
    md += `## 页面图片\n\n`
    for (const imageFile of imageFiles) {
      md += `![slide image](${imageFile})\n\n`
    }
  }

  if (ocrText.trim()) {
    md += `## 图片 OCR 文本\n\n${ocrText.trim()}\n`
  }

  return md
}

function unzip(srcPptx, tmpDir) {
  execFileSync('unzip', ['-q', srcPptx, '-d', tmpDir], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  })
}

function runOcr(imagePaths) {
  if (imagePaths.length === 0) return ''
  return execFileSync('swift', [path.join(SCRIPT_DIR, 'ocr-image.swift'), ...imagePaths], {
    encoding: 'utf8',
    maxBuffer: 120 * 1024 * 1024
  }).trim()
}

async function copySlideImages({ tmpDir, outDir, slideNum, slideXml, relsXml }) {
  const relationships = parseRelationships(relsXml)
  const embedIds = [...new Set(extractImageEmbedIds(slideXml))]
  const imageDir = path.join(outDir, '_images')
  const imageFiles = []
  const absoluteImagePaths = []

  await fs.mkdir(imageDir, { recursive: true })

  let imageIndex = 0
  for (const embedId of embedIds) {
    const rel = relationships[embedId]
    if (!rel?.target || !rel.type.includes('/image')) continue

    const pptxTarget = resolveRelationshipTarget('ppt/slides', rel.target)
    const sourceImage = path.join(tmpDir, pptxTarget)
    const ext = path.extname(sourceImage) || '.png'
    imageIndex += 1
    const imageName = `slide-${String(slideNum).padStart(3, '0')}-image${imageIndex}${ext}`
    const destImage = path.join(imageDir, imageName)
    await fs.copyFile(sourceImage, destImage)
    imageFiles.push(`_images/${imageName}`)
    absoluteImagePaths.push(destImage)
  }

  return { imageFiles, absoluteImagePaths }
}

async function writeIndex({ outDir, caseSlug, sourceName, totalSlides, slideStats }) {
  const totalImages = slideStats.reduce((sum, slide) => sum + slide.imageCount, 0)
  const ocrSlides = slideStats.filter(slide => slide.hasOcr).length
  let md = `# ${caseSlug} · PPTX 拆解索引\n\n`
  md += `- 来源: ${sourceName}\n`
  md += `- 总页数: ${totalSlides}\n`
  md += `- 图片引用: ${totalImages}\n`
  md += `- OCR 页数: ${ocrSlides}\n`
  md += `- 拆解时间: ${new Date().toISOString()}\n\n`
  md += `## 页索引\n\n`
  for (const slide of slideStats) {
    md += `- [Slide ${slide.slideNum}](slide-${String(slide.slideNum).padStart(3, '0')}.md) · ${slide.title} · images=${slide.imageCount} · chars=${slide.charCount}\n`
  }
  await fs.writeFile(path.join(outDir, 'SUMMARY.md'), md)
}

async function ingestPptx(srcPptx, outDir, caseSlug = path.basename(srcPptx, '.pptx')) {
  if (!srcPptx || !outDir) {
    throw new Error('Usage: node scripts/ingest/ingest-pptx.mjs <src.pptx> <out_dir> [case_slug]')
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pptagent-pptx-'))
  const sourceName = path.basename(srcPptx)
  try {
    console.log(`[ingest-pptx] ${srcPptx} -> ${outDir}`)
    unzip(srcPptx, tmpDir)

    const slidesDir = path.join(tmpDir, 'ppt/slides')
    const files = sortSlideFiles(await fs.readdir(slidesDir))
    if (files.length === 0) throw new Error(`No slides found in ${srcPptx}`)

    await fs.rm(outDir, { recursive: true, force: true })
    await fs.mkdir(outDir, { recursive: true })

    const slideStats = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const slideNum = Number.parseInt(/(\d+)/.exec(file)?.[1] ?? String(i + 1), 10)
      const pad = String(slideNum).padStart(3, '0')
      const slideXml = await fs.readFile(path.join(slidesDir, file), 'utf8')
      const relsPath = path.join(slidesDir, '_rels', `${file}.rels`)
      const relsXml = await fs.readFile(relsPath, 'utf8').catch(() => '')
      const texts = extractTextFromSlideXml(slideXml)
      const { imageFiles, absoluteImagePaths } = await copySlideImages({
        tmpDir,
        outDir,
        slideNum,
        slideXml,
        relsXml
      })
      const ocrText = runOcr(absoluteImagePaths)
      const markdown = buildSlideMarkdown({
        slideNum,
        totalSlides: files.length,
        caseSlug,
        sourceName,
        texts,
        imageFiles,
        ocrText
      })
      await fs.writeFile(path.join(outDir, `slide-${pad}.md`), markdown)
      slideStats.push({
        slideNum,
        title: texts[0] || ocrText.split('\n').map(line => line.trim()).find(Boolean) || `Slide ${slideNum}`,
        imageCount: imageFiles.length,
        hasOcr: Boolean(ocrText.trim()),
        charCount: texts.join('\n').length + ocrText.length
      })
    }

    await writeIndex({
      outDir,
      caseSlug,
      sourceName,
      totalSlides: files.length,
      slideStats
    })
    console.log(`[ingest-pptx] ${files.length} slides -> ${outDir}`)
    return { slides: files.length, outDir, slideStats }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [srcPptx, outDir, caseSlug] = process.argv.slice(2)
  ingestPptx(srcPptx, outDir, caseSlug).catch(error => {
    console.error(error)
    process.exit(1)
  })
}

export {
  buildSlideMarkdown,
  extractImageEmbedIds,
  extractTextFromSlideXml,
  ingestPptx,
  parseRelationships,
  resolveRelationshipTarget,
  sortSlideFiles
}
