import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { readWebSearchAuditLog } from './audit-log.mjs'
import {
  filterDomesticMediaResults,
  isDomesticMediaUrl,
  pickEngine,
  sanitizeDomesticMediaQuery,
  webSearch,
} from './web-search.mjs'

assert.equal(pickEngine('新能源汽车市场规模是多少', {}), 'tavily', '短问答型 -> tavily')
assert.equal(pickEngine('找 5 个券商对市场的预测', { maxResults: 5 }), 'tavily', '自然语言列举型不因 maxResults 走 serper')
assert.equal(pickEngine('相机配件市场全文研究报告', {}), 'exa', '全文研究 -> exa')
assert.equal(pickEngine('品牌定位怎么做', {}), 'tavily')
assert.equal(pickEngine('竞品最近动作有哪些', { maxResults: 8 }), 'tavily')
assert.equal(pickEngine('SmallRig Ulanzi Tilta competitor matrix camera accessories', { maxResults: 8 }), 'serper')
assert.equal(
  pickEngine('SmallRig 在摄影摄像配件市场中应该优先服务哪些创作者人群，并用哪些真实证据支撑定位判断？', { maxResults: 8 }),
  'exa',
  '长语义研究问句 -> exa',
)
assert.equal(pickEngine('SmallRig 斯莫格 最近动态', { engine: 'serper' }), 'serper')
assert.equal(pickEngine('SmallRig camera rig review', { engine: 'social:reddit' }), 'social:reddit')

assert.equal(isDomesticMediaUrl('https://mp.weixin.qq.com/s/example'), true)
assert.equal(isDomesticMediaUrl('https://www.xiaohongshu.com/explore/example'), true)
assert.equal(isDomesticMediaUrl('https://www.reddit.com/r/Filmmakers/comments/example'), false)
assert.equal(
  sanitizeDomesticMediaQuery('SmallRig 评价 site:xiaohongshu.com 微信公众号 小红书 wechat'),
  'SmallRig 评价 公开内容平台 公开用户社区 public community',
)
assert.deepEqual(
  filterDomesticMediaResults([
    { title: '公众号文章', url: 'https://mp.weixin.qq.com/s/example' },
    { title: 'Reddit discussion', url: 'https://www.reddit.com/r/Filmmakers/comments/example' },
    { title: '小红书笔记', url: 'https://www.xiaohongshu.com/explore/example' },
    { title: '平台目录', url: 'https://example.com/catalog', snippet: '包含微信公众平台和小红书入口' },
  ]),
  [{ title: 'Reddit discussion', url: 'https://www.reddit.com/r/Filmmakers/comments/example' }],
)
await assert.rejects(
  () => webSearch('SmallRig 评价', { engine: 'social', platform: 'xiaohongshu', noCache: true }),
  /Domestic social search platform disabled/,
)

const slug = '_web-search-test'
await fs.rm(`outputs/${slug}`, { recursive: true, force: true })
await webSearch('SmallRig 斯莫格 最近动态', { engine: 'serper', maxResults: 3, slug })
const auditEntries = await readWebSearchAuditLog(slug)
assert.equal(auditEntries.length, 1)
assert.equal(auditEntries[0].provider, 'serper')
assert.ok(auditEntries[0].result_count > 0)
assert.match(auditEntries[0].results[0].url, /^https?:\/\//)
await fs.rm(`outputs/${slug}`, { recursive: true, force: true })

const sanitizeSlug = '_web-search-sanitize-test'
await fs.rm(`outputs/${sanitizeSlug}`, { recursive: true, force: true })
await webSearch('SmallRig 评价 site:xiaohongshu.com 微信公众号', {
  engine: 'serper',
  maxResults: 3,
  slug: sanitizeSlug,
  noCache: true,
})
const sanitizeAuditEntries = await readWebSearchAuditLog(sanitizeSlug)
assert.equal(sanitizeAuditEntries.length, 1)
assert.doesNotMatch(sanitizeAuditEntries[0].query, /xiaohongshu|小红书|公众号|微信/)
assert.ok(sanitizeAuditEntries[0].results.every(result => !/xiaohongshu|小红书|公众号|微信/.test(
  `${result.url} ${result.title} ${result.snippet}`,
)))
await fs.rm(`outputs/${sanitizeSlug}`, { recursive: true, force: true })

const exaSlug = '_exa-search-test'
await fs.rm(`outputs/${exaSlug}`, { recursive: true, force: true })
await webSearch('SmallRig camera accessories detailed market report', {
  engine: 'exa',
  maxResults: 2,
  maxCharacters: 1200,
  slug: exaSlug,
})
const exaAuditEntries = await readWebSearchAuditLog(exaSlug)
assert.equal(exaAuditEntries.length, 1)
assert.equal(exaAuditEntries[0].provider, 'exa')
assert.ok(exaAuditEntries[0].result_count > 0)
await fs.rm(`outputs/${exaSlug}`, { recursive: true, force: true })

console.log('✅ web-search heuristic test passed')
