// scripts/compile/extract-concepts.mjs
// Stage 2: scan assets/_raw markdown/json files and extract concept candidates.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../..')
const RAW_DIR = path.join(REPO_ROOT, 'assets/_raw')
const OUT = path.join(REPO_ROOT, 'assets/_compiled/concepts-candidates.json')
const DICT_PATH = path.join(REPO_ROOT, 'scripts/concept-dictionary.json')

const SCAN_DIRS = [
  'books',
  'cases',
  'models',
  'frameworks',
  'qa',
  'sops',
  'methodologies/summaries',
  'prompts-legacy',
  'dictionary',
  'tools'
]

const SKIP_DIRS = ['methodologies/raw', 'visuals-legacy']

function toPosix(value) {
  return value.split(path.sep).join('/')
}

function shouldSkipPath(filePath) {
  const normalized = toPosix(filePath)
  return SKIP_DIRS.some(skip => normalized.includes(`/assets/_raw/${skip}/`) || normalized.includes(`assets/_raw/${skip}/`))
}

function shouldScanPath(filePath) {
  const normalized = toPosix(filePath)
  if (shouldSkipPath(normalized)) return false
  return SCAN_DIRS.some(scan => normalized.includes(`/assets/_raw/${scan}/`) || normalized.includes(`assets/_raw/${scan}/`))
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function scoreQuality(text, pos, excerpt) {
  let score = 2
  if (excerpt.length > 150) score += 1
  if (/(步骤|流程|方法|实操|案例|例如|应用|定义|模型|工具|策略)/.test(excerpt)) score += 1
  if (/\d+/.test(excerpt)) score = Math.min(5, score + 0.5)
  if (pos < 500) score = Math.min(5, score + 0.5)
  return Math.max(1, Math.min(5, Math.round(score)))
}

function extractConceptsFromText(text, dict, sourcePath) {
  const found = new Map()
  for (const concept of dict.concepts) {
    const allNames = [concept.name, ...(concept.aliases || [])]
      .sort((a, b) => b.length - a.length)
    const occurrences = []
    const seenPositions = new Set()

    for (const name of allNames) {
      const re = new RegExp(escapeRegExp(name), 'g')
      let match
      while ((match = re.exec(text)) !== null) {
        const overlapsExisting = [...seenPositions].some(position => {
          const pos = Number(position)
          return match.index >= pos && match.index < pos + name.length
        })
        if (overlapsExisting) continue
        seenPositions.add(match.index)

        const start = Math.max(0, match.index - 100)
        const end = Math.min(text.length, match.index + name.length + 200)
        const excerpt = text.slice(start, end).replace(/\s+/g, ' ').trim()
        occurrences.push({
          source: sourcePath,
          matched_alias: name,
          position: match.index,
          excerpt: excerpt.slice(0, 300),
          quality_score: scoreQuality(text, match.index, excerpt)
        })
      }
    }

    if (occurrences.length > 0) {
      found.set(concept.name, {
        concept: concept.name,
        category: concept.category,
        aliases: concept.aliases,
        occurrences
      })
    }
  }

  return [...found.values()]
}

async function walk(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (shouldSkipPath(full)) continue
    if (entry.isDirectory()) {
      await walk(full, files)
    } else if ((entry.name.endsWith('.md') || entry.name.endsWith('.json')) && shouldScanPath(full)) {
      files.push(full)
    }
  }
  return files
}

async function extractConceptCandidates() {
  console.log('[extract-concepts] Loading dictionary')
  const dict = JSON.parse(await fs.readFile(DICT_PATH, 'utf8'))
  console.log(`  ${dict.concepts.length} concepts in dict`)

  console.log('[extract-concepts] Walking _raw/')
  const files = await walk(RAW_DIR)
  console.log(`  ${files.length} files to scan`)

  const conceptMap = new Map()
  for (const file of files) {
    const text = await fs.readFile(file, 'utf8')
    const relPath = toPosix(path.relative(REPO_ROOT, file))
    const local = extractConceptsFromText(text, dict, relPath)
    for (const concept of local) {
      if (!conceptMap.has(concept.concept)) {
        conceptMap.set(concept.concept, { ...concept, occurrences: [] })
      }
      conceptMap.get(concept.concept).occurrences.push(...concept.occurrences)
    }
  }

  const concepts = [...conceptMap.values()]
    .map(concept => ({
      ...concept,
      occurrence_count: concept.occurrences.length,
      average_quality_score: Number((
        concept.occurrences.reduce((sum, occurrence) => sum + occurrence.quality_score, 0) /
        Math.max(concept.occurrences.length, 1)
      ).toFixed(2))
    }))
    .sort((a, b) => b.occurrence_count - a.occurrence_count)

  const output = {
    extraction_timestamp: new Date().toISOString(),
    total_raw_files_scanned: files.length,
    total_concepts_extracted: concepts.length,
    total_occurrences: concepts.reduce((sum, concept) => sum + concept.occurrence_count, 0),
    dictionary_version: dict.version,
    scan_dirs: SCAN_DIRS,
    skip_dirs: SKIP_DIRS,
    concepts
  }

  await fs.mkdir(path.dirname(OUT), { recursive: true })
  await fs.writeFile(OUT, `${JSON.stringify(output, null, 2)}\n`)

  console.log(`[extract-concepts] Done. ${concepts.length} concepts, ${output.total_occurrences} occurrences total`)
  console.log(`  Output: ${toPosix(path.relative(REPO_ROOT, OUT))}`)
  console.log('\nTop 10 concepts by occurrence count:')
  for (const concept of concepts.slice(0, 10)) {
    console.log(`  ${concept.concept.padEnd(28)} ${concept.occurrence_count} mentions`)
  }
  return output
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  extractConceptCandidates().catch(error => {
    console.error(error)
    process.exit(1)
  })
}

export {
  extractConceptCandidates,
  extractConceptsFromText,
  scoreQuality,
  shouldScanPath,
  shouldSkipPath,
  walk
}
