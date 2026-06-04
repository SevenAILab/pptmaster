import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PROMPTS_DIR = path.join(REPO_ROOT, 'prompts')
const REPORT = path.join(REPO_ROOT, 'docs/audit-claude-specific.md')

const CLAUDE_SPECIFIC_PATTERNS = [
  { pattern: /<thinking>/g, name: 'thinking 标签' },
  { pattern: /<example>/g, name: 'example XML 标签' },
  { pattern: /<system>/g, name: 'system XML 标签' },
  { pattern: /artifacts?/gi, name: 'artifacts 概念' },
  { pattern: /Claude Code|Claude 工具/g, name: 'Claude Code 特定引用' },
  { pattern: /Anthropic XML/g, name: 'Anthropic XML 风格' },
]

export function scanContent(content) {
  const findings = []
  for (const { pattern, name } of CLAUDE_SPECIFIC_PATTERNS) {
    const matches = [...content.matchAll(pattern)].map(match => match[0])
    if (matches.length > 0) {
      findings.push({
        pattern: name,
        count: matches.length,
        examples: matches.slice(0, 3),
      })
    }
  }
  return findings
}

export function summarizeFindings(fileFindings) {
  return {
    totalFilesWithFindings: fileFindings.length,
    totalFindingKinds: fileFindings.reduce((sum, item) => sum + item.findings.length, 0),
    totalMatches: fileFindings.reduce(
      (sum, item) => sum + item.findings.reduce((innerSum, finding) => innerSum + finding.count, 0),
      0,
    ),
  }
}

async function scanFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8')
  return scanContent(content)
}

async function walk(dir) {
  const files = []
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await walk(full))
    else if (entry.name.endsWith('.md')) files.push(full)
  }
  return files.sort()
}

function renderReport(files, fileFindings) {
  const summary = summarizeFindings(fileFindings)
  const lines = [
    '# Audit · Claude 特有特性扫描',
    '',
    `生成时间: ${new Date().toISOString()}`,
    '',
  ]

  for (const item of fileFindings) {
    lines.push(`## ${path.relative(REPO_ROOT, item.file)}`, '')
    for (const finding of item.findings) {
      lines.push(`- 🔴 ${finding.pattern} × ${finding.count}`)
      lines.push(`  - 示例: ${finding.examples.map(example => `\`${example}\``).join(', ')}`)
    }
    lines.push('')
  }

  lines.push('## 总结', '')
  lines.push(`- 扫描文件: ${files.length}`)
  lines.push(`- 含问题文件: ${summary.totalFilesWithFindings}`)
  lines.push(`- 发现问题类型: ${summary.totalFindingKinds}`)
  lines.push(`- 命中总数: ${summary.totalMatches}`)
  if (summary.totalMatches === 0) {
    lines.push('', '✅ **所有 prompts 已 100% 模型无关**')
  }

  return lines.join('\n')
}

export async function auditPrompts() {
  const files = await walk(PROMPTS_DIR)
  const fileFindings = []
  for (const file of files) {
    const findings = await scanFile(file)
    if (findings.length > 0) fileFindings.push({ file, findings })
  }

  const report = renderReport(files, fileFindings)
  await fs.mkdir(path.dirname(REPORT), { recursive: true })
  await fs.writeFile(REPORT, report)

  return {
    files,
    fileFindings,
    summary: summarizeFindings(fileFindings),
    reportPath: REPORT,
  }
}

async function cliMain() {
  const result = await auditPrompts()
  console.log(`[audit] Scanned ${result.files.length} files, found ${result.summary.totalMatches} Claude-specific matches`)
  console.log(`[audit] Report: ${path.relative(REPO_ROOT, result.reportPath)}`)
  process.exit(result.summary.totalMatches === 0 ? 0 : 1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
