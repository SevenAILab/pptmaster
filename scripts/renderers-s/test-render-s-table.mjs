import assert from 'node:assert/strict'
import { renderSTable } from './render-s-table.mjs'

// 显式表格数据
const a = renderSTable({
  page_no: 4,
  action_title: '竞品对比',
  table: { headers: ['品牌', '定位', '价格带'], rows: [['A', '高端', '¥¥¥'], ['B', '性价比', '¥']] },
})
assert.ok(a.includes('<section class="S"'))
assert.ok(a.includes('data-layout="table"'))
assert.ok(a.includes('<table'), '应为真 <table>')
assert.ok(a.includes('data-pptx-role="native-table"'))
assert.ok(a.includes('<th>品牌</th>') && a.includes('<td>高端</td>'))

// 无 table 字段时，从 core_points 的 "维度：说明" 兜底成两列表
const b = renderSTable({ page_no: 5, action_title: '要点', core_points: ['定位：高端', '人群：Z世代'] })
assert.ok(b.includes('<table'))
assert.ok(b.includes('<td>定位</td>') && b.includes('<td>高端</td>'))
console.log('✅ render-s-table test passed')
