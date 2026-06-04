import assert from 'node:assert/strict'
import { renderFallback } from './render-fallback.mjs'
import { renderS03 } from './render-s03-split-statement.mjs'
import { renderS05 } from './render-s05-three-layers.mjs'
import { renderS09 } from './render-s09-dot-matrix-statement.mjs'
import { renderS12 } from './render-s12-manifesto.mjs'
import { renderS13 } from './render-s13-three-forces.mjs'
import { renderS14 } from './render-s14-loop-form.mjs'
import { renderS15 } from './render-s15-matrix-fill.mjs'
import { renderS17 } from './render-s17-system-diagram.mjs'
import { renderS19 } from './render-s19-four-cards.mjs'
import { renderS21 } from './render-s21-tech-spec.mjs'
import { renderS22 } from './render-s22-image-hero.mjs'

const escapeHtml = value => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

const html = renderFallback({
  page_no: 1,
  layout: 'S99',
  action_title: '测试降级渲染',
  core_points: ['第一点', '第二点'],
  data_refs: [{ value: '100%', source: '测试来源' }],
  models_used: ['Test-Model'],
}, escapeHtml)

assert.ok(html.includes('data-layout="S99"'))
assert.ok(html.includes('fallback render'))
assert.ok(html.includes('测试降级渲染'))
assert.ok(!html.includes('Test-Model'))

const baseSlide = {
  page_no: 2,
  action_title: '从配件供应商升级为全球影像场景产品生态开创者',
  core_points: ['战略层: 定位', '心智层: 主张', '落地层: 产品系列', '复盘指标: KPI'],
  data_refs: [{ value: 'page-124', source: 'assets/_raw/cases/标杆案例/smallrig/page-124.md' }],
  models_used: ['Brand-House', 'OKR'],
  render_hints: { kpi_hero: 'FREE YOUR DREAM' },
}

for (const [name, renderer, className] of [
  ['S03', renderS03, 'cover-split'],
  ['S05', renderS05, 'three-layers'],
  ['S09', renderS09, 'dot-mat'],
  ['S12', renderS12, 'ink-banner-full'],
  ['S13', renderS13, 'three-forces'],
  ['S14', renderS14, 'loop-form'],
  ['S15', renderS15, 'matrix-fill'],
  ['S17', renderS17, 'system-diagram'],
  ['S19', renderS19, 'four-cards'],
  ['S21', renderS21, 'tech-spec'],
  ['S22', renderS22, 'image-hero'],
]) {
  const rendered = renderer({ ...baseSlide, layout: name }, escapeHtml)
  assert.ok(rendered.includes(`data-layout="${name}"`), `${name} should preserve data-layout`)
  assert.ok(rendered.includes(className), `${name} should include ${className}`)
  assert.ok(rendered.includes('从配件供应商升级'), `${name} should render title`)
  if (name === 'S22') {
    assert.ok(rendered.includes('data-image-slot="s22-hero-21x9"'), 'S22 should bind hero image slot')
  }
}

console.log('✅ renderers test passed')
