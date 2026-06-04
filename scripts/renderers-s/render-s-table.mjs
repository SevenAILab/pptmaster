import { escapeHtml, footer, nativeTableHtml, titleBar } from './render-utils-s.mjs'

export function renderSTable(slide) {
  const title = escapeHtml(slide.action_title || '')
  const table = slide.table
  let headers
  let rows

  if (table && Array.isArray(table.headers) && Array.isArray(table.rows)) {
    headers = table.headers
    rows = table.rows
  } else {
    // 兜底：把 "维度：说明" 形式的要点拆成两列表（不编造内容，仅拆分既有文本）。
    headers = ['维度', '说明']
    rows = (slide.core_points || []).map(point => {
      const value = String(point)
      const index = value.search(/[:：]/)
      return index >= 0 ? [value.slice(0, index).trim(), value.slice(index + 1).trim()] : ['', value]
    })
  }

  return `<section class="S" data-page="${escapeHtml(String(slide.page_no || ''))}" data-layout="table">
  ${titleBar('PPTAgent', slide.section || '')}
  <div class="TS"><h1>${title}</h1></div>
  <div class="BA">${nativeTableHtml(headers, rows)}</div>
  ${footer(slide)}
</section>`
}
