import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildBriefFromInputs, buildGenerationPrompt, generateDeck } from './generate-nonlocked-deck.mjs'
import { buildQuestionPrompt } from './research-worker.mjs'
import { loadNonlockedSchemeConfig, renderResearchAngles } from './scheme-nonlocked.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FIXTURES = [
  { slug: 'fixture-luma-coffee', industryWord: '咖啡' },
  { slug: 'fixture-sailtrade-crm', industryWord: '外贸' },
  { slug: 'fixture-ironbox-fitness', industryWord: '健身' },
]

const scheme = loadNonlockedSchemeConfig({ root: REPO_ROOT })

for (const fixture of FIXTURES) {
  const brief = buildBriefFromInputs({ root: REPO_ROOT, slug: fixture.slug })
  const { system, user } = buildGenerationPrompt(brief)
  assert.ok(user.includes(fixture.industryWord), `${fixture.slug}: 生成 prompt 应包含行业词`)
  assert.ok(!system.includes('PPTAgent') && !user.includes('PPTAgent'), `${fixture.slug}: prompt 不得含 PPTAgent 专属内容`)
  assert.ok(!user.includes('gamma.app'), `${fixture.slug}: prompt 不得含 PPT 竞品硬编码`)

  const angles = renderResearchAngles(scheme.research_angles, brief.form)
  const qp = buildQuestionPrompt({ brief, angles })
  assert.ok(qp.user.includes(fixture.industryWord), `${fixture.slug}: 研究问题 prompt 应包含行业词`)
  assert.ok(!qp.system.includes('site:gamma') && !qp.user.includes('site:'), `${fixture.slug}: 不得含 site: 硬编码`)

  const result = await generateDeck({ brief, options: { dryRun: true } })
  assert.equal(result.locks.ok, true, `${fixture.slug}: ${result.locks.violations?.join('; ')}`)
}

console.log('✅ fixture briefs: 3 个跨行业 brief 全部通过离线回归')
