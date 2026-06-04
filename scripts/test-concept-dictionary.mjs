import assert from 'node:assert/strict'
import fs from 'node:fs'

const dictionary = JSON.parse(fs.readFileSync('scripts/concept-dictionary.json', 'utf8'))

assert.equal(dictionary.version, '0.1.0')
assert.deepEqual(dictionary.categories, ['model', 'methodology', 'term', 'sop'])
assert.equal(dictionary.concepts.length, 45, 'Should seed 45 core concepts')

const byName = new Map(dictionary.concepts.map(concept => [concept.name, concept]))
for (const name of ['SWOT', 'STP', 'Business-Model-Canvas', 'Brand-House', 'JTBD']) {
  assert.equal(byName.has(name), true, `${name} should exist`)
}

assert.equal(byName.get('SWOT').aliases.includes('态势分析'), true)
assert.equal(byName.get('Brand-House').category, 'model')

const requiredAliasBoosts = {
  'Slogan-7-Principles': ['口号 7 原则', 'Slogan 原则', '口号七原则', '品牌口号', 'Slogan 七要素', '口号原则', 'slogan 设计原则', '广告语原则', 'Slogan'],
  JTBD: ['待办任务理论', 'Jobs to be Done', '用户任务', 'JTBD 模型', 'Jobs-to-be-Done', '任务理论', '待完成工作', '用户工作', '任务地图', '完成任务', '任务(Job)', '用户“雇佣”产品'],
  'Industry-Lifecycle': ['行业生命周期', '行业周期', '产品生命周期', '成长期', '成熟期', '衰退期', '导入期', 'PLC'],
  'Competitor-Matrix': ['竞品矩阵', '竞品对比', '竞品分析矩阵', '竞品对比表', '竞争格局图', '竞品对照表', '竞争矩阵', '功能对比矩阵', '行业竞品对比', '横向对比表'],
  'Perceptual-Map': ['知觉地图', '认知地图', 'Perceptual Map', '感知图', '定位地图', '心智地图', '品牌认知图', '定位图', '竞争定位图', 'Positioning Map'],
  'Marketing-Calendar': ['营销日历', '年度营销日历', '传播节奏表', '年度节点表', 'marketing calendar', '年度营销节奏', '营销节奏计划', '执行排期'],
  '4P-Rhythm': ['4P 节奏', '营销节奏', '4P 节奏表', '4P 推进节奏', '传播节奏', '节奏怎么安排'],
  'Pain-Gain-Map': ['痛点收益地图', '痛点-收益分析', '痛点地图', 'Pain Gain Map', '痛点收益分析', '用户痛点'],
  '4A-Funnel': ['4A 行为漏斗', 'AIDA', 'AIDA 模型', '认知漏斗', 'AIDMA', '4A 漏斗', '销售漏斗', '条件漏斗', '品牌销售漏斗'],
  MECE: ['MECE', '相互独立完全穷尽', '完全穷尽', '互斥穷尽', '相互独立', 'Mutually Exclusive Collectively Exhaustive', '不遗漏重要讯息', '不遗漏', '核心要点'],
  'Action-Title': ['行动标题', 'Action Title', '结论标题', '结论先行标题', '行动型标题', 'Action title', '先说结论', '结论先行', '鼓励行动']
}

for (const [name, requiredAliases] of Object.entries(requiredAliasBoosts)) {
  const concept = byName.get(name)
  assert.ok(concept, `${name} should exist`)
  for (const alias of requiredAliases) {
    assert.ok(concept.aliases.includes(alias), `${name} should include alias: ${alias}`)
  }
}

const aliases = dictionary.concepts.flatMap(concept => concept.aliases.map(alias => `${alias}::${concept.name}`))
const aliasNames = aliases.map(value => value.split('::')[0])
assert.equal(new Set(aliasNames).size, aliasNames.length, 'Aliases should not be duplicated')

for (const concept of dictionary.concepts) {
  assert.equal(typeof concept.name, 'string')
  assert.equal(dictionary.categories.includes(concept.category), true, `${concept.name} has valid category`)
  assert.equal(Array.isArray(concept.aliases), true)
  assert.equal(concept.aliases.length > 0, true, `${concept.name} should have aliases`)
}

console.log('✅ concept-dictionary test passed')
