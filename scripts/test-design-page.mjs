import assert from 'node:assert/strict'
import {
  buildDesignPrompt,
  designDeck,
  designPage,
  isWellFormedSection,
  parseSectionHtml,
} from './design-page.mjs'

const sampleSlide = {
  page_no: 2,
  intent: '讲清流程',
  action_title: '把 6 个 Sub-Agent 串成一条流水线',
  core_points: [
    'Gartner 预测 2028 年 60% B2B work 由对话式 AI 执行',
    '第 1 周把官网首屏改成品牌策划方案 Agent',
  ],
  data_refs: [{ source: 'https://example.com/report' }],
  blocks: [{ type: 'timeline', title: '三周推进' }],
}

const { system, user } = buildDesignPrompt(sampleSlide)

assert.match(system, /Swiss|瑞士国际主义/)
assert.match(system, /guizang/)
assert.match(system, /审美标尺/)
assert.match(system, /不是固定模板|不是模板目录/)
assert.match(system, /结构.*内容|内容.*结构/)
assert.match(system, /无衬线/)
assert.match(system, /一个强调色|单一强调色/)
assert.match(system, /禁止.*脚本|不要.*脚本/)
assert.match(system, /不要 <style> 标签/)
assert.match(system, /<section/)
assert.match(user, /6 个 Sub-Agent/)
assert.match(user, /Gartner/)
assert.match(user, /https:\/\/example\.com\/report/)

const guidedDesign = buildDesignPrompt({ page_no: 1, action_title: 'T', core_points: [], data_refs: [] }, {
  skillGuidance: '## deck-design-system 方法论指引\n单一强调色；SVG 禁文字。',
})
assert.match(guidedDesign.system, /deck-design-system 方法论指引/)
assert.match(guidedDesign.system, /单一强调色/)
assert.ok(!buildDesignPrompt({ page_no: 1 }).system.includes('方法论指引'))

const parsed = parseSectionHtml('```html\n<section class="slide light">A</section>\n```', { pageNo: 3 })
assert.match(parsed, /^<section\b/)
assert.match(parsed, /data-page="3"/)
assert.match(parsed, /A<\/section>$/)

assert.equal(isWellFormedSection('<section class="slide light" data-page="1">ok</section>'), true)
assert.equal(isWellFormedSection('<section class="slide light"><section>nested</section></section>'), true)
assert.equal(isWellFormedSection('<div>nope</div>'), false)
assert.equal(isWellFormedSection('<section>unclosed'), false)
assert.equal(isWellFormedSection('<section>A</section><section>B</section>'), false)

assert.throws(
  () => parseSectionHtml('<section class="slide" data-page="4">wrong</section>', { pageNo: 3 }),
  /data-page.*3/,
)
assert.throws(() => parseSectionHtml('没有 section', { pageNo: 1 }), /No <section>/)
assert.throws(() => parseSectionHtml('<section>A</section><section>B</section>', { pageNo: 1 }), /exactly one/i)
assert.throws(() => parseSectionHtml('<section class="slide"><script>alert(1)</script></section>', { pageNo: 1 }), /Forbidden/i)
assert.throws(() => parseSectionHtml('<section class="slide"><style>.x{}</style></section>', { pageNo: 1 }), /Forbidden/i)
assert.throws(() => parseSectionHtml('<section class="slide"><html></html></section>', { pageNo: 1 }), /Forbidden/i)
assert.throws(() => parseSectionHtml('<section class="slide"><head></head></section>', { pageNo: 1 }), /Forbidden/i)
assert.throws(() => parseSectionHtml('<section class="slide"><body></body></section>', { pageNo: 1 }), /Forbidden/i)
assert.throws(() => parseSectionHtml('<section class="slide"><link href="https://evil.test/x.css"></section>', { pageNo: 1 }), /Forbidden/i)
assert.throws(() => parseSectionHtml('<section class="slide"><iframe src="https://evil.test"></iframe></section>', { pageNo: 1 }), /Forbidden/i)
assert.throws(() => parseSectionHtml('<section class="slide" onclick="x()">x</section>', { pageNo: 1 }), /Forbidden/i)
assert.throws(() => parseSectionHtml('<section class="slide"><a href="javascript:alert(1)">x</a></section>', { pageNo: 1 }), /Forbidden/i)
assert.throws(() => parseSectionHtml('<section class="slide"><img src="https://evil.test/a.png"></section>', { pageNo: 1 }), /Forbidden/i)
assert.throws(() => parseSectionHtml('<section class="panel">no slide class</section>', { pageNo: 1 }), /slide/i)

const designedPage = await designPage(sampleSlide, {
  callModel: async (modelSystem, modelUser) => {
    assert.match(modelSystem, /无衬线/)
    assert.match(modelUser, /把 6 个 Sub-Agent/)
    return '<section class="slide light"><h1>P</h1></section>'
  },
})
assert.equal(designedPage.page_no, 2)
assert.match(designedPage.section_html, /data-page="2"/)
assert.match(designedPage.section_html, /<h1>P<\/h1>/)

const guidedPage = await designPage({ page_no: 4, action_title: 'Guided' }, {
  skillGuidance: '## deck-design-system 方法论指引\n必须统一 token。',
  callModel: async (modelSystem) => {
    assert.match(modelSystem, /必须统一 token/)
    return '<section class="slide light">guided</section>'
  },
})
assert.match(guidedPage.section_html, /data-page="4"/)

let retryCalls = 0
const retriedPage = await designPage({ page_no: 3, action_title: 'Retry' }, {
  callModel: async (_modelSystem, modelUser) => {
    retryCalls += 1
    if (retryCalls === 1) return '<section class="slide"><style>.x{}</style>x</section>'
    assert.match(modelUser, /上一次输出被拒绝/)
    return '<section class="slide">fixed</section>'
  },
})
assert.equal(retryCalls, 2)
assert.match(retriedPage.section_html, /fixed/)
assert.match(retriedPage.section_html, /data-page="3"/)

await assert.rejects(designPage({ page_no: 5, action_title: 'Bad raw' }, {
  maxAttempts: 1,
  callModel: async () => '<section class="slide">A</section><section class="slide">B</section>',
}), error => {
  assert.match(error.message, /exactly one/)
  assert.match(error.rawOutput, /<section class="slide">A/)
  return true
})

let callCount = 0
const deck = {
  metadata: { input_slug: 'demo' },
  slides: [
    { page_no: 1, action_title: 'A', core_points: ['A1'] },
    { page_no: 2, action_title: 'B', core_points: ['B1'] },
  ],
}
const designedDeck = await designDeck(deck, {
  skillGuidance: '## deck-design-system 方法论指引\nDeck 级透传。',
  callModel: async () => {
    callCount += 1
    return '<section class="slide dark">x</section>'
  },
})
assert.equal(callCount, 2)
assert.equal(designedDeck.metadata.input_slug, 'demo')
assert.equal(designedDeck.slides.length, 2)
assert.ok(designedDeck.slides.every(slide => slide.section_html.startsWith('<section')))
assert.equal(designedDeck.slides[0].action_title, 'A')

console.log('✅ design-page test passed')
