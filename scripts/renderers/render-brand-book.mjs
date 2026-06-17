import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chapterWeights } from '../detect-brand-type.mjs'
import {
  filterForOutput,
  listTransformers,
  registerTransformer,
} from '../../core/output-registry.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const DEFAULT_TEMPLATE = path.join(REPO_ROOT, 'templates', 'template-brand-book.html')

export const BRAND_BOOK_MODULES = Object.freeze([
  'brand_entry',
  'market_context',
  'brand_definition',
  'audience_scenarios',
  'strategy_core',
  'narrative_system',
  'product_system',
  'visual_direction',
  'proof_growth',
  'personality_statement',
])

const MODULE_TITLES = Object.freeze({
  brand_entry: '品牌入口',
  market_context: '背景与市场',
  brand_definition: '品牌定义',
  audience_scenarios: '人群与场景',
  strategy_core: '战略核心',
  narrative_system: '叙事系统',
  product_system: '产品体系',
  visual_direction: '视觉方向',
  proof_growth: '证明与增长',
  personality_statement: '品牌人格',
})

const DEFAULT_PALETTE = Object.freeze({
  primary: '#1f3a34',
  secondary: '#d7e7df',
  accent: '#c66b2e',
  text: '#1d1d1d',
  bg: '#fbfaf7',
})

