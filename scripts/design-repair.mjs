import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { assembleFreeformDeck } from './assemble-freeform-deck.mjs'
import { designPage } from './design-page.mjs'
import { inspectDeck } from './page-inspect.mjs'

const HEX_PATTERN = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g
const GRADIENT_PATTERN = /(linear|radial)-gradient\((?:[^()]|\([^)]*\))*\)/gi

function normalizeHex(value) {
  const lower = String(value || '').toLowerCase()
  if (lower.length === 4) {
    return `#${lower[1]}${lower[1]}${lower[2]}${lower[2]}${lower[3]}${lower[3]}`
  }
  return lower
}

function hexToRgb(value) {
  const hex = normalizeHex(value).slice(1)
  return [0, 2, 4].map(index => Number.parseInt(hex.slice(index, index + 2), 16))
}

function isNeutral(value) {
  const [r, g, b] = hexToRgb(value)
  return Math.max(r, g, b) - Math.min(r, g, b) < 18
}

export function normalizeAccents(html, accent = '#002fa7') {
  const normalizedAccent = normalizeHex(accent)
  return String(html || '')
    .replace(GRADIENT_PATTERN, normalizedAccent)
    .replace(HEX_PATTERN, raw => {
      const hex = normalizeHex(raw)
      if (hex === normalizedAccent) return normalizedAccent
      if (isNeutral(hex)) return raw
      return normalizedAccent
    })
}

function runVisualAudit({ root, htmlPath }) {
  const scriptPath = path.join(root, 'skills/deck-design-system/scripts/audit_visual.py')
  const audit = spawnSync(process.env.PYTHON || 'python3', [scriptPath, htmlPath], {
    encoding: 'utf8',
  })
  return {
    passed: audit.status === 0,
    status: audit.status,
    output: [audit.stdout || '', audit.stderr || '', audit.error ? String(audit.error.message || audit.error) : ''].filter(Boolean).join(''),
  }
}

export async function repairDeck({
  htmlPath,
  designedPath,
  runDir,
  root,
  accent = '#002fa7',
  maxRounds = 2,
  callModel,
  style = 'swiss',
  skillGuidance,
} = {}) {
  if (!htmlPath) throw new Error('repairDeck requires htmlPath')
  if (!runDir) throw new Error('repairDeck requires runDir')
  if (!root) throw new Error('repairDeck requires root')
  fs.mkdirSync(runDir, { recursive: true })

  const rounds = []
  let html = fs.readFileSync(htmlPath, 'utf8')
  let finalPass = false
  for (let round = 1; round <= maxRounds; round += 1) {
    const audit = runVisualAudit({ root, htmlPath })
    const record = { round, before: audit }
    rounds.push(record)
    if (audit.passed) {
      finalPass = true
    } else {
      const repaired = normalizeAccents(html, accent)
      if (repaired !== html) {
        html = repaired
        fs.writeFileSync(htmlPath, html)
      }
      const after = runVisualAudit({ root, htmlPath })
      record.after = after
      finalPass = after.passed
    }

    if (finalPass && designedPath && typeof callModel === 'function') {
      try {
        const inspect = await inspectDeck(htmlPath)
        record.inspect = inspect
        if (!inspect.ok && inspect.overflows.length) {
          const designed = JSON.parse(fs.readFileSync(designedPath, 'utf8'))
          const overflowPages = [...new Set(inspect.overflows.map(item => Number(item.page)).filter(Boolean))]
          for (const pageNo of overflowPages) {
            const index = designed.slides.findIndex(slide => Number(slide.page_no) === pageNo)
            if (index === -1) continue
            const slide = designed.slides[index]
            const feedback = inspect.overflows
              .filter(item => Number(item.page) === pageNo)
              .map(item => `- <${String(item.tag).toLowerCase()}> ${item.text || ''}`)
              .join('\n')
            designed.slides[index] = await designPage({
              ...slide,
              repair_feedback: `上一版出现越界/溢出：\n${feedback}\n请减少文字密度，增大留白，避免任何元素出界。`,
            }, { callModel, maxAttempts: 1, skillGuidance })
          }
          fs.writeFileSync(designedPath, JSON.stringify(designed, null, 2))
          html = normalizeAccents(await assembleFreeformDeck(designed, { style, root }), accent)
          fs.writeFileSync(htmlPath, html)
          const afterRepaint = await inspectDeck(htmlPath)
          record.afterRepaint = afterRepaint
          finalPass = afterRepaint.ok && runVisualAudit({ root, htmlPath }).passed
        }
      } catch (error) {
        record.inspectError = String(error?.message || error)
      }
    }

    if (finalPass) {
      break
    }
  }

  const report = { htmlPath, rounds, finalPass, accent: normalizeHex(accent) }
  fs.writeFileSync(path.join(runDir, 'visual-repair.json'), JSON.stringify(report, null, 2))
  if (!finalPass) {
    const last = rounds.at(-1)
    throw new Error(`视觉返修后仍未通过：${last?.after?.output || last?.before?.output || 'unknown visual audit failure'}`)
  }
  return report
}
