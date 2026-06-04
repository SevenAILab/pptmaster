import { chromeHtml, dataRefsHtml, modelsHtml } from './render-utils.mjs'

export function renderS12(slide, escapeHtml) {
  const title = escapeHtml(slide.action_title || '')
  const points = slide.core_points || []
  const lead = escapeHtml(points[0] || '')
  const bannerText = escapeHtml(points[1] || slide.render_hints?.kpi_hero || 'MANIFESTO')
  const refs = dataRefsHtml(slide, escapeHtml)
  const models = modelsHtml(slide, escapeHtml)

  return `<section class="slide light" data-layout="S12" data-page="${slide.page_no}" data-animate="manifesto">
  <div class="canvas-card manifesto">
    ${chromeHtml(slide, escapeHtml)}
    <div class="manifesto-top" data-anim="line" style="display:grid;grid-template-columns:8fr 4fr;gap:4vw;align-items:flex-start;flex:1">
      <div>
        <div class="t-cat">S12 · Manifesto</div>
        <div style="font-family:var(--sans),var(--sans-zh);font-weight:200;font-size:min(5.4vw,9.6vh);line-height:1.02;letter-spacing:-.025em;margin-top:2vh">${title}</div>
      </div>
      <div style="padding-top:1.2vw">
        ${lead ? `<p class="lead">${lead}</p>` : ''}
        ${refs ? `<div class="data-block" style="margin-top:3vh">\n${refs}\n        </div>` : ''}
      </div>
    </div>
    <div class="ink-banner-full card-ink" data-anim="up" style="margin:0 -5vw -4.4vh;padding:4.2vh 5vw;display:grid;grid-template-columns:7fr 5fr;gap:3vw;align-items:center">
      <div style="font-family:var(--sans),var(--sans-zh);font-weight:200;font-size:min(4.8vw,8vh);line-height:1.02;letter-spacing:-.025em">${bannerText}</div>
      ${models ? `<div class="models-used" style="justify-self:end">${models}</div>` : ''}
    </div>
  </div>
</section>`
}
