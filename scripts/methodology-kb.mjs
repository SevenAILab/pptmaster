import fs from 'node:fs'
import path from 'node:path'

const GOLDEN_DIR = 'assets/_compiled/concepts-golden'

function text(value) {
  return String(value ?? '').trim()
}

function stripOuterQuotes(value) {
  return text(value).replace(/^['"]|['"]$/g, '').trim()
}

export function parseConceptDoc(raw) {
  const value = String(raw || '')
  const nameMatch = value.match(/^name:\s*(.+)$/m)
  const titleMatch = value.match(/^#\s+(.+)$/m)
  const name = stripOuterQuotes(nameMatch?.[1]) || stripOuterQuotes(titleMatch?.[1])
  if (!name) throw new Error('Concept doc missing name/title')

  let definition = ''
  const defSection = value.match(/^##\s*定义\s*\n+([\s\S]*?)(?=\n##\s|$)/m)
  if (defSection) {
    definition = text(defSection[1].split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('```') && !line.startsWith('>'))[0] || '')
  }
  if (!definition && titleMatch) {
    const after = value.slice(value.indexOf(titleMatch[0]) + titleMatch[0].length)
    definition = text(after.split('\n').map(line => line.trim()).filter(Boolean)[0] || '')
  }
  return { name, definition }
}

export function loadConceptIndex({ root } = {}) {
  if (!root) throw new Error('loadConceptIndex requires root')
  const dir = path.join(root, GOLDEN_DIR)
  const files = fs.readdirSync(dir)
    .filter(file => file.endsWith('.md') && file !== 'INDEX.md')
    .sort()
  const index = files.map(file => {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8')
    const { name, definition } = parseConceptDoc(raw)
    return {
      slug: file.replace(/\.md$/, ''),
      name,
      definition,
      file: `${GOLDEN_DIR}/${file}`,
    }
  })
  if (index.length === 0) throw new Error(`No golden concepts found in ${dir}`)
  return index
}

export function buildConceptSelectionPrompt({ brief, index, max = 4 } = {}) {
  const system = [
    '你是品牌策略方法论路由器。从给定的框架清单中，为这个客户案子挑选最相关的框架。',
    `最多选 ${max} 个，至少选 2 个。只能从清单中的 slug 里选，不要发明新的。`,
    '选择标准：能直接回答该客户根问题的主框架优先；功能重叠的框架只选一个。',
    '只输出 JSON：{"selected":[{"slug":"...","why":"一句话"}]}，不要解释。',
  ].join('\n')
  const lines = (index || []).map(item =>
    `- ${item.slug} | ${item.name} | ${text(item.definition).slice(0, 80)}`,
  )
  const user = [
    '# 客户表单',
    brief?.formText || JSON.stringify(brief?.form || {}, null, 2),
    '',
    '# 根问题',
    brief?.strategicQuestion || '',
    '',
    '# 可选框架清单',
    ...lines,
  ].join('\n')
  return { system, user }
}

export function parseConceptSelection(value, index, { max = 4 } = {}) {
  const rawText = String(value || '')
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = fenced ? fenced[1] : rawText
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object in concept selection: ${rawText.slice(0, 200)}`)
  }
  const parsed = JSON.parse(raw.slice(start, end + 1))
  const known = new Set((index || []).map(item => item.slug))
  const selected = (Array.isArray(parsed?.selected) ? parsed.selected : [])
    .map(entry => text(entry?.slug))
    .filter(Boolean)
  const invalid = selected.filter(slug => !known.has(slug))
  if (invalid.length) throw new Error(`Unknown concept slugs: ${invalid.join(', ')}`)
  const unique = [...new Set(selected)].slice(0, max)
  if (unique.length === 0) throw new Error('Concept selection returned no valid slugs')
  return unique
}

export async function selectConcepts({ brief, index, callModel, max = 4 } = {}) {
  if (typeof callModel !== 'function') throw new Error('selectConcepts requires callModel')
  const { system, user } = buildConceptSelectionPrompt({ brief, index, max })
  const response = await callModel(system, user)
  return parseConceptSelection(typeof response === 'string' ? response : response?.text, index, { max })
}

export function buildQuerySelectionPrompt({ query, index, max = 2 } = {}) {
  const system = [
    '你是品牌策略方法论路由器。现在一份方案的某些页被评审指出论证缺口，请从框架清单中挑选最能补上该缺口的框架。',
    `最多选 ${max} 个，可以只选 1 个。只能从清单中的 slug 里选，不要发明新的。`,
    '只输出 JSON：{"selected":[{"slug":"...","why":"一句话"}]}，不要解释。',
  ].join('\n')
  const lines = (index || []).map(item =>
    `- ${item.slug} | ${item.name} | ${text(item.definition).slice(0, 80)}`,
  )
  const user = [
    '# 评审指出的缺口',
    String(query || ''),
    '',
    '# 可选框架清单',
    ...lines,
  ].join('\n')
  return { system, user }
}

export async function selectConceptsForQuery({ query, index, callModel, max = 2 } = {}) {
  if (typeof callModel !== 'function') throw new Error('selectConceptsForQuery requires callModel')
  const { system, user } = buildQuerySelectionPrompt({ query, index, max })
  const response = await callModel(system, user)
  return parseConceptSelection(typeof response === 'string' ? response : response?.text, index, { max })
}

export function loadConceptBodies({ slugs, root, maxCharsPerConcept = 1200 } = {}) {
  if (!root) throw new Error('loadConceptBodies requires root')
  return (slugs || []).map(slug => {
    const filePath = path.join(root, GOLDEN_DIR, `${slug}.md`)
    if (!fs.existsSync(filePath)) throw new Error(`Concept file missing: ${filePath}`)
    const raw = fs.readFileSync(filePath, 'utf8')
    const { name } = parseConceptDoc(raw)
    const withoutFrontmatter = raw.replace(/^---[\s\S]*?---\s*/, '')
    return {
      slug,
      name,
      content: withoutFrontmatter.slice(0, maxCharsPerConcept).trim(),
    }
  })
}
