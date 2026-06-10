#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  classifySource,
  coerceLocalDataRefValue,
  isVerifiableSource,
  sortBySourceTier,
  verifyLocalDataRef,
} from './source-tiers.mjs'

const localSource = 'assets/_raw/cases/标杆案例/smallrig/page-037.md'
const firstPartySource = 'inputs/source-tier-test/first-party/customer.md'

await fs.rm('inputs/source-tier-test', { recursive: true, force: true })
await fs.mkdir('inputs/source-tier-test/first-party', { recursive: true })
await fs.writeFile(firstPartySource, '客户自有数据: 付费用户 128 家, 月活试用团队 420 个。')

assert.equal(classifySource(localSource).source_tier, 'T3')
assert.equal(isVerifiableSource(localSource), false)
assert.equal(classifySource(firstPartySource, { slug: 'source-tier-test' }).source_tier, 'T1')
assert.equal(isVerifiableSource(firstPartySource, { slug: 'source-tier-test' }), true)
assert.equal(classifySource('https://www.idc.com/getdoc.jsp?containerId=example').source_tier, 'T2')
assert.equal(classifySource('https://www.36kr.com/p/example').source_tier, 'T3')
assert.equal(classifySource('https://www.reddit.com/r/videography/comments/example').source_tier, 'T4')
assert.equal(isVerifiableSource('inputs/smallrig/summary.md', { slug: 'smallrig' }), false)

assert.equal(classifySource('https://www.stats.gov.cn/sj/ndsj/').source_tier, 'T2')
assert.equal(classifySource('https://www.tsinghua.edu.cn/report').source_tier, 'T2')
for (const url of [
  'https://report.iimedia.cn/repo199-0/46641.html',
  'https://www.leadleo.com/article/details/65e179',
  'https://www.cbndata.com/report/123',
  'https://www.questmobile.com.cn/research/report/1',
  'https://www.analysys.cn/article/detail/2025',
  'https://www.cninsights.com/report/38',
  'https://www.spdbi.com/getfile/index/action/images/name/65f3a0c4ec550.pdf',
]) assert.equal(classifySource(url).source_tier, 'T2', url)
for (const url of [
  'https://www.baogao.com/report/20723009.html',
  'https://big5.chinabgao.com/report/20476449.html',
  'https://www.thepaper.cn/newsDetail_forward_28614235',
  'https://www.sohu.com/a/780629439',
]) assert.equal(classifySource(url).source_tier, 'T3', url)

assert.throws(() => verifyLocalDataRef({
  value: '90天内各平台用户复购率平均超过 30%',
  source: localSource,
  source_tier: 'T1',
}), /unverifiable local data_ref path/)

assert.doesNotThrow(() => verifyLocalDataRef({
  value: '付费用户 128 家',
  source: firstPartySource,
  source_tier: 'T1',
}, { slug: 'source-tier-test' }))

assert.throws(
  () => verifyLocalDataRef({
    value: '90天复购率超过 99%',
    source: localSource,
    source_tier: 'T1',
  }),
  /unverifiable local data_ref path/,
)

const coerced = coerceLocalDataRefValue({
  value: '客户已有 128 家付费用户和 420 个试用团队。',
  source: firstPartySource,
  source_tier: 'T1',
}, { slug: 'source-tier-test' })
assert.match(coerced.value, /付费用户 128 家|月活试用团队 420 个/)
assert.doesNotThrow(() => verifyLocalDataRef(coerced, { slug: 'source-tier-test' }))

assert.deepEqual(
  sortBySourceTier([
    { source_tier: 'T4', source: 'https://reddit.com/a' },
    { source_tier: 'T1', source: firstPartySource },
    { source_tier: 'T2', source: 'https://idc.com/a' },
  ]).map(item => item.source_tier),
  ['T1', 'T2', 'T4'],
)

await fs.rm('inputs/source-tier-test', { recursive: true, force: true })

console.log('✅ source tier and local evidence guard test passed')
