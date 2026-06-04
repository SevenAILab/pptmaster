import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export class SearchLogger {
  constructor(outputDir) {
    this.outputDir = outputDir
    this.logPath = path.join(outputDir, 'search-log.json')
    this.entries = []
  }

  async load() {
    try {
      const data = JSON.parse(await fs.readFile(this.logPath, 'utf8'))
      this.entries = data.entries || []
    } catch {
      this.entries = []
    }
  }

  log({ agent_id, query, engine, cost_usd, result_count, cache_hit, results_summary }) {
    this.entries.push({
      agent_id,
      query,
      engine,
      cost_usd,
      result_count,
      cache_hit,
      results_summary,
      timestamp: new Date().toISOString(),
    })
  }

  async save() {
    await fs.mkdir(this.outputDir, { recursive: true })
    const totalCost = this.entries.reduce((sum, entry) => sum + (entry.cost_usd || 0), 0)
    const totalSearches = this.entries.length
    const cacheHits = this.entries.filter(entry => entry.cache_hit).length
    const output = {
      total_searches: totalSearches,
      total_cost_usd: Number(totalCost.toFixed(6)),
      cache_hit_rate: totalSearches > 0 ? cacheHits / totalSearches : 0,
      entries: this.entries,
    }

    await fs.writeFile(this.logPath, JSON.stringify(output, null, 2))
    return output
  }
}

async function cliMain() {
  const logPath = process.argv[2]
  if (!logPath) {
    console.error('Usage: node scripts/search-log.mjs <path-to-search-log.json>')
    process.exit(1)
  }

  const data = JSON.parse(await fs.readFile(logPath, 'utf8'))
  console.log(`Total searches:  ${data.total_searches}`)
  console.log(`Total cost USD:  $${data.total_cost_usd.toFixed(4)}`)
  console.log(`Cache hit rate:  ${(data.cache_hit_rate * 100).toFixed(1)}%`)
  console.log('\nBy agent:')

  const byAgent = {}
  for (const entry of data.entries) {
    byAgent[entry.agent_id] = (byAgent[entry.agent_id] || 0) + 1
  }
  for (const [agent, count] of Object.entries(byAgent)) {
    console.log(`  ${agent}: ${count}`)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
