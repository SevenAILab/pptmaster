import assert from 'node:assert/strict'
import { renderSStatement } from './render-s-statement.mjs'

const html = renderSStatement({ page_no: 3, action_title: '三条主张', core_points: ['第一', '第二', '第三'] })
assert.ok(html.includes('<section class="S"'))
assert.ok(html.includes('data-layout="statement"'))
assert.ok(html.includes('三条主张'))
assert.ok(html.includes('01') && html.includes('02') && html.includes('03'), '应有编号')
assert.ok(html.includes('第一') && html.includes('第三'))
assert.ok(!html.includes('vw'))
console.log('✅ render-s-statement test passed')
