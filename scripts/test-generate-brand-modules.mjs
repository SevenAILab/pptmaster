import assert from 'node:assert/strict'
import { createBrandContent, lockSpine } from '../core/content-model.mjs'
import { deterministicBrandModules, generateBrandModules } from './generate-brand-modules.mjs'

let content = createBrandContent({ brand_slug: 'demo', brand_type: 'new_consumer_full' })
content = lockSpine(content, {
  chosen_direction_id: 'd1',
  positioning_statement: '独立咖啡馆的稳定品质供应',
  mission: '让小馆也能稳定出品',
  vision: '成为独立咖啡馆第一供应选择',
  proposition: '稳定品质+灵活配送',
})

const analysisCards = {
  byType: {
    competitor: { cards: [{ id: 'comp-1', claim: '头部只服务连锁，忽视独立小馆', source_tier: 'T2' }] },
    user: { cards: [{ id: 'usr-1', claim: '独立馆主最痛采购不稳定', source_tier: 'T1' }] },
  },
}

const callModel = async (system, user) => {
  assert.match(system, /renderable-fields/)
  assert.match(user, /独立咖啡馆的稳定品质供应/)
  assert.match(user, /comp-1/)
  return JSON.stringify({
    content: {
      title: '品牌定义',
      positioning: '独立咖啡馆的稳定品质供应',
      what_it_is: '专为独立小馆做的稳定供应链',
      differentiation: ['只服务独立馆', '按小批量稳定配送'],
      body: '针对 comp-1 揭示的空白与 usr-1 的采购焦虑，提供稳定供应。',
      production_note: '不要渲染',
    },
    evidence_refs: ['comp-1', 'usr-1'],
    depth_level: 'L4',
  })
}

const out = await generateBrandModules({
  content,
  brief: { form: { name: 'demo', industry: '咖啡供应链' } },
  analysisCards,
  callModel,
  kinds: ['brand_definition'],
})
const def = out.modules.find(module => module.kind === 'brand_definition')
assert.ok(def)
assert.equal(def.visibility, 'external')
assert.deepEqual(def.evidence_refs.sort(), ['comp-1', 'usr-1'])
assert.ok(['L3', 'L4'].includes(def.depth_level))
assert.ok(!('production_note' in def.content))
assert.ok(def.content.differentiation.length === 2)

const lazy = async () => JSON.stringify({
  content: {
    title: '品牌定义',
    positioning: '独立咖啡馆的稳定品质供应',
    body: '独立咖啡馆的稳定品质供应。',
  },
  evidence_refs: [],
  depth_level: 'L4',
})
await assert.rejects(generateBrandModules({
  content,
  brief: {},
  analysisCards,
  callModel: lazy,
  kinds: ['brand_definition'],
}), /evidence|boilerplate|套话|specific/i)

const internalLeak = async () => JSON.stringify({
  content: {
    title: '品牌定义',
    positioning: '独立咖啡馆的稳定品质供应',
    body: '针对 comp-1 的竞品弱点和 usr-1 的采购焦虑，给出单店回本测算。',
  },
  evidence_refs: ['comp-1', 'usr-1'],
  depth_level: 'L4',
})
await assert.rejects(generateBrandModules({
  content,
  brief: { form: { name: 'demo', industry: '咖啡供应链' } },
  analysisCards,
  callModel: internalLeak,
  kinds: ['brand_definition'],
}), /visibility|internal|对内/i)

let repairCalls = 0
const repairedInternalLeak = async () => {
  repairCalls += 1
  if (repairCalls === 1) {
    return JSON.stringify({
      content: {
        title: '品牌定义',
        positioning: '独立咖啡馆的稳定品质供应',
        body: '针对 comp-1 的竞品弱点和 usr-1 的采购焦虑，给出单店回本测算。',
      },
      evidence_refs: ['comp-1', 'usr-1'],
      depth_level: 'L4',
    })
  }
  return JSON.stringify({
    content: {
      title: '品牌定义',
      positioning: '独立咖啡馆的稳定品质供应',
      body: '针对 comp-1 显示的连锁供给空白与 usr-1 的采购焦虑，提供面向独立馆的稳定供应选择。',
    },
    evidence_refs: ['comp-1', 'usr-1'],
    depth_level: 'L4',
  })
}
const repaired = await generateBrandModules({
  content,
  brief: { form: { name: 'demo', industry: '咖啡供应链' } },
  analysisCards,
  callModel: repairedInternalLeak,
  kinds: ['brand_definition'],
})
assert.equal(repairCalls, 2)
assert.equal(repaired.modules[0].visibility, 'external')

const offline = deterministicBrandModules({
  content,
  brief: { slug: 'demo', form: { name: 'demo', industry: '咖啡供应链', target_audience: ['独立馆主'], core_products: ['豆源配送'] } },
})
assert.ok(offline.content.modules.some(module => module.content.offline === true))
assert.ok(offline.content.modules.every(module => module.visibility !== 'external' || module.evidence_refs.length > 0))

console.log('✅ generate-brand-modules tests passed')
