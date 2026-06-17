import fs from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCHEMA_PATH = path.join(REPO_ROOT, 'schemas', 'brand-system-content.schema.json')
const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'))

export const BRAND_TYPES = Object.freeze([
  'strategy_charter',
  'new_consumer_full',
  'brand_asset_story',
  'lifestyle_ops',
  'worldview_visual',
])

export const MODULE_KINDS = Object.freeze([
  'brand_entry',
  'market_context',
  'brand_definition',
  'audience_scenarios',
  'strategy_core',
  'narrative_system',
  'product_system',
  'visual_direction',
  'proof_growth',
  'personality_statement',
  'personality_playbook',
  'risk_check',
  'founder_fit',
  'research_note',
])

export const VISIBILITIES = Object.freeze(['external', 'internal', 'review'])
export const DEPTH_LEVELS = Object.freeze(['L1', 'L2', 'L3', 'L4'])

const OUTPUT_TYPES = new Set(['brand-book', 'independent-site'])
const DOCUMENT_TYPES = new Set(['brand_manual', 'whitepaper', 'investment_brand_book', 'internal_brand_playbook'])
const AUDIENCE_TYPES = new Set(['consumer', 'partner', 'media', 'franchisee', 'internal_team', 'investor'])
const BRAND_TYPE_SET = new Set(BRAND_TYPES)
const MODULE_KIND_SET = new Set(MODULE_KINDS)
const VISIBILITY_SET = new Set(VISIBILITIES)
const DEPTH_LEVEL_SET = new Set(DEPTH_LEVELS)

function nowIso() {
  return new Date().toISOString()
}

function pathLabel(parts) {
  return parts.length ? parts.join('.') : '$'
}

function matchesType(value, expected) {
  if (Array.isArray(expected)) return expected.some(type => matchesType(value, type))
  if (expected === 'array') return Array.isArray(value)
  if (expected === 'null') return value === null
  if (expected === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value)
  if (expected === 'number') return typeof value === 'number' && Number.isFinite(value)
  return typeof value === expected
}

function validateAgainstSchema(value, node, parts = []) {
  const errors = []
  if (!node || typeof node !== 'object') return errors

  if (node.type && !matchesType(value, node.type)) {
    errors.push(`${pathLabel(parts)} invalid type`)
    return errors
  }

  if (node.enum && !node.enum.includes(value)) {
    errors.push(`${pathLabel(parts)} invalid enum value`)
  }

  if (typeof value === 'number') {
    if (typeof node.minimum === 'number' && value < node.minimum) errors.push(`${pathLabel(parts)} below minimum`)
    if (typeof node.maximum === 'number' && value > node.maximum) errors.push(`${pathLabel(parts)} above maximum`)
  }

  if (matchesType(value, 'object')) {
    for (const requiredKey of node.required || []) {
      if (!Object.prototype.hasOwnProperty.call(value, requiredKey)) {
        errors.push(`${pathLabel([...parts, requiredKey])} required`)
      }
    }
    for (const [key, child] of Object.entries(node.properties || {})) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        errors.push(...validateAgainstSchema(value[key], child, [...parts, key]))
      }
    }
  }

  if (Array.isArray(value) && node.items) {
    value.forEach((item, index) => {
      errors.push(...validateAgainstSchema(item, node.items, [...parts, String(index)]))
    })
  }

  return errors
}

function assertTopLevelShape(content) {
  const missing = (schema.required || []).filter(key => !Object.prototype.hasOwnProperty.call(content || {}, key))
  if (missing.length) {
    throw new Error(`invalid BrandSystemContent: required ${missing.join(', ')}`)
  }
}

function assertEnum(value, allowed, label) {
  if (!allowed.has(value)) throw new Error(`invalid ${label}: ${value}`)
}

