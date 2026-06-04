import { escapeHtml, footer, splitLabel, titleBar } from './render-utils-s.mjs'

const VARIANT_CLASS = { stack: 'cols-stack', columns: 'cols-row', grid: 'cols-grid' }

// 统一数据骨架：动作标题 + 副标(page_subtitle) + N 条要点(core_points 字符串)。
// SXX 只通过 variant 决定这 N 条要点的视觉排布（堆叠/分栏/网格）。
export function renderSPoints(slide, { variant = 'columns' } = {}) {
  const layout = VARIANT_CLASS[variant] ? variant : 'columns'
  const title = escapeHtml(slide.action_title || '')
  const eyebrow = escapeHtml(slide.page_subtitle || '')
  const meta = slide.part_title || ''
  const accent = slide.render_hints?.accent_color === 'ink' ? 'ink' : 'accent'
  const points = (slide.core_points || []).slice(0, 6)

  const cards = points.map((point, index) => {
    const { label, detail } = splitLabel(point)
    const head = escapeHtml(label || String(index + 1).padStart(2, '0'))
    return `<div class="card"><div class="card-title">${head}</div><div class="card-body">${escapeHtml(detail)}</div></div>`
  }).join('')

  return `<section class="S" data-page="${escapeHtml(String(slide.page_no || ''))}" data-layout="${layout}" data-accent="${accent}">
  ${titleBar('PPTAgent', meta)}
  <div class="TS"><h1>${title}</h1>${eyebrow ? `<div class="sub">${eyebrow}</div>` : ''}</div>
  <div class="BA"><div class="${VARIANT_CLASS[layout]}">${cards}</div></div>
  ${footer(slide)}
</section>`
}
