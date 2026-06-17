import { parseSkeleton, validateSkeleton } from './deck-skeleton.mjs'

function text(value) {
  return String(value ?? '').trim()
}

export function buildOutlinePrompt(brief, {
  requiredConclusions = [],
  minPages = 20,
  maxPages = 30,
  methodology,
  researchBrief,
  analysisCards,
  caseLogic,
  strategicSpine,
  skillGuidance,
} = {}) {
  const conclusionLines = requiredConclusions.map(item => `- ${item.id}: ${item.label}`)
  const conceptLines = (methodology?.concepts || []).map(concept =>
    `- ${concept.name}（slug: ${concept.slug}）`,
  )
  const findings = Array.isArray(analysisCards?.cards) && analysisCards.cards.length
    ? analysisCards.cards.map(card => ({
      claim: `${card.id || '?'}: ${card.claim}${card.implication ? ` → ${card.implication}` : ''}`,
      source_id: card.id || card.source_id,
      source_url: card.source || card.source_url,
    }))
    : (researchBrief?.findings || [])
  const findingLines = findings.map(finding =>
    `- ${finding.claim}（来源[${finding.source_id ?? '?'}] ${finding.source_url || ''}）`,
  )
  const system = [
    '你是顶级品牌咨询公司的项目总监，为这个客户设计一份完整方案的 deck 骨架。',
    `总内容页（不含封面/目录/brief/章节过渡/收束/总结/行动等结构件）约 ${minPages}-${maxPages} 页；页数跟内容走，一个核心判断一页，讲不完拆两页，不要为凑页数注水。`,
    '叙事必须递进（诊断→判断→结论→配称→落地），禁止并列铺陈互不咬合的章节。',
    '一页一观点：每页只讲一个核心判断，governing_thought 必须写成判断句，不是话题词；points 最多 4 条；evidence_refs 必须挂分析卡/研究来源 id。',
    '必须包含结构件：封面 cover、目录 toc、brief_opening 开场（SCQA：situation/complication/question，question=根问题）、每章 transition_question（问题引导过渡页）、每章 closing_judgment（收束）、总结 conclusion（顶层结论）和 action_items（行动）。',
    '所有必备结论 id 必须被 sections[].covers 或 pages[].covers 覆盖。把方法论框架用在最相关的页，在 governing_thought 或 points 以 "[框架: 名称]" 标注；禁止复述框架定义。',
    strategicSpine?.positioning_statement
      ? `全局战略主线已锁定：${strategicSpine.positioning_statement}。所有章节必须回扣该主线，不得下游重写。`
      : '',
    '只输出契约 B JSON：{"cover":{"title","subtitle"},"toc":[...],"brief_opening":{"situation","complication","question"},"sections":[{"section_no","title","transition_question","closing_judgment","covers":["必备结论id"],"pages":[{"governing_thought","points":[≤4],"evidence_refs":[...],"layout_hint","covers":[]}]}],"conclusion":{"governing_thought","action_items":[...]}}。',
    skillGuidance,
    caseLogic,
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
    ...(strategicSpine?.positioning_statement
      ? ['', '# 已锁战略主线（必须贯穿）', JSON.stringify(strategicSpine, null, 2)]
      : []),
    '',
    '# 必备结论清单（type 级，必须全部被 sections[].covers 或 pages[].covers 覆盖）',
    ...conclusionLines,
    ...(conceptLines.length ? ['', '# 已选方法论框架', ...conceptLines] : []),
    ...(findingLines.length ? ['', '# 已核实研究/分析卡发现（evidence_refs 优先引用这些 id）', ...findingLines] : []),
  ].join('\n')
  return { system, user }
}

export function parseOutline(value) {
  const skeleton = parseSkeleton(value)
  const basic = validateSkeleton(skeleton, { minContentPages: 1 })
  if (basic.violations.some(violation => /^缺 sections|第\d+章无 content 页/.test(violation))) {
    throw new Error(`Outline JSON must contain sections[].pages[]: ${basic.violations.join('; ')}`)
  }
  return skeleton
}

export function validateOutline(outline, {
  requiredConclusions = [],
  minPages = 20,
  maxPages = 30,
} = {}) {
  return validateSkeleton(outline, {
    requiredConclusions,
    minContentPages: minPages,
    maxContentPages: maxPages,
  })
}
