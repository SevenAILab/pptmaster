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
