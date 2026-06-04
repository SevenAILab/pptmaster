import { escapeHtml, footer, titleBar } from './render-utils-s.mjs'

export function renderSFallback(slide) {
  const title = escapeHtml(slide.action_title || '')
  const sub = escapeHtml(slide.page_subtitle || '')
  const points = (slide.core_points || [])
    .map(point => `<li>${escapeHtml(String(point))}</li>`)
    .join('')

  return `<section class="S" data-page="${escapeHtml(String(slide.page_no || ''))}" data-layout="fallback">
  ${titleBar('PPTAgent', slide.part_title || '')}
  <div class="TS"><h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div>
  <div class="BA"><ul class="points">${points}</ul></div>
  ${footer(slide)}
</section>`
}
