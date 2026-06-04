import { chromeHtml, splitLabel } from './render-utils.mjs'

export function renderS19(slide, escapeHtml) {
  const title = escapeHtml(slide.action_title || '')
  const cards = Array.from({ length: 4 }, (_, index) => splitLabel((slide.core_points || [])[index] || `资产 ${index + 1}: 待补充`))

  return `<section class="slide light" data-layout="S19" data-page="${slide.page_no}" data-animate="four-cards">
  <div class="canvas-card four-cards">
    ${chromeHtml(slide, escapeHtml)}
    <div data-anim="line" style="display:flex;flex-direction:column;gap:2vh;margin-bottom:3vh">
      <div style="height:2px;background:var(--accent);width:100%"></div>
      <div style="display:grid;grid-template-columns:8fr 4fr;gap:4vw;align-items:end">
        <h2 class="h-xl-zh" style="font-size:min(4.6vw,8.2vh)">${title}</h2>
        <p class="lead">把策略拆成少数可识别、可运营、可复用的资产单元。</p>
      </div>
    </div>
    <div data-anim="up" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1.4vw;flex:1;min-height:0">
${cards.map((card, index) => `      <article class="${index === 0 ? 'card-ink' : 'sub-card card-fill'}" style="padding:2.4vh 1.6vw;display:flex;flex-direction:column;justify-content:space-between;min-width:0">
        <div class="num-mega" style="font-size:min(5vw,8.8vh);line-height:.9;color:${index === 0 ? 'var(--paper)' : 'var(--accent)'}">${String(index + 1).padStart(2, '0')}</div>
        <div>
          <div class="t-h-prod">${escapeHtml(card.label || `资产 ${index + 1}`)}</div>
          <p class="t-body" style="margin-top:1.2vh">${escapeHtml(card.body)}</p>
        </div>
      </article>`).join('\n')}
    </div>
  </div>
</section>`
}
