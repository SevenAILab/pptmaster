import fs from 'node:fs'
import path from 'node:path'

export function loadCaseLogic({ root, proposalType } = {}) {
  if (!root) throw new Error('loadCaseLogic requires root')
  const mapPath = path.join(root, 'assets/_compiled/case-logic/map.json')
  if (!fs.existsSync(mapPath)) throw new Error(`case-logic map missing: ${mapPath}`)
  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
  const entry = map[proposalType]
  if (!entry) {
    throw new Error(`Unknown proposal type for case-logic: ${proposalType}. Known: ${Object.keys(map).filter(key => key !== 'guardrail').join(', ')}`)
  }
  const filePath = path.join(root, entry.file)
  if (!fs.existsSync(filePath)) throw new Error(`case-logic file missing: ${filePath}`)
  const logic = fs.readFileSync(filePath, 'utf8').trim()
  return {
    proposalType,
    file: entry.file,
    source: entry.source,
    text: [
      '## 案例推导逻辑参考（学怎么推导，不是抄模板）',
      `参考案例类型：${proposalType}；来源：${entry.source}`,
      map.guardrail || '只学推导链；内容、行业、结论、页数、版式必须基于本客户重新生成；禁止套用案例结构与原文。',
      '',
      logic,
    ].join('\n'),
  }
}
