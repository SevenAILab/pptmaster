import fs from 'node:fs'
import path from 'node:path'

function text(value) {
  return String(value ?? '').trim()
}

export function loadNonlockedSchemeConfig({ root, schemeId = 'brand_strategy' } = {}) {
  if (!root) throw new Error('loadNonlockedSchemeConfig requires root')
  const manifestPath = path.join(root, 'schemes', schemeId, 'manifest.json')
  if (!fs.existsSync(manifestPath)) throw new Error(`Scheme manifest missing: ${manifestPath}`)
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const nonlocked = manifest.nonlocked
  if (!nonlocked || !Array.isArray(nonlocked.research_angles) || nonlocked.research_angles.length === 0) {
    throw new Error(`Scheme ${schemeId} manifest 缺 nonlocked.research_angles`)
  }
  if (!Array.isArray(nonlocked.case_patterns) || nonlocked.case_patterns.length === 0) {
    throw new Error(`Scheme ${schemeId} manifest 缺 nonlocked.case_patterns`)
  }
  return nonlocked
}

export function renderResearchAngles(angles, form = {}) {
  const audience = Array.isArray(form.target_audience)
    ? form.target_audience.map(text).filter(Boolean).join('、')
    : text(form.target_audience)
  const vars = {
    name: text(form.name),
    industry: text(form.industry),
    audience,
  }
  const formField = {
    name: 'form.name',
    industry: 'form.industry',
    audience: 'form.target_audience',
  }
  return (angles || []).map(angle => String(angle).replace(/\{(name|industry|audience)\}/g, (_, key) => {
    if (!vars[key]) throw new Error(`research angle 需要 ${formField[key]}，当前为空`)
    return vars[key]
  }))
}

export function loadCasePattern({ root, file, maxChars = 1200 } = {}) {
  if (!root) throw new Error('loadCasePattern requires root')
  const filePath = path.join(root, file)
  if (!fs.existsSync(filePath)) throw new Error(`Case pattern missing: ${filePath}`)
  const raw = fs.readFileSync(filePath, 'utf8')
  return {
    file,
    name: path.basename(file, '.md'),
    content: raw.slice(0, maxChars).trim(),
  }
}
