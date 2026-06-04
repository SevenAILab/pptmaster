// scripts/compile/build-concepts-to-compile.mjs
// Task 18: curate the 60 concept checklist for golden-version compilation.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../..')
const CANDIDATES_PATH = path.join(REPO_ROOT, 'assets/_compiled/concepts-candidates.json')
const OUT = path.join(REPO_ROOT, 'assets/_compiled/CONCEPTS-TO-COMPILE.md')

const sections = [
  {
    title: 'Sub-Agent ① consumer_insight',
    count: 9,
    rationale: '覆盖用户是谁、为什么买、如何体验；优先绑定 247 页书 Ch4、体验层全景图与用户模型卡。',
    concepts: [
      'JTBD',
      'Persona-5W2H',
      'User-Journey',
      '4A-Funnel',
      'Maslow',
      'Pain-Gain-Map',
      'Service-Blueprint',
      'HEART',
      'KANO'
    ]
  },
  {
    title: 'Sub-Agent ② industry_analysis',
    count: 8,
    rationale: '覆盖宏观环境、行业结构、生命周期、价值链与战略目标落地。',
    concepts: [
      'PESTEL',
      'Industry-Lifecycle',
      'Porter-5-Forces',
      'Value-Chain',
      'S-Curve',
      'OGSM',
      'Ansoff-Matrix',
      'North-Star-Metric'
    ]
  },
  {
    title: 'Sub-Agent ③ competitor_analysis',
    count: 8,
    rationale: '覆盖竞品对比、差异化机会、组合策略与 SWOT/TOWS 转行动。',
    concepts: [
      'SWOT',
      'Competitor-Matrix',
      'Perceptual-Map',
      '4P-Comparison',
      'BCG-Matrix',
      'TOWS',
      '4P',
      '4C'
    ]
  },
  {
    title: 'Sub-Agent ④ brand_positioning',
    count: 11,
    rationale: 'Phase 1 核心模块，覆盖定位、价值主张、商业模式、人格调性与输出表达。',
    concepts: [
      'STP',
      'Brand-Positioning-Triangle',
      'Business-Model-Canvas',
      'Value-Prop-Canvas',
      'Aaker-Brand-Personality',
      'RTB',
      'VMV',
      'SCQA',
      'Big-Idea',
      'Brand-Architecture',
      'GTM'
    ]
  },
  {
    title: 'Sub-Agent ⑤ brand_building',
    count: 9,
    rationale: '覆盖品牌屋、产品屋、口号、视觉锤、品牌故事与资产管理。',
    concepts: [
      'Brand-House',
      'Product-House',
      'Slogan-7-Principles',
      'Visual-Hammer-Verbal-Nail',
      'Brand-Asset-5-Star',
      'Brand-Story-Hero-Journey',
      'Brand-Asset-Management',
      'KOL-KOC',
      'Crisis-Management'
    ]
  },
  {
    title: 'Sub-Agent ⑥ annual_planning',
    count: 10,
    rationale: '覆盖年度目标、节奏、整合营销、增长实验、预算与复盘机制。',
    concepts: [
      'OKR',
      'Marketing-Calendar',
      '4P-Rhythm',
      'AARRR-Funnel',
      'PDCA',
      'IMC',
      'Growth-Flywheel',
      'ICE',
      'Budget-Allocation',
      'LTV-CAC'
    ]
  },
  {
    title: '横切方法论',
    count: 5,
    rationale: '不是单独 Sub-Agent，而是所有模块共享的推理、结构与表达工具箱。',
    concepts: [
      '5-Why-Essence',
      'Communication-Theory-34',
      'MECE',
      'Pyramid-Principle',
      'Action-Title'
    ]
  }
]

