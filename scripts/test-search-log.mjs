import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { SearchLogger } from './search-log.mjs'

const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pptagent-search-log-'))
const logger = new SearchLogger(outputDir)

await logger.load()
logger.log({
  agent_id: 'industry_analysis',
  query: '新能源汽车市场规模',
  engine: 'tavily',
  cost_usd: 0.0001,
  result_count: 5,
  cache_hit: false,
  results_summary: ['A', 'B'],
})
logger.log({
  agent_id: 'competitor_analysis',
  query: 'SmallRig 斯莫格 最近动态',
  engine: 'serper',
  cost_usd: 0.0003,
  result_count: 5,
  cache_hit: true,
  results_summary: ['C'],
})

const saved = await logger.save()
assert.equal(saved.total_searches, 2)
assert.equal(saved.total_cost_usd, 0.0004)
assert.equal(saved.cache_hit_rate, 0.5)

const reloaded = new SearchLogger(outputDir)
await reloaded.load()
assert.equal(reloaded.entries.length, 2)

await fs.rm(outputDir, { recursive: true, force: true })
console.log('✅ search-log test passed')
