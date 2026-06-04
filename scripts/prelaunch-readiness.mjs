#!/usr/bin/env node
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function readJson(filePath) {
  return JSON.parse(read(filePath))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function runNode(scriptPath) {
  execFileSync(process.execPath, [scriptPath], { stdio: 'pipe' })
}

function runNpmBlueprintValidate() {
  execFileSync('npm', [
    'run',
    'blueprint:validate',
    '--',
    'assets/_compiled/blueprints/brand-positioning-deck-v1.json',
    'assets/_compiled/blueprints/brand-building-deck-v1.json',
  ], { stdio: 'pipe' })
}

function validateReleaseDocs() {
  for (const script of [
    'scripts/test-release-docs.mjs',
    'scripts/test-readme-release.mjs',
    'scripts/test-launch-readiness.mjs',
  ]) {
    runNode(script)
  }
}

function validateBlueprintSystem() {
  for (const script of [
    'scripts/test-chief-strategist-orchestrator.mjs',
    'scripts/test-blueprint-validators.mjs',
    'scripts/test-run-sub-agent.mjs',
    'scripts/test-blueprint-suite.mjs',
    'scripts/test-blueprint-assemble.mjs',
    'scripts/test-blueprint-end-to-end.mjs',
    'scripts/test-consulting-review.mjs',
  ]) {
    runNode(script)
  }
  runNpmBlueprintValidate()
}

function validateDemoOutput(slug, expectedPages, requiredTexts = [], forbiddenTexts = []) {
  const rawPath = `outputs/${slug}/raw-output.json`
  const htmlPath = `outputs/${slug}/index.html`
  assert(fs.existsSync(rawPath), `${rawPath} missing; run blueprint demo first`)
  assert(fs.existsSync(htmlPath), `${htmlPath} missing; run blueprint demo first`)

  const raw = readJson(rawPath)
  assert(Array.isArray(raw.slides), `${rawPath} should have slides array`)
  assert(raw.slides.length === expectedPages, `${slug} expected ${expectedPages} pages, got ${raw.slides.length}`)

  const rawText = JSON.stringify(raw)
  const html = read(htmlPath)
  for (const text of requiredTexts) {
    assert(rawText.includes(text) || html.includes(text), `${slug} missing required text: ${text}`)
  }
  for (const text of forbiddenTexts) {
    assert(!rawText.includes(text), `${slug} contains forbidden text: ${text}`)
  }
}

function validateSmallRigRefs() {
  const raw = readJson('outputs/smallrig-mi-blueprint/raw-output.json')
  let refs = 0
  let badRefs = 0
  for (const slide of raw.slides || []) {
    for (const ref of slide.data_refs || []) {
      refs += 1
      if (ref.source !== 'assets/_raw/cases/标杆案例/smallrig/page-124.md') badRefs += 1
    }
  }
  assert(refs >= 50, `SmallRig should have at least 50 page-124 data refs, got ${refs}`)
  assert(badRefs === 0, `SmallRig has ${badRefs} non-page-124 refs`)
}

function validatePromptBundlePacket() {
  const bundlePath = 'outputs/test-positioning-case/_chunks/p2-c3-consumer-portraits.prompt-bundle.md'
  assert(fs.existsSync(bundlePath), `${bundlePath} missing; run blueprint suite for a chunk first`)
  const bundle = read(bundlePath)
  assert(bundle.includes('## Orchestrator Task Packet (auto-injected)'), 'prompt bundle missing orchestrator task packet')
  assert(bundle.includes('"role": "chief_strategist"'), 'prompt bundle missing chief_strategist role')
  assert(bundle.includes('"working_memory"'), 'prompt bundle missing working_memory')
}

function validateEnvSafety() {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '.env'], {
      stdio: 'pipe',
      encoding: 'utf8',
    })
    throw new Error('.env should not be tracked')
  } catch (error) {
    if (error.message === '.env should not be tracked') throw error
  }
}

try {
  validateReleaseDocs()
  validateBlueprintSystem()
  validateDemoOutput('pptagent-blueprint', 80, ['PPTAgent', '品牌策划方案 Agent'])
  validateDemoOutput('test-positioning-case-blueprint', 80, ['茶语', '品牌屋'], ['PPTAgent', 'AI PPT', '甲方品牌方和市场部'])
  validateDemoOutput('test-building-case-blueprint', 95, ['启程', 'SWOT', '品牌建设'])
  validateDemoOutput('smallrig-mi-blueprint', 95, [
    '全球影像场景产品生态开创者',
    'FREE YOUR DREAM',
    'Rig UP',
    '全生态',
  ])
  validateSmallRigRefs()
  validatePromptBundlePacket()
  validateEnvSafety()
  console.log('✅ prelaunch readiness passed')
} catch (error) {
  console.error(`❌ prelaunch readiness failed: ${error.message}`)
  process.exit(1)
}
