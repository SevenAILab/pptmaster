// scripts/compile/build-golden.mjs
// Helper: build a batch context for one concept from concepts-candidates.json.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../..')
const CANDIDATES_PATH = path.join(REPO_ROOT, 'assets/_compiled/concepts-candidates.json')

function slugifyConcept(conceptName) {
  const parts = conceptName
    .trim()
    .match(/[A-Za-z0-9]+/g) || []

  return parts
    .flatMap(part => {
      if (/^[A-Z0-9]+$/.test(part)) return [part.toLowerCase()]
      return part
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .split('-')
        .filter(Boolean)
        .map(item => item.toLowerCase())
    })
    .join('-')
}

async function buildBatchContext(conceptName) {
  const candidates = JSON.parse(await fs.readFile(CANDIDATES_PATH, 'utf8'))
  const concept = candidates.concepts.find(item => item.concept === conceptName)
  if (!concept) throw new Error(`Concept ${conceptName} not in candidates`)

  let out = `# Batch context for: ${conceptName}\n\n`
  out += `Target file: assets/_compiled/concepts-golden/${slugifyConcept(conceptName)}.md\n`
  out += `Category: ${concept.category}\n`
  out += `Aliases: ${concept.aliases?.join(', ') || '(none)'}\n`
  out += `Total occurrences: ${concept.occurrences.length}\n\n`

  const sorted = [...concept.occurrences].sort((a, b) => {
    if (b.quality_score !== a.quality_score) return b.quality_score - a.quality_score
    return a.source.localeCompare(b.source)
  })

  out += '## Top 10 occurrences (by quality)\n\n'
  for (const [index, occurrence] of sorted.slice(0, 10).entries()) {
    out += `### ${index + 1}. ${occurrence.source} (q=${occurrence.quality_score})\n\n`
    out += `matched_alias: ${occurrence.matched_alias}\n\n`
    out += `> ${occurrence.excerpt}\n\n`
  }

  return out
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const conceptName = process.argv[2]
  if (!conceptName) {
    console.error('Usage: node scripts/compile/build-golden.mjs <concept-name>')
    process.exit(1)
  }

  buildBatchContext(conceptName)
    .then(context => process.stdout.write(context))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

export { buildBatchContext, slugifyConcept }
