const TYPES = ['positioning', 'building', 'upgrade']

export function buildTypePrompt({ brief } = {}) {
  const system = [
    '判断这份品牌方案属于哪种类型，只输出一个词：',
    '- positioning（品牌定位）：要确立“该占什么心智位置”。',
    '- building（品牌建设）：定位已定或方向已定，要落成产品、渠道、营销、服务体系。',
    '- upgrade（品牌升级）：从旧定位、旧身份或旧品牌体系升级到新定位。',
    '只输出 positioning / building / upgrade 之一，不要解释。',
  ].join('\n')
  const user = [`# 客户表单\n${brief?.formText || ''}`, `# 根问题\n${brief?.strategicQuestion || ''}`].join('\n\n')
  return { system, user }
}

export function parseProposalType(value) {
  const raw = String(value || '').toLowerCase()
  for (const type of TYPES) {
    if (raw.includes(type)) return type
  }
  throw new Error(`Cannot determine proposal_type from: ${String(value).slice(0, 80)}`)
}

export async function detectProposalType({ brief, callModel } = {}) {
  const explicit = String(brief?.form?.proposal_type || '').toLowerCase()
  if (TYPES.includes(explicit)) return explicit
  if (typeof callModel !== 'function') throw new Error('detectProposalType requires callModel when form.proposal_type absent')
  const { system, user } = buildTypePrompt({ brief })
  return parseProposalType(await callModel(system, user))
}
