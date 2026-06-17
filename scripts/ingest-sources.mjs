function stripHtml(value) {
  return String(value || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')
}

function normalizeItem(item, index) {
  const type = String(item?.type || '').trim()
  if (!['text', 'note', 'url', 'file'].includes(type)) throw new Error(`unsupported source type: ${type}`)
  const source = type === 'url' || type === 'file' ? String(item.value || `source-${index + 1}`) : type
  const raw = type === 'url' ? (item.fetched || item.value) : item.value
  const text = type === 'url' ? stripHtml(raw) : String(raw || '')
  if (!text.trim()) throw new Error(`source item ${index + 1} is empty`)
  return { type, source, text: text.trim() }
}

function extractJsonObject(value) {
  const rawText = String(value || '')
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = fenced ? fenced[1] : rawText
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('ingest response must contain JSON object')
  return JSON.parse(raw.slice(start, end + 1))
}

export async function ingestSources({ items = [], callModel } = {}) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('ingestSources requires items[]')
  if (typeof callModel !== 'function') throw new Error('ingestSources requires callModel')
  const normalized = items.map(normalizeItem)
  const system = [
    '你是品牌 intake 的资料归一器。请把多源乱料归一成 pre-brief。',
    '每条关键结论必须保留 raw_spans 来源。',
    '只输出 JSON：{"brand_basics":{},"problem":"","opportunity":"","audience_hint":"","product_hint":"","tonality_hint":[],"raw_spans":[{"source","span"}]}。',
  ].join('\n')
  const user = normalized.map((item, index) => [
    `# source ${index + 1}`,
    `type: ${item.type}`,
    `source: ${item.source}`,
    item.text,
  ].join('\n')).join('\n\n')
  const parsed = extractJsonObject(await callModel(system, user))
  return {
    brand_basics: parsed.brand_basics || {},
    problem: String(parsed.problem || ''),
    opportunity: String(parsed.opportunity || ''),
    audience_hint: String(parsed.audience_hint || ''),
    product_hint: String(parsed.product_hint || ''),
    tonality_hint: Array.isArray(parsed.tonality_hint) ? parsed.tonality_hint : [],
    raw_spans: Array.isArray(parsed.raw_spans) ? parsed.raw_spans : [],
  }
}
