import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tpl = await fs.readFile(path.join(ROOT, 'templates/template-deck-S.html'), 'utf8')

assert.ok(tpl.includes('.S{'), '缺少 .S 容器定义')
assert.ok(tpl.includes('width:1080px'), '缺少 1080px 宽度')
assert.ok(tpl.includes('height:608px'), '缺少 608px 高度')
assert.ok(tpl.includes('<!-- SLIDES_HERE -->'), '缺少注入标记')
assert.ok(!tpl.includes('100vw'), '不应包含浏览版的 100vw（必须固定 px）')
assert.ok(!tpl.includes('10000vw'), '不应包含浏览版的胶片条 10000vw')
assert.ok(!tpl.includes('fonts.googleapis.com'), '不应外链字体（必须自包含、可离线转换）')
assert.ok(tpl.includes('.cols-row{'), '缺少 columns 容器样式 .cols-row')
assert.ok(tpl.includes('.cols-stack{'), '缺少 stack 容器样式 .cols-stack')
assert.ok(tpl.includes('.cols-grid{'), '缺少 grid 容器样式 .cols-grid')
console.log('✅ template-deck-S test passed')
