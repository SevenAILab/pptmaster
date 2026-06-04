import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderFallback } from './renderers/render-fallback.mjs'
import { renderS03 } from './renderers/render-s03-split-statement.mjs'
import { renderS05 } from './renderers/render-s05-three-layers.mjs'
import { renderS09 } from './renderers/render-s09-dot-matrix-statement.mjs'
import { renderS12 } from './renderers/render-s12-manifesto.mjs'
import { renderS13 } from './renderers/render-s13-three-forces.mjs'
import { renderS14 } from './renderers/render-s14-loop-form.mjs'
import { renderS15 } from './renderers/render-s15-matrix-fill.mjs'
import { renderS17 } from './renderers/render-s17-system-diagram.mjs'
import { renderS19 } from './renderers/render-s19-four-cards.mjs'
import { renderS21 } from './renderers/render-s21-tech-spec.mjs'
import { renderS22 } from './renderers/render-s22-image-hero.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const STYLE_TEMPLATES = {
  swiss: 'templates/template-swiss.html',
  magazine: 'templates/template-magazine.html',
}

function escapeHtml(value) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const RENDERER_DISPATCH = {
  S03: renderS03,
  S05: renderS05,
  S09: renderS09,
  S12: renderS12,
  S13: renderS13,
  S14: renderS14,
  S15: renderS15,
  S17: renderS17,
  S19: renderS19,
  S21: renderS21,
  S22: renderS22,
}

export const SMART_LAYOUT_TO_SXX = {
  'hero-statement': 'S22',
  'split-statement': 'S03',
  'three-layers': 'S05',
  'matrix-2x2': 'S17',
  'matrix-3x3': 'S15',
  'flow-arrow': 'S09',
  timeline: 'S09',
  pyramid: 'S13',
  tree: 'S13',
  'kpi-card': 'S22',
  'framework-grid': 'S15',
  'brand-house-9-layer': 'S17',
  'image-hero': 'S22',
}

function renderSlide(slide) {
  const smartLayout = slide.layout_designer?.smart_layout || slide.layout
  const layout = SMART_LAYOUT_TO_SXX[smartLayout] || slide.layout || 'S03'
  const renderer = RENDERER_DISPATCH[layout] || renderFallback
  return renderer({
    ...slide,
    layout,
    _designer_hints: slide.layout_designer || null,
  }, escapeHtml)
}

function replaceSlides(template, slidesHtml) {
  if (template.includes('<!-- SLIDES_HERE')) {
    return template.replace(
      /<!-- SLIDES_HERE[\s\S]*?(?=\n<\/div>\s*\n\s*<div id="nav")/,
      slidesHtml,
    )
  }

  return template.replace(
    /<div id="deck">[\s\S]*?<\/div>\s*<div id="overview">/,
    `<div id="deck">\n${slidesHtml}\n</div>\n<div id="overview">`,
  )
}

export async function renderDeck(inputJson, outputHtml, options = {}) {
  const data = JSON.parse(await fs.readFile(inputJson, 'utf8'))
  const style = options.style || data.client_profile?.render_style || 'swiss'
  const templateFile = STYLE_TEMPLATES[style]
  if (!templateFile) throw new Error(`Unknown style: ${style}`)

  const template = await fs.readFile(path.join(REPO_ROOT, templateFile), 'utf8')
  const slidesHtml = (data.slides || []).map(renderSlide).join('\n\n')
  const clientName = data.client_profile?.name || data.metadata?.client_name || '品牌定位案'
  const html = replaceSlides(template, slidesHtml)
    .replace(/\[必填\][^<]*/g, `${escapeHtml(clientName)} · 品牌定位案`)

  await fs.mkdir(path.dirname(outputHtml), { recursive: true })
  await fs.writeFile(outputHtml, html)
  return { slideCount: data.slides?.length || 0, style, outputHtml }
}

async function cliMain() {
  const args = process.argv.slice(2)
  const positional = args.filter(arg => !arg.startsWith('--'))
  const [inputJson, outputHtml] = positional
  const style = args.find(arg => arg.startsWith('--style='))?.split('=')[1] || 'swiss'

  if (!inputJson || !outputHtml) {
    console.error('Usage: node scripts/render-deck.mjs <input.json> <output.html> [--style=swiss|magazine]')
    process.exit(1)
  }

  console.log(`[render] Reading ${inputJson}`)
  const result = await renderDeck(inputJson, outputHtml, { style })
  console.log(`  ${result.slideCount} slides, style=${result.style}`)
  console.log(`[render] Done -> ${outputHtml}`)
  console.log(`  Open in browser: open ${outputHtml}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
