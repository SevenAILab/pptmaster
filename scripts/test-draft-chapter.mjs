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
  usedPageClaims: ['P1 行业正在同质化 / 门店越开越像 / 价格带挤压'],
  methodology: { concepts: [{ name: 'JTBD', content: 'JTBD...' }] },
  researchBrief: { findings: [], sources: [] },
})
assert.match(system, /正好 3 页/)
assert.match(system, /第 1 页.*章首页/)
assert.match(system, /chapter_takeaways/)
assert.match(system, /不得与已用标题|不得重复/)
assert.match(system, /语义重复率|新增变量|换一种说法/)
assert.match(user, /行业同质化加剧/)
assert.match(user, /行业正在同质化/)
assert.match(user, /门店越开越像/)
assert.match(user, /锚点是什么/)

const guidancePrompt = buildChapterPrompt({
  brief,
  outline,
  chapter: outline.chapters[1],
  previousTakeaways: [],
  usedTitles: [],
  skillGuidance: '## proposal-narrative 方法论指引\n横纵双轴；一页一观点。',
})
assert.match(guidancePrompt.system, /proposal-narrative 方法论指引/)
assert.match(guidancePrompt.system, /横纵双轴/)

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

let retryChapterCalls = 0
const retriedChapter = await draftChapter({
  brief,
  outline,
  chapter: outline.chapters[1],
  previousTakeaways: [],
  usedTitles: [],
  callModel: async (retrySystem, retryUser) => {
    retryChapterCalls += 1
    assert.match(retrySystem, /资深品牌策略主笔/)
    if (retryChapterCalls === 1) return '{"slides":[{"page_no":1,"action_title":"坏 JSON"}'
    assert.match(retryUser, /上一次 JSON 解析失败/)
    assert.match(retryUser, /只重新输出合法 JSON/)
    return JSON.stringify({ slides: ok.slides, chapter_takeaways: ['定位锚点 = A'] })
  },
})
assert.equal(retryChapterCalls, 2)
assert.equal(retriedChapter.slides.length, 3)

let retryInvalidKindCalls = 0
const retriedInvalidKind = await draftChapter({
  brief,
  outline,
  chapter: outline.chapters[1],
  previousTakeaways: [],
  usedTitles: [],
  callModel: async (retrySystem, retryUser) => {
    retryInvalidKindCalls += 1
    assert.match(retrySystem, /empirical\/deductive\/hypothesis/)
    if (retryInvalidKindCalls === 1) {
      return JSON.stringify({
        slides: ok.slides.map((slide, index) => index === 0 ? { ...slide, evidence_kind: 'secondary_research' } : slide),
        chapter_takeaways: ['定位锚点 = A'],
      })
    }
    assert.match(retryUser, /上一次章节输出校验失败/)
    assert.match(retryUser, /evidence_kind/)
    return JSON.stringify({ slides: ok.slides, chapter_takeaways: ['定位锚点 = A'] })
  },
})
assert.equal(retryInvalidKindCalls, 2)
assert.equal(retriedInvalidKind.slides[0].evidence_kind, 'deductive')

let groupedCalls = 0
const grouped = await draftChapter({
  brief,
  outline,
  chapter: { ...outline.chapters[1], pages_budget: 5 },
  previousTakeaways: ['上一章结论'],
  usedTitles: ['旧标题'],
  usedPageClaims: ['P1 旧标题 / 旧核心点'],
  skillGuidance: '## proposal-narrative 方法论指引\n分组调用也必须带上。',
  callModel: async (groupSystem, groupUser) => {
    groupedCalls += 1
    assert.match(groupSystem, /本次只写本章第/)
    assert.match(groupSystem, /分组调用也必须带上/)
    assert.match(groupUser, groupedCalls === 1 ? /旧核心点/ : /本章已生成页面/)
    if (groupedCalls > 1) assert.match(groupUser, /P1: 页组 1-1.*a/)
    if (groupedCalls === 1) {
      assert.match(groupSystem, /第 1 页必须是章首页/)
      return JSON.stringify({
        slides: [
          { page_no: 1, intent: '章节导入', action_title: '页组 1-1', layout: 'hero-statement', core_points: ['a'], data_refs: [{ source: 'inputs/x/summary.md' }], evidence_kind: 'deductive', validation_method: 'v', blocks: [{ type: 'callout', text: 'a' }] },
          { page_no: 2, intent: 'i', action_title: '页组 1-2', layout: 'split-statement', core_points: ['b'], data_refs: [{ source: 'inputs/x/summary.md' }], evidence_kind: 'deductive', validation_method: 'v', blocks: [{ type: 'callout', text: 'b' }] },
        ],
      })
    }
    if (groupedCalls === 2) {
      assert.match(groupSystem, /不要再写章节导入页/)
      return JSON.stringify({
        slides: [
          { page_no: 3, intent: 'i', action_title: '页组 2-3', layout: 'split-statement', core_points: ['c'], data_refs: [{ source: 'inputs/x/summary.md' }], evidence_kind: 'deductive', validation_method: 'v', blocks: [{ type: 'callout', text: 'c' }] },
          { page_no: 4, intent: 'i', action_title: '页组 2-4', layout: 'split-statement', core_points: ['d'], data_refs: [{ source: 'inputs/x/summary.md' }], evidence_kind: 'deductive', validation_method: 'v', blocks: [{ type: 'callout', text: 'd' }] },
        ],
      })
    }
    return JSON.stringify({
      slides: [
        { page_no: 5, intent: 'i', action_title: '页组 3-5', layout: 'split-statement', core_points: ['e'], data_refs: [{ source: 'inputs/x/summary.md' }], evidence_kind: 'deductive', validation_method: 'v', blocks: [{ type: 'callout', text: 'e' }] },
      ],
      chapter_takeaways: ['拆分章结论'],
    })
  },
  maxPagesPerCall: 2,
})
assert.equal(groupedCalls, 3)
assert.deepEqual(grouped.slides.map(slide => slide.page_no), [1, 2, 3, 4, 5])
assert.deepEqual(grouped.chapter_takeaways, ['拆分章结论'])

await assert.rejects(draftChapter({
  brief,
  outline,
  chapter: { ...outline.chapters[1], pages_budget: 3 },
  previousTakeaways: [],
  usedTitles: [],
  callModel: async (badSystem) => badSystem.includes('第 1-2 页')
    ? JSON.stringify({
      slides: [
        { page_no: 1, intent: 'i', action_title: 'a', layout: 'split-statement', core_points: ['a'], data_refs: [{ source: 'inputs/x/summary.md' }], evidence_kind: 'deductive', validation_method: 'v', blocks: [{ type: 'callout', text: 'a' }] },
        { page_no: 2, intent: 'i', action_title: 'b', layout: 'split-statement', core_points: ['b'], data_refs: [{ source: 'inputs/x/summary.md' }], evidence_kind: 'deductive', validation_method: 'v', blocks: [{ type: 'callout', text: 'b' }] },
      ],
    })
    : JSON.stringify({
      slides: [
        { page_no: 1, intent: 'i', action_title: 'wrong', layout: 'split-statement', core_points: ['wrong'], data_refs: [{ source: 'inputs/x/summary.md' }], evidence_kind: 'deductive', validation_method: 'v', blocks: [{ type: 'callout', text: 'wrong' }] },
      ],
      chapter_takeaways: ['t'],
    }),
  maxPagesPerCall: 2,
}), /page_no|页组/)

console.log('✅ draft-chapter: prompt + parse + budget lock passed')
