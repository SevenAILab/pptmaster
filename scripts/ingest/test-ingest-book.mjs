// Minimal unit test for ingest-book.mjs
// Run: node scripts/ingest/test-ingest-book.mjs

import { splitByChapterAnchors } from './ingest-book.mjs'
import assert from 'node:assert/strict'

const fakeText = `
前言
内容...

第 1 章：启程认知：品牌的力量与 AI 的机遇
1.1 品牌的本质
内容...
1.2 品牌的价值
内容...

第 2 章：市场分析
2.1 锁定赛道
内容...
`

const chapters = splitByChapterAnchors(fakeText)
assert.equal(chapters.length, 2, 'Should split into 2 chapters')
assert.equal(chapters[0].slug, 'ch01-cognition')
assert.equal(chapters[1].slug, 'ch02-market')
assert.ok(chapters[0].content.includes('1.1 品牌的本质'))

console.log('✅ ingest-book test passed')
