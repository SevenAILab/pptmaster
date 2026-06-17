import assert from 'node:assert/strict'
import { chapterWeights, detectBrandType } from './detect-brand-type.mjs'

assert.equal(detectBrandType({
  category: 'tech_b2b',
  stage: 'new',
  delivery_goal: 'external_intro',
  has_visual: false,
  has_ops_data: false,
}).brand_type, 'strategy_charter')

assert.equal(detectBrandType({
  category: 'fnb',
  stage: 'new',
  delivery_goal: 'channel',
  has_visual: true,
  has_ops_data: false,
}).brand_type, 'new_consumer_full')

assert.equal(detectBrandType({
  category: 'consumer',
  stage: 'mature',
  delivery_goal: 'asset',
  has_visual: true,
  has_ops_data: true,
}).brand_type, 'brand_asset_story')

assert.equal(detectBrandType({ category: 'travel', stage: 'growth' }).brand_type, 'lifestyle_ops')
assert.equal(detectBrandType({ category: 'fashion', audience: ['youth'] }).brand_type, 'worldview_visual')
assert.equal(chapterWeights('lifestyle_ops').proof_growth, 3)
assert.throws(() => chapterWeights('unknown'), /unknown brand type/i)

console.log('✅ detect-brand-type tests passed')