const fallbackStats = {
  '4A-Funnel': {
    occ: 0,
    avg: 0,
    sourceLabels: ['Spec §4.3 recommended', 'scripts/concept-dictionary.json'],
    status: 'spec推荐但当前语料 0 命中，黄金版需补充 4A/认知漏斗定义与案例'
  },
  'Pain-Gain-Map': {
    occ: 0,
    avg: 0,
    sourceLabels: ['Spec §4.3 recommended', 'scripts/concept-dictionary.json'],
    status: 'spec推荐但当前语料 0 命中，黄金版需从价值主张/用户痛点材料中合成'
  },
  '4P-Comparison': {
    aliasOf: '4P',
    status: 'spec推荐概念，当前用 4P 证据映射为竞品 4P 对比法'
  },
  'Slogan-7-Principles': {
    occ: 0,
    avg: 0,
    sourceLabels: ['Spec §4.7 must_load', 'scripts/concept-dictionary.json'],
    status: 'spec必读但当前语料 0 命中，黄金版需从品牌口号章节/案例补证据'
  },
  MECE: {
    occ: 0,
    avg: 0,
    sourceLabels: ['Spec §4.9 cross_methodologies', 'scripts/concept-dictionary.json'],
    status: '横切结构工具，当前语料 0 命中，保留为输出自检必备'
  },
  'Service-Blueprint': {
    occ: 0,
    avg: 0,
    sourceLabels: ['MAP-STRUCTURE 06-体验层', '全景图工具: 服务蓝图 Service Blueprint'],
    status: '新增候选，来自体验层全景图，需 Task 19+ 补黄金版'
  },
  HEART: {
    occ: 0,
    avg: 0,
    sourceLabels: ['MAP-STRUCTURE 06-体验层', '全景图工具: HEART 指标体系'],
    status: '新增候选，来自体验层全景图，作为体验测量辅助'
  },
  KANO: {
    occ: 0,
    avg: 0,
    sourceLabels: ['MAP-STRUCTURE 04-产品层', '全景图工具: KANO 模型'],
    status: '新增候选，来自产品层全景图，用于需求优先级判断'
  },
  OGSM: {
    occ: 0,
    avg: 0,
    sourceLabels: ['MAP-STRUCTURE 02-战略层', '全景图工具: OGSM 模型'],
    status: '新增候选，来自战略层全景图，用于目标-策略-衡量落地'
  },
  'North-Star-Metric': {
    occ: 0,
    avg: 0,
    sourceLabels: ['MAP-STRUCTURE 07-增长层', '全景图工具: 北极星指标'],
    status: '新增候选，来自增长层全景图，用于统一增长目标'
  },
  'Brand-Architecture': {
    occ: 0,
    avg: 0,
    sourceLabels: ['MAP-STRUCTURE 03-品牌层', '全景图工具: 品牌架构图'],
    status: '新增候选，来自品牌层全景图，用于品牌延伸与架构管理'
  },
  GTM: {
    occ: 0,
    avg: 0,
    sourceLabels: ['MAP-STRUCTURE 05-传播层/07-增长层', '传播与渠道拓展模块'],
    status: '新增候选，用于连接定位、上市打法与渠道节奏'
  },
  'Brand-Asset-Management': {
    occ: 0,
    avg: 0,
    sourceLabels: ['MAP-STRUCTURE 03-品牌层', 'MAP-STRUCTURE 08-管理层'],
    status: '新增候选，来自品牌资产管理与管理制度模块'
  },
  'KOL-KOC': {
    occ: 0,
    avg: 0,
    sourceLabels: ['MAP-STRUCTURE 05-传播层', '全景图模块: KOL/KOC 合作'],
    status: '新增候选，来自传播层全景图，用于口碑与内容触达'
  },
  'Crisis-Management': {
    occ: 0,
    avg: 0,
    sourceLabels: ['MAP-STRUCTURE 08-管理层', '全景图工具: 危机管理流程'],
    status: '新增候选，来自管理层全景图，用于品牌风险与预案'
  },
  'Growth-Flywheel': {
    occ: 0,
    avg: 0,
    sourceLabels: ['MAP-STRUCTURE 07-增长层', '全景图工具: 增长飞轮模型'],
    status: '新增候选，来自增长层全景图，用于年度增长机制'
  },
  ICE: {
    occ: 0,
    avg: 0,
    sourceLabels: ['MAP-STRUCTURE 07-增长层', '全景图工具: ICE 优先级模型'],
    status: '新增候选，来自增长层全景图，用于增长实验排序'
  },
  'Budget-Allocation': {
    occ: 0,
    avg: 0,
    sourceLabels: ['MAP-STRUCTURE 08-管理层', '全景图输出: 预算分配方案'],
    status: '新增候选，来自年度规划预算管理场景'
  },
  'LTV-CAC': {
    occ: 0,
    avg: 0,
    sourceLabels: ['MAP-STRUCTURE 07-增长层', '全景图工具: LTV/CAC 生命周期价值模型'],
    status: '新增候选，来自增长层全景图，用于商业化效率评估'
  }
}

