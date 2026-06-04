import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { deckToPptx } from './deck-to-pptx.mjs'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pptagent-conv-'))

// 造一个假的工具树，让 resolveTool 通过
const toolDir = path.join(tmp, 'tool')
fs.mkdirSync(path.join(toolDir, '99-runtime-do-not-edit', 'bin'), { recursive: true })
fs.writeFileSync(path.join(toolDir, '99-runtime-do-not-edit', 'bin', 'html-to-pptx.js'), '// fake')
const env = { HTML2PPT_DIR: toolDir }

const htmlPath = path.join(tmp, 'deck.html')
fs.writeFileSync(htmlPath, '<section class="S"><table data-pptx-role="native-table"></table></section>')

// PASS：原生表格 2 >= 设计表格 1
const outA = path.join(tmp, 'outA')
function runnerPass(entry, html, outDir) {
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'deck_转换报告.md'), '- Native PowerPoint tables: 2\n')
  fs.writeFileSync(path.join(outDir, 'deck_推荐可编辑版.pptx'), 'PK')
  return 0
}
const resA = deckToPptx({ htmlPath, outDir: outA, runner: runnerPass, env })
assert.equal(resA.designTables, 1)
assert.equal(resA.nativeTables, 2)
assert.ok(resA.recommended.endsWith('_推荐可编辑版.pptx'))

// FAIL：退出码非零
const outB = path.join(tmp, 'outB')
assert.throws(() => deckToPptx({ htmlPath, outDir: outB, runner: () => 1, env }), /退出码 1/)

// FAIL：丢表（原生 0 < 设计 1）
const outC = path.join(tmp, 'outC')
function runnerLoseTable(entry, html, outDir) {
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'deck_转换报告.md'), '- Native PowerPoint tables: 0\n')
  return 0
}
assert.throws(() => deckToPptx({ htmlPath, outDir: outC, runner: runnerLoseTable, env }), /丢表/)

fs.rmSync(tmp, { recursive: true, force: true })
console.log('✅ deck-to-pptx runner test passed')
