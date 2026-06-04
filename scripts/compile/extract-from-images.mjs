// scripts/compile/extract-from-images.mjs
// Stage 2.5: extract concept positions from 8 master-map images via local OCR and merge into candidates.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractConceptsFromText } from './extract-concepts.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../..')
const CANDIDATES_PATH = path.join(REPO_ROOT, 'assets/_compiled/concepts-candidates.json')
const IMAGE_EXTRACT_PATH = path.join(REPO_ROOT, 'assets/_compiled/image-concept-positions.json')
const DICT_PATH = path.join(REPO_ROOT, 'scripts/concept-dictionary.json')
const MASTER_MAP_DIR = path.join(REPO_ROOT, 'assets/visuals/master-map')
const OCR_SCRIPT = path.join(REPO_ROOT, 'scripts/ingest/ocr-image.swift')

const IMAGE_ONLY_ALIASES = {
  'Business-Model-Canvas': ['商业模式设计', '商业模式'],
  'VMV': ['品牌愿景与使命', '愿景与使命', '核心价值观'],
  'Brand-House': ['品牌定位与价值主张', '品牌架构', '品牌管理报告'],
  'RTB': ['建立品牌认知与信任', '获得用户选择'],
  'PDCA': ['复盘机制', '复盘改进'],
  'Brand-Asset-5-Star': ['品牌资产', '品牌健康度', '品牌资产指标'],
  'Value-Prop-Canvas': ['价值主张提炼', '价值主张'],
  'User-Journey': ['用户旅程阶段划分'],
  'Marketing-Calendar': ['传播执行计划'],
  'IMC': ['整合营销传播']
}

function toPosix(value) {
  return value.split(path.sep).join('/')
}

function inferLayerFromImageName(image) {
  const match = /^\d+[-_](.+?)\./.exec(image)
  if (!match) return '总览'
  return match[1].replace(/total/i, '总览')
}

function buildImageConceptPositions({ image, ocrText, dict }) {
  const layer = inferLayerFromImageName(image)
  const imageDict = {
    ...dict,
    concepts: dict.concepts.map(concept => ({
      ...concept,
      aliases: [...(concept.aliases || []), ...(IMAGE_ONLY_ALIASES[concept.name] || [])]
    }))
  }
  const local = extractConceptsFromText(ocrText, imageDict, `assets/visuals/master-map/${image}`)
  const concepts = []
  const seen = new Set()

  for (const item of local) {
    const key = `${image}:${item.concept}`
    if (seen.has(key)) continue
    seen.add(key)
    const occurrence = item.occurrences[0]
    concepts.push({
      concept: item.concept,
      category: item.category || 'term',
      image,
      layer,
      stage: '图片 OCR',
      role: occurrence?.matched_alias || item.concept,
      matched_alias: occurrence?.matched_alias || item.concept,
      excerpt: occurrence?.excerpt || ''
    })
  }

  return { concepts }
}

function recomputeConceptStats(concept) {
  const occurrenceCount = concept.occurrences.length
  return {
    ...concept,
    occurrence_count: occurrenceCount,
    average_quality_score: Number((
      concept.occurrences.reduce((sum, occurrence) => sum + occurrence.quality_score, 0) /
      Math.max(occurrenceCount, 1)
    ).toFixed(2))
  }
}

