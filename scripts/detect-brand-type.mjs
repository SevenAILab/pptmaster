import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const weights = JSON.parse(readFileSync(path.join(REPO_ROOT, 'assets', 'content', 'brand-type-weights.json'), 'utf8'))

function asText(value) {
  if (Array.isArray(value)) return value.join(' ')
  return String(value || '')
}

function includesAny(value, words) {
  const text = asText(value).toLowerCase()
  return words.some(word => text.includes(word))
}

export function detectBrandType({
  category = '',
  stage = '',
  delivery_goal = '',
  has_visual = false,
  has_ops_data = false,
  audience = [],
} = {}) {
  const all = `${asText(category)} ${asText(stage)} ${asText(delivery_goal)} ${asText(audience)}`.toLowerCase()

  if (includesAny(all, ['tech_b2b', 'b2b', 'saas', 'software', 'enterprise', 'industrial', 'technology'])) {
    return { brand_type: 'strategy_charter', confidence: 0.85, reason: 'B2B/tech strategy charter route' }
  }
  if (includesAny(all, ['fnb', 'food', 'beverage', 'coffee', 'cafe', '餐饮', '咖啡', '饮品'])) {
    return { brand_type: 'new_consumer_full', confidence: 0.82, reason: 'F&B/new consumer route' }
  }
  if (includesAny(all, ['lifestyle', 'travel', 'hotel', 'wellness', '旅游', '生活方式'])) {
    return { brand_type: 'lifestyle_ops', confidence: 0.78, reason: 'Lifestyle operations route' }
  }
  if (includesAny(all, ['fashion', 'youth', 'streetwear', 'visual', '潮流', '服装', '青年'])) {
    return { brand_type: 'worldview_visual', confidence: 0.78, reason: 'Worldview/visual identity route' }
  }
  if (
    includesAny(category, ['consumer', 'retail', '消费'])
    && (includesAny(stage, ['mature', '成熟']) || includesAny(delivery_goal, ['asset', '资产']) || has_ops_data)
  ) {
    return { brand_type: 'brand_asset_story', confidence: has_visual ? 0.84 : 0.76, reason: 'Mature consumer asset route' }
  }
  return { brand_type: 'new_consumer_full', confidence: 0.55, reason: 'Default MVP route' }
}

export function chapterWeights(brandType) {
  const selected = weights[brandType]
  if (!selected) throw new Error(`unknown brand type: ${brandType}`)
  return { ...selected }
}
