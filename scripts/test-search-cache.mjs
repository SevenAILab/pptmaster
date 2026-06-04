import assert from 'node:assert/strict'
import { withCache, clearCache, cacheStats } from './search-cache.mjs'

await clearCache()

let calls = 0
const fakeFetch = async () => {
  calls += 1
  return { answer: 'fake result' }
}

const r1 = await withCache('query1', { engine: 'tavily' }, fakeFetch)
assert.equal(calls, 1)
assert.equal(r1.answer, 'fake result')
assert.equal(r1._cacheHit, false)

const r2 = await withCache('query1', { engine: 'tavily' }, fakeFetch)
assert.equal(calls, 1, 'Should not call again')
assert.equal(r2.answer, 'fake result')
assert.equal(r2._cacheHit, true)

const r3 = await withCache('query2', { engine: 'tavily' }, fakeFetch)
assert.equal(calls, 2)
assert.equal(r3._cacheHit, false)

const stats = await cacheStats()
assert.equal(stats.entries, 2)
assert.ok(stats.sizeKB >= 0)

console.log('✅ search-cache test passed')
