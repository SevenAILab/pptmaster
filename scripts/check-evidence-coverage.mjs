#!/usr/bin/env node
import fs from 'node:fs/promises'
import { reportEvidenceCoverage } from './evidence-coverage.mjs'

const DEFAULT_MIN_RATIO = 0.25 // 定位案约 1/4 页由研究 agent 驱动，作为 warn 下限

async function main() {
  const args = process.argv.slice(2)
  const deckPath = args.find(a => !a.startsWith('--'))
  const minArg = args.find(a => a.startsWith('--min-ratio='))
  const minRatio = minArg ? Number(minArg.split('=')[1]) : DEFAULT_MIN_RATIO
  if (!deckPath) {
    console.error('Usage: node scripts/check-evidence-coverage.mjs <deck.json> [--min-ratio=0.25]')
    process.exit(1)
  }
  const deck = JSON.parse(await fs.readFile(deckPath, 'utf8'))
  const report = reportEvidenceCoverage(deck)
  console.log(`证据覆盖度: ${report.pages_with_web_ref}/${report.total_pages} 页带网络来源 (web_ref_ratio=${report.web_ref_ratio})`)
  console.log(`带任意来源: ${report.pages_with_any_ref}/${report.total_pages}; 无任何来源页: [${report.pages_without_any_ref.join(', ')}]`)
  if (report.web_ref_ratio < minRatio) {
    console.warn(`⚠️  web_ref_ratio ${report.web_ref_ratio} < 下限 ${minRatio}：该稿网络真数字偏少，建议复核研究 agent 是否真跑/上游证据是否下沉。`)
  }
  process.exit(0) // warn-only：始终 exit 0，不阻断流水线
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
