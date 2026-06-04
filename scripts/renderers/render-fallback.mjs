export function renderFallback(slide, escapeHtml) {
  const layout = escapeHtml(slide.layout || 'S03')
  const title = escapeHtml(slide.action_title || '')
  const points = (slide.core_points || [])
    .map(point => `        <li>${escapeHtml(point)}</li>`)
    .join('\n')

  return `<section class="slide light" data-layout="${layout}" data-page="${slide.page_no}">
  <div class="canvas-card">
    <div class="chrome-min">
      <span>PPTAgent</span>
      <span>${escapeHtml(String(slide.page_no || ''))}</span>
    </div>
    <div class="slide-content">
      <p class="t-meta">${layout} · (fallback render, 待 Plan 3+ 精雕)</p>
      <h2 class="action-title t-h1">${title}</h2>
      <ul class="core-points t-body">
${points}
      </ul>
    </div>
  </div>
</section>`
}
