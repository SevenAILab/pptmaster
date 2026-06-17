import assert from 'node:assert/strict'
import { addModule, createBrandContent } from '../core/content-model.mjs'
import { getTransformer, listTransformers } from '../core/output-registry.mjs'
import { renderIndependentSite } from './renderers/render-independent-site.mjs'

let content = createBrandContent({ brand_slug: 'demo', brand_type: 'worldview_visual' })
content = {
  ...content,
  strategic_spine: { ...content.strategic_spine, positioning_statement: '服装新物种' },
  tonality: {
    ...content.tonality,
    palette: { primary: '#1a3c34', secondary: '#cfe3da', accent: '#e08a2c', text: '#1c1c1c', bg: '#faf8f4' },
  },
}
content = addModule(content, {
  id: 'entry',
  kind: 'brand_entry',
  visibility: 'external',
  depth_level: 'L3',
  content: { name: '刺猬', slogan: '活该与众不同', one_liner: '科技刺绣定制' },
})
content = addModule(content, {
  id: 'risk',
  kind: 'risk_check',
  visibility: 'internal',
  depth_level: 'L3',
  content: { body: '内部风险', production_note: '不要漏出' },
})
const { html, sections_rendered } = renderIndependentSite(content)
assert.ok(html.includes('活该与众不同'))
assert.ok(html.includes('#1a3c34'))
assert.ok(!html.includes('risk'))
assert.ok(!html.includes('内部风险'))
assert.ok(!html.includes('production_note'))
assert.ok(!html.includes('制作备注'))
assert.equal(sections_rendered.length, 1)
assert.ok(listTransformers().includes('independent-site'))
assert.equal(getTransformer('independent-site').render(content).sections_rendered.length, 1)

console.log('✅ render-independent-site tests passed')
