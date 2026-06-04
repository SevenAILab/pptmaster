import { chromeHtml, dataRefsHtml, modelsHtml, splitLabel } from './render-utils.mjs'

export function renderS05(slide, escapeHtml) {
  const title = escapeHtml(slide.action_title || '')
  const points = slide.core_points || []
  const layers = [0, 1, 2].map(index => {
    const point = splitLabel(points[index] || points[0] || '')
    return {
      kicker: point.label || ['STRATEGY', 'MIND', 'ACTION'][index],
      body: point.body || '',
    }
  })
  const layerHtml = layers.map((layer, index) => `        <article class="sub-card card-fill" style="padding:2.6vh 2vw;display:grid;grid-template-columns:4.2em 1fr;gap:1.4vw;align-items:start;min-height:16vh">
          <div class="num-mega" style="font-size:min(4.4vw,7.6vh);color:${index === 1 ? 'var(--accent)' : 'var(--ink)'}">${String(index + 1).padStart(2, '0')}</div>
          <div>
            <div class="t-cat">${escapeHtml(layer.kicker)}</div>
            <p class="t-body" style="margin-top:1vh">${escapeHtml(layer.body)}</p>
          </div>
        </article>`).join('\n')
  const refs = dataRefsHtml(slide, escapeHtml)
  const models = modelsHtml(slide, escapeHtml)

  return `<section class="slide light" data-layout="S05" data-page="${slide.page_no}" data-animate="sub-stack">
  <div class="canvas-card">
    ${chromeHtml(slide, escapeHtml)}
    <div class="three-layers grid-2-4-8" style="flex:1;align-items:stretch">
      <div class="lead-col" style="display:flex;flex-direction:column;min-width:0">
        <span class="t-cat">S05 · Three Layers</span>
        <h2 class="h-xl-zh" style="font-size:min(4.8vw,8.4vh);margin-top:2vh">${title}</h2>
        ${refs ? `<div class="data-block" style="margin-top:auto">\n${refs}\n        </div>` : ''}
        ${models ? `<div class="models-used" style="margin-top:2vh">${models}</div>` : ''}
      </div>
      <div class="sub-card-stack" style="display:flex;flex-direction:column;gap:2vh;justify-content:center">
${layerHtml}
      </div>
    </div>
  </div>
</section>`
}
