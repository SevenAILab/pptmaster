import assert from 'node:assert/strict'
import { extractConceptsFromText, shouldSkipPath, scoreQuality } from './extract-concepts.mjs'

const dict = {
  concepts: [
    { name: 'SWOT', aliases: ['SWOT 分析', '态势分析'], category: 'model' },
    { name: 'STP', aliases: ['STP 模型'], category: 'model' }
  ]
}

const text = `
本章介绍 SWOT 分析的使用方法。
SWOT 是经典的战略分析工具。
我们也常用 STP 模型来做市场细分。
`

const found = extractConceptsFromText(text, dict, 'test-source.md')
const swot = found.find(c => c.concept === 'SWOT')
assert.ok(swot, 'Should find SWOT')
assert.equal(swot.occurrences.length, 2, 'Should find 2 SWOT mentions')
assert.ok(found.find(c => c.concept === 'STP'))
assert.equal(swot.occurrences[0].source, 'test-source.md')
assert.equal(swot.occurrences[0].quality_score >= 2, true)

assert.equal(shouldSkipPath('assets/_raw/methodologies/raw/01-essence.md'), true)
assert.equal(shouldSkipPath('assets/_raw/visuals-legacy/README.md'), true)
assert.equal(shouldSkipPath('assets/_raw/methodologies/summaries/01-essence.md'), false)
assert.equal(scoreQuality('步骤 方法 案例 123', 0, '步骤 方法 案例 123'), 4)

console.log('✅ extract-concepts test passed')