function mergeImageConceptPositions({ candidates, imageExtract }) {
  let merged = 0
  let added = 0

  for (const imgConcept of imageExtract.concepts) {
    let existing = candidates.concepts.find(concept => concept.concept === imgConcept.concept)
    const occurrence = {
      source: `assets/visuals/master-map/${imgConcept.image}`,
      matched_alias: imgConcept.matched_alias || imgConcept.concept,
      position: -1,
      excerpt: `[image position] 层级: ${imgConcept.layer} · 阶段: ${imgConcept.stage} · 角色: ${imgConcept.role}`,
      quality_score: 4
    }

    if (existing) {
      const duplicate = existing.occurrences.some(item =>
        item.source === occurrence.source &&
        item.matched_alias === occurrence.matched_alias &&
        item.position === -1
      )
      if (!duplicate) {
        existing.occurrences.push(occurrence)
        merged += 1
      }
    } else {
      existing = {
        concept: imgConcept.concept,
        category: imgConcept.category || 'term',
        aliases: [],
        occurrences: [occurrence]
      }
      candidates.concepts.push(existing)
      added += 1
    }
  }

  candidates.concepts = candidates.concepts
    .map(recomputeConceptStats)
    .sort((a, b) => b.occurrence_count - a.occurrence_count)
  candidates.total_concepts_extracted = candidates.concepts.length
  candidates.total_occurrences = candidates.concepts.reduce((sum, concept) => sum + concept.occurrence_count, 0)
  candidates.image_extraction_merged = true
  candidates.image_extraction_method = imageExtract.method || 'apple-vision-ocr+dictionary-match'
  candidates.last_merged = new Date().toISOString()

  return { candidates, merged, added }
}

async function generateImageConceptPositions() {
  const dict = JSON.parse(await fs.readFile(DICT_PATH, 'utf8'))
  const imageFiles = (await fs.readdir(MASTER_MAP_DIR))
    .filter(file => /^0\d-.*\.png$/.test(file))
    .sort()
  if (imageFiles.length !== 8) {
    throw new Error(`Expected 8 master-map images, got ${imageFiles.length}`)
  }

  const concepts = []
  const ocr = {}
  for (const image of imageFiles) {
    const imagePath = path.join(MASTER_MAP_DIR, image)
    const ocrText = execFileSync('swift', [OCR_SCRIPT, imagePath], {
      encoding: 'utf8',
      maxBuffer: 40 * 1024 * 1024
    }).trim()
    ocr[image] = ocrText
    concepts.push(...buildImageConceptPositions({ image, ocrText, dict }).concepts)
    console.log(`[extract-from-images] OCR ${image}: ${ocrText.length} chars`)
  }

  const output = {
    extraction_timestamp: new Date().toISOString(),
    method: 'apple-vision-ocr+dictionary-match',
    source_dir: toPosix(path.relative(REPO_ROOT, MASTER_MAP_DIR)),
    image_count: imageFiles.length,
    concepts,
    ocr_char_counts: Object.fromEntries(Object.entries(ocr).map(([image, text]) => [image, text.length]))
  }

  await fs.writeFile(IMAGE_EXTRACT_PATH, `${JSON.stringify(output, null, 2)}\n`)
  console.log(`[extract-from-images] wrote ${toPosix(path.relative(REPO_ROOT, IMAGE_EXTRACT_PATH))} (${concepts.length} positions)`)
  return output
}

async function readOrGenerateImageExtract() {
  try {
    return JSON.parse(await fs.readFile(IMAGE_EXTRACT_PATH, 'utf8'))
  } catch {
    return generateImageConceptPositions()
  }
}

async function main() {
  const candidates = JSON.parse(await fs.readFile(CANDIDATES_PATH, 'utf8'))
  const imageExtract = await readOrGenerateImageExtract()
  console.log(`[extract-from-images] Merging ${imageExtract.concepts.length} image-based concept positions`)
  const { candidates: mergedCandidates, merged, added } = mergeImageConceptPositions({ candidates, imageExtract })
  await fs.writeFile(CANDIDATES_PATH, `${JSON.stringify(mergedCandidates, null, 2)}\n`)
  console.log(`[extract-from-images] Merged ${merged} occurrences, added ${added} concepts. Total concepts: ${mergedCandidates.concepts.length}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(error => {
    console.error(error)
    process.exit(1)
  })
}

export {
  buildImageConceptPositions,
  generateImageConceptPositions,
  inferLayerFromImageName,
  mergeImageConceptPositions
}
