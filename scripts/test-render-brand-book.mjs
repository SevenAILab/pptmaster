import assert from 'node:assert/strict'
import { addModule, createBrandContent } from '../core/content-model.mjs'
import { getTransformer, listTransformers } from '../core/output-registry.mjs'
import { renderBrandBook } from './renderers/render-brand-book.mjs'

let content = createBrandContent({ brand_slug: 'demo', brand_type: 'strategy_charter' })
content = {
  ...content,
  strategic_spine: {
    ...content.strategic_spine,
    positioning_statement: '独立咖啡馆的品质供应链',
  },
  tonality: {
    ...content.tonality,
    palette: {
      primary: '#1a3c34',
      secondary: '#cfe3da',
      accent: '#e08a2c',
      text: '#1c1c1c',
      bg: '#faf8f4',
    },
  },
}
content = addModule(content, {
  id: 'def',
  kind: 'brand_definition',
  visibility: 'external',
  depth_level: 'L3',
  content: {
    title: '品牌定位',
    body: '为独立咖啡馆提供稳定、可信的品质供应链。',
    points: ['缩短采购决策', '降低品质波动'],
    production_note: '左图右文，配竞品对比',
    layout_hint: 'split',
  },
})
content = addModule(content, {
  id: 'risk',
  kind: 'risk_check',
  visibility: 'internal',
  depth_level: 'L3',
  content: { title: '风险', body: '定位假设未验证' },
})

const { html, chapters_rendered } = renderBrandBook(content)
assert.ok(html.includes('品牌定位'))
assert.ok(html.includes('独立咖啡馆的品质供应链'))
assert.ok(html.includes('#1a3c34'))
assert.ok(/<section class="chapter"/.test(html))
assert.equal(chapters_rendered.length, 1)
assert.ok(!html.includes('风险'))
assert.ok(!html.includes('production_note'))
assert.ok(!html.includes('左图右文'))
assert.ok(!html.includes('layout_hint'))
assert.ok(!html.includes('制作备注'))
assert.ok(!html.includes('排版备注'))

assert.ok(listTransformers().includes('brand-book'))
assert.equal(getTransformer('brand-book').render(content).chapters_rendered.length, 1)
assert.throws(() => renderBrandBook(createBrandContent({
  brand_slug: 'empty',
  brand_type: 'strategy_charter',
})), /no external modules/i)

console.log('✅ render-brand-book tests passed')
