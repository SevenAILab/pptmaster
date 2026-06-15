import fs from 'node:fs'
import path from 'node:path'

export const STAGE_SKILLS = {
  outline: {
    skill: 'proposal-narrative',
    refs: ['scqa-pyramid', 'deck-structure', 'writing-discipline'],
  },
  draft: {
    skill: 'proposal-narrative',
    refs: ['dual-axis', 'page-craft', 'writing-discipline'],
  },
  design: {
    skill: 'deck-design-system',
    refs: ['design-tokens-and-themes', 'layout-system', 'anti-ai-slop', 'visual-qa'],
  },
  analysis_industry: {
    skill: 'industry-analysis',
    refs: ['how-it-makes-money', 'market-and-trend', 'players-and-variables', 'evidence-and-sources'],
  },
  analysis_competitor: {
    skill: 'competitor-analysis',
    refs: ['scope-definition', 'teardown-layers', 'conclusions', 'evidence-discipline'],
  },
  analysis_self: {
    skill: 'self-analysis',
    refs: ['what-you-have', 'real-vs-fake-advantage', 'swot-matrix', 'from-analysis-to-focus'],
  },
  analysis_user: {
    skill: 'user-insight',
    refs: ['define-and-validate', 'deep-dig', 'insight-craft', 'evidence-and-synthesis'],
  },
}

export function loadSkillGuidance({
  root,
  stage,
  refsOverride,
  maxCharsPerRef = 4000,
} = {}) {
  if (!root) throw new Error('loadSkillGuidance requires root')
  const mapping = STAGE_SKILLS[stage]
  if (!mapping) {
    throw new Error(`Unknown stage: ${stage}. Known stages: ${Object.keys(STAGE_SKILLS).join(', ')}`)
  }

  const refs = refsOverride || mapping.refs
  const loaded = []
  const blocks = []
  for (const ref of refs) {
    const refPath = path.join(root, 'skills', mapping.skill, 'references', `${ref}.md`)
    if (!fs.existsSync(refPath)) throw new Error(`Skill reference missing: ${refPath}`)
    const content = fs.readFileSync(refPath, 'utf8').slice(0, maxCharsPerRef).trim()
    loaded.push({ ref, chars: content.length })
    blocks.push(`### ${ref}\n${content}`)
  }

  return {
    skill: mapping.skill,
    refs,
    loaded,
    text: [`## ${mapping.skill} 方法论指引（必须遵循）`, ...blocks].join('\n\n'),
  }
}
