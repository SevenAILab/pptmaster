import assert from 'node:assert/strict'
import { renderSFallback } from './render-s-fallback.mjs'

const html = renderSFallback({ page_no: 2, action_title: '测试标题', core_points: ['一', '二'] })
assert.ok(html.includes('<section class="S"'), '应为 .S 容器')
assert.ok(html.includes('data-page="2"'))
assert.ok(html.includes('测试标题'))
assert.ok(html.includes('一') && html.includes('二'))
assert.ok(!html.includes('vw'), '.S 不应使用 vw 单位')
console.log('✅ render-s-fallback test passed')
