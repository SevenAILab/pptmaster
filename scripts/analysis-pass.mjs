import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { loadSkillGuidance } from './skill-injector.mjs'

export const ANALYSIS_TYPES = ['industry', 'competitor', 'self', 'user']

const TYPE_TO_STAGE = {
  industry: 'analysis_industry',
  competitor: 'analysis_competitor',
  self: 'analysis_self',
  user: 'analysis_user',
}

const TYPE_TO_SKILL = {
  industry: 'industry-analysis',
  competitor: 'competitor-analysis',
  self: 'self-analysis',
  user: 'user-insight',
}

function text(value) {
  return String(value ?? '').trim()
}

function extractJson(value) {
  const rawText = String(value || '')
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = fenced ? fenced[1] : rawText
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object in analysis response: ${rawText.slice(0, 200)}`)
  }
  return JSON.parse(raw.slice(start, end + 1))
}

function skillNameFor(type) {
  return TYPE_TO_SKILL[type]
}

export function buildAnalysisPrompt(type, { brief, researchBrief, guidance } = {}) {
  if (!ANALYSIS_TYPES.includes(type)) throw new Error(`Unknown analysis type: ${type}`)
  const findings = (researchBrief?.findings || []).map(finding =>
    `- ${finding.claim}（来源[${finding.source_id ?? '?'}] ${finding.source_url || finding.source || ''} ${finding.source_tier || ''}）`,
  )
  const sources = (researchBrief?.sources || []).map(source =>
    `- [${source.id ?? '?'}] ${source.url || source.source || ''} (${source.source_tier || 'T3'} / ${source.type || 'unknown'})`,
  )
  const system = [
    guidance,
    `你正在产出 ${skillNameFor(type)} 的分析卡。`,
    `analysis_type 必须是 ${type}。`,
    '只输出契约 A JSON：{"analysis_type":"industry|competitor|self|user","cards":[{"id","claim","evidence","source","source_tier","implication","confidence"}]}。',
    '每张卡必须有 claim（判断）、evidence（证据）、source（出处）、source_tier（T1/T2/T3/T4）、implication（所以本方案该怎么办）、confidence（high/med/low/hypothesis）。',
    'id 使用类型前缀：industry=ind, competitor=comp, self=self, user=user，例如 comp-01。',
    '不要复述资料；必须把事实消化成对 deck 叙事有用的 implication。',
  ].filter(Boolean).join('\n')
  const user = [
    '# 客户表单',
    brief?.formText || '',
    '',
    '# 资料摘要',
    brief?.summary || '',
    '',
    '# 根问题',
    text(brief?.strategicQuestion),
    '',
    '# 研究发现',
    ...(findings.length ? findings : ['（无）']),
    '',
    '# 来源',
    ...(sources.length ? sources : ['（无）']),
  ].join('\n')
  return { system, user }
}

export function parseAnalysisCards(type, value) {
  const parsed = extractJson(value)
  const cards = Array.isArray(parsed?.cards) ? parsed.cards : []
  if (cards.length === 0) throw new Error('Analysis response must contain cards[]')
  const prefix = type === 'industry' ? 'ind' : type === 'competitor' ? 'comp' : type
  return {
    analysis_type: type,
    cards: cards.map((card, index) => ({
      id: text(card?.id) || `${prefix}-${String(index + 1).padStart(2, '0')}`,
      claim: text(card?.claim),
      evidence: text(card?.evidence),
      source: text(card?.source || card?.source_url || card?.url),
      source_tier: text(card?.source_tier) || 'T3',
      implication: text(card?.implication),
      confidence: text(card?.confidence) || 'med',
      analysis_type: type,
    })),
  }
}

function runCardGate({ root, type, cards }) {
  const scriptPath = path.join(root, 'skills', skillNameFor(type), 'scripts', 'check_analysis_cards.py')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `pptmaster-${type}-cards-`))
  try {
    const cardsPath = path.join(tmp, 'cards.json')
    fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2))
    const result = spawnSync(process.env.PYTHON || 'python3', [scriptPath, cardsPath], {
      encoding: 'utf8',
    })
    if (result.status !== 0) {
      throw new Error([
        `${type} 分析卡质量门未通过：`,
        result.stdout || '',
        result.stderr || '',
        result.error ? String(result.error.message || result.error) : '',
      ].filter(Boolean).join('\n'))
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

export async function runAnalysisPass({
  brief,
  researchBrief,
  root,
  types = ANALYSIS_TYPES,
  callModel,
} = {}) {
  if (!root) throw new Error('runAnalysisPass requires root')
  if (typeof callModel !== 'function') throw new Error('runAnalysisPass requires callModel')
  const byType = {}
  const cards = []
  for (const type of types) {
    if (!ANALYSIS_TYPES.includes(type)) throw new Error(`Unknown analysis type: ${type}`)
    const guidance = loadSkillGuidance({ root, stage: TYPE_TO_STAGE[type] })
    const { system, user } = buildAnalysisPrompt(type, { brief, researchBrief, guidance: guidance.text })
    const parsed = parseAnalysisCards(type, await callModel(system, user))
    runCardGate({ root, type, cards: parsed })
    byType[type] = {
      ...parsed,
      injected: { skill: guidance.skill, refs: guidance.loaded },
    }
    cards.push(...parsed.cards)
  }
  return { cards, byType }
}
