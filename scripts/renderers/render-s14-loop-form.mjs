import { chromeHtml, splitLabel } from './render-utils.mjs'

function pointAt(points, index, fallback) {
  return splitLabel(points[index] || fallback)
}

export function renderS14(slide, escapeHtml) {
  const title = escapeHtml(slide.action_title || '')
  const points = slide.core_points || []
  const steps = [0, 1, 2, 3].map(index => pointAt(points, index, `Step ${index + 1}: 待补充`))
  const labels = steps.map((step, index) => escapeHtml(step.label || `STEP ${index + 1}`))

  return `<section class="slide light" data-layout="S14" data-page="${slide.page_no}" data-animate="loop-form">
  <div class="canvas-card loop-form">
    ${chromeHtml(slide, escapeHtml)}
    <div data-anim="line" style="display:grid;grid-template-columns:5fr 7fr;gap:4vw;align-items:end;margin-bottom:3vh">
      <div>
        <p class="t-cat">S14 · Loop Form</p>
        <h2 class="h-xl-zh" style="font-size:min(4.6vw,8.2vh);margin-top:2vh">${title}</h2>
      </div>
      <p class="lead">把一次性动作设计成可积累的品牌资产闭环。</p>
    </div>
    <div data-anim="up" style="display:grid;grid-template-columns:5fr 7fr;gap:4vw;flex:1;align-items:center;min-height:0">
      <div style="display:flex;flex-direction:column;gap:1.2vh">
${steps.map((step, index) => `        <div class="sub-card card-fill" style="padding:1.8vh 1.6vw;margin-left:${index * 1.1}vw;display:grid;grid-template-columns:3.8em 1fr;gap:1vw;align-items:start">
          <div class="t-meta">${String(index + 1).padStart(2, '0')}</div>
          <div>
            <div class="t-h-prod">${escapeHtml(step.label || `Step ${index + 1}`)}</div>
            <p class="t-body" style="margin-top:.7vh">${escapeHtml(step.body)}</p>
          </div>
        </div>`).join('\n')}
      </div>
      <div style="position:relative;min-height:58vh">
        <svg viewBox="0 0 640 520" style="width:100%;height:58vh;display:block">
          <defs>
            <marker id="s14-arrow-${slide.page_no}" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="var(--accent)"></path>
            </marker>
          </defs>
          <circle cx="320" cy="260" r="190" fill="none" stroke="var(--border-subtle)" stroke-width="2"></circle>
          <circle cx="320" cy="82" r="34" fill="var(--accent)"></circle>
          <circle cx="506" cy="260" r="34" fill="var(--ink)"></circle>
          <circle cx="320" cy="438" r="34" fill="var(--accent)"></circle>
          <circle cx="134" cy="260" r="34" fill="var(--ink)"></circle>
          <path d="M365 98 C455 132 500 188 506 222" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#s14-arrow-${slide.page_no})"></path>
          <path d="M490 304 C455 388 396 430 358 438" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#s14-arrow-${slide.page_no})"></path>
          <path d="M276 430 C198 394 145 340 136 298" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#s14-arrow-${slide.page_no})"></path>
          <path d="M150 216 C184 134 244 92 282 84" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#s14-arrow-${slide.page_no})"></path>
        </svg>
        <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center">
          <div class="t-cat">LOOP</div>
          <div class="h-md" style="font-size:min(2.8vw,5vh);color:var(--accent)">持续积累</div>
        </div>
        <div class="t-meta" style="position:absolute;left:50%;top:5%;transform:translateX(-50%)">${labels[0]}</div>
        <div class="t-meta" style="position:absolute;right:2%;top:50%;transform:translateY(-50%)">${labels[1]}</div>
        <div class="t-meta" style="position:absolute;left:50%;bottom:5%;transform:translateX(-50%)">${labels[2]}</div>
        <div class="t-meta" style="position:absolute;left:2%;top:50%;transform:translateY(-50%)">${labels[3]}</div>
      </div>
    </div>
  </div>
</section>`
}
