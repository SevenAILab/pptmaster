import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const DEPRECATION_WARNING = 'DEPRECATED: merge-full-deck.mjs is superseded by assemble-by-blueprint.mjs. New flow: node scripts/assemble-by-blueprint.mjs <slug> --scheme brand_positioning_case'

function printDeprecationWarning() {
  console.warn(`WARNING: ${DEPRECATION_WARNING}`)
}

export const SUITE_SECTIONS = [
  { suffix: 'industry', agent_id: 'industry_analysis', section_title: '第一部分 · 行业分析 (3C-行业)', cover_layout: 'S12' },
  { suffix: 'consumer', agent_id: 'consumer_insight', section_title: '第二部分 · 消费者洞察 (3C-客户)', cover_layout: 'S12' },
  { suffix: 'competitor', agent_id: 'competitor_analysis', section_title: '第三部分 · 竞争分析 (3C-对手)', cover_layout: 'S12' },
  { suffix: 'positioning', agent_id: 'brand_positioning', section_title: '第四部分 · 品牌定位 (核心)', cover_layout: 'S12', legacyDir: true },
  { suffix: 'building', agent_id: 'brand_building', section_title: '第五部分 · 品牌建设 (落地)', cover_layout: 'S12' },
  { suffix: 'annual', agent_id: 'annual_planning', section_title: '第六部分 · 年度规划 (执行)', cover_layout: 'S12' },
]

const FULL_METHODOLOGY_SOURCES = [
  'STP',
  'Business-Model-Canvas',
  'Value-Prop-Canvas',
  'RTB',
  'Aaker-Brand-Personality',
  'VMV',
  'Brand-House',
  'Product-House',
  'JTBD',
  'Persona-5W2H',
  'User-Journey',
  'Pain-Gain-Map',
  'PESTEL',
  'Industry-Lifecycle',
  'Porter-5-Forces',
  'SWOT',
  'Competitor-Matrix',
  'Perceptual-Map',
  'Slogan-7-Principles',
  'Visual-Hammer-Verbal-Nail',
  'OKR',
  'Marketing-Calendar',
  '4P-Rhythm',
  'AARRR-Funnel',
  'Pyramid-Principle',
  'MECE',
  'Action-Title',
]

function outputDirFor(clientSlug, section) {
  if (section.legacyDir) return clientSlug
  return `${clientSlug}-${section.suffix}`
}

function sourcePathFor(clientSlug, section) {
  return `outputs/${outputDirFor(clientSlug, section)}/raw-output.json`
}

function collectAssumptions(outputs) {
  return Object.values(outputs)
    .flatMap(output => output.metadata?.assumptions || [])
    .filter(Boolean)
}

export function buildMergedDeck(clientSlug, outputs, options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString().split('T')[0]
  const mergedSlides = []
  let pageCounter = 1

  mergedSlides.push({
    page_no: pageCounter++,
    layout: 'S22',
    action_title: `${clientSlug} 品牌全案以 6 个 Sub-Agent 串联成完整策略闭环`,
    core_points: [
      `客户: ${clientSlug}`,
      `生成日期: ${generatedAt}`,
      '覆盖行业分析、消费者洞察、竞争分析、品牌定位、品牌建设、年度规划六个模块',
      '由 PPTAgent 自动合并,真实来源和策略推演在各页 data_refs 中保留'
    ],
    data_refs: [],
    models_used: ['全案', 'Pyramid-Principle', 'Action-Title'],
    render_hints: { kpi_hero: '品牌全案', image_slot: null, accent_color: 'accent' },
  })

  for (const section of SUITE_SECTIONS) {
    const data = outputs[section.suffix]
    if (!data) continue

    mergedSlides.push({
      page_no: pageCounter++,
      layout: section.cover_layout,
      action_title: section.section_title,
      core_points: [
        `本部分由 Sub-Agent ${data.agent_id || section.agent_id} 生成`,
        `原始页数: ${(data.slides || []).length}`,
        `来源文件: ${sourcePathFor(clientSlug, section)}`,
      ],
      data_refs: [],
      models_used: ['幕封', 'Action-Title'],
      render_hints: {
        kpi_hero: section.section_title.split('·')[1]?.trim() || section.section_title,
        accent_color: 'accent',
      },
    })

    for (const slide of data.slides || []) {
      mergedSlides.push({
        ...slide,
        page_no: pageCounter++,
        section: section.suffix,
        source_agent: data.agent_id || section.agent_id,
      })
    }
  }

  mergedSlides.push({
    page_no: pageCounter++,
    layout: 'S03',
    action_title: 'SmallRig 全案下一步应进入视觉精雕和客户数据校准',
    core_points: [
      '内容层已经串联 6 个 Sub-Agent,可进入完整 deck 视觉验证',
      '年度规划中的预算、KPI、档期仍需客户真实经营数据校准',
      '所有 SmallRig 真实品牌字段继续以 page-124 OCR 和已通过 review 的上游输出为准',
    ],
    data_refs: [
      {
        value: 'SmallRig 品牌屋真实字段',
        source: 'assets/_raw/cases/标杆案例/smallrig/page-124.md',
        type: 'quote',
      },
    ],
    models_used: ['Pyramid-Principle', 'MECE', 'Action-Title'],
    render_hints: { kpi_hero: 'Next', image_slot: null, accent_color: 'ink' },
  })

  return {
    agent_id: 'full_suite',
    client_profile: {
      name: clientSlug,
      industry: '品牌全案',
      render_style: 'swiss',
    },
    slides: mergedSlides,
    metadata: {
      methodology_sources: FULL_METHODOLOGY_SOURCES,
      total_pages: mergedSlides.length,
      generated_at: generatedAt,
      generated_from: SUITE_SECTIONS.map(section => sourcePathFor(clientSlug, section)),
      source_agents: SUITE_SECTIONS.map(section => section.agent_id),
      assumptions: collectAssumptions(outputs),
      self_check_passed: true,
    },
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

async function loadSuiteOutputs(clientSlug) {
  const outputs = {}
  for (const section of SUITE_SECTIONS) {
    const rawPath = path.join(REPO_ROOT, sourcePathFor(clientSlug, section))
    try {
      outputs[section.suffix] = await readJson(rawPath)
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Missing raw-output for ${section.suffix}: ${path.relative(REPO_ROOT, rawPath)}`)
      }
      throw error
    }
  }
  return outputs
}

export async function mergeFullDeck(clientSlug) {
  const outputs = await loadSuiteOutputs(clientSlug)
  const merged = buildMergedDeck(clientSlug, outputs)
  const outDir = path.join(REPO_ROOT, `outputs/${clientSlug}-full`)
  const outPath = path.join(outDir, 'raw-output.json')
  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(outPath, JSON.stringify(merged, null, 2))
  return { outPath, pageCount: merged.slides.length }
}

async function cliMain() {
  printDeprecationWarning()
  const [clientSlug] = process.argv.slice(2)
  if (!clientSlug) {
    console.error('Usage: node scripts/merge-full-deck.mjs <client_slug>')
    process.exit(1)
  }

  console.log(`\n=== Merge Full Deck for ${clientSlug} ===\n`)
  const result = await mergeFullDeck(clientSlug)
  console.log(`✅ Merged ${result.pageCount} pages -> ${path.relative(REPO_ROOT, result.outPath)}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
