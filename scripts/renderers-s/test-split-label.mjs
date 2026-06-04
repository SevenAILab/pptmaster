import assert from 'node:assert/strict'
import { splitLabel } from './render-utils-s.mjs'

// 短前缀 + 冒号 -> 拆成标签/正文（半角与全角冒号都支持）
assert.deepEqual(splitLabel('行业线:垂直仍有空位'), { label: '行业线', detail: '垂直仍有空位' })
assert.deepEqual(splitLabel('Q1：跑通样板'), { label: 'Q1', detail: '跑通样板' })
// 无冒号 -> 整句作正文，标签为空
assert.deepEqual(splitLabel('通用工具正在抢心智'), { label: '', detail: '通用工具正在抢心智' })
// 冒号前过长（>14 字符）-> 不当标签，整句作正文
const long = '这是一段很长的描述性句子总共超过十四个字符:后面'
assert.equal(splitLabel(long).label, '')
// 冒号在句首（idx=0）-> 不产生空标签
assert.deepEqual(splitLabel('：开头冒号'), { label: '', detail: '：开头冒号' })
// 空 / 非字符串安全
assert.deepEqual(splitLabel(''), { label: '', detail: '' })
assert.deepEqual(splitLabel(null), { label: '', detail: '' })
console.log('✅ split-label test passed')
