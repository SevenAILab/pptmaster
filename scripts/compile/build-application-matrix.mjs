import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const GOLDEN_DIR = path.join(REPO_ROOT, 'assets/_compiled/concepts-golden')
const OUT = path.join(REPO_ROOT, 'assets/_compiled/concept-application-matrix.json')

const SUB_AGENTS = [
  'consumer_insight',
  'industry_analysis',
  'competitor_analysis',
  'brand_positioning',
  'brand_building',
  'annual_planning',
]

const ROLE_TIER = {
  '主框架': 'must_load',
  '辅助工具': 'recommended',
  '可选引用': 'optional',
}

const SPEC_OVERRIDES = {
  consumer_insight: {
    must_load: ['JTBD', 'Persona-5W2H', 'User-Journey'],
    recommended: ['4A-Funnel', 'Maslow', 'Pain-Gain-Map'],
  },
  industry_analysis: {
    must_load: ['PESTEL', 'Industry-Lifecycle', 'Porter-5-Forces'],
    recommended: ['Value-Chain', 'S-Curve', '5-Why-Essence'],
  },
  competitor_analysis: {
    must_load: ['SWOT', 'Competitor-Matrix', 'Perceptual-Map'],
    recommended: ['4P-Comparison', 'BCG-Matrix', 'TOWS'],
  },
  brand_positioning: {
    must_load: ['STP', 'Brand-Positioning-Triangle', 'Business-Model-Canvas', 'Value-Prop-Canvas'],
    recommended: ['Aaker-Brand-Personality', 'RTB', 'VMV', '5-Why-Essence'],
  },
  brand_building: {
    must_load: ['Brand-House', 'Product-House', 'Slogan-7-Principles', 'Visual-Hammer-Verbal-Nail'],
    recommended: ['Brand-Asset-5-Star', 'Aaker-Brand-Personality', 'Brand-Story-Hero-Journey'],
  },
  annual_planning: {
    must_load: ['OKR', 'Marketing-Calendar', '4P-Rhythm', 'AARRR-Funnel'],
    recommended: ['PDCA', 'Communication-Theory-34', 'IMC'],
  },
}

function parseFrontmatter(markdown) {
  const match = /^---\n([\s\S]+?)\n---/.exec(markdown)
  if (!match) return {}

  const lines = match[1].split('\n')
  const frontmatter = {}
  let currentKey = null

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+#.*$/, '')
    const keyValue = /^([a-zA-Z_]+):\s*(.*)$/.exec(line)
    if (keyValue) {
      currentKey = keyValue[1]
      const value = keyValue[2].trim()
      frontmatter[currentKey] = value || []
      continue
    }

    if (!currentKey) continue

    const listItem = /^\s*-\s+(.+)$/.exec(line)
    if (listItem) {
      if (!Array.isArray(frontmatter[currentKey])) frontmatter[currentKey] = []
      frontmatter[currentKey].push(listItem[1].trim())
      continue
    }

    const mapItem = /^\s+([a-zA-Z0-9_]+):\s*(.+)$/.exec(line)
    if (mapItem) {
      if (Array.isArray(frontmatter[currentKey])) frontmatter[currentKey] = {}
      frontmatter[currentKey][mapItem[1]] = mapItem[2].trim()
    }
  }

  return frontmatter
}

function normalizeAgent(agent) {
  const map = {
    '①': 'consumer_insight',
    '1': 'consumer_insight',
    consumer_insight: 'consumer_insight',
    '②': 'industry_analysis',
    '2': 'industry_analysis',
    industry_analysis: 'industry_analysis',
    '③': 'competitor_analysis',
    '3': 'competitor_analysis',
    competitor_analysis: 'competitor_analysis',
    '④': 'brand_positioning',
    '4': 'brand_positioning',
    brand_positioning: 'brand_positioning',
    '⑤': 'brand_building',
    '5': 'brand_building',
    brand_building: 'brand_building',
    '⑥': 'annual_planning',
    '6': 'annual_planning',
    annual_planning: 'annual_planning',
  }

  return map[String(agent).trim()] || null
}

function normalizeRole(role) {
  return String(role || '辅助工具').split(/\s+/)[0].trim()
}

function extractReason(markdown) {
  const match = /##\s*定义\s*\n+([\s\S]+?)(?=\n##\s|$)/.exec(markdown)
  if (!match) return ''
  return match[1]
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, 160)
}

function createConceptEntry({ name, slug, category, role, tier, file, reason }) {
  return {
    concept: name,
    slug,
    file: `assets/_compiled/concepts-golden/${file}`,
    category,
    role,
    tier,
    reason,
  }
}

function moveConcept(matrix, agent, conceptName, targetTier) {
  let entry = null
  for (const tier of ['must_load', 'recommended', 'optional']) {
    const index = matrix[agent][tier].findIndex(item => item.concept === conceptName)
    if (index >= 0) {
      entry = matrix[agent][tier][index]
      matrix[agent][tier].splice(index, 1)
    }
  }
  if (!entry) return
  entry.tier = targetTier
  entry.role = targetTier === 'must_load' ? '主框架' : targetTier === 'recommended' ? '辅助工具' : '可选引用'
  matrix[agent][targetTier].push(entry)
}

