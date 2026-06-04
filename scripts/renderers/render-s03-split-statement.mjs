import { chromeHtml, dataRefsHtml, modelsHtml } from './render-utils.mjs'

export function renderS03(slide, escapeHtml) {
  const title = escapeHtml(slide.action_title || '')
  const points = (slide.core_points || []).slice(0, 3)
    .map((point, index) => `        <li class="split-point" style="display:grid;grid-template-columns:3.4em 1fr;gap:1.2vw;align-items:start;border-top:1px solid var(--border-subtle);padding:2.2vh 0">
          <span class="num t-meta">${String(index + 1).padStart(2, '0')}</span>
          <span class="t-body">${escapeHtml(point)}</span>
        </li>`)
    .join('\n')
  const refs = dataRefsHtml(slide, escapeHtml)
  const models = modelsHtml(slide, escapeHtml)

  return `<section class="slide light" data-layout="S03" data-page="${slide.page_no}" data-animate="statement-rise">
  <div class="canvas-card cover-split" style="display:grid;grid-template-columns:7fr 5fr;gap:5vw">
    <div class="split-left" style="display:flex;flex-direction:column;min-width:0">
      ${chromeHtml(slide, escapeHtml)}
      <p class="t-meta">S03 · Split Statement</p>
      <h2 class="h-statement" style="font-size:min(5.2vw,9.2vh);line-height:1.02;letter-spacing:-.025em;margin-top:2.4vh">${title}</h2>
      ${models ? `<div class="models-used" style="margin-top:auto">${models}</div>` : ''}
    </div>
    <div class="split-right" style="display:flex;flex-direction:column;justify-content:center;min-width:0">
      <ul class="split-points" style="list-style:none;display:flex;flex-direction:column">
${points}
      </ul>
      ${refs ? `<div class="data-block" style="margin-top:3vh">\n${refs}\n      </div>` : ''}
    </div>
  </div>
</section>`
}
