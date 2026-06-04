import assert from 'node:assert/strict'
import { renderSPoints } from './render-s-points.mjs'

// columns：冒号要点拆成卡片标题+正文；page_subtitle 作眉头；part_title 作 TB meta
const cols = renderSPoints({
  page_no: 5, layout: 'S03', action_title: '三条主张',
  page_subtitle: '行业窗口', part_title: 'PART 1',
  core_points: ['行业线:垂直仍有空位', '产品线:把策划产品化', '无冒号要点'],
  render_hints: { accent_color: 'accent' },
}, { variant: 'columns' })
assert.ok(cols.includes('<section class="S"'))
assert.ok(cols.includes('data-layout="columns"'))
assert.ok(cols.includes('data-accent="accent"'))
assert.ok(cols.includes('三条主张'))
assert.ok(cols.includes('行业窗口'), '应渲染 page_subtitle 眉头')
assert.ok(cols.includes('PART 1'), '应把 part_title 放进顶栏 meta')
assert.ok(cols.includes('行业线') && cols.includes('垂直仍有空位'), '应按冒号拆标题+正文')
assert.ok(cols.includes('cols-row'), 'columns 用 .cols-row 容器')
assert.equal((cols.match(/class="card"/g) || []).length, 3, '应渲染 3 张卡片')
assert.ok(cols.includes('>03<') && cols.includes('无冒号要点'), '无冒号要点用编号作标题')
assert.ok(!cols.includes('vw'), '不应出现浏览版单位')

// stack
const stack = renderSPoints({ page_no: 3, action_title: '三层', core_points: ['a', 'b', 'c'] }, { variant: 'stack' })
assert.ok(stack.includes('data-layout="stack"') && stack.includes('cols-stack'))

// grid + ink 强调色
const grid = renderSPoints({
  page_no: 63, action_title: '四象限',
  core_points: ['Q1:一', 'Q2:二', 'Q3:三', 'Q4:四'],
  render_hints: { accent_color: 'ink' },
}, { variant: 'grid' })
assert.ok(grid.includes('data-layout="grid"') && grid.includes('cols-grid'))
assert.ok(grid.includes('data-accent="ink"'))
assert.ok(grid.includes('Q1') && grid.includes('Q4'))

// 缺省 variant = columns；空 core_points 不抛错
const def = renderSPoints({ page_no: 1, action_title: '空页', core_points: [] })
assert.ok(def.includes('data-layout="columns"'))

console.log('✅ render-s-points test passed')
