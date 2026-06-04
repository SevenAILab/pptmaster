import { classifySource, isVerifiableSource } from './source-tiers.mjs'

export const MIN_SEARCHES_FOR_ASSUMPTION = 3
export const ASSUMPTION_RATIO_CAP = 0.4
export const KEY_JUDGMENT_RE = /应该|应当|应以|建议|切入|抢占|占据|定位为|成为|主打|发力|将会|预计|领先|首选|唯一/
export const PRESCRIPTIVE_RE = /应该|应当|应以|建议|切入|抢占|占据|定位为|成为|主打|发力|将会|预计|预测|空位|心智|第一联想|验证方向|进入验证清单|RTB/

function slideText(slide) {
  return [slide.action_title || '', ...(slide.core_points || [])].join(' ')
}

function isKeyJudgmentSlide(slide) {
  return KEY_JUDGMENT_RE.test(slideText(slide))
}

export function classifySlideJudgmentType(slide) {
  if (slide.evidence_status === 'hypothesis') return 'prescriptive'
  const text = slideText(slide)
  return PRESCRIPTIVE_RE.test(text) ? 'prescriptive' : 'descriptive'
}

function sourceTier(ref = {}) {
  const declared = String(ref.source_tier || '').toUpperCase()
  if (declared) return declared
  const inferred = classifySource(ref.source || ref.source_url || ref.url || '')
  return String(inferred?.source_tier || '').toUpperCase()
}

function hasRealEvidence(slide, allowedTiers = ['T1', 'T2', 'T3']) {
  return (slide.data_refs || []).some(ref => {
    const source = ref.source || ref.source_url || ref.url || ''
    if (!source || !isVerifiableSource(source)) return false
    return allowedTiers.includes(sourceTier(ref))
  })
}

function hasKeyJudgmentEvidence(slide) {
  return hasRealEvidence(slide, ['T1', 'T2', 'T3'])
}

function pageList(slides) {
  return slides.map(slide => slide.page_no).filter(Boolean).join(',') || '?'
}

function isBrokenHypothesis(slide) {
  return slide.evidence_status === 'hypothesis' && !hasHypothesisContract(slide)
}

function validationItem(slide) {
  const text = [slide.action_title || '', ...(slide.core_points || [])].join(' ')
  return {
    page_no: slide.page_no || null,
    action_title: slide.action_title || '',
    hypothesis_basis: slide.hypothesis_basis || '',
    validation_method: slide.validation_method || '',
    reason: text.includes('待验证') || slide.evidence_status === 'hypothesis'
      ? 'honest_hypothesis'
      : 'prescriptive_judgment',
  }
}

function hasStrongEvidence(slide) {
  return (slide.data_refs || []).some(ref => {
    const declared = String(ref.source_tier || '').toUpperCase()
    if (declared === 'T1' || declared === 'T2') return true
    const inferred = classifySource(ref.source || ref.source_url || ref.url || '')
    const tier = String(inferred?.source_tier || '').toUpperCase()
    return tier === 'T1' || tier === 'T2'
  })
}

function hasHypothesisContract(slide) {
  return String(slide.hypothesis_basis || '').trim() &&
    String(slide.validation_method || '').trim()
}

// 返回 'evidenced' | 'hypothesis' | 'unsupported' | 'descriptive'
export function classifySlideEvidence(slide) {
  if (slide.evidence_status === 'hypothesis') {
    return hasHypothesisContract(slide) ? 'hypothesis' : 'unsupported'
  }
  const judgmentType = classifySlideJudgmentType(slide)
  if (judgmentType === 'descriptive') {
    return hasRealEvidence(slide) ? 'descriptive' : 'unsupported'
  }
  if (hasKeyJudgmentEvidence(slide) || hasStrongEvidence(slide)) return 'evidenced'
  return 'unsupported'
}

export function evaluateChunkAssumptions(chunkOutput, options = {}) {
  const minSearches = options.minSearches ?? MIN_SEARCHES_FOR_ASSUMPTION
  const cap = options.cap ?? ASSUMPTION_RATIO_CAP
  const slides = chunkOutput.slides || []
  void minSearches
  void options

  const statuses = slides.map(classifySlideEvidence)
  const judgmentTypes = slides.map(classifySlideJudgmentType)
  const keyJudgmentCount = statuses.filter(status => status === 'evidenced' || status === 'hypothesis').length
  const hypothesisCount = statuses.filter(status => status === 'hypothesis').length
  const unsupportedSlides = slides.filter((_, index) => statuses[index] === 'unsupported')
  const unsupportedDescriptiveSlides = unsupportedSlides.filter(slide => classifySlideJudgmentType(slide) === 'descriptive')
  const unsupportedPrescriptiveSlides = unsupportedSlides.filter(slide => classifySlideJudgmentType(slide) === 'prescriptive')

  if (unsupportedSlides.length > 0) {
    const brokenHypothesisSlides = unsupportedSlides.filter(isBrokenHypothesis)
    const reason = brokenHypothesisSlides.length > 0
      ? `第 ${pageList(brokenHypothesisSlides)} 页标注为待验证假设，但缺 hypothesis_basis 或 validation_method；显式假设必须写清依据和验证方法。`
      : unsupportedDescriptiveSlides.length > 0
        ? `第 ${pageList(unsupportedDescriptiveSlides)} 页描述性事实缺真实来源(T1/T2/T3)——无源事实违反红线。`
        : `第 ${pageList(unsupportedPrescriptiveSlides)} 页建议/预测性判断缺真实来源，且未标注为有依据+验证方法的待验证假设——把未经证实的判断当事实写，违反红线。`
    return {
      hardBlock: true,
      blockReason: reason,
      keyJudgmentCount,
      hypothesisCount,
      assumptionRatio: 0,
      overflow: false,
      hypothesisHeavy: false,
      validationChecklist: [],
      slideEvidenceStatuses: statuses,
      slideJudgmentTypes: judgmentTypes,
    }
  }

  const assumptionRatio = keyJudgmentCount === 0
    ? 0
    : Number((hypothesisCount / keyJudgmentCount).toFixed(4))
  const overflow = assumptionRatio > cap
  const validationChecklist = slides
    .filter((slide, index) => statuses[index] === 'hypothesis')
    .map(validationItem)

  return {
    hardBlock: false,
    blockReason: '',
    keyJudgmentCount,
    hypothesisCount,
    assumptionRatio,
    overflow,
    hypothesisHeavy: overflow,
    validationChecklist,
    slideEvidenceStatuses: statuses,
    slideJudgmentTypes: judgmentTypes,
  }
}
