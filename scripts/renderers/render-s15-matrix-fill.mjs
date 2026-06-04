import { chromeHtml, splitLabel } from './render-utils.mjs'

export function renderS15(slide, escapeHtml) {
  const title = escapeHtml(slide.action_title || '')
  const points = slide.core_points || []
  const cells = Array.from({ length: 12 }, (_, index) => splitLabel(points[index] || ''))

  return `<section class="slide light" data-layout="S15" data-page="${slide.page_no}" data-animate="matrix-fill">
  <div class="canvas-card matrix-fill">
    ${chromeHtml(slide, escapeHtml)}
    <div data-anim="line" style="display:grid;grid-template-columns:7fr 5fr;gap:4vw;align-items:end;margin-bottom:3vh">
      <div>
        <p class="t-cat">S15 · Matrix Fill</p>
        <h2 class="h-xl-zh" style="font-size:min(4.4vw,7.8vh);margin-top:2vh">${title}</h2>
      </div>
      <p class="lead">用矩阵让候选项、评估维度和取舍理由同时可见。</p>
    </div>
    <div data-anim="up" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:minmax(12vh,auto);gap:1.2vh 1vw;flex:1;min-height:0">
${cells.map((cell, index) => `      <article class="${index % 5 === 0 ? 'card-ink' : 'sub-card card-fill'}" style="padding:1.5vh 1.2vw;display:flex;flex-direction:column;justify-content:space-between;min-width:0">
        <div class="t-meta">${String(index + 1).padStart(2, '0')}</div>
        <div>
          <div class="t-h-prod">${escapeHtml(cell.label || `维度 ${index + 1}`)}</div>
          <p class="body-sm" style="margin-top:.7vh">${escapeHtml(cell.body || '待补充')}</p>
        </div>
      </article>`).join('\n')}
    </div>
  </div>
</section>`
}
