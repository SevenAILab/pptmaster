import { chromeHtml, dataRefsHtml, modelsHtml, splitLabel } from './render-utils.mjs'

export function renderS17(slide, escapeHtml) {
  const title = escapeHtml(slide.action_title || '')
  const points = (slide.core_points || []).slice(0, 3).map(splitLabel)
  while (points.length < 3) points.push({ label: `Layer ${points.length + 1}`, body: '' })
  const refs = dataRefsHtml(slide, escapeHtml)
  const models = modelsHtml(slide, escapeHtml)
  const labels = points.map((point, index) => escapeHtml(point.label || ['Core', 'Middle', 'Outer'][index]))

  return `<section class="slide light" data-layout="S17" data-page="${slide.page_no}" data-animate="system-diagram">
  <div class="canvas-card system-diagram">
    ${chromeHtml(slide, escapeHtml)}
    <div data-anim="up" style="display:grid;grid-template-columns:5fr 7fr;gap:4vw;flex:1;align-items:center">
      <div>
        <p class="t-cat">S17 · System Diagram</p>
        <h2 class="h-xl-zh" style="font-size:min(4.6vw,8.2vh);margin-top:2vh">${title}</h2>
        <div style="display:flex;flex-direction:column;gap:1.4vh;margin-top:4vh">
          ${points.map((point, index) => `<div style="border-top:1px solid var(--border-subtle);padding-top:1.3vh">
            <div class="t-meta">${String(index + 1).padStart(2, '0')} · ${escapeHtml(point.label || `Layer ${index + 1}`)}</div>
            <p class="t-body" style="margin-top:.6vh">${escapeHtml(point.body)}</p>
          </div>`).join('\n')}
        </div>
        ${refs ? `<div class="data-block" style="margin-top:3vh">\n${refs}\n        </div>` : ''}
      </div>
      <div style="position:relative;min-height:58vh">
        <svg class="sys-svg" viewBox="0 0 600 600" style="width:100%;height:58vh;display:block">
          <circle cx="300" cy="300" r="230" fill="none" stroke="var(--border-subtle)" stroke-width="1"></circle>
          <circle cx="300" cy="300" r="150" fill="none" stroke="var(--accent)" stroke-width="2"></circle>
          <circle cx="300" cy="300" r="72" fill="var(--ink)" stroke="none"></circle>
          <path d="M300 70 L300 145" stroke="var(--accent)" stroke-width="1"></path>
          <path d="M498 398 L430 365" stroke="var(--accent)" stroke-width="1"></path>
          <path d="M105 405 L170 368" stroke="var(--accent)" stroke-width="1"></path>
        </svg>
        <div class="sys-label" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:var(--paper);font-family:var(--mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase">${labels[0]}</div>
        <div class="sys-label" style="position:absolute;left:50%;top:18%;transform:translateX(-50%);font-family:var(--mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase">${labels[1]}</div>
        <div class="sys-label" style="position:absolute;right:1vw;bottom:18%;font-family:var(--mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase">${labels[2]}</div>
      </div>
    </div>
    ${models ? `<div class="models-used">${models}</div>` : ''}
  </div>
</section>`
}
