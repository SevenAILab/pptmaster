import assert from 'node:assert/strict'
import {
  assertConversionIntegrity,
  countDesignTables,
  parseNativeTableCount,
  resolveTool,
} from './deck-to-pptx.mjs'

// 数 HTML 里的真表格
assert.equal(countDesignTables('<table><tr></tr></table> <table >'), 2)
assert.equal(countDesignTables('<div>no tables</div>'), 0)

// 解析转换报告里的原生表格数
assert.equal(parseNativeTableCount('x\n- Native PowerPoint tables: 5\ny'), 5)
assert.throws(() => parseNativeTableCount('no count here'), /Native PowerPoint tables/)

// 护栏：合格 / 退出码非零 / 丢表 三种判定
assert.ok(assertConversionIntegrity({ exitCode: 0, designTables: 2, nativeTables: 3 }))
assert.throws(() => assertConversionIntegrity({ exitCode: 1, designTables: 0, nativeTables: 0 }), /退出码 1/)
assert.throws(() => assertConversionIntegrity({ exitCode: 0, designTables: 3, nativeTables: 1 }), /丢表/)

// 工具找不到必须抛错（红线）
assert.throws(() => resolveTool({ HTML2PPT_DIR: '/no/such/tool/dir' }), /未找到 html2ppt/)
console.log('✅ deck-to-pptx helpers test passed')
