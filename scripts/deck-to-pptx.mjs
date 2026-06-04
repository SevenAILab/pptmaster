import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const DEFAULT_HTML2PPT_DIR = '/Users/seven/Downloads/html2ppt-sales-tool-v26.1.1'

// 定位外部转换器入口；找不到就抛错（红线：不静默兜底）。
export function resolveTool(env = process.env) {
  const dir = env.HTML2PPT_DIR || DEFAULT_HTML2PPT_DIR
  const entry = path.join(dir, '99-runtime-do-not-edit', 'bin', 'html-to-pptx.js')
  if (!fs.existsSync(entry)) {
    throw new Error(`未找到 html2ppt 转换器: ${entry}。请设置环境变量 HTML2PPT_DIR 指向工具目录。`)
  }
  return entry
}

// HTML 里的真 <table> 数 = 期望的原生 PPT 表格数。
export function countDesignTables(html) {
  return (html.match(/<table[\s>]/g) || []).length
}

// 从转换器写的 *_转换报告.md 里解析原生表格数；缺这行就抛错（无法校验=不合格）。
export function parseNativeTableCount(reportMarkdown) {
  const match = reportMarkdown.match(/Native PowerPoint tables:\s*(\d+)/)
  if (!match) throw new Error('转换报告缺少 "Native PowerPoint tables" 统计，无法校验表格完整性')
  return Number(match[1])
}

// 在输出目录里按后缀找转换报告；找不到=转换未完成=抛错。
export function findReportFile(outDir) {
  const files = fs.readdirSync(outDir)
  const report = files.find(file => file.endsWith('_转换报告.md'))
  if (!report) throw new Error(`输出目录未找到 *_转换报告.md：${outDir}（转换可能未完成）`)
  return path.join(outDir, report)
}

// 唯一的合格判定：退出码必须为 0，原生表格数不得少于设计真表格数。
export function assertConversionIntegrity({ exitCode, designTables, nativeTables }) {
  if (exitCode !== 0) {
    throw new Error(`html2ppt 转换失败，退出码 ${exitCode}（红线：失败必抛错，不静默兜底）`)
  }
  if (nativeTables < designTables) {
    throw new Error(`原生表格数(${nativeTables}) < 设计真表格数(${designTables})，疑似丢表，转换不合格（红线：不接受降级产物）`)
  }
  return true
}

// 默认 runner：真子进程调用外部转换器，显式锁定 --selector ".S"。
function defaultRunner(entry, htmlPath, outDir) {
  const result = spawnSync(
    process.execPath,
    [entry, htmlPath, '--out', outDir, '--selector', '.S', '--no-open'],
    { stdio: 'inherit' },
  )
  return typeof result.status === 'number' ? result.status : 1
}

// 渲染好的 .S HTML -> 可编辑 PPTX；护栏校验后返回产物路径。
// runner / env 可注入，便于单测（不触发真 playwright）。
export function deckToPptx({ htmlPath, outDir, runner = defaultRunner, env = process.env }) {
  const entry = resolveTool(env)
  fs.mkdirSync(outDir, { recursive: true })
  const html = fs.readFileSync(htmlPath, 'utf8')
  const designTables = countDesignTables(html)

  const exitCode = runner(entry, htmlPath, outDir)
  let nativeTables = 0
  let reportPath = null
  if (exitCode === 0) {
    reportPath = findReportFile(outDir)
    nativeTables = parseNativeTableCount(fs.readFileSync(reportPath, 'utf8'))
  }
  assertConversionIntegrity({ exitCode, designTables, nativeTables })

  const files = fs.readdirSync(outDir)
  const recommended = files.find(file => file.endsWith('_推荐可编辑版.pptx'))
  return {
    recommended: recommended ? path.join(outDir, recommended) : null,
    report: reportPath,
    designTables,
    nativeTables,
  }
}

function cliMain() {
  const [htmlPath, outDir] = process.argv.slice(2).filter(arg => !arg.startsWith('--'))
  if (!htmlPath || !outDir) {
    console.error('Usage: node scripts/deck-to-pptx.mjs <deck.html> <outDir>')
    process.exit(1)
  }
  const result = deckToPptx({ htmlPath: path.resolve(htmlPath), outDir: path.resolve(outDir) })
  console.log(`[deck:pptx] 设计真表格=${result.designTables} 原生PPT表格=${result.nativeTables}`)
  console.log(`[deck:pptx] 推荐可编辑版: ${result.recommended}`)
  console.log(`[deck:pptx] 转换报告: ${result.report}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    cliMain()
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
