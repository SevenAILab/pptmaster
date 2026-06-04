export function modelsHtml(slide, escapeHtml, options = {}) {
  if (!options.visible) return ''

  return (slide.models_used || [])
    .map(model => `<span class="model-tag">${escapeHtml(model)}</span>`)
    .join(' ')
}

export function dataRefsHtml(slide, escapeHtml, options = {}) {
  if (!options.visible) return ''

  return (slide.data_refs || [])
    .slice(0, 3)
    .map(dataRef => `<div class="data-ref"><span class="value">${escapeHtml(dataRef.value || '')}</span><span class="source">${escapeHtml(dataRef.source || '')}</span></div>`)
    .join('\n')
}

export function chromeHtml(slide, escapeHtml, label = 'PPTAgent') {
  return `<div class="chrome-min">
      <span>${escapeHtml(label)}</span>
      <span>${escapeHtml(String(slide.page_no || ''))}</span>
    </div>`
}

export function chunkPoints(points, count) {
  return Array.from({ length: count }, (_, index) => points[index] || '')
}

export function splitLabel(text) {
  const [label, ...rest] = String(text || '').split(/[:：]/)
  return {
    label: rest.length ? label.trim() : '',
    body: (rest.length ? rest.join(':') : label).trim(),
  }
}
