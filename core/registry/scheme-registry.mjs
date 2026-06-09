import fs from 'node:fs'
import path from 'node:path'

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function uniq(values) {
  return [...new Set(values)].filter(Boolean)
}

export function loadSchemeRegistry({ root, fallbackBlueprints = {}, fallbackWorkers = {} } = {}) {
  if (!root) throw new Error('loadSchemeRegistry requires root')

  const blueprintsByType = {}
  const workersById = {}
  const schemesDir = path.join(root, 'schemes')

  if (fs.existsSync(schemesDir)) {
    for (const scheme of fs.readdirSync(schemesDir).sort()) {
      const schemeDir = path.join(schemesDir, scheme)
      if (!fs.statSync(schemeDir).isDirectory()) continue

      const manifestPath = path.join(schemeDir, 'manifest.json')
      if (fs.existsSync(manifestPath)) {
        const manifest = readJson(manifestPath)
        for (const blueprint of manifest.blueprints || []) {
          if (blueprint.scheme_type && blueprint.path) {
            blueprintsByType[blueprint.scheme_type] = blueprint.path
          }
        }
      }

      const workersPath = path.join(schemeDir, 'workers.json')
      if (fs.existsSync(workersPath)) {
        const workers = readJson(workersPath)
        for (const [workerId, config] of Object.entries(workers)) {
          workersById[workerId] = config
        }
      }
    }
  }

  function resolveBlueprintPath(schemeType) {
    if (blueprintsByType[schemeType]) {
      return { path: blueprintsByType[schemeType], source: 'manifest' }
    }
    if (fallbackBlueprints[schemeType]) {
      return { path: fallbackBlueprints[schemeType], source: 'fallback' }
    }
    const known = uniq([...Object.keys(blueprintsByType), ...Object.keys(fallbackBlueprints)])
    throw new Error(`Unknown scheme_type: ${schemeType}. Known: ${known.join(', ')}`)
  }

  function resolveWorker(workerId) {
    if (workersById[workerId]) {
      return { ...workersById[workerId], source: 'manifest' }
    }
    if (fallbackWorkers[workerId]) {
      return { ...fallbackWorkers[workerId], source: 'fallback' }
    }
    const known = uniq([...Object.keys(workersById), ...Object.keys(fallbackWorkers)])
    throw new Error(`Unknown worker_id: ${workerId}. Known: ${known.join(', ')}`)
  }

  return {
    resolveBlueprintPath,
    resolveWorker,
    listSchemeTypes: () => Object.keys(blueprintsByType),
    listWorkers: () => Object.keys(workersById),
  }
}
