import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readTraces } from './trace-log.mjs'

function formatRefs(refs) {
  if (!Array.isArray(refs) || refs.length === 0) return '（无）'
  return refs.map(ref => {
    if (typeof ref === 'string') return ref
    const chars = Number.isFinite(Number(ref?.chars)) ? `(${ref.chars}字)` : ''
    return `${ref?.ref || 'unknown'}${chars}`
  }).join('、')
}

export function buildBlackboxReport(runDir) {
  const resolvedRunDir = path.resolve(runDir)
  const traces = readTraces(resolvedRunDir)
  const lines = [
    '# Agent 黑箱：方案是怎么一步步做出来的',
    '',
    `运行目录：\`${resolvedRunDir}\``,
    '',
  ]

  if (traces.length === 0) {
    lines.push('尚未找到 trace 记录。')
  }

  for (const trace of traces) {
    lines.push(`## 第 ${trace.seq} 步 · ${trace.step}`)
    if (trace.note) lines.push(`- 做了什么：${trace.note}`)
    if (trace.injected?.skill) {
      lines.push(`- 注入的 skill 方法论：**${trace.injected.skill}** → ${formatRefs(trace.injected.refs)}`)
    } else {
      lines.push('- 注入的 skill 方法论：无')
    }
    if (trace.output) lines.push(`- 产出：\`${JSON.stringify(trace.output)}\``)
    if (trace.timestamp) lines.push(`- 时间：${trace.timestamp}`)
    lines.push('')
  }

  const artifacts = [
    'research-brief.json',
    'methodology-selection.json',
    'outline.json',
    'deck.json',
    'deck.designed.json',
    'deck.freeform.html',
    'methodology-usage.json',
    'critic-rounds.json',
    'process-locks.json',
    'audit-visual.txt',
  ].filter(file => fs.existsSync(path.join(resolvedRunDir, file)))

  if (artifacts.length) {
    lines.push('## 落盘产物（可逐个打开核对）')
    lines.push(...artifacts.map(file => `- \`${file}\``))
    lines.push('')
  }

  return lines.join('\n')
}

function cliMain() {
  const runDir = process.argv[2]
  if (!runDir) {
    console.error('Usage: node scripts/blackbox-report.mjs <run-dir>')
    process.exit(2)
  }
  const resolvedRunDir = path.resolve(runDir)
  const md = buildBlackboxReport(resolvedRunDir)
  const outPath = path.join(resolvedRunDir, 'blackbox-report.md')
  fs.writeFileSync(outPath, md)
  console.log(`✅ 黑箱报告 -> ${outPath}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain()
}
