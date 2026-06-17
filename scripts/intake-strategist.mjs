import fs from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const questionMap = JSON.parse(readFileSync(path.join(REPO_ROOT, 'assets', 'intake', 'question-map.json'), 'utf8'))

function extractJsonObject(value) {
  const rawText = String(value || '')
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const raw = fenced ? fenced[1] : rawText
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('intake response must contain JSON object')
  return JSON.parse(raw.slice(start, end + 1))
}

function answerText(value) {
  return String(value ?? '').trim()
}

function nextQuestion(answers = {}) {
  return questionMap.questions.find(question => question.simplify_tag !== 'optional' && !answerText(answers[question.id]))
}

export async function nextIntakeStep({ state = {}, callModel } = {}) {
  const answers = state.answers || {}
  const candidate = nextQuestion(answers)
  if (!candidate) return { done: true, restate: '信息已经足够进入生成。' }
  if (typeof callModel !== 'function') {
    return {
      restate: candidate.restate_template.replace('{{answer}}', ''),
      ask_id: candidate.id,
      ask_prompt: candidate.oblique_prompt,
      options: candidate.options_or_examples,
      done: false,
    }
  }
  const system = [
    '你是品牌 intake 策略师。用侧面提问，不要直接问品牌主张、品牌定位这类术语。',
    '输出 JSON：{"restate","ask_id","ask_prompt","options":[...],"done":false}。',
    '必须一问一复述，并给 2-4 个选项，最后一个可以是其他（自述）。',
  ].join('\n')
  const user = JSON.stringify({
    preBrief: state.preBrief || {},
    answers,
    next_question_seed: candidate,
  }, null, 2)
  const parsed = extractJsonObject(await callModel(system, user))
  return {
    restate: answerText(parsed.restate),
    ask_id: answerText(parsed.ask_id || candidate.id),
    ask_prompt: answerText(parsed.ask_prompt || candidate.oblique_prompt),
    options: Array.isArray(parsed.options) && parsed.options.length >= 2 ? parsed.options : candidate.options_or_examples,
    done: Boolean(parsed.done),
  }
}

export function scoreSufficiency({ answers = {} } = {}) {
  let score = 0
  const gaps = []
  for (const dim of questionMap.sufficiency_dimensions) {
    const ids = dim.question_ids || []
    const answered = ids.filter(id => answerText(answers[id]).length >= 1)
    const concrete = ids.filter(id => answerText(answers[id]).length >= 3)
    const ratio = ids.length ? ((answered.length + concrete.length) / (ids.length * 2)) : 0
    const dimScore = Math.min(1, ratio) * dim.weight * 10
    score += dimScore
    if (ratio < 0.6) gaps.push(dim.dim)
  }
  return { score: Math.round(score * 10) / 10, gaps, answers }
}

function inferSlug(answers) {
  return answerText(answers.q_brand_name || answers.q_category || 'brand')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'brand'
}

function parseTonality(raw) {
  const value = answerText(raw)
  const knownBrands = ['观夏', '无印良品', '苹果', 'MUJI', 'Apple', '耐克', 'Nike', '星巴克', 'Starbucks']
  const referenceBrands = new Set()
  for (const brand of knownBrands) {
    if (value.includes(brand)) referenceBrands.add(brand)
  }
  const patternMatches = value.matchAll(/(?:像|参考|类似|接近)([\u4e00-\u9fffA-Za-z0-9][\u4e00-\u9fffA-Za-z0-9\s-]{1,20}?)(?:那种|的|，|,|、|\s)/g)
  for (const match of patternMatches) {
    const candidate = answerText(match[1]).replace(/那种.*/, '')
    if (candidate) referenceBrands.add(candidate)
  }
  const keywordCandidates = ['温暖', '克制', '自然', '留白', '科技', '冷静', '高级', '活泼', '专业', '年轻', '质感', '可靠', '明亮', '大胆', '精致']
  const keywords = keywordCandidates.filter(keyword => value.includes(keyword))
  return {
    keywords: keywords.length ? keywords : (value ? [value] : []),
    reference_brands: [...referenceBrands],
    source: 'qa',
  }
}

export async function finalizeBrief({
  answers = {},
  preBrief = {},
  output_types_selected = ['brand-book'],
  slug,
  outputRoot,
} = {}) {
  const sufficiency = scoreSufficiency({ answers })
  const brief = {
    slug: slug || inferSlug(answers),
    gate_passed: sufficiency.score >= 7,
    intake_sufficiency: sufficiency.score,
    gaps: sufficiency.gaps,
    answers,
    preBrief,
    brand_type_input: {
      category: answers.q_category || preBrief.brand_basics?.category_guess || '',
      stage: answers.q_stage || '',
      delivery_goal: answers.q_goal || '',
      audience: [answers.q_user].filter(Boolean),
    },
    tonality: parseTonality(answers.q_tonality),
    output_types_selected,
  }
  if (outputRoot) {
    const dir = path.join(outputRoot, brief.slug)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'brief.json'), JSON.stringify(brief, null, 2))
  }
  return brief
}