function classifySource(source) {
  if (source.includes('assets/visuals/master-map')) return '全景图'
  if (source.includes('assets/_raw/books/0to1-brand')) return '247页书'
  if (source.includes('assets/_raw/models')) return '模型卡'
  if (source.includes('assets/_raw/methodologies')) return '方法论文章'
  if (source.includes('assets/_raw/cases')) return '案例PPT'
  if (source.includes('assets/_raw/prompts-legacy')) return '历史Prompt'
  if (source.includes('assets/_raw/tools')) return '402工具表'
  if (source.includes('assets/_raw/frameworks')) return '框架PDF'
  if (source.includes('assets/_raw/dictionary')) return '词典PDF'
  if (source.includes('assets/_raw/qa')) return 'QA资料'
  if (source.includes('assets/_raw/sops')) return 'SOP资料'
  return source
}

function summarizeSources(occurrences) {
  const labels = []
  for (const source of [...new Set(occurrences.map(item => item.source))]) {
    const label = classifySource(source)
    if (!labels.includes(label)) labels.push(label)
  }
  return labels.slice(0, 5)
}

function buildStatsMap(candidates) {
  return new Map(candidates.concepts.map(concept => [concept.concept, concept]))
}

function statsFor(concept, statsMap) {
  const fallback = fallbackStats[concept]
  const mapped = fallback?.aliasOf || concept
  const candidate = statsMap.get(mapped)

  if (candidate) {
    const imageCount = candidate.occurrences.filter(item => item.source.includes('assets/visuals/master-map')).length
    const labels = summarizeSources(candidate.occurrences)
    const evidenceStatus = imageCount > 0 ? '双证据优先' : '文本证据可用'
    const status = fallback?.status && !fallback.status.includes('当前语料 0 命中')
      ? fallback.status
      : evidenceStatus
    return {
      occ: candidate.occurrence_count,
      avg: candidate.average_quality_score,
      imageCount,
      sourceLabels: labels,
      status
    }
  }

  if (fallback) {
    return {
      occ: fallback.occ,
      avg: fallback.avg,
      imageCount: 0,
      sourceLabels: fallback.sourceLabels,
      status: fallback.status
    }
  }

  return {
    occ: 0,
    avg: 0,
    imageCount: 0,
    sourceLabels: ['待补充来源'],
    status: '新增候选，需补证据'
  }
}

function conceptLine(concept, statsMap) {
  const stats = statsFor(concept, statsMap)
  const avg = stats.avg ? `, avg_q: ${stats.avg}` : ''
  const image = stats.imageCount ? `, image: ${stats.imageCount}` : ''
  return `- [ ] ${concept} (occ: ${stats.occ}${avg}${image}, sources: ${stats.sourceLabels.join(' + ')}, status: ${stats.status})`
}

async function buildConceptsToCompile() {
  const candidates = JSON.parse(await fs.readFile(CANDIDATES_PATH, 'utf8'))
  const statsMap = buildStatsMap(candidates)
  const total = sections.reduce((sum, section) => sum + section.concepts.length, 0)

  let out = '# 60 个核心概念 · 待编译清单\n\n'
  out += '> Task 18 checkpoint #1。本清单按 Spec v1.1.1 §4.3-4.9 的 must_load/recommended 先保证覆盖，再按 occurrences、quality_score、247 页书 + 全景图双证据排序补足。\n\n'
  out += `- checklist total: ${total}\n`
  out += '- selection rule: spec 必选/推荐 > 多源高频高质量 > 全景图位置证据 > MAP-STRUCTURE 新增但需补证据\n'
  out += '- review note: status 含“0 命中/新增候选”的条目，请 Seven/Claude 在 checkpoint review 时确认是否保留或替换。\n\n'

  for (const section of sections) {
    out += `## ${section.title} (${section.concepts.length} 个)\n\n`
    out += `${section.rationale}\n\n`
    for (const concept of section.concepts) {
      out += `${conceptLine(concept, statsMap)}\n`
    }
    out += '\n'
  }

  out += '## Review 风险提示\n\n'
  out += '- `4A-Funnel`、`Pain-Gain-Map`、`Slogan-7-Principles`、`MECE` 已通过 alias 补强获得文本证据；黄金版仍需在 Task 19/20 精修 primary/secondary source。\n'
  out += '- `4P-Comparison` 当前以 `4P` 的证据承接；黄金版应写成“竞品 4P 对比矩阵”，不要只写营销组合定义。\n'
  out += '- `Service-Blueprint`、`HEART`、`KANO`、`OGSM` 等 MAP-STRUCTURE 新增概念，需在 Task 19/20 编译时补 primary/secondary source。\n'

  await fs.writeFile(OUT, out)
  console.log(`[build-concepts-to-compile] wrote ${path.relative(REPO_ROOT, OUT)} (${total} concepts)`)
  return out
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  buildConceptsToCompile().catch(error => {
    console.error(error)
    process.exit(1)
  })
}

export { buildConceptsToCompile, sections, statsFor }
