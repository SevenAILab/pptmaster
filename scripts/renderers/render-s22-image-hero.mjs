import { dataRefsHtml, modelsHtml } from './render-utils.mjs'

function statItems(slide, escapeHtml) {
  const hints = slide.render_hints || {}
  const points = slide.core_points || []
  const stats = [
    hints.kpi_hero || points[0] || '01',
    points[1] || '02',
    points[2] || '03',
  ]
  return stats.map((stat, index) => `<div style="display:flex;flex-direction:column;gap:.6vh;min-width:0">
          <div style="height:1px;background:var(--ink)"></div>
          <div class="t-meta">Metric ${String(index + 1).padStart(2, '0')}</div>
          <div style="font-family:var(--sans),var(--sans-zh);font-weight:200;font-size:min(3.4vw,6.2vh);line-height:1;letter-spacing:-.025em;color:${index === 2 ? 'var(--accent)' : 'var(--ink)'}">${escapeHtml(String(stat).slice(0, 24))}</div>
          <div style="height:1px;background:var(--border-subtle);margin-top:auto"></div>
          <p class="body-sm">${escapeHtml(points[index] || '')}</p>
        </div>`).join('\n')
}

export function renderS22(slide, escapeHtml) {
  const title = escapeHtml(slide.action_title || '')
  const imageSrc = escapeHtml(slide.render_hints?.image_slot || '')
  const refs = dataRefsHtml(slide, escapeHtml)
  const models = modelsHtml(slide, escapeHtml)
  const imageBlock = imageSrc
    ? `<img src="${imageSrc}" data-image-slot="s22-hero-21x9" alt="${title}" loading="eager" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 35%">`
    : `<div class="dot-mat xl" data-image-slot="s22-hero-21x9" style="position:absolute;inset:0;color:rgba(var(--accent-rgb),.55);background-color:var(--grey-1)"></div>`

  return `<section class="slide light" data-layout="S22" data-page="${slide.page_no}" data-animate="image-hero">
  <div class="canvas-card image-hero" style="padding:0;display:flex;flex-direction:column;overflow:hidden">
    <div class="hero-img-wrap" data-anim="img" style="position:relative;flex:0 0 60%;overflow:hidden;background:var(--grey-1)">
      ${imageBlock}
      <div class="chrome-min" style="position:absolute;top:0;left:0;right:0;color:rgba(255,255,255,.9);padding:5.6vh 5vw 0">
        <span>PPTAgent</span>
        <span>${escapeHtml(String(slide.page_no || ''))}</span>
      </div>
      <div class="hero-overlay-block" data-anim="title-block" style="position:absolute;left:5vw;top:11vh;background:var(--paper);padding:3.2vh 3.2vw;max-width:46vw">
        <div style="font-family:var(--sans),var(--sans-zh);font-weight:200;font-size:min(4.2vw,7.6vh);line-height:1.04;letter-spacing:-.025em;color:var(--text-primary)">${title}</div>
      </div>
    </div>
    <div data-anim="kpi" class="image-hero-body">
      <div style="display:flex;flex-direction:column;gap:2vh">
        ${refs ? `<div class="data-block">\n${refs}\n        </div>` : `<p class="lead">${escapeHtml((slide.core_points || [])[0] || '')}</p>`}
        ${models ? `<div class="models-used">${models}</div>` : ''}
      </div>
      <div class="image-hero-stats" style="gap:2vw">
${statItems(slide, escapeHtml)}
      </div>
    </div>
  </div>
</section>`
}