const SAFE_KEYS = new Set([
  'name',
  'slogan',
  'one_liner',
  'title',
  'subtitle',
  'body',
  'summary',
  'positioning',
  'proposition',
  'mission',
  'vision',
  'story',
  'narrative',
  'differentiation',
  'trust',
  'points',
  'bullets',
  'highlights',
  'values',
  'scenarios',
  'products',
  'proof_points',
  'sections',
  'quote',
])

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function safeId(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function isSafeKey(key) {
  const normalized = String(key || '').toLowerCase()
  if (!SAFE_KEYS.has(key)) return false
  if (normalized === 'note' || normalized === 'notes' || normalized.endsWith('_note')) return false
  if (normalized.startsWith('layout_') || normalized.includes('production')) return false
  return true
}

function renderArray(value) {
  const items = value
    .map(item => renderValue(item, { wrapObject: true }))
    .filter(Boolean)
    .map(item => `<li>${item}</li>`)
    .join('')
  return items ? `<ul>${items}</ul>` : ''
}

function renderObject(value) {
  return Object.entries(value)
    .filter(([key]) => isSafeKey(key))
    .map(([key, child]) => {
      const rendered = renderValue(child, { wrapObject: true })
      if (!rendered) return ''
      if (key === 'title' || key === 'subtitle') return ''
      return `<div class="field"><span class="field-title">${escapeHtml(labelForKey(key))}</span>${rendered}</div>`
    })
    .filter(Boolean)
    .join('')
}

function renderValue(value, { wrapObject = false } = {}) {
  if (value === null || value === undefined || value === '') return ''
  if (Array.isArray(value)) return renderArray(value)
  if (typeof value === 'object') return wrapObject ? renderObject(value) : renderObject(value)
  return escapeHtml(value)
}

function labelForKey(key) {
  return ({
    body: '',
    summary: '',
    one_liner: '',
    points: '关键要点',
    bullets: '关键要点',
    highlights: '亮点',
    values: '价值观',
    scenarios: '场景',
    products: '产品',
    proof_points: '证明',
  })[key] || key.replaceAll('_', ' ')
}

function renderContent(content) {
  const title = content.title || content.name || content.slogan || ''
  const bodyParts = Object.entries(content)
    .filter(([key]) => isSafeKey(key) && key !== 'title' && key !== 'name' && key !== 'slogan')
    .map(([key, value]) => {
      const rendered = renderValue(value, { wrapObject: true })
      if (!rendered) return ''
      if (typeof value === 'string') return `<p>${rendered}</p>`
      return `<div class="field">${key === 'body' || key === 'summary' || key === 'one_liner' ? '' : `<span class="field-title">${escapeHtml(labelForKey(key))}</span>`}${rendered}</div>`
    })
    .filter(Boolean)
    .join('')
  return { title: String(title || ''), body: bodyParts }
}

function selectedModules(content) {
  const weights = chapterWeights(content.meta.brand_type)
  const order = new Map(BRAND_BOOK_MODULES.map((kind, index) => [kind, index]))
  return filterForOutput(content, 'brand-book')
    .map(module => ({ module, weight: weights[module.kind] ?? 1 }))
    .filter(item => item.weight > 0)
    .sort((a, b) => (order.get(a.module.kind) ?? 99) - (order.get(b.module.kind) ?? 99))
}

function paletteVars(content) {
  const palette = { ...DEFAULT_PALETTE, ...(content.tonality?.palette || {}) }
  return Object.entries(palette)
    .map(([key, value]) => `--${key}: ${escapeHtml(value)};`)
    .join('\n      ')
}

function coverHtml(content) {
  const entry = (content.modules || []).find(module => module.kind === 'brand_entry' && module.visibility === 'external')
  const brandName = entry?.content?.name || content.meta.brand_slug
  const positioning = content.strategic_spine?.positioning_statement
    || entry?.content?.one_liner
    || (content.modules || []).find(module => module.kind === 'brand_definition')?.content?.positioning
    || ''
  return [
    '<header class="cover">',
    '<p class="kicker">Brand Book</p>',
    `<h1>${escapeHtml(brandName)}</h1>`,
    positioning ? `<p class="positioning">${escapeHtml(positioning)}</p>` : '',
    '</header>',
  ].join('')
}

function tocHtml(chapters) {
  const links = chapters
    .map(chapter => `<a href="#${escapeHtml(chapter.id)}">${escapeHtml(chapter.title)}</a>`)
    .join('')
  return `<nav class="toc" aria-label="目录">${links}</nav>`
}

function chapterHtml({ id, title, module, body }) {
  return [
    `<section class="chapter" id="${escapeHtml(id)}">`,
    `<p class="eyebrow">${escapeHtml(MODULE_TITLES[module.kind] || module.kind)}</p>`,
    `<h2>${escapeHtml(title || MODULE_TITLES[module.kind] || module.kind)}</h2>`,
    body,
    '</section>',
  ].join('')
}

export function renderBrandBook(content, { template = DEFAULT_TEMPLATE } = {}) {
  ensureBrandBookTransformerRegistered()
  const modules = selectedModules(content)
  if (modules.length === 0) throw new Error('no external modules available for brand-book rendering')

  const chapters = modules.map(({ module, weight }) => {
    const rendered = renderContent(module.content || {})
    const title = rendered.title || MODULE_TITLES[module.kind] || module.kind
    return {
      id: safeId(module.id || module.kind),
      title,
      weight,
      module,
      body: rendered.body || '<p></p>',
    }
  })

  const html = readFileSync(template, 'utf8')
    .replaceAll('{{TITLE}}', escapeHtml(`${content.meta.brand_slug} Brand Book`))
    .replaceAll('{{PALETTE_VARS}}', paletteVars(content))
    .replaceAll('{{COVER}}', coverHtml(content))
    .replaceAll('{{TOC}}', tocHtml(chapters))
    .replaceAll('{{CHAPTERS}}', chapters.map(chapterHtml).join('\n'))
    .replaceAll('{{FOOTER}}', escapeHtml(`Generated for ${content.meta.brand_slug}`))

  return {
    html,
    chapters_rendered: chapters.map(chapter => ({
      id: chapter.id,
      kind: chapter.module.kind,
      title: chapter.title,
      weight: chapter.weight,
    })),
  }
}

export function ensureBrandBookTransformerRegistered() {
  if (listTransformers().includes('brand-book')) return
  registerTransformer({
    type: 'brand-book',
    visibility_filter: ['external'],
    module_allowlist: [...BRAND_BOOK_MODULES],
    render: renderBrandBook,
  })
}

ensureBrandBookTransformerRegistered()
