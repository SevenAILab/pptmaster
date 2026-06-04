import { isHttpSource } from './source-tiers.mjs'

function refSource(ref) {
  return String((ref && (ref.source || ref.source_url || ref.url)) || '').trim()
}

// 统计每页是否带「网络(http)来源」/「任意来源」，给出全 deck 覆盖率。
// 纯确定性报告，不抛错——覆盖率低只是 warn 信号（有些策略判断页合法地无网络数字）。
export function reportEvidenceCoverage(deck) {
  const slides = Array.isArray(deck && deck.slides) ? deck.slides : []
  const perPage = slides.map(slide => {
    const refs = Array.isArray(slide.data_refs) ? slide.data_refs : []
    const sources = refs.map(refSource).filter(Boolean)
    return {
      page_no: slide.page_no != null ? slide.page_no : null,
      has_web_ref: sources.some(isHttpSource),
      has_any_ref: sources.length > 0,
    }
  })
  const total = perPage.length
  const pagesWithWeb = perPage.filter(p => p.has_web_ref).length
  const pagesWithAny = perPage.filter(p => p.has_any_ref).length
  return {
    total_pages: total,
    pages_with_web_ref: pagesWithWeb,
    pages_with_any_ref: pagesWithAny,
    web_ref_ratio: total ? Number((pagesWithWeb / total).toFixed(4)) : 0,
    pages_without_any_ref: perPage.filter(p => !p.has_any_ref).map(p => p.page_no),
    perPage,
  }
}
