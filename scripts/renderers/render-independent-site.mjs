import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  filterForOutput,
  listTransformers,
  registerTransformer,
} from '../../core/output-registry.mjs'
import { BRAND_BOOK_MODULES } from './render-brand-book.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const DEFAULT_TEMPLATE = path.join(REPO_ROOT, 'templates', 'template-independent-site.html')
const DEFAULT_PALETTE = { primary: '#1f3a34', secondary: '#d7e7df', accent: '#c66b2e', text: '#1d1d1d', bg: '#fbfaf7' }
const SAFE_KEYS = new Set(['name', 'slogan', 'one_liner', 'title', 'body', 'summary', 'points', 'bullets', 'values', 'products', 'proof_points'])

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function safeId(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
}

function safeKey(key) {
  const normalized = String(key || '').toLowerCase()
  return SAFE_KEYS.has(key) && !normalized.endsWith('_note') && !normalized.includes('production') && !normalized.startsWith('layout_')
}

function renderValue(value) {
  if (value === null || value === undefined || value === '') return ''
  if (Array.isArray(value)) return `<ul>${value.map(item => `<li>${renderValue(item)}</li>`).join('')}</ul>`
  if (typeof value === 'object') {
    return Object.entries(value).filter(([key]) => safeKey(key)).map(([, child]) => renderValue(child)).join('')
  }
  return escapeHtml(value)
}

function paletteVars(content) {
  const palette = { ...DEFAULT_PALETTE, ...(content.tonality?.palette || {}) }
  return Object.entries(palette).map(([key, value]) => `--${key}: ${escapeHtml(value)};`).join('\n      ')
}

function hero(content) {
  const entry = (content.modules || []).find(module => module.kind === 'brand_entry' && module.visibility === 'external')
  const name = entry?.content?.name || content.meta.brand_slug
  const slogan = entry?.content?.slogan || content.strategic_spine?.positioning_statement || ''
  const oneLiner = entry?.content?.one_liner || content.strategic_spine?.proposition || ''
  return [
    '<header class="hero">',
    `<h1>${escapeHtml(name)}</h1>`,
    slogan ? `<p class="slogan">${escapeHtml(slogan)}</p>` : '',
    oneLiner ? `<p class="one-liner">${escapeHtml(oneLiner)}</p>` : '',
    '</header>',
  ].join('')
}

function sectionFor(module) {
  const title = module.content?.title || module.content?.name || module.kind
  const body = Object.entries(module.content || {})
    .filter(([key]) => safeKey(key) && !['title', 'name', 'slogan'].includes(key))
    .map(([, value]) => {
      const rendered = renderValue(value)
      return typeof value === 'string' ? `<p>${rendered}</p>` : rendered
    })
    .filter(Boolean)
    .join('')
  return `<section id="${escapeHtml(safeId(module.id || module.kind))}"><h2>${escapeHtml(title)}</h2>${body || '<p></p>'}</section>`
}

export function renderIndependentSite(content, { template = DEFAULT_TEMPLATE } = {}) {
  ensureIndependentSiteTransformerRegistered()
  const modules = filterForOutput(content, 'independent-site')
  if (modules.length === 0) throw new Error('no external modules available for independent-site rendering')
  const html = readFileSync(template, 'utf8')
    .replaceAll('{{TITLE}}', escapeHtml(`${content.meta.brand_slug} Site`))
    .replaceAll('{{PALETTE_VARS}}', paletteVars(content))
    .replaceAll('{{HERO}}', hero(content))
    .replaceAll('{{SECTIONS}}', modules.map(sectionFor).join('\n'))
    .replaceAll('{{CTA}}', `<aside class="cta"><strong>${escapeHtml(content.strategic_spine?.proposition || '让品牌表达更清晰、更可信。')}</strong></aside>`)
  return {
    html,
    sections_rendered: modules.map(module => ({ id: module.id, kind: module.kind })),
  }
}

export function ensureIndependentSiteTransformerRegistered() {
  if (listTransformers().includes('independent-site')) return
  registerTransformer({
    type: 'independent-site',
    visibility_filter: ['external'],
    module_allowlist: [...BRAND_BOOK_MODULES],
    render: renderIndependentSite,
  })
}

ensureIndependentSiteTransformerRegistered()
