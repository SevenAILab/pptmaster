import assert from 'node:assert/strict'
import { addModule, createBrandContent } from '../core/content-model.mjs'
import {
  createOutputRegistry,
  filterForOutput,
  getTransformer,
  listTransformers,
  registerTransformer,
} from '../core/output-registry.mjs'

const registry = createOutputRegistry()
registry.register({
  type: 'brand-book',
  visibility_filter: ['external'],
  module_allowlist: ['brand_definition', 'strategy_core'],
  render: content => ({ html: `<n>${registry.filterForOutput(content, 'brand-book').length}</n>` }),
})
assert.throws(() => registry.register({
  type: 'brand-book',
  visibility_filter: ['external'],
  module_allowlist: [],
  render: () => ({}),
}), /duplicate transformer/i)

let content = createBrandContent({ brand_slug: 'd', brand_type: 'strategy_charter' })
content = addModule(content, { id: 'a', kind: 'brand_definition', visibility: 'external', content: {} })
content = addModule(content, { id: 'b', kind: 'risk_check', visibility: 'internal', content: {} })
content = addModule(content, { id: 'c', kind: 'proof_growth', visibility: 'review', content: {} })

assert.equal(registry.filterForOutput(content, 'brand-book').length, 1)
assert.deepEqual(registry.list(), ['brand-book'])
assert.equal(registry.get('brand-book').render(content).html, '<n>1</n>')
assert.throws(() => registry.get('nope'), /unknown transformer/i)

registerTransformer({
  type: 'test-output',
  visibility_filter: ['external'],
  module_allowlist: ['brand_definition'],
  render: contentForRender => ({ count: filterForOutput(contentForRender, 'test-output').length }),
})
assert.ok(listTransformers().includes('test-output'))
assert.equal(getTransformer('test-output').render(content).count, 1)

console.log('✅ output-registry tests passed')
