import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_BLACKLIST,
  assertDeckDiscipline,
  bestTier,
  findBlacklistHits,
  findPreciseNumbers,
  hasSourcedRef,
  isTopicLikeTitle,
  lintDeck,
  lintSlide,
} from './content-discipline.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ---- 规则5 黑名单 ----
assert.deepEqual(findBlacklistHits('我们要赋能客户、构建生态'), ['赋能', '构建生态'])
assert.deepEqual(findBlacklistHits('清晰的品牌定位与差异化主张'), [])
assert.deepEqual(findBlacklistHits('自定义词命中', ['自定义词']), ['自定义词'])
assert.ok(DEFAULT_BLACKLIST.includes('打造闭环'))

// ---- 规则4 精确数字识别 ----
assert.deepEqual(findPreciseNumbers('复购率达到 8.6%'), ['8.6%'])
assert.deepEqual(findPreciseNumbers('市场规模 30万 / 同比 2倍 / 客单 199元'), ['30万', '2倍', '199元'])
// 负例：不应误报（年份/序号/代号/像素/中文数词）
assert.deepEqual(findPreciseNumbers('2024年第3季度的 S03 页面 1080px'), [])
assert.deepEqual(findPreciseNumbers('千万不要忽视一倍的增长'), [])

// ---- 规则4 出处存在性 ----
assert.equal(hasSourcedRef({ data_refs: [{ source: 'inputs/x/summary.md' }] }), true)
assert.equal(hasSourcedRef({ data_refs: [{ source: '' }] }), false)
assert.equal(hasSourcedRef({ data_refs: [] }), false)
assert.equal(hasSourcedRef({}), false)

// ---- 规则4 出处分级（复用 source-tiers.mjs，不另造分级）----
// 一手目录 → T1
assert.equal(bestTier({ data_refs: [{ source: 'inputs/demo/first-party/a.md' }] }, { slug: 'demo' }).tier, 'T1')
// summary.md（非 first-party 约定）→ 当前被分级为 T3（已实测）
assert.equal(bestTier({ data_refs: [{ source: 'inputs/demo/summary.md' }] }).tier, 'T3')
// 多源取最佳（最小 rank）
assert.equal(
  bestTier({ data_refs: [{ source: 'inputs/demo/summary.md' }, { source: 'inputs/demo/first-party/a.md' }] }, { slug: 'demo' }).tier,
  'T1',
)
assert.equal(bestTier({ data_refs: [] }), null)

// ---- 规则2 标题启发式 ----
assert.equal(isTopicLikeTitle('客户行业卡'), true)            // 短名词短语 → 话题
assert.equal(isTopicLikeTitle('竞品分析'), true)
assert.equal(isTopicLikeTitle('PPTAgent 应聚焦品牌策划赛道'), false) // 含"应" → 结论
assert.equal(isTopicLikeTitle('定价应低于行业均值，以换取渗透'), false) // 含标点/谓词
assert.equal(isTopicLikeTitle(''), false)

// ---- lintSlide：干净页通过 ----
const cleanSlide = {
  page_no: 1,
  action_title: 'PPTAgent 应聚焦品牌策划赛道，而非通用 PPT',
  core_points: ['行业边界清晰', '价值边界清晰'],
  data_refs: [{ value: 'x', source: 'inputs/demo/summary.md', type: 'client_input' }],
}
assert.deepEqual(lintSlide(cleanSlide).violations, [])

// ---- lintSlide：缺槽位 + 黑名单 + 无出处精确数 → 违规 ----
const badSlide = {
  page_no: 2,
  action_title: '',                        // 缺行动标题
  core_points: ['赋能用户，复购率 8.6%'],   // 黑名单 + 精确数
  data_refs: [],                            // 缺出处
}
const badResult = lintSlide(badSlide)
assert.ok(badResult.violations.some(v => v.includes('缺「行动标题」')))
assert.ok(badResult.violations.some(v => v.includes('缺「出处」')))
assert.ok(badResult.violations.some(v => v.includes('赋能')))
assert.ok(badResult.violations.some(v => v.includes('8.6%') && v.includes('无任何出处')))

// ---- lintSlide：精确数 + 仅 T3 出处 → 警告（非违规）----
const t3NumberSlide = {
  page_no: 3,
  action_title: '市场仍在高速增长，应尽快卡位',
  core_points: ['年增速 30%'],
  data_refs: [{ value: '30%', source: 'inputs/demo/summary.md', type: 'client_input' }],
}
const t3Result = lintSlide(t3NumberSlide)
assert.deepEqual(t3Result.violations, [])
assert.ok(t3Result.warnings.some(w => w.includes('建议补 A 级')))

// ---- 整册聚合 ----
assert.equal(lintDeck({ slides: [cleanSlide, cleanSlide] }).violations.length, 0)
assert.ok(lintDeck({ slides: [badSlide] }).violations.length >= 3)

// ---- assertDeckDiscipline：有违规必抛错 / 干净 deck 不抛错 ----
assert.throws(() => assertDeckDiscipline({ slides: [badSlide] }), /内容纪律红线违规/)
assert.doesNotThrow(() => assertDeckDiscipline({ slides: [cleanSlide] }))

// ---- 真实 80 页基线冒烟：不得抛错（grounding 已验证 0 黑名单 / 0 精确数 / 槽位齐全）----
const realPath = path.join(REPO_ROOT, 'outputs/pptagent-blueprint/raw-output.json')
if (fs.existsSync(realPath)) {
  const realDeck = JSON.parse(fs.readFileSync(realPath, 'utf8'))
  const realResult = assertDeckDiscipline(realDeck, { slug: 'pptagent' })
  assert.equal(realResult.violations.length, 0)
  console.log(`   · 真实 80 页基线：0 违规，${realResult.warnings.length} 条警告`)
}

// ---- CLI：干净文件 exit 0 / 违规文件 exit 1 ----
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-'))
const okFile = path.join(tmp, 'ok.json')
const badFile = path.join(tmp, 'bad.json')
fs.writeFileSync(okFile, JSON.stringify({ slides: [cleanSlide] }))
fs.writeFileSync(badFile, JSON.stringify({ slides: [badSlide] }))
const cli = path.join(REPO_ROOT, 'scripts/check-content-discipline.mjs')
assert.equal(spawnSync('node', [cli, okFile], { encoding: 'utf8' }).status, 0, 'clean deck CLI 应 exit 0')
assert.equal(spawnSync('node', [cli, badFile], { encoding: 'utf8' }).status, 1, 'violation deck CLI 应 exit 1')
fs.rmSync(tmp, { recursive: true, force: true })

console.log('✅ content-discipline test passed')