function applySpecOverrides(matrix) {
  for (const [agent, tiers] of Object.entries(SPEC_OVERRIDES)) {
    const mustLoadSet = new Set(tiers.must_load)
    for (const item of [...matrix[agent].must_load]) {
      if (!mustLoadSet.has(item.concept)) moveConcept(matrix, agent, item.concept, 'recommended')
    }

    for (const [tier, concepts] of Object.entries(tiers)) {
      for (const conceptName of concepts) {
        moveConcept(matrix, agent, conceptName, tier)
      }
    }
  }
}

function sortMatrix(matrix) {
  for (const agent of SUB_AGENTS) {
    for (const tier of ['must_load', 'recommended', 'optional']) {
      matrix[agent][tier].sort((a, b) => a.concept.localeCompare(b.concept))
    }
  }
}

function computeCoverage(matrix, conceptCount) {
  const stats = {}
  const uniqueConcepts = new Set()

  for (const agent of SUB_AGENTS) {
    const total = matrix[agent].must_load.length + matrix[agent].recommended.length + matrix[agent].optional.length
    stats[agent] = {
      total,
      must_load_count: matrix[agent].must_load.length,
      recommended_count: matrix[agent].recommended.length,
      optional_count: matrix[agent].optional.length,
    }

    for (const tier of ['must_load', 'recommended', 'optional']) {
      for (const item of matrix[agent][tier]) uniqueConcepts.add(item.concept)
    }
  }

  stats.overall = {
    mapped_unique_concepts: uniqueConcepts.size,
    golden_concepts_count: conceptCount,
    coverage_ratio: Number((uniqueConcepts.size / conceptCount).toFixed(4)),
  }

  return stats
}

function buildCrossMethodologies(conceptsByName) {
  return {
    essence_seeker: conceptsByName.has('5-Why-Essence') ? [conceptsByName.get('5-Why-Essence')] : [],
    swot: conceptsByName.has('SWOT') ? [conceptsByName.get('SWOT')] : [],
    communication_theory_34: conceptsByName.has('Communication-Theory-34')
      ? [conceptsByName.get('Communication-Theory-34')]
      : [],
    mece: conceptsByName.has('MECE') ? [conceptsByName.get('MECE')] : [],
    pyramid_principle: conceptsByName.has('Pyramid-Principle') ? [conceptsByName.get('Pyramid-Principle')] : [],
    action_title: conceptsByName.has('Action-Title') ? [conceptsByName.get('Action-Title')] : [],
  }
}

async function buildApplicationMatrix() {
  const files = (await fs.readdir(GOLDEN_DIR))
    .filter(file => file.endsWith('.md') && file !== 'INDEX.md')
    .sort()

  console.log(`[matrix] Scanning ${files.length} golden concepts`)

  const matrix = Object.fromEntries(
    SUB_AGENTS.map(agent => [agent, { must_load: [], recommended: [], optional: [] }]),
  )
  const conceptsByName = new Map()

  for (const file of files) {
    const markdown = await fs.readFile(path.join(GOLDEN_DIR, file), 'utf8')
    const frontmatter = parseFrontmatter(markdown)
    const name = frontmatter.name || file.replace(/\.md$/, '')
    const slug = file.replace(/\.md$/, '')
    const category = frontmatter.category || ''
    const applicableAgents = Array.isArray(frontmatter.applicable_sub_agents)
      ? frontmatter.applicable_sub_agents
      : []
    const applicationRole = typeof frontmatter.application_role === 'object'
      ? frontmatter.application_role
      : {}

    const baseEntry = {
      concept: name,
      slug,
      file: `assets/_compiled/concepts-golden/${file}`,
      category,
      reason: extractReason(markdown),
    }
    conceptsByName.set(name, baseEntry)

    for (const rawAgent of applicableAgents) {
      const agent = normalizeAgent(rawAgent)
      if (!agent || !matrix[agent]) continue

      const role = normalizeRole(applicationRole[agent] || applicationRole[rawAgent] || '辅助工具')
      const tier = ROLE_TIER[role] || 'recommended'
      matrix[agent][tier].push(createConceptEntry({
        name,
        slug,
        category,
        role,
        tier,
        file,
        reason: baseEntry.reason,
      }))
    }
  }

  applySpecOverrides(matrix)
  sortMatrix(matrix)

  const output = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    generated_from: {
      golden_dir: 'assets/_compiled/concepts-golden',
      golden_concepts_count: files.length,
      source_rule: 'frontmatter.applicable_sub_agents + application_role, with spec §4.3-4.8 tier overrides',
    },
    matrix,
    cross_methodologies: buildCrossMethodologies(conceptsByName),
    coverage_stats: computeCoverage(matrix, files.length),
  }

  await fs.writeFile(OUT, `${JSON.stringify(output, null, 2)}\n`)
  console.log(`[matrix] Done. ${path.relative(REPO_ROOT, OUT)}`)
  console.log('\nCoverage:')
  for (const agent of SUB_AGENTS) {
    const stats = output.coverage_stats[agent]
    console.log(
      `  ${agent.padEnd(22)} must=${stats.must_load_count} rec=${stats.recommended_count} opt=${stats.optional_count}`,
    )
  }

  return output
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  buildApplicationMatrix().catch(error => {
    console.error(error)
    process.exit(1)
  })
}

export { buildApplicationMatrix, parseFrontmatter }
