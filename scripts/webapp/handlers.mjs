import fs from 'node:fs'
import path from 'node:path'

function text(value) {
  return String(value ?? '').trim()
}

const REQUIRED_FORM_FIELDS = [
  'name',
  'industry',
  'stage',
  'core_products',
  'target_audience',
  'competitors',
  'budget_level',
  'tonality',
]

function runDirFor(root, slug) {
  return path.join(root, 'outputs', `${slug}-fullcase`)
}

function readRecentEvents(runDir) {
  try {
    return fs.readFileSync(path.join(runDir, 'events.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .slice(-10)
      .map(line => JSON.parse(line))
  } catch {
    return []
  }
}

export function createRun({ root, payload } = {}) {
  if (!root) throw new Error('createRun requires root')
  const form = payload?.form || {}
  for (const field of REQUIRED_FORM_FIELDS) {
    const value = form[field]
    const empty = Array.isArray(value)
      ? value.map(text).filter(Boolean).length === 0
      : !text(value)
    if (empty) throw new Error(`表单缺必填字段: ${field}`)
  }
  const summary = text(payload?.summary)
  if (summary.length < 50) throw new Error('摘要至少 50 字（公司是谁/产品/用户/竞争/挑战）')
  const strategicQuestion = text(payload?.strategicQuestion)
  if (!strategicQuestion) throw new Error('根问题（strategicQuestion）必填')

  const slug = `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const inputDir = path.join(root, 'inputs', slug)
  fs.mkdirSync(inputDir, { recursive: true })
  fs.writeFileSync(path.join(inputDir, 'form.json'), JSON.stringify({
    render_style: 'swiss',
    expected_pages: 24,
    ...form,
  }, null, 2))
  fs.writeFileSync(path.join(inputDir, 'summary.md'), [
    '# 摘要（web intake）',
    '',
    '公司是谁、主营产品、目标用户、竞争格局、当前挑战：',
    '',
    summary,
    '',
  ].join('\n'))
  fs.writeFileSync(path.join(inputDir, 'strategic-question.md'), `# 根问题\n\n${strategicQuestion}\n`)
  return { slug, inputDir }
}

export function getRunStatus({ root, slug } = {}) {
  if (!root || !slug) throw new Error('getRunStatus requires root + slug')
  const runDir = runDirFor(root, slug)
  const has = file => fs.existsSync(path.join(runDir, file))
  const readJson = file => JSON.parse(fs.readFileSync(path.join(runDir, file), 'utf8'))
  const events = readRecentEvents(runDir)

  if (has('generation-error.txt')) {
    return {
      stage: 'failed',
      error: fs.readFileSync(path.join(runDir, 'generation-error.txt'), 'utf8').slice(0, 500),
      events,
    }
  }
  if (has('deck.freeform.html') && has('deck.json')) return { stage: 'done', events }
  if (has('outline-approval.json')) return { stage: 'drafting', events }
  if (has('outline.json')) {
    return { stage: 'awaiting_outline_approval', outline: readJson('outline.json'), events }
  }
  if (fs.existsSync(runDir)) return { stage: 'researching', events }
  return { stage: 'created', events }
}

export function approveOutline({ root, slug, notes = '' } = {}) {
  if (!root || !slug) throw new Error('approveOutline requires root + slug')
  const runDir = runDirFor(root, slug)
  if (!fs.existsSync(path.join(runDir, 'outline.json'))) {
    throw new Error(`outline 不存在，无法批准: ${runDir}`)
  }
  fs.writeFileSync(path.join(runDir, 'outline-approval.json'), JSON.stringify({
    approved: true,
    notes: text(notes),
    approved_at: new Date().toISOString(),
  }, null, 2))
  return { approved: true }
}
