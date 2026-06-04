import { chromeHtml, dataRefsHtml, modelsHtml, splitLabel } from './render-utils.mjs'

export function renderS13(slide, escapeHtml) {
  const title = escapeHtml(slide.action_title || '')
  const forceCards = (slide.core_points || []).slice(0, 3).map((point, index) => {
    const parsed = splitLabel(point)
    return `          <article class="force-card card-fill" style="padding:2.2vh 2vw;display:grid;grid-template-columns:5em 1fr;gap:1.4vw;align-items:start">
            <div class="force-num" style="font-family:var(--sans);font-weight:200;font-size:min(5.8vw,9vh);line-height:.9;color:var(--accent)">${String(index + 1).padStart(2, '0')}</div>
            <div>
              <h3 class="t-h-prod">${escapeHtml(parsed.label || `Force ${index + 1}`)}</h3>
              <p class="t-body" style="margin-top:.8vh">${escapeHtml(parsed.body)}</p>
            </div>
          </article>`
  }).join('\n')
  const refs = dataRefsHtml(slide, escapeHtml)
  const models = modelsHtml(slide, escapeHtml)

  return `<section class="slide light" data-layout="S13" data-page="${slide.page_no}" data-animate="three-forces">
  <div class="canvas-card three-forces">
    ${chromeHtml(slide, escapeHtml)}
    <div data-anim="up" style="display:grid;grid-template-columns:5fr 7fr;gap:3vw;flex:1;min-height:0">
      <div class="hero-ink-col card-ink" style="padding:3.2vh 2.4vw;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden">
        <span class="dot-mat dense" style="position:absolute;right:1vw;bottom:2vh;width:14vw;height:14vw;color:rgba(255,255,255,.5)"></span>
        <div>
          <div class="t-cat">S13 · Three Forces</div>
          <h2 class="h-xl-zh" style="font-size:min(4.4vw,7.8vh);margin-top:2vh;color:var(--paper)">${title}</h2>
        </div>
        ${models ? `<div class="models-used">${models}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:1.6vh;justify-content:center">
${forceCards}
        ${refs ? `<div class="data-block">\n${refs}\n        </div>` : ''}
      </div>
    </div>
  </div>
</section>`
}
