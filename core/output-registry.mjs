function normalizeTransformer(transformer) {
  if (!transformer || typeof transformer !== 'object') throw new Error('transformer must be an object')
  const type = String(transformer.type || '').trim()
  if (!type) throw new Error('transformer.type is required')
  if (typeof transformer.render !== 'function') throw new Error(`${type} transformer requires render`)
  return {
    type,
    visibility_filter: [...(transformer.visibility_filter || ['external'])],
    module_allowlist: [...(transformer.module_allowlist || [])],
    render: transformer.render,
  }
}

export function createOutputRegistry() {
  const transformers = new Map()
  return {
    register(transformer) {
      const normalized = normalizeTransformer(transformer)
      if (transformers.has(normalized.type)) throw new Error(`duplicate transformer: ${normalized.type}`)
      transformers.set(normalized.type, normalized)
      return normalized
    },
    get(type) {
      const transformer = transformers.get(type)
      if (!transformer) throw new Error(`unknown transformer: ${type}`)
      return transformer
    },
    list() {
      return [...transformers.keys()]
    },
    filterForOutput(content, type) {
      const transformer = this.get(type)
      const visibilityFilter = new Set(transformer.visibility_filter || [])
      const allowlist = new Set(transformer.module_allowlist || [])
      return (content.modules || []).filter(module => (
        visibilityFilter.has(module.visibility)
        && (allowlist.size === 0 || allowlist.has(module.kind))
      ))
    },
  }
}

const globalRegistry = createOutputRegistry()

export function registerTransformer(transformer) {
  return globalRegistry.register(transformer)
}

export function getTransformer(type) {
  return globalRegistry.get(type)
}

export function listTransformers() {
  return globalRegistry.list()
}

export function filterForOutput(content, type) {
  return globalRegistry.filterForOutput(content, type)
}
