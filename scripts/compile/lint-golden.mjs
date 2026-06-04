// scripts/compile/lint-golden.mjs
// 扫描 concepts-golden/ 所有 md 文件,检测 P0 违规,可选 --fix 自动加 placeholder
// Usage:
//   node scripts/compile/lint-golden.mjs        # 仅扫描+报告
//   node scripts/compile/lint-golden.mjs --fix  # 自动修复可机械修的部分 (植愈坊标注 + 可追溯报告 placeholder)

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../..')
const GOLDEN_DIR = path.join(REPO_ROOT, 'assets/_compiled/concepts-golden')
const REPORT_PATH = path.join(REPO_ROOT, 'docs/lint-report.md')

const SHOULD_FIX = process.argv.includes('--fix')

// 致命级 Wave 3 文件清单 (硬塞 SmallRig 编造, 必须人工删 SmallRig 改 Tier 3)
const WAVE3_INTERNET_TOOLS = new Set(['ice.md', 'ltv-cac.md', 'gtm.md', 'ogsm.md', 'growth-flywheel.md', 'north-star-metric.md'])
const WAVE3_MAP_STRUCTURE = new Set(['brand-architecture.md', 'brand-asset-management.md', 'crisis-management.md', 'service-blueprint.md', 'kano.md', 'heart.md'])
const B_LAYER_NEEDS_TIER2 = new Set(['4p.md', '4c.md', '4p-comparison.md', 'maslow.md', 'porter-5-forces.md', 'pestel.md', 'bcg-matrix.md', 'ansoff-matrix.md', 'value-chain.md', 'industry-lifecycle.md', 's-curve.md', 'perceptual-map.md', 'competitor-matrix.md', '4a-funnel.md', 'imc.md'])

