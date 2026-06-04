import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertDeckDiscipline } from './content-discipline.mjs'
import { renderSFallback } from './renderers-s/render-s-fallback.mjs'
import { renderSPoints } from './renderers-s/render-s-points.mjs'
import { renderSTable } from './renderers-s/render-s-table.mjs'
import { escapeHtml } from './renderers-s/render-utils-s.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TEMPLATE = 'templates/template-deck-S.html'

// 与浏览版 scripts/render-deck.mjs 逐字对齐，避免两条链路漂移。
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

// 每个 SXX 绑定一种 .S 排布；真实数据 7 种全覆盖，另 4 种为未来 deck 预留。
const points = variant => slide => renderSPoints(slide, { variant })
export const SXX_TO_S_RENDERER = {
  S03: points('columns'),
  S05: points('stack'),
  S09: points('grid'),
  S12: points('stack'),
  S13: points('columns'),
  S14: points('stack'),
  S15: points('grid'),
  S17: points('columns'),
  S19: points('grid'),
  S21: slide => renderSTable(slide),
  S22: points('columns'),
}

function renderSlideS(slide) {
  const smartLayout = slide.layout_designer?.smart_layout || slide.layout
  const sxx = SMART_LAYOUT_TO_SXX[smartLayout] || slide.layout || 'S03'
  const renderer = SXX_TO_S_RENDERER[sxx]
  if (renderer) return renderer(slide)
  if (slide.table) return renderSTable(slide)
  return renderSFallback(slide)
}

export async function renderDeckS(inputJson, outputHtml) {
  const data = JSON.parse(await fs.readFile(inputJson, 'utf8'))
  const template = await fs.readFile(path.join(REPO_ROOT, TEMPLATE), 'utf8')
  if (!template.includes('<!-- SLIDES_HERE -->')) {
    throw new Error('模板缺少 <!-- SLIDES_HERE --> 注入标记')
  }

  const slides = data.slides || []
  if (slides.length === 0) {
    throw new Error('方案 JSON 没有 slides，无法渲染（红线：失败必抛错，不产空 deck）')
  }

  // 内容纪律红线闸门：违规直接抛错，绝不渲染出违规 deck（失败必抛错，不静默兜底）
  assertDeckDiscipline(data)

  const slidesHtml = slides.map(renderSlideS).join('\n\n')
  const clientName = data.client_profile?.name || data.metadata?.client_name || '品牌定位案'
  const html = template
    .replace('<!-- SLIDES_HERE -->', slidesHtml)
    .replace(/\[必填\][^<]*/g, `${escapeHtml(clientName)} · 品牌定位案`)

  await fs.mkdir(path.dirname(outputHtml), { recursive: true })
  await fs.writeFile(outputHtml, html)
  return { slideCount: slides.length, outputHtml }
}

async function cliMain() {
  const [inputJson, outputHtml] = process.argv.slice(2).filter(arg => !arg.startsWith('--'))
  if (!inputJson || !outputHtml) {
    console.error('Usage: node scripts/render-deck-s.mjs <input.json> <output.html>')
    process.exit(1)
  }
  const result = await renderDeckS(inputJson, outputHtml)
  console.log(`[render-s] ${result.slideCount} 个 .S 页面 -> ${outputHtml}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
