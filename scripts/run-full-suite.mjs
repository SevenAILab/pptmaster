import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareSubAgentBundle } from './run-sub-agent.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const DEPRECATION_WARNING = 'DEPRECATED: run-full-suite.mjs is superseded by run-blueprint-suite.mjs. New flow: node scripts/run-blueprint-suite.mjs <slug> --scheme brand_positioning_case'

function printDeprecationWarning() {
  console.warn(`WARNING: ${DEPRECATION_WARNING}`)
}

export const SUITE_ORDER = [
  { id: 'industry_analysis', suffix: 'industry' },
  { id: 'consumer_insight', suffix: 'consumer' },
  { id: 'competitor_analysis', suffix: 'competitor' },
  { id: 'brand_positioning', suffix: 'positioning', upstream: ['industry', 'consumer', 'competitor'] },
  { id: 'brand_building', suffix: 'building', upstream: ['positioning'] },
  { id: 'annual_planning', suffix: 'annual', upstream: ['positioning', 'building'] },
]

const LEGACY_SUFFIX_OUTPUT = {
  positioning: 'legacy_positioning',
}

const UPSTREAM_KEYS = {
  industry: 'industry_analysis',
  consumer: 'consumer_insight',
  competitor: 'competitor_analysis',
  positioning: 'brand_positioning',
  building: 'brand_building',
  annual: 'annual_planning',
}

export function upstreamKeyForSuffix(suffix) {
  return UPSTREAM_KEYS[suffix] || suffix
}

export function resolveOutputDirName(clientSlug, suffix) {
  if (suffix === 'legacy_positioning') return clientSlug
  return `${clientSlug}-${suffix}`
}

function repoPath(...segments) {
  return path.join(REPO_ROOT, ...segments)
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

function summarizeOutput(output) {
  return JSON.stringify({
    agent_id: output.agent_id,
    slide_count: output.slides?.length || 0,
    titles: (output.slides || []).map(slide => slide.action_title).slice(0, 12),
    methodology_sources: output.metadata?.methodology_sources || [],
    assumptions: output.metadata?.assumptions || [],
  }, null, 2)
}

async function loadUpstreamOutputs(clientSlug, suffixes = []) {
  const upstreamOutputs = {}
  for (const suffix of suffixes) {
    const preferredDir = resolveOutputDirName(clientSlug, suffix)
    const legacyAlias = LEGACY_SUFFIX_OUTPUT[suffix]
    const candidates = [
      repoPath('outputs', preferredDir, 'raw-output.json'),
      legacyAlias ? repoPath('outputs', resolveOutputDirName(clientSlug, legacyAlias), 'raw-output.json') : null,
    ].filter(Boolean)

    let output = null
    let sourcePath = null
    for (const candidate of candidates) {
      output = await readJsonIfExists(candidate)
      if (output) {
        sourcePath = candidate
        break
      }
    }

    if (!output) {
      console.warn(`⚠️  上游 ${suffix} 缺失, ${clientSlug}-${suffix} 将保留模板 fallback`)
      continue
    }

    upstreamOutputs[upstreamKeyForSuffix(suffix)] = [
      `Source: ${path.relative(REPO_ROOT, sourcePath)}`,
      summarizeOutput(output),
    ].join('\n')
  }
  return upstreamOutputs
}

async function prepareSuiteBundle(clientSlug, agent) {
  const upstreamOutputs = await loadUpstreamOutputs(clientSlug, agent.upstream || [])
  const outputSuffix = agent.suffix === 'positioning' ? undefined : agent.suffix
  return prepareSubAgentBundle(agent.id, clientSlug, {
    outputSuffix,
    upstreamOutputs,
  })
}

async function assertExistingRawOutput(clientSlug, agent) {
  const outputDir = resolveOutputDirName(clientSlug, agent.suffix === 'positioning' ? 'legacy_positioning' : agent.suffix)
  const rawPath = repoPath('outputs', outputDir, 'raw-output.json')
  const output = await readJsonIfExists(rawPath)
  return {
    outputDir,
    rawPath,
    exists: Boolean(output),
    slideCount: output?.slides?.length || 0,
  }
}

export async function runFullSuite(clientSlug) {
  const results = []
  for (const agent of SUITE_ORDER) {
    const bundle = await prepareSuiteBundle(clientSlug, agent)
    const rawOutput = await assertExistingRawOutput(clientSlug, agent)
    results.push({ agent, bundle, rawOutput })
  }
  return results
}

async function cliMain() {
  printDeprecationWarning()
  const [clientSlug] = process.argv.slice(2).filter(arg => !arg.startsWith('--'))
  if (!clientSlug) {
    console.error('Usage: node scripts/run-full-suite.mjs <client_slug>')
    process.exit(1)
  }

  console.log(`\n=== Run Full Suite for ${clientSlug} ===\n`)
  const results = await runFullSuite(clientSlug)
  for (const { agent, bundle, rawOutput } of results) {
    console.log(`[${agent.id}] bundle -> ${path.relative(REPO_ROOT, bundle.bundlePath)}`)
    console.log(`  must_load=${bundle.mustLoadCount}, web_search=${bundle.webSearch}, max_searches=${bundle.maxSearches}`)
    if (rawOutput.exists) {
      console.log(`  ✅ raw-output exists: outputs/${rawOutput.outputDir}/raw-output.json (${rawOutput.slideCount} slides)`)
    } else {
      console.log(`  ⚠️  raw-output missing: outputs/${rawOutput.outputDir}/raw-output.json`)
      console.log('     请读取 prompt-bundle.md 后生成 raw-output.json,再重跑本脚本。')
    }
  }

  const missing = results.filter(result => !result.rawOutput.exists)
  if (missing.length > 0) {
    console.log('\n=== Full Suite Pending ===')
    console.log(`缺 ${missing.length} 个 raw-output,暂不自动合并。`)
    return
  }

  console.log('\n=== Full Suite Ready ===')
  console.log(`下一步: node scripts/merge-full-deck.mjs ${clientSlug}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
