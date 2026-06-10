import assert from 'node:assert/strict'
import { buildChapterPrompt, draftChapter, parseChapterResponse } from './draft-chapter.mjs'

const brief = { formText: '{"name":"LUMA"}', summary: '摘要', strategicQuestion: '# 根问题\n如何定位？' }
const outline = {
  narrative: '诊断到落地',
  chapters: [
    { chapter_no: 1, title: '诊断', goal: 'g1', pages_budget: 3, key_questions: ['行业怎么了'], covers: [] },
    { chapter_no: 2, title: '定位', goal: 'g2', pages_budget: 3, key_questions: ['锚点是什么'], covers: ['positioning_statement'] },
  ],
}
const { system, user } = buildChapterPrompt({
  brief,
  outline,
  chapter: outline.chapters[1],
  previousTakeaways: ['第 1 章结论：行业同质化加剧'],
  usedTitles: ['行业正在同质化'],
  methodology: { concepts: [{ name: 'JTBD', content: 'JTBD...' }] },
  researchBrief: { findings: [], sources: [] },
})
assert.match(system, /正好 3 页/)
assert.match(system, /第 1 页.*章首页/)
assert.match(system, /chapter_takeaways/)
assert.match(system, /不得与已用标题|不得重复/)
assert.match(user, /行业同质化加剧/)
assert.match(user, /行业正在同质化/)
assert.match(user, /锚点是什么/)

const ok = parseChapterResponse(JSON.stringify({
  slides: [
    { page_no: 1, intent: '章节导入', action_title: '定位章', layout: 'hero-statement', core_points: ['x'], data_refs: [{ source: 'inputs/x/summary.md' }], evidence_kind: 'deductive', validation_method: 'v', blocks: [{ type: 'callout', text: 'x' }] },
    { page_no: 2, intent: 'i', action_title: '锚点应是 A', layout: 'split-statement', core_points: ['y'], data_refs: [{ source: 'inputs/x/summary.md' }], evidence_kind: 'deductive', validation_method: 'v', blocks: [{ type: 'callout', text: 'y' }] },
    { page_no: 3, intent: 'i', action_title: '差异化来自 B', layout: 'split-statement', core_points: ['z'], data_refs: [{ source: 'inputs/x/summary.md' }], evidence_kind: 'deductive', validation_method: 'v', blocks: [{ type: 'callout', text: 'z' }] },
  ],
  chapter_takeaways: ['定位锚点 = A'],
}))
assert.equal(ok.slides.length, 3)
assert.deepEqual(ok.chapter_takeaways, ['定位锚点 = A'])
assert.throws(() => parseChapterResponse(JSON.stringify({ slides: ok.slides })), /chapter_takeaways/)
assert.throws(() => parseChapterResponse('{"slides":[]}'), /slides/)

await assert.rejects(draftChapter({
  brief,
  outline,
  chapter: outline.chapters[1],
  previousTakeaways: [],
  usedTitles: [],
  callModel: async () => JSON.stringify({ slides: ok.slides.slice(0, 2), chapter_takeaways: ['t'] }),
}), /页数.*预算|pages_budget/)

const drafted = await draftChapter({
  brief,
  outline,
  chapter: outline.chapters[1],
  previousTakeaways: [],
  usedTitles: [],
  callModel: async () => JSON.stringify({ slides: ok.slides, chapter_takeaways: ['定位锚点 = A'] }),
})
assert.equal(drafted.slides.length, 3)
assert.equal(drafted.chapter_no, 2)

console.log('✅ draft-chapter: prompt + parse + budget lock passed')
