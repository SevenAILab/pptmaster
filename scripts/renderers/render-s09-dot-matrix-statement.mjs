import { chromeHtml, modelsHtml } from './render-utils.mjs'

export function renderS09(slide, escapeHtml) {
  const title = escapeHtml(slide.action_title || '')
  const subtitle = escapeHtml((slide.core_points || [])[0] || '')
  const models = modelsHtml(slide, escapeHtml)

  return `<section class="slide light" data-layout="S09" data-page="${slide.page_no}" data-animate="matrix-statement">
  <div class="canvas-card dot-matrix-statement" style="position:relative">
    ${chromeHtml(slide, escapeHtml)}
    <span class="ring-mat" style="position:absolute;left:5vw;bottom:9vh;width:18vw;height:18vw;color:var(--ink)"></span>
    <span class="dot-mat lg" style="position:absolute;right:0;top:0;width:34vw;height:34vw;color:var(--accent)"></span>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;max-width:78vw">
      <p class="t-meta">S09 · Dot Matrix Statement</p>
      <h2 class="h-statement" style="font-size:min(5.2vw,9.2vh);line-height:1.02;letter-spacing:-.025em;margin-top:2.4vh">${title}</h2>
      ${subtitle ? `<p class="lead" style="max-width:56ch;margin-top:3vh">${subtitle}</p>` : ''}
    </div>
    ${models ? `<div class="models-used">${models}</div>` : ''}
  </div>
</section>`
}
