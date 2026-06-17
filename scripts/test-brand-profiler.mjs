import assert from 'node:assert/strict'
import { applyPaletteToContent, buildPalette } from './brand-profiler.mjs'
import { createBrandContent } from '../core/content-model.mjs'

const palette = await buildPalette({
  tonality: { keywords: ['温暖', '克制', '自然'], reference_brands: ['观夏'], source: 'qa' },
  callModel: async () => JSON.stringify({
    primary: '#7a5c3e',
    secondary: '#e7ddcc',
    accent: '#c2703d',
    text: '#2b2a20',
    bg: '#faf6ef',
  }),
})
for (const key of ['primary', 'secondary', 'accent', 'text', 'bg']) {
  assert.match(palette[key], /^#[0-9a-fA-F]{6}$/)
}

const fallback = await buildPalette({ tonality: { keywords: ['科技', '克制'], source: 'qa' } })
assert.match(fallback.primary, /^#[0-9a-fA-F]{6}$/)

const content = applyPaletteToContent(createBrandContent({ brand_slug: 'd', brand_type: 'strategy_charter' }), palette)
assert.equal(content.tonality.palette.primary, '#7a5c3e')

await assert.rejects(buildPalette({
  tonality: { keywords: ['x'], source: 'qa' },
  callModel: async () => JSON.stringify({ primary: 'red' }),
}), /palette/i)

console.log('✅ brand-profiler tests passed')
