import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lintDeck } from './content-discipline.mjs'

async function cliMain() {
  const args = process.argv.slice(2)
  const inputJson = args.filter(a => !a.startsWith('--'))[0]
  const slugArg = args.find(a => a.startsWith('--slug='))
  if (!inputJson) {
    console.error('Usage: node scripts/check-content-discipline.mjs <deck.json> [--slug=<slug>]')
    process.exit(1)
  }
  const slug = slugArg ? slugArg.slice('--slug='.length) : undefined
  const data = JSON.parse(await fs.readFile(inputJson, 'utf8'))
  const result = lintDeck(data, slug ? { slug } : {})
  for (const w of result.warnings) console.warn(`⚠️  ${w}`)
  if (result.violations.length) {
    console.error(`\n❌ 内容纪律红线违规 ${result.violations.length} 条：`)
    for (const v of result.violations) console.error(`  - ${v}`)
    process.exit(1)
  }
  console.log(`✅ 内容纪律检查通过：${(data.slides || []).length} 页，0 违规，${result.warnings.length} 条警告`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
