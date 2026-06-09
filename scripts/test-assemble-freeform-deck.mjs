import assert from 'node:assert/strict'
import { STYLE_TEMPLATES, replaceSlides } from './render-deck.mjs'
import { assembleFreeformDeck } from './assemble-freeform-deck.mjs'

assert.equal(STYLE_TEMPLATES.swiss, 'templates/template-swiss.html')
assert.equal(typeof replaceSlides, 'function')

const shell = '<div id="deck"><!-- SLIDES_HERE -->\n</div>\n<div id="nav"></div>'
const replaced = replaceSlides(shell, '<section class="slide">X</section>')
assert.ok(replaced.includes('<section class="slide">X</section>'))
assert.ok(replaced.includes('id="nav"'))

const deck = {
  client_profile: { name: 'P4 测试客户' },
  slides: [
    { page_no: 1, section_html: '<section class="slide light" data-page="1">ONE</section>' },
    { page_no: 2, section_html: '<section class="slide dark" data-page="2">TWO</section>' },
  ],
}

const html = await assembleFreeformDeck(deck, { style: 'swiss' })
assert.ok(html.includes('<!DOCTYPE') || html.includes('<html'))
assert.ok(html.includes('ONE'))
assert.ok(html.includes('TWO'))
assert.ok(!html.includes('<!-- SLIDES_HERE'))
assert.ok(!html.includes('SMART_LAYOUT_TO_SXX'))
const htmlWithoutComments = html.replace(/<!--[\s\S]*?-->/g, '')
assert.equal((htmlWithoutComments.match(/<section\b/g) || []).length, 2)

await assert.rejects(
  assembleFreeformDeck({ slides: [{ page_no: 1 }] }, { style: 'swiss' }),
  /missing section_html/,
)
await assert.rejects(
  assembleFreeformDeck({ slides: deck.slides }, { style: 'unknown' }),
  /Unknown style/,
)

console.log('✅ assemble-freeform-deck test passed')