async function scanFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8')
  const base = path.basename(filePath)
  const issues = []

  // 1. 检查"案例可追溯报告"覆盖
  const exampleHeaders = [...content.matchAll(/^### 示例[^\n]+/gm)]
  const traceabilityBlocks = [...content.matchAll(/> \*\*案例可追溯报告\*\*/g)]
  if (exampleHeaders.length > 0 && traceabilityBlocks.length < exampleHeaders.length) {
    issues.push({
      level: '🟠 严重',
      type: 'missing_traceability',
      detail: `${exampleHeaders.length} 个示例段, 仅 ${traceabilityBlocks.length} 个有可追溯报告`,
    })
  }

  // 2. 检查植愈坊标注
  const hasZhi = content.includes('植愈坊')
  const hasEduTag = /教学性虚拟|247 书贯穿|教学案例/.test(content)
  if (hasZhi && !hasEduTag) {
    issues.push({
      level: '🟠 严重',
      type: 'zhiyufang_not_tagged',
      detail: '植愈坊出现但未标"教学性虚拟案例"',
    })
  }

  // 3. 检查 SmallRig 硬塞 (Wave 3 致命)
  const smallrigCount = (content.match(/smallrig|斯莫格/gi) || []).length
  if (WAVE3_INTERNET_TOOLS.has(base) && smallrigCount > 0) {
    issues.push({
      level: '🔴 致命',
      type: 'wave3_internet_smallrig_fabrication',
      detail: `Wave 3 互联网工具硬塞 SmallRig ${smallrigCount} 次 (案例 PDF 不应有此内容, 必须删 SmallRig 改 Tier 3 抽象示例)`,
    })
  }
  if (WAVE3_MAP_STRUCTURE.has(base) && smallrigCount > 0) {
    issues.push({
      level: '🔴 致命',
      type: 'wave3_map_smallrig_fabrication',
      detail: `Wave 3 MAP-STRUCTURE 概念硬塞 SmallRig ${smallrigCount} 次 (需改 Tier 3 抽象)`,
    })
  }
  if (B_LAYER_NEEDS_TIER2.has(base) && smallrigCount > 0) {
    issues.push({
      level: '🟠 严重',
      type: 'b_layer_smallrig_likely_fabrication',
      detail: `B 层行业通用概念硬塞 SmallRig ${smallrigCount} 次 (高编造风险, 应改 Tier 2 经典案例)`,
    })
  }

  return { file: base, issues, smallrigCount }
}

function autoFix(content, base) {
  let fixed = content
  let changes = []

  // Fix 1: 植愈坊标注 — 在标题首次出现植愈坊时, 紧跟着加 blockquote
  if (content.includes('植愈坊')) {
    const hasEduTag = /教学性虚拟|247 书贯穿/.test(content)
    if (!hasEduTag) {
      // 找到第一个含"植愈坊"的 ### 示例 标题, 在其紧后插入教学标注
      fixed = fixed.replace(
        /(^### 示例[^\n]*植愈坊[^\n]*)\n/m,
        (match, header) => {
          if (header.includes('教学')) return match
          changes.push('added_zhiyufang_edu_tag')
          return `${header} (247 书贯穿教学案例)\n\n> **案例可追溯报告**: 植愈坊是 Seven 247 书全书贯穿的**教学性虚拟案例** (非真实商业体)。具体出处行号待 Codex 后续按 P0-4 模板填充, 当前仅标注教学属性。**禁止包装成"真实品牌成功案例"**。\n`
        }
      )
    }
  }

  // Fix 2: 给缺可追溯报告的示例段加 placeholder
  // 策略: 找每个 ### 示例 标题, 如果其下 5 行内没有 "> **案例可追溯报告**", 插入 placeholder
  const lines = fixed.split('\n')
  const newLines = []
  for (let i = 0; i < lines.length; i++) {
    newLines.push(lines[i])
    if (/^### 示例/.test(lines[i])) {
      // 看后续 5 行是否已有可追溯报告
      const window = lines.slice(i + 1, i + 6).join('\n')
      if (!window.includes('案例可追溯报告')) {
        // 自动判断模板
        let template
        if (/SmallRig|斯莫格/i.test(lines[i])) {
          template = `> **案例可追溯报告**: ⚠️ **待人工校对** — 本示例的 SmallRig 内容需逐字与 \`assets/_raw/cases/标杆案例/smallrig/*.md\` 真实页对照。如案例 PDF 中无对应内容, 必须按 P0-6 4 层 Fallback 改用 Tier 2 经典案例或 Tier 3 抽象示例, 禁止 LLM 编造 SmallRig 案例。`
        } else if (/植愈坊/.test(lines[i])) {
          template = `> **案例可追溯报告**: 植愈坊是 Seven 247 书全书贯穿的**教学性虚拟案例** (非真实商业体)。本示例内容来自 247 书相应章节的植愈坊推演 (具体行号待 Codex 后续按 P0-4 填充)。**禁止包装成"真实品牌成功案例"**。`
        } else {
          template = `> **案例可追溯报告**: ⚠️ **待人工分类** — 请按 P0-6 4 层 Fallback 决策树标注本案例性质 (Tier 1 真实案例 / Tier 2 行业经典 / Tier 3 抽象示例 / Tier 4 教学案例), 并补全 source 路径 + 行号。`
        }
        newLines.push('')
        newLines.push(template)
        changes.push('added_traceability_placeholder')
      }
    }
  }
  fixed = newLines.join('\n')

  return { fixed, changes }
}

async function main() {
  const files = (await fs.readdir(GOLDEN_DIR)).filter(f => f.endsWith('.md') && f !== 'INDEX.md')
  files.sort()

  const allResults = []
  let fixedCount = 0
  let totalChanges = 0

  for (const f of files) {
    const filePath = path.join(GOLDEN_DIR, f)
    const result = await scanFile(filePath)
    allResults.push(result)

    if (SHOULD_FIX && result.issues.length > 0) {
      const content = await fs.readFile(filePath, 'utf8')
      const { fixed, changes } = autoFix(content, f)
      if (changes.length > 0) {
        await fs.writeFile(filePath, fixed)
        fixedCount++
        totalChanges += changes.length
      }
    }
  }

  // 输出报告
  const severityCount = { '🔴 致命': 0, '🟠 严重': 0 }
  for (const r of allResults) {
    for (const iss of r.issues) severityCount[iss.level] = (severityCount[iss.level] || 0) + 1
  }

  let report = `# Lint Report · concepts-golden\n\n`
  report += `生成时间: ${new Date().toISOString()}\n\n`
  report += `## 总览\n\n`
  report += `- 扫描文件: ${files.length}\n`
  report += `- 有问题文件: ${allResults.filter(r => r.issues.length > 0).length}\n`
  report += `- 🔴 致命问题数: ${severityCount['🔴 致命']}\n`
  report += `- 🟠 严重问题数: ${severityCount['🟠 严重']}\n`
  if (SHOULD_FIX) {
    report += `- ✅ 自动修复文件: ${fixedCount} (共 ${totalChanges} 处变更)\n`
  }
  report += `\n## 致命问题 (必须人工修)\n\n`
  for (const r of allResults) {
    const critical = r.issues.filter(i => i.level === '🔴 致命')
    if (critical.length > 0) {
      report += `### ${r.file}\n`
      for (const i of critical) report += `- ${i.type}: ${i.detail}\n`
      report += '\n'
    }
  }
  report += `\n## 严重问题\n\n`
  for (const r of allResults) {
    const serious = r.issues.filter(i => i.level === '🟠 严重')
    if (serious.length > 0) {
      report += `### ${r.file}\n`
      for (const i of serious) report += `- ${i.type}: ${i.detail}\n`
      report += '\n'
    }
  }
  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true })
  await fs.writeFile(REPORT_PATH, report)

  console.log(`[lint] Scanned ${files.length} files`)
  console.log(`[lint] 🔴 致命: ${severityCount['🔴 致命']}, 🟠 严重: ${severityCount['🟠 严重']}`)
  if (SHOULD_FIX) console.log(`[lint] ✅ Auto-fixed ${fixedCount} files (${totalChanges} changes)`)
  console.log(`[lint] Report: ${path.relative(REPO_ROOT, REPORT_PATH)}`)
}

main().catch(e => { console.error(e); process.exit(1) })
