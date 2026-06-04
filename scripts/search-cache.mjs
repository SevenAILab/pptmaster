import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_DIR = path.join(REPO_ROOT, '.cache/web-search')
const TTL_MS = 24 * 60 * 60 * 1000

function makeKey(query, opts = {}) {
  const normalized = JSON.stringify({
    query: String(query).trim().toLowerCase(),
    opts: { ...opts, engine: opts.engine || 'auto' },
  })
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16)
}

export async function withCache(query, opts, fn) {
  const key = makeKey(query, opts)
  const file = path.join(CACHE_DIR, `${key}.json`)

  try {
    const cached = JSON.parse(await fs.readFile(file, 'utf8'))
    if (Date.now() - cached.timestamp < TTL_MS) {
      return { ...cached.data, _cacheHit: true }
    }
  } catch {
    // Cache miss, stale entry, or invalid JSON: fetch fresh data.
  }

  const data = await fn()
  const dataWithFlag = { ...data, _cacheHit: false }
  await fs.mkdir(CACHE_DIR, { recursive: true })
  await fs.writeFile(file, JSON.stringify({ timestamp: Date.now(), query, opts, data }, null, 2))
  return dataWithFlag
}

export async function clearCache() {
  await fs.rm(CACHE_DIR, { recursive: true, force: true })
}

export async function cacheStats() {
  try {
    const files = await fs.readdir(CACHE_DIR)
    let totalSize = 0
    for (const file of files) {
      const stat = await fs.stat(path.join(CACHE_DIR, file))
      totalSize += stat.size
    }
    return { entries: files.length, sizeKB: Math.round(totalSize / 1024) }
  } catch {
    return { entries: 0, sizeKB: 0 }
  }
}
