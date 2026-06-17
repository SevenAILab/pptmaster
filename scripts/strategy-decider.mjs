import { lockSpine } from '../core/content-model.mjs'

function text(value) {
  return String(value ?? '').trim()
}

function extractJsonObject(value) {
  const rawText = String(value || '')
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = fenced ? fenced[1] : rawText
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object in strategy response: ${rawText.slice(0, 200)}`)
  }
  return JSON.parse(raw.slice(start, end + 1))
}

function flattenCards(analysisCards) {
  if (Array.isArray(analysisCards?.cards)) return analysisCards.cards
  return Object.values(analysisCards?.byType || {}).flatMap(group => group.cards || [])
}

function directionFromRaw(raw, index) {
  return {
    id: text(raw.id) || `d${index + 1}`,
    positioning: text(raw.positioning || raw.positioning_statement),
    tension: text(raw.tension),
    mission: text(raw.mission),
    vision: text(raw.vision),
    proposition: text(raw.proposition),
    niche_basis: text(raw.niche_basis),
    evidence_refs: Array.isArray(raw.evidence_refs) ? raw.evidence_refs.map(text).filter(Boolean) : [],
  }
}

function validateDirection(direction, cardIds) {
  for (const key of ['id', 'positioning', 'tension', 'mission', 'vision', 'proposition', 'niche_basis']) {
    if (!direction[key]) throw new Error(`strategy direction ${direction.id || '?'} missing ${key}`)
  }
  if (direction.evidence_refs.length === 0) {
    throw new Error(`strategy direction ${direction.id} missing evidence_refs`)
  }
  for (const ref of direction.evidence_refs) {
    if (!cardIds.has(ref)) throw new Error(`unknown evidence_ref in ${direction.id}: ${ref}`)
  }
}

export async function deriveStrategyDirections({ analysisCards, brief = {}, callModel } = {}) {
  if (typeof callModel !== 'function') throw new Error('deriveStrategyDirections requires callModel')
  const cards = flattenCards(analysisCards)
  if (cards.length === 0) throw new Error('deriveStrategyDirections requires analysis cards')
  const cardIds = new Set(cards.map(card => text(card.id)).filter(Boolean))
  const system = [
    '你是品牌战略总编。请基于四维 analysis-cards 推导恰好 3 个战略方向。',
    '硬约束：洞察必须是张力，tension 必须能让策略转弯；evidence_refs 必须引用真实 analysis card id。',
    '只输出 JSON：{"directions":[{"id","positioning","tension","mission","vision","proposition","niche_basis","evidence_refs":[...]}]}。',
    '必须恰好 3 个战略方向，不要解释。',
  ].join('\n')
  const user = [
    '# brief',
    JSON.stringify(brief, null, 2),
    '',
    '# analysis-cards',
    JSON.stringify(cards, null, 2),
  ].join('\n')
  const parsed = extractJsonObject(await callModel(system, user))
  const directions = (parsed.directions || []).map(directionFromRaw)
  if (directions.length !== 3) throw new Error(`strategy directions must contain exactly 3 个 direction, got ${directions.length}`)
  directions.forEach(direction => validateDirection(direction, cardIds))
  return { directions }
}

export function deterministicStrategyDirections({ brief = {}, analysisCards } = {}) {
  const cards = flattenCards(analysisCards)
  const refs = cards.map(card => text(card.id)).filter(Boolean)
  const name = brief?.form?.name || brief?.slug || '品牌'
  const industry = brief?.form?.industry || brief?.brand_type_input?.category || '品类'
  const first = refs.slice(0, 2)
  const one = first.length ? first : ['client-input']
  return {
    directions: [
      {
        id: 'd1',
        positioning: `${name} 的品质便捷品牌`,
        tension: `${industry} 用户想要专业品质，但市场常把便捷和品质拆开解决。`,
        mission: `让 ${industry} 的高品质体验变得更稳定、更容易获得。`,
        vision: `成为 ${industry} 中最可信的品质便捷品牌。`,
        proposition: '用稳定产品与清晰体验，把专业品质交付到日常场景。',
        niche_basis: '品质心智与便捷交付之间的生态位。',
        evidence_refs: one,
      },
      {
        id: 'd2',
        positioning: `${name} 的专业信任品牌`,
        tension: `${industry} 供给很多，但用户缺少可判断的信任锚点。`,
        mission: '把专业判断翻译成用户能感知的选择理由。',
        vision: '成为用户做选择时第一个想到的可信参照。',
        proposition: '用透明标准、真实证据和持续服务建立信任。',
        niche_basis: '专业标准和大众理解之间的生态位。',
        evidence_refs: one,
      },
      {
        id: 'd3',
        positioning: `${name} 的体验效率品牌`,
        tension: `${industry} 增长需要效率，但效率经常牺牲体验感。`,
        mission: '让高效率交付仍然保留品牌质感。',
        vision: '成为兼具效率与体验的规模化样板。',
        proposition: '用产品结构和服务节奏，让体验更稳定可复制。',
        niche_basis: '效率规模和体验一致性之间的生态位。',
        evidence_refs: one,
      },
    ],
  }
}

export function lockChosenDirection(content, directions, chosenId) {
  if (content.strategic_spine?.locked) throw new Error('strategic spine already locked')
  const direction = (directions || []).find(item => item.id === chosenId)
    || (/^d[1-9]\d*$/.test(chosenId)
      ? (directions || [])[Number(chosenId.slice(1)) - 1]
      : null)
  if (!direction) throw new Error(`unknown strategy direction: ${chosenId}`)
  return lockSpine(content, {
    chosen_direction_id: direction.id,
    positioning_statement: direction.positioning,
    mission: direction.mission,
    vision: direction.vision,
    proposition: direction.proposition,
  })
}
