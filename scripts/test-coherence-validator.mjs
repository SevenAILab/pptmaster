import assert from 'node:assert/strict'
import { addModule, createBrandContent } from '../core/content-model.mjs'
import { assertCoherence, validateCoherence } from '../validators/coherence-validator.mjs'

let content = createBrandContent({ brand_slug: 'demo', brand_type: 'new_consumer_full' })
content = {
  ...content,
  strategic_spine: {
    positioning_statement: '品质便捷',
    mission: 'm',
    vision: 'v',
    proposition: 'p',
    locked: true,
    locked_at: '2026-06-18T00:00:00.000Z',
    chosen_direction_id: 'd1',
  },
}
content = addModule(content, {
  id: 'm1',
  kind: 'product_system',
  visibility: 'external',
  depth_level: 'L4',
  content: { body: '围绕品质做爆品，并把便捷交付做成可感知体验。' },
  spine_alignment: '承接品质便捷定位',
})

let result = validateCoherence(content)
assert.equal(result.ok, true, result.violations.map(v => v.reason).join('\n'))
assert.doesNotThrow(() => assertCoherence(content))

content = addModule(content, {
  id: 'm2',
  kind: 'narrative_system',
  visibility: 'external',
  depth_level: 'L1',
  content: { body: '我们追求性价比和低价。' },
  spine_alignment: '',
})
result = validateCoherence(content)
assert.equal(result.ok, false)
assert.ok(result.violations.some(v => v.id === 'm2' && /spine_alignment|深度|可互换/.test(v.reason)))
assert.throws(() => assertCoherence(content), /coherence gate failed/i)

let conflict = createBrandContent({ brand_slug: 'demo', brand_type: 'new_consumer_full' })
conflict = { ...conflict, strategic_spine: { ...content.strategic_spine } }
conflict = addModule(conflict, {
  id: 'a',
  kind: 'market_context',
  visibility: 'external',
  depth_level: 'L3',
  content: { body: '品质市场规模 30亿元，便捷渠道增长。' },
  spine_alignment: '品质便捷',
})
conflict = addModule(conflict, {
  id: 'b',
  kind: 'proof_growth',
  visibility: 'external',
  depth_level: 'L3',
  content: { body: '品质市场规模 50亿元，便捷渠道增长。' },
  spine_alignment: '品质便捷',
})
assert.ok(validateCoherence(conflict).violations.some(v => /假设冲突/.test(v.reason)))

console.log('✅ coherence-validator tests passed')
