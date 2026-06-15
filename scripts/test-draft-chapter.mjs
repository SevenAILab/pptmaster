import assert from 'node:assert/strict'
import { buildChapterPrompt, draftChapter, parseChapterResponse } from './draft-chapter.mjs'

const brief = { formText: '{"name":"LUMA"}', summary: '摘要', strategicQuestion: '# 根问题\n如何定位？' }
const skeleton = {
  toc: ['诊断', '定位'],
  brief_opening: { question: '如何定位？' },
}
const section = {
  section_no: 2,
  title: '定位',
  transition_question: 'LUMA 应占据哪个空位？',
  closing_judgment: '定位锚点已立',
  covers: ['positioning_statement'],
  pages: [
    { governing_thought: 'LUMA 应占据日常可及的专业精品', points: ['竞品两端留下空位'], evidence_refs: ['comp-01'], layout_hint: 'comparison' },
    { governing_thought: '这个定位必须由门店体验和会员机制共同证明', points: ['体验即 RTB'], evidence_refs: ['self-01'], layout_hint: 'framework' },
  ],
}
const analysisCards = {
  cards: [
    { id: 'comp-01', analysis_type: 'competitor', claim: '竞品两端分化', implication: 'LUMA 避开平价红海', source: 'https://example.com/report', source_tier: 'T2' },
    { id: 'self-01', analysis_type: 'self', claim: '门店体验稳定', implication: '体验可以承接定位', source: 'inputs/luma/summary.md', source_tier: 'T1' },
  ],
}
const { system, user } = buildChapterPrompt({
  brief,
  skeleton,
  section,
  previousTakeaways: ['第 1 章结论：行业同质化加剧'],
  usedTitles: ['行业正在同质化'],
  usedPageClaims: ['P1 行业正在同质化 / 门店越开越像 / 价格带挤压'],
  methodology: { concepts: [{ name: 'JTBD', content: 'JTBD...' }] },
  analysisCards,
  caseLogic: '## 案例推导逻辑参考\n只学推导链。',
  skillGuidance: '## proposal-narrative 方法论指引\n一页一观点。',
})
assert.match(system, /只填.*content 页/)
assert.match(system, /不要写封面、目录、brief/)
assert.match(system, /一页一观点/)
assert.match(system, /按需拆页/)
assert.doesNotMatch(system, /正好 \d+ 页/)
assert.match(system, /proposal-narrative 方法论指引/)
assert.match(system, /案例推导逻辑/)
assert.match(user, /行业同质化加剧/)
assert.match(user, /行业正在同质化/)
assert.match(user, /门店越开越像/)
assert.match(user, /LUMA 应占据哪个空位/)
assert.match(user, /comp-01/)
assert.match(user, /JTBD/)

const ok = parseChapterResponse(JSON.stringify({
  pages: [
    {
      governing_thought: 'LUMA 应占据日常可及的专业精品',
      points: ['竞品两端留下空位'],
      evidence_refs: ['comp-01'],
      evidence_kind: 'deductive',
      layout_hint: 'comparison',
    },
    {
      governing_thought: '这个定位必须由门店体验和会员机制共同证明',
      points: ['体验即 RTB'],
      evidence_refs: ['self-01'],
      evidence_kind: 'deductive',
      layout_hint: 'framework',
    },
  ],
  chapter_takeaways: ['定位锚点 = 日常可及的专业精品'],
}), { section, analysisCards })
assert.equal(ok.pages.length, 2)
assert.equal(ok.slides[0].action_title, ok.pages[0].governing_thought)
assert.equal(ok.pages[0].data_refs[0].source, 'https://example.com/report')
assert.deepEqual(ok.chapter_takeaways, ['定位锚点 = 日常可及的专业精品'])
assert.throws(() => parseChapterResponse(JSON.stringify({ pages: ok.pages }), { section, analysisCards }), /chapter_takeaways/)
assert.throws(() => parseChapterResponse('{"pages":[]}', { section }), /pages/)
assert.throws(() => parseChapterResponse(JSON.stringify({
  pages: [{ governing_thought: '坏页但没有证据', points: ['x'], evidence_refs: [], evidence_kind: 'deductive' }],
  chapter_takeaways: ['x'],
}), { section: { pages: [] } }), /evidence_refs/)

const drafted = await draftChapter({
  brief,
  skeleton,
  section,
  previousTakeaways: [],
  usedTitles: [],
  analysisCards,
  callModel: async () => JSON.stringify({
    pages: ok.pages,
    chapter_takeaways: ['定位锚点 = 日常可及的专业精品'],
  }),
})
assert.equal(drafted.pages.length, 2)
assert.equal(drafted.slides.length, 2)
assert.equal(drafted.section_no, 2)

let retryCalls = 0
const retried = await draftChapter({
  brief,
  skeleton,
  section,
  previousTakeaways: [],
  usedTitles: [],
  analysisCards,
  callModel: async (retrySystem, retryUser) => {
    retryCalls += 1
    assert.match(retrySystem, /资深品牌策略主笔/)
    if (retryCalls === 1) return '{"pages":[{"governing_thought":"坏 JSON"}'
    assert.match(retryUser, /上一次章节输出校验失败|上一次 JSON 解析失败/)
    assert.match(retryUser, /只重新输出合法 JSON/)
    return JSON.stringify({ pages: ok.pages, chapter_takeaways: ['定位锚点 = A'] })
  },
})
assert.equal(retryCalls, 2)
assert.equal(retried.pages.length, 2)

console.log('✅ draft-chapter: content-page prompt + parse + retry passed')
