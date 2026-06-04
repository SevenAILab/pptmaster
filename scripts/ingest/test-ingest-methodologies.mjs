import assert from 'node:assert/strict'
import {
  buildSourcesMarkdown,
  buildSummaryMarkdown,
  findLocalArticleFile,
  hashContent,
  METHODOLOGY_SOURCES,
  normalizeForMatch,
  rawFilename,
  summarizeFetchResults
} from './ingest-methodologies.mjs'

assert.equal(METHODOLOGY_SOURCES.length, 14, 'Should register 14 methodology articles')
assert.equal(rawFilename(METHODOLOGY_SOURCES[0]), '01-essence.md')
assert.equal(rawFilename(METHODOLOGY_SOURCES[13]), '14-34-communication-theories.md')

const results = new Map([
  [1, { status: 'ok', fetchedAt: '2026-05-26T13:00:00.000Z', charCount: 1280, hash: 'abc123' }],
  [2, { status: 'failed', fetchedAt: '2026-05-26T13:01:00.000Z', error: 'blocked' }]
])
const markdown = buildSourcesMarkdown(METHODOLOGY_SOURCES, results)
assert.equal(markdown.includes('14 篇文章不是 Seven 原创'), true)
assert.equal(markdown.includes('收到原作者投诉立即下架对应摘要'), true)
assert.equal(markdown.includes('| 1 | https://mp.weixin.qq.com/s/i3_8kR-xCmLbLe_0tE4L2g | 如何找到本质？ | 横切方法论 | 2026-05-26T13:00:00.000Z | 1280 | `abc123` |'), true)
assert.equal(markdown.includes('## Failed URLs'), true)
assert.equal(markdown.includes('- #2 https://mp.weixin.qq.com/s/iHsY5E4MJ_QU-i_UAPENLA — blocked'), true)

assert.equal(hashContent('品牌策略方法论').length, 64)
assert.deepEqual(summarizeFetchResults(results), { ok: 1, failed: 1 })
assert.equal(normalizeForMatch('如何做用户洞察？'), '如何做用户洞察')
assert.equal(
  findLocalArticleFile(METHODOLOGY_SOURCES[5], [
    '06_如何做用户画像.md',
    '06_如何做用户洞察.md',
    '15_108个写方案技巧.md'
  ]),
  '06_如何做用户洞察.md'
)

const summary = buildSummaryMarkdown(METHODOLOGY_SOURCES[6], `
# 探讨 SWOT 分析

战略分析需要同时看优势、劣势、机会和威胁。

## 1. 什么是SWOT分析？
SWOT 是用来判断内外部关键因素的基础模型。

## 2. 为何SWOT分析如此重要？
它能帮助团队明确战略方向和资源配置。

## 3. 如何做SWOT分析？
先收集内部信息，再收集外部机会与威胁。

## 总结
SWOT 不是填表，而是形成行动策略。
`)
assert.equal(summary.includes('slug: swot'), true)
assert.equal(summary.includes('## 核心方法'), true)
assert.equal(summary.includes('## 关键模型/工具'), true)
assert.equal(summary.includes('SWOT'), true)

console.log('✅ ingest-methodologies test passed')
