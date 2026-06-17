import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { finalizeBrief, nextIntakeStep, scoreSufficiency } from './intake-strategist.mjs'

const state = {
  preBrief: { problem: '采购难' },
  answers: { q_category: '咖啡供应链', q_goal: '招商' },
  output_types_selected: [],
}
const step = await nextIntakeStep({
  state,
  callModel: async (system, user) => {
    assert.match(system, /侧面提问/)
    assert.match(user, /咖啡供应链/)
    return JSON.stringify({
      restate: '你想做咖啡供应链、目标招商，对吗？',
      ask_id: 'q_user',
      ask_prompt: '谁会第一个为它买单？',
      options: ['独立咖啡馆主理人', '连锁采购', '其他（自述）'],
    })
  },
})
assert.ok(step.restate)
assert.ok(step.ask_prompt)
assert.equal(step.options.length, 3)
assert.ok(!/品牌主张/.test(step.ask_prompt))

const low = scoreSufficiency({ answers: { q_category: '咖啡供应链' } })
assert.ok(low.score < 7)
assert.ok(low.gaps.length > 0)

const answers = {
  q_category: '咖啡供应链',
  q_user: '独立咖啡馆主理人',
  q_scene: '小馆临时补豆和稳定出品',
  q_old_problem: '采购难且品质不稳',
  q_new_cognition: '小馆也应该有专业供应链',
  q_product: '咖啡豆和履约服务',
  q_proposition: '让小馆稳定做出好咖啡',
  q_persona_personality: '温和可靠不制造焦虑',
  q_public_data: '12 家试点门店复购',
  q_goal: '招商',
}
const high = scoreSufficiency({ answers })
assert.ok(high.score >= 7, JSON.stringify(high))

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pptmaster-intake-'))
try {
  const brief = await finalizeBrief({
    answers,
    preBrief: { problem: '采购难' },
    output_types_selected: ['brand-book'],
    slug: 'coffee-supply',
    outputRoot: tmp,
  })
  assert.equal(brief.gate_passed, true)
  assert.deepEqual(brief.output_types_selected, ['brand-book'])
  assert.ok(brief.tonality.keywords.includes('温和可靠不制造焦虑'))
  assert.ok(brief.brand_type_input.category.includes('咖啡'))
  const saved = JSON.parse(await fs.readFile(path.join(tmp, 'coffee-supply', 'brief.json'), 'utf8'))
  assert.equal(saved.slug, 'coffee-supply')
} finally {
  await fs.rm(tmp, { recursive: true, force: true })
}

console.log('✅ intake-strategist tests passed')
