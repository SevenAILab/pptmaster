import assert from 'node:assert/strict'
import { ingestSources } from './ingest-sources.mjs'

const preBrief = await ingestSources({
  items: [
    { type: 'text', value: '我想做一个面向独立咖啡馆的供应链品牌' },
    { type: 'note', value: '会议纪要：客户说最大痛点是小馆采购难、品质不稳' },
    { type: 'url', value: 'https://example.com', fetched: '<html><title>Demo</title><body>独立咖啡 供应链</body></html>' },
  ],
  callModel: async (system, user) => {
    assert.match(system, /pre-brief/)
    assert.match(user, /采购难/)
    return JSON.stringify({
      brand_basics: { name_guess: '?', category_guess: '供应链/咖啡' },
      problem: '小馆采购难、品质不稳',
      opportunity: '稳定品质供应链',
      audience_hint: '独立咖啡馆',
      product_hint: '供应链服务',
      tonality_hint: ['专业', '可靠'],
      raw_spans: [{ source: 'note', span: '采购难' }],
    })
  },
})

assert.ok(preBrief.problem.includes('采购'))
assert.equal(preBrief.raw_spans[0].source, 'note')
await assert.rejects(ingestSources({ items: [], callModel: async () => '{}' }), /items/i)

console.log('✅ ingest-sources tests passed')
