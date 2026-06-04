import assert from 'node:assert/strict'
import { reportEvidenceCoverage } from './evidence-coverage.mjs'

const deck = {
  slides: [
    { page_no: 1, data_refs: [{ source: 'https://www.idc.com/a' }] },                       // 有网络来源
    { page_no: 2, data_refs: [{ source: 'inputs/x/first-party/sales.md', source_tier: 'T1' }] }, // T1 本地，无网络
    { page_no: 3, data_refs: [] },                                                          // 无任何来源
    { page_no: 4, data_refs: [{ source: 'https://36kr.com/b' }] },                          // 有网络来源
  ],
}

const report = reportEvidenceCoverage(deck)
assert.equal(report.total_pages, 4)
assert.equal(report.pages_with_web_ref, 2)
assert.equal(report.pages_with_any_ref, 3)
assert.equal(report.web_ref_ratio, 0.5)
assert.deepEqual(report.pages_without_any_ref, [3])
assert.equal(report.perPage.length, 4)
assert.equal(report.perPage[0].has_web_ref, true)
assert.equal(report.perPage[1].has_web_ref, false)
assert.equal(report.perPage[1].has_any_ref, true)

console.log('✅ test-evidence-coverage passed')
