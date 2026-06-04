import { escapeHtml, footer, titleBar } from './render-utils-s.mjs'

export function renderSStatement(slide) {
  const title = escapeHtml(slide.action_title || '')
  const points = (slide.core_points || [])
    .slice(0, 5)
    .map((point, index) => `<li><span class="num">${String(index + 1).padStart(2, '0')}</span><span class="txt">${escapeHtml(String(point))}</span></li>`)
    .join('')

  return `<section class="S" data-page="${escapeHtml(String(slide.page_no || ''))}" data-layout="statement">
  ${titleBar('PPTAgent', slide.section || '')}
  <div class="TS"><h1>${title}</h1></div>
  <div class="BA"><ul class="statement-points">${points}</ul></div>
  ${footer(slide)}
</section>`
}
