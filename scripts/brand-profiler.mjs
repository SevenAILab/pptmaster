const HEX_RE = /^#?[0-9a-fA-F]{6}$/

function normalizeHex(value) {
  const text = String(value || '').trim()
  if (!HEX_RE.test(text)) return ''
  return text.startsWith('#') ? text : `#${text}`
}

function extractJsonObject(value) {
  const rawText = String(value || '')
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = fenced ? fenced[1] : rawText
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('palette response must contain JSON object')
  return JSON.parse(raw.slice(start, end + 1))
}

function deterministicPalette(tonality = {}) {
  const text = [...(tonality.keywords || []), ...(tonality.reference_brands || [])].join(' ')
  if (/科技|冷静|专业|B2B|软件/.test(text)) {
    return { primary: '#1f4f6f', secondary: '#d8e7ef', accent: '#3f8fbf', text: '#18242c', bg: '#f7fbfd' }
  }
  if (/自然|温暖|克制|观夏|大地/.test(text)) {
    return { primary: '#7a5c3e', secondary: '#e7ddcc', accent: '#c2703d', text: '#2b2a20', bg: '#faf6ef' }
  }
  if (/年轻|潮流|视觉|大胆/.test(text)) {
    return { primary: '#26214f', secondary: '#e2def8', accent: '#d9487d', text: '#17151f', bg: '#fbf9ff' }
  }
  return { primary: '#1f3a34', secondary: '#d7e7df', accent: '#c66b2e', text: '#1d1d1d', bg: '#fbfaf7' }
}

function validatePalette(palette) {
  const normalized = {}
  for (const key of ['primary', 'secondary', 'accent', 'text', 'bg']) {
    normalized[key] = normalizeHex(palette?.[key])
    if (!normalized[key]) throw new Error(`invalid palette ${key}: ${palette?.[key]}`)
  }
  return normalized
}

export async function buildPalette({ tonality = {}, callModel } = {}) {
  if (typeof callModel === 'function') {
    const system = '你是品牌视觉策略师。请根据调性输出 5 个十六进制颜色，只输出 JSON：{"primary","secondary","accent","text","bg"}。'
    const user = JSON.stringify(tonality, null, 2)
    return validatePalette(extractJsonObject(await callModel(system, user)))
  }
  return validatePalette(deterministicPalette(tonality))
}

export function applyPaletteToContent(content, palette) {
  return {
    ...content,
    tonality: {
      ...content.tonality,
      palette: validatePalette(palette),
    },
  }
}
