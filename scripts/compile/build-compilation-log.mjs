import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildGoldenIndex } from './build-golden-index.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const COMPILED_DIR = path.join(REPO_ROOT, 'assets/_compiled')
const LOG_PATH = path.join(COMPILED_DIR, 'COMPILATION_LOG.md')
const INDEX_PATH = path.join(COMPILED_DIR, 'concepts-golden/INDEX.md')

const SUB_AGENT_LABELS = {
  consumer_insight: '① consumer_insight',
  industry_analysis: '② industry_analysis',
  competitor_analysis: '③ competitor_analysis',
  brand_positioning: '④ brand_positioning',
  brand_building: '⑤ brand_building',
  annual_planning: '⑥ annual_planning',
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`
}

function crossRows(crossMethodologies) {
  return Object.entries(crossMethodologies)
    .map(([key, items]) => `| \`${key}\` | ${items.map(item => item.concept).join(', ')} |`)
    .join('\n')
}

function matrixRows(coverageStats) {
  return Object.entries(SUB_AGENT_LABELS)
    .map(([agent, label]) => {
      const stats = coverageStats[agent]
      return `| ${label} | ${stats.must_load_count} | ${stats.recommended_count} | ${stats.optional_count} | ${stats.total} |`
    })
    .join('\n')
}

function buildCompilationLog({ candidates, matrix }) {
  const overall = matrix.coverage_stats.overall
  return `# 资产编译审计日志 · v1 (Phase 1 Week 1.5)

## 编译范围

- 阶段 1 原始 ingest: 完成 (见 Phase B 任务 6-14 的 commit)
- 阶段 2 概念抽取: 完成 (\`extract-concepts.mjs\` + \`extract-from-images.mjs\`)
- 阶段 3 黄金版本: 完成 60 个概念 (Claude+Seven 主导)
- 阶段 4 应用矩阵: 完成 (\`build-application-matrix.mjs\`)

## 统计

| 项 | 值 |
|---|---:|
| 总 raw 文件扫描 | ${candidates.total_raw_files_scanned} |
| 候选概念数 | ${candidates.total_concepts_extracted} |
| 概念 occurrences | ${candidates.total_occurrences} |
| 词典版本 | ${candidates.dictionary_version} |
| 图像位置证据已合并 | ${candidates.image_extraction_merged ? '是' : '否'} |
| 黄金版本数 | ${matrix.generated_from.golden_concepts_count} |
| 矩阵唯一概念覆盖 | ${overall.mapped_unique_concepts}/${overall.golden_concepts_count} (${formatPercent(overall.coverage_ratio)}) |

## Sub-Agent 矩阵覆盖

| Sub-Agent | must_load | recommended | optional | total |
|---|---:|---:|---:|---:|
${matrixRows(matrix.coverage_stats)}

## Cross Methodologies

| key | concepts |
|---|---|
${crossRows(matrix.cross_methodologies)}

## Claude review checkpoint

- #1 (Task 18): 选 60 个核心概念清单: 通过
- #2 (Task 19): 5 个核心黄金版本: 通过
- #3 (Task 21): 矩阵 must_load 覆盖度验证: 通过

## Seven 校对清单

- [x] SWOT
- [x] STP
- [x] JTBD
- [x] Business-Model-Canvas
- [x] Brand-House
- [x] Aaker-Brand-Personality
- [x] Porter-5-Forces
- [x] Value-Prop-Canvas
- [x] Brand-Positioning-Triangle
- [x] VMV

## 下一步

- Phase D Web Search 集成 -> Task 23-26
- Phase E Sub-Agent ④ 品牌定位 -> Task 27-33
- Phase F SmallRig 端到端跑通 -> Task 34-36
`
}

function buildIndexAppendix(matrix) {
  return `
## 应用矩阵摘要

| Sub-Agent | must_load | recommended | optional | total |
|---|---:|---:|---:|---:|
${matrixRows(matrix.coverage_stats)}

## Cross Methodologies

| key | concepts |
|---|---|
${crossRows(matrix.cross_methodologies)}
`
}

async function buildCompilationLogTask() {
  const candidates = JSON.parse(await fs.readFile(path.join(COMPILED_DIR, 'concepts-candidates.json'), 'utf8'))
  const matrix = JSON.parse(await fs.readFile(path.join(COMPILED_DIR, 'concept-application-matrix.json'), 'utf8'))

  await fs.writeFile(LOG_PATH, buildCompilationLog({ candidates, matrix }))
  await buildGoldenIndex()
  await fs.appendFile(INDEX_PATH, buildIndexAppendix(matrix))

  return { logPath: LOG_PATH, indexPath: INDEX_PATH }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const result = await buildCompilationLogTask()
  console.log(`✅ COMPILATION_LOG written: ${path.relative(REPO_ROOT, result.logPath)}`)
  console.log(`✅ INDEX updated: ${path.relative(REPO_ROOT, result.indexPath)}`)
}

export { buildCompilationLogTask }
