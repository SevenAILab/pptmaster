import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const visibilityMap = JSON.parse(readFileSync(path.join(REPO_ROOT, 'assets', 'content', 'visibility-map.json'), 'utf8'))

const INTERNAL_RE = /营收|利润|毛利|成本|现金流|单店|回本|测算|底价|返点|KPI|薪酬|绩效|未发布|风险清单|竞品弱点/
const REVIEW_RE = /行业第一|最大|领先|功效|投资回报|加盟收益|名人|授权|用户数据|隐私/

export function defaultVisibilityForKind(kind) {
  const visibility = visibilityMap[kind]
  if (!visibility) throw new Error(`unknown module kind: ${kind}`)
  return visibility
}

export function classifyVisibility({ kind, text = '', evidence_refs = [] } = {}) {
  const defaultVisibility = defaultVisibilityForKind(kind)
  const body = String(text || '')

  if (INTERNAL_RE.test(body)) {
    return {
      visibility: 'internal',
      reason: '命中一律对内规则',
      matched_rule: 'internal_keyword',
    }
  }

  if (REVIEW_RE.test(body) && (!Array.isArray(evidence_refs) || evidence_refs.length === 0)) {
    return {
      visibility: 'review',
      reason: '命中需人工确认规则且缺 evidence_refs',
      matched_rule: 'review_keyword_without_evidence',
    }
  }

  return {
    visibility: defaultVisibility,
    reason: '使用模块默认可见性',
    matched_rule: 'default_visibility',
  }
}
