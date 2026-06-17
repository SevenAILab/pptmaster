import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const fieldsPath = path.join(REPO_ROOT, 'assets', 'content', 'renderable-fields.json')
const renderableFields = JSON.parse(readFileSync(fieldsPath, 'utf8'))

export function isProductionField(key) {
  const normalized = String(key || '').toLowerCase()
  return normalized === 'note'
    || normalized === 'notes'
    || normalized === 'offline'
    || normalized.endsWith('_note')
    || normalized.startsWith('layout_')
    || normalized.startsWith('production')
    || normalized.includes('production_')
}

export function renderableFieldsForKind(kind) {
  const fields = renderableFields[kind]
  if (!fields) throw new Error(`renderable fields missing for kind: ${kind}`)
  return [...fields]
}

function sanitizeValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !isProductionField(key))
        .map(([key, child]) => [key, sanitizeValue(child)]),
    )
  }
  return value
}

export function sanitizeRenderableContent(kind, content = {}) {
  const allowed = new Set(renderableFieldsForKind(kind))
  return Object.fromEntries(
    Object.entries(content || {})
      .filter(([key]) => allowed.has(key) && !isProductionField(key))
      .map(([key, value]) => [key, sanitizeValue(value)]),
  )
}

export function renderableFieldMap() {
  return JSON.parse(JSON.stringify(renderableFields))
}
