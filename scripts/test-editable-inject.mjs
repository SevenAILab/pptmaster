import assert from 'node:assert/strict'
import { injectEditToolbar } from './editable-inject.mjs'

const html = '<!DOCTYPE html><html><head><title>x</title></head><body><div id="deck"><section class="slide light">正文</section></div></body></html>'
const out = injectEditToolbar(html)
assert.ok(out.includes('pptmaster-edit-toolbar'))
assert.ok(out.includes('contenteditable'))
assert.ok(out.includes('导出 HTML'))
assert.ok(out.indexOf('</body>') > out.indexOf('pptmaster-edit-toolbar'))
assert.throws(() => injectEditToolbar('<div>没有 body</div>'), /No <\/body>/)

console.log('✅ editable-inject passed')
