import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { approveOutline, createRun, getRunStatus } from './handlers.mjs'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pptmaster-webapp-'))
try {
  const payload = {
    form: {
      name: 'LUMA Coffee',
      industry: '精品咖啡连锁',
      stage: '扩张期',
      core_products: ['手冲'],
      target_audience: ['白领'],
      competitors: ['Manner'],
      budget_level: '中',
      tonality: '克制',
      render_style: 'swiss',
      expected_pages: 24,
    },
    summary: '这是一段超过五十个字的客户资料摘要，用来描述公司是谁、主营产品、目标用户、竞争格局、当前挑战与自我期待，凑足长度验证门槛。',
    strategicQuestion: 'LUMA 应如何差异化定位？',
  }
  const { slug } = createRun({ root: tmp, payload })
  assert.match(slug, /^web-/)
  const inputDir = path.join(tmp, 'inputs', slug)
  assert.ok(fs.existsSync(path.join(inputDir, 'form.json')))
  assert.match(fs.readFileSync(path.join(inputDir, 'summary.md'), 'utf8'), /主营产品/)
  assert.match(fs.readFileSync(path.join(inputDir, 'strategic-question.md'), 'utf8'), /# 根问题/)
  const form = JSON.parse(fs.readFileSync(path.join(inputDir, 'form.json'), 'utf8'))
  assert.equal(form.name, 'LUMA Coffee')

  assert.throws(() => createRun({ root: tmp, payload: { ...payload, form: { ...payload.form, name: '' } } }), /name/)
  assert.throws(() => createRun({ root: tmp, payload: { ...payload, summary: '太短' } }), /摘要至少/)
  assert.throws(() => createRun({ root: tmp, payload: { ...payload, strategicQuestion: '' } }), /根问题/)

  assert.equal(getRunStatus({ root: tmp, slug }).stage, 'created')
  const runDir = path.join(tmp, 'outputs', `${slug}-fullcase`)
  fs.mkdirSync(runDir, { recursive: true })
  assert.equal(getRunStatus({ root: tmp, slug }).stage, 'researching')
  fs.writeFileSync(path.join(runDir, 'outline.json'), JSON.stringify({
    narrative: 'x',
    chapters: [{ chapter_no: 1, title: '诊断', goal: 'g', pages_budget: 5, key_questions: [], covers: [] }],
  }))
  const awaiting = getRunStatus({ root: tmp, slug })
  assert.equal(awaiting.stage, 'awaiting_outline_approval')
  assert.equal(awaiting.outline.chapters.length, 1)

  approveOutline({ root: tmp, slug, notes: '同意' })
  assert.ok(fs.existsSync(path.join(runDir, 'outline-approval.json')))
  assert.equal(getRunStatus({ root: tmp, slug }).stage, 'drafting')
  fs.writeFileSync(path.join(runDir, 'deck.json'), '{"slides":[]}')
  fs.writeFileSync(path.join(runDir, 'deck.freeform.html'), '<html></html>')
  assert.equal(getRunStatus({ root: tmp, slug }).stage, 'done')
  assert.throws(() => approveOutline({ root: tmp, slug: 'web-nope' }), /outline/)
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}

console.log('✅ webapp handlers: createRun + status + approve passed')
