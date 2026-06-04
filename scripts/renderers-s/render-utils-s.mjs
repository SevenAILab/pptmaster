export function escapeHtml(value) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function titleBar(label = 'PPTAgent', meta = '') {
  return `<div class="TB"><span class="logo">${escapeHtml(label)}</span><span class="meta">${escapeHtml(meta)}</span></div>`
}

export function footer(slide) {
  const page = escapeHtml(String(slide?.page_no || ''))
  return `<div class="PF PFR">${page}</div>`
}

// 真实 <table>：转换器会把它变成可编辑的原生 PPT 表格（XML <a:tbl>）。
export function nativeTableHtml(headers = [], rows = []) {
  const thead = `<tr>${headers.map(header => `<th>${escapeHtml(String(header))}</th>`).join('')}</tr>`
  const tbody = rows
    .map(row => `<tr>${(row || []).map(cell => `<td>${escapeHtml(String(cell))}</td>`).join('')}</tr>`)
    .join('')
  return `<table data-pptx-role="native-table" class="ntbl"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`
}

// 把 "标签：正文" 形式的要点拆成卡片标题+正文。
// 仅当冒号前缀较短(<=14 且非句首)才视为标签；否则整句作正文。
// 这是对既有文字的视觉重组，不编造任何内容（红线：不伪造）。
export function splitLabel(point) {
  const value = String(point == null ? '' : point).trim()
  const index = value.search(/[:：]/)
  if (index > 0 && index <= 14) {
    const label = value.slice(0, index).trim()
    const detail = value.slice(index + 1).trim()
    if (label && detail) return { label, detail }
  }
  return { label: '', detail: value }
}