function normalizeModule(module) {
  if (!module || typeof module !== 'object' || Array.isArray(module)) throw new Error('module must be an object')
  if (!module.id) throw new Error('module.id is required')
  assertEnum(module.kind, MODULE_KIND_SET, 'module kind')
  assertEnum(module.visibility, VISIBILITY_SET, 'module visibility')
  if (module.content === null || typeof module.content !== 'object' || Array.isArray(module.content)) {
    throw new Error('module.content must be an object')
  }
  if (module.depth_level && !DEPTH_LEVEL_SET.has(module.depth_level)) {
    throw new Error(`invalid depth_level: ${module.depth_level}`)
  }
  return {
    evidence_refs: [],
    depth_level: 'L2',
    spine_alignment: '',
    ...module,
  }
}

export function createBrandContent({
  brand_slug,
  brand_type,
  document_type = 'brand_manual',
  audience = [],
  output_types_selected = [],
  intake_sufficiency = 0,
  tonality = {},
} = {}) {
  if (!brand_slug) throw new Error('brand_slug is required')
  assertEnum(brand_type, BRAND_TYPE_SET, 'brand_type')
  assertEnum(document_type, DOCUMENT_TYPES, 'document_type')
  for (const audienceType of audience) assertEnum(audienceType, AUDIENCE_TYPES, 'audience')
  for (const outputType of output_types_selected) assertEnum(outputType, OUTPUT_TYPES, 'output type')

  return {
    meta: {
      brand_slug,
      created_at: nowIso(),
      document_type,
      brand_type,
      audience: [...audience],
      output_types_selected: [...output_types_selected],
      intake_sufficiency,
    },
    strategic_spine: {
      positioning_statement: '',
      mission: '',
      vision: '',
      proposition: '',
      chosen_direction_id: null,
      locked: false,
      locked_at: null,
    },
    tonality: {
      keywords: [...(tonality.keywords || [])],
      reference_brands: [...(tonality.reference_brands || [])],
      source: tonality.source || 'qa',
      ...(tonality.palette ? { palette: { ...tonality.palette } } : {}),
    },
    modules: [],
  }
}

export function validateBrandContent(content) {
  assertTopLevelShape(content)
  const errors = validateAgainstSchema(content, schema)
  return { valid: errors.length === 0, errors }
}

export function addModule(content, module) {
  const normalized = normalizeModule(module)
  if ((content.modules || []).some(existing => existing.id === normalized.id)) {
    throw new Error(`duplicate module id: ${normalized.id}`)
  }
  const next = {
    ...content,
    modules: [...(content.modules || []), normalized],
  }
  const validation = validateBrandContent(next)
  if (!validation.valid) throw new Error(`invalid BrandSystemContent: ${validation.errors.join('; ')}`)
  return next
}

export function externalModules(content) {
  return (content.modules || []).filter(module => module.visibility === 'external')
}

export function internalModules(content) {
  return (content.modules || []).filter(module => module.visibility === 'internal')
}

export function lockSpine(content, {
  chosen_direction_id,
  positioning_statement,
  mission,
  vision,
  proposition,
} = {}) {
  if (content.strategic_spine?.locked) throw new Error('strategic spine already locked')
  return {
    ...content,
    strategic_spine: {
      ...content.strategic_spine,
      chosen_direction_id: chosen_direction_id || content.strategic_spine?.chosen_direction_id || null,
      positioning_statement: positioning_statement ?? content.strategic_spine?.positioning_statement ?? '',
      mission: mission ?? content.strategic_spine?.mission ?? '',
      vision: vision ?? content.strategic_spine?.vision ?? '',
      proposition: proposition ?? content.strategic_spine?.proposition ?? '',
      locked: true,
      locked_at: nowIso(),
    },
  }
}

export async function readContent(filePath) {
  const content = JSON.parse(await fs.readFile(filePath, 'utf8'))
  const validation = validateBrandContent(content)
  if (!validation.valid) throw new Error(`invalid BrandSystemContent: ${validation.errors.join('; ')}`)
  return content
}

export async function writeContent(filePath, content) {
  const validation = validateBrandContent(content)
  if (!validation.valid) throw new Error(`invalid BrandSystemContent: ${validation.errors.join('; ')}`)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(content, null, 2))
}
