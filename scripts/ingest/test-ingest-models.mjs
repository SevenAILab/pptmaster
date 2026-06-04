import { splitModels, slugify } from './ingest-models.mjs'
import assert from 'node:assert/strict'

const fake = `
1. SWOT 分析
定义: ...
适用场景: ...

2. 4P 营销组合
定义: ...

3. STP 模型
定义: ...
`

const models = splitModels(fake)
assert.equal(models.length, 3, 'Should split 3 models')
assert.equal(models[0].num, 1)
assert.equal(models[0].name, 'SWOT 分析')
assert.equal(slugify('SWOT 分析'), 'swot')
assert.equal(slugify('4P 营销组合'), '4p-marketing-mix')

console.log('✅ ingest-models test passed')
