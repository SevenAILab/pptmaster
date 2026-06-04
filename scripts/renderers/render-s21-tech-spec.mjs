import { chromeHtml, splitLabel } from './render-utils.mjs'

export function renderS21(slide, escapeHtml) {
  const title = escapeHtml(slide.action_title || '')
  const points = slide.core_points || []
  const specs = [0, 1, 2].map(index => splitLabel(points[index] || `规范 ${index + 1}: 待补充`))
  const rules = [3, 4, 5, 6].map(index => splitLabel(points[index] || ''))

  return `<section class="slide light" data-layout="S21" data-page="${slide.page_no}" data-animate="tech-spec">
  <div class="canvas-card tech-spec">
    ${chromeHtml(slide, escapeHtml)}
    <div data-anim="line" style="margin-bottom:3vh">
      <p class="t-cat">S21 · Tech Spec</p>
    </div>
    <div data-anim="up" style="display:grid;grid-template-columns:4.5fr repeat(3,2.5fr);gap:2vw;align-items:start;min-height:40vh">
      <div>
        <div class="h-xl-zh" style="font-size:min(4.6vw,8.2vh);line-height:1.04">${title}</div>
        <p class="lead" style="margin-top:2vh">把品牌表达翻译成团队可以执行的规范。</p>
      </div>
${specs.map((spec, index) => `      <div style="border-top:2px solid ${index === 1 ? 'var(--accent)' : 'var(--ink)'};padding-top:1.6vh;min-width:0">
        <div class="t-meta">SPEC ${String(index + 1).padStart(2, '0')}</div>
        <div class="kpi-num" style="font-family:var(--sans),var(--sans-zh);font-weight:200;font-size:min(3.2vw,5.8vh);line-height:1;margin-top:1.2vh;color:${index === 1 ? 'var(--accent)' : 'var(--ink)'}">${escapeHtml(spec.label || `规范 ${index + 1}`)}</div>
        <p class="body-sm" style="margin-top:1vh">${escapeHtml(spec.body)}</p>
      </div>`).join('\n')}
    </div>
    <div data-anim="hero" style="display:grid;grid-template-columns:5fr 4fr 3fr;gap:3vw;align-items:end;margin-top:auto">
      <div class="bottom-hero" style="font-family:var(--sans),var(--sans-zh);font-weight:200;font-size:min(5.4vw,9.4vh);line-height:.96;color:var(--accent)">SPEC</div>
      <div style="display:flex;flex-direction:column;gap:1vh">
${rules.filter(rule => rule.label || rule.body).map(rule => `        <div style="border-top:1px solid var(--border-subtle);padding-top:.8vh">
          <span class="t-meta">${escapeHtml(rule.label || 'RULE')}</span>
          <p class="body-sm">${escapeHtml(rule.body)}</p>
        </div>`).join('\n')}
      </div>
      <div data-anim="bars" style="display:flex;align-items:end;gap:.35vw;height:14vh;justify-content:flex-end">
${Array.from({ length: 9 }, (_, index) => `        <span class="vbar" style="display:block;width:.6vw;height:${20 + index * 7}%;background:${index % 3 === 1 ? 'var(--accent)' : 'var(--ink)'}"></span>`).join('\n')}
      </div>
    </div>
  </div>
</section>`
}
