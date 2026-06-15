import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

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
  runDir,
  root,
  accent = '#002fa7',
  maxRounds = 2,
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
    rounds.push({ round, before: audit })
    if (audit.passed) {
      finalPass = true
      break
    }
    const repaired = normalizeAccents(html, accent)
    if (repaired === html) {
      finalPass = false
      break
    }
    html = repaired
    fs.writeFileSync(htmlPath, html)
    const after = runVisualAudit({ root, htmlPath })
    rounds[rounds.length - 1].after = after
    if (after.passed) {
      finalPass = true
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
