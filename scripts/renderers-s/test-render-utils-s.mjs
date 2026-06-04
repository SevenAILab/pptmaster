import assert from 'node:assert/strict'
import { escapeHtml, nativeTableHtml, footer, titleBar } from './render-utils-s.mjs'

assert.equal(escapeHtml('<a>&"'), '&lt;a&gt;&amp;&quot;')

const t = nativeTableHtml(['维度', '说明'], [['定位', '高端'], ['人群', 'Z世代']])
assert.ok(t.includes('<table'), '应为真实 <table>')
assert.ok(t.includes('data-pptx-role="native-table"'), '应标记 native-table 角色')
assert.ok(t.includes('<th>维度</th>'))
assert.ok(t.includes('<td>高端</td>'))
assert.ok(t.includes('<td>Z世代</td>'))

assert.ok(footer({ page_no: 7 }).includes('7'), '页脚应含页码')
assert.ok(titleBar('PPTAgent', '品牌定位').includes('PPTAgent'))
console.log('✅ render-utils-s test passed')
