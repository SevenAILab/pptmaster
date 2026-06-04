import assert from 'node:assert/strict'
import { buildMarkdown, normalizeCategory, rowsToTools } from './ingest-tools.mjs'

const rows = [
  { B: '序号', C: '分类', D: '序号', E: '名称', F: '链接' },
  { B: '1', C: '一、淘系后台数据平台\r\n/电商插件', D: '1', E: '生意参谋', F: 'https://sycm.taobao.com/' },
  { B: '2', C: '', D: '2', E: '小旺神', F: 'https://xiaowangshen.com/' },
  { B: '3', C: '二、广告营销案例网站', D: '1', E: '数英网', F: 'https://www.digitaling.com' },
  { B: '', C: '二十二、翻译网站', D: '1', E: '翻译狗', F: 'https://www.fanyigou.com' },
  { B: '364', C: '', D: '61', E: '', F: '' }
]

const { tools, notes } = rowsToTools(rows)
assert.equal(tools.length, 4, 'Should parse valid rows, including inferred-number rows')
assert.equal(normalizeCategory('一、淘系后台数据平台\r\n/电商插件'), '一、淘系后台数据平台 / 电商插件')
assert.equal(tools[1].category, '一、淘系后台数据平台 / 电商插件', 'Should inherit previous category')
assert.equal(tools[2].category, '二、广告营销案例网站')
assert.equal(tools[3].no, 'inferred-001', 'Should keep named rows without a global number')
assert.equal(tools[3].name, '翻译狗')
assert.equal(notes.inferredNumbers, 1)
assert.equal(notes.skippedBlankNames, 1)

const markdown = buildMarkdown(tools, notes)
assert.equal(markdown.includes('共 4 个工具'), true)
assert.equal(markdown.includes('源表有 1 行缺全局编号，已保留为推断编号。'), true)
assert.equal(markdown.includes('源表有 1 行名称为空，已跳过。'), true)
assert.equal(markdown.includes('| 2 | 小旺神 | [link](https://xiaowangshen.com/) |'), true)

console.log('✅ ingest-tools test passed')
