import assert from 'node:assert/strict'
import {
  splitByCatalog,
  splitByRoleHeadings,
  splitByPattern,
  splitPageNumberedSections,
  shouldSliceImage,
  isSparseText,
  shouldPreferOcr,
  slugify
} from './ingest-pdf-doc.mjs'

const chapterText = `
封面

第 1 章 品牌战略总览
品牌战略正文。

第 2 部分 品牌定位系统
定位正文。

第三部分 品牌管理落地
管理正文。
`

const segments = splitByPattern(
  chapterText,
  /^(?:第\s*[一二三四五六七八九十0-9]+\s*[章节部分]|[0-9]+[.、])/m
)

assert.equal(segments.length, 3, 'Should split chapter-style headings')
assert.equal(segments[0].title, '第 1 章 品牌战略总览')
assert.equal(segments[2].content.includes('管理正文。'), true)
assert.equal(isSparseText('\f\f\n  \f'), true)
assert.equal(isSparseText('品牌战略正文'.repeat(20)), false)
assert.equal(shouldPreferOcr('公众号：策略人藏锋'.repeat(80)), true)
assert.equal(shouldPreferOcr('公\n众\n号\n：\n策\n略\n人\n藏\n锋\n'.repeat(80)), true)
assert.equal(shouldPreferOcr('品牌年度规划正文'.repeat(80)), false)
assert.equal(shouldSliceImage({ width: 1695, height: 33179 }), true)
assert.equal(shouldSliceImage({ width: 1695, height: 5000 }), false)

const pageNumbered = splitPageNumberedSections('CONTENTS 001 P7\f003 什么是用户洞察？\n品牌定位问答正文\f004\n第二问正文')
assert.equal(pageNumbered.length, 2, 'Should split page-numbered deck sections and skip contents pages')
assert.equal(pageNumbered[0].title, '003 什么是用户洞察？')
assert.equal(pageNumbered[1].content.includes('第二问正文'), true)

const catalogText = `
25 大提示词
目录：企业发展历程/行业发展历程/商业模式画布

企业发展历程
[角色]
企业发展正文。

行业发展历程
[角色]
行业发展正文。

商业模式画布
[角色]
商业模式正文。
`
const catalogSegments = splitByCatalog(catalogText)
assert.equal(catalogSegments.length, 3, 'Should split slash-separated prompt catalogs')
assert.equal(catalogSegments[0].title, '企业发展历程')
assert.equal(catalogSegments[2].content.includes('商业模式正文。'), true)

const roleSegments = splitByRoleHeadings('企业发展历程\n[角色]\n正文一\n\n财报分析\n[角色定位]\n正文二\n\n文章总结提炼\n[背景及目标]\n正文三')
assert.equal(roleSegments.length, 3, 'Should split prompt docs by common bracketed role markers')
assert.equal(roleSegments[1].title, '财报分析')
assert.equal(roleSegments[2].content.includes('正文三'), true)

assert.equal(slugify('品牌策略：百问百答 / 极简答案书', 1), '品牌策略-百问百答-极简答案书')
assert.equal(slugify('***', 7), 'section-007')

console.log('✅ ingest-pdf-doc test passed')
