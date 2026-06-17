import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { runBrandBookMode } from './gen-fullcase-cli.mjs'

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'pptmaster-brandbook-cli-'))
try {
  const modelOutputDir = path.join(tmp, 'model-out')
  const modelResult = await runBrandBookMode({
    slug: 'fixture-luma-coffee',
    opts: {
      root: path.resolve('.'),
      outputDir: modelOutputDir,
      research: false,
      pick: 'd1',
      outputs: ['brand-book'],
    },
    callModel: async (system, user) => {
      if (system.includes('恰好 3 个战略方向')) {
        return JSON.stringify({ directions: [
          { id: 'd1', positioning: 'LUMA Coffee 的日常精品咖啡', tension: '用户要精品但不想承担独立店的不确定性', mission: 'm', vision: 'v', proposition: 'p', niche_basis: 'n', evidence_refs: ['ind-1', 'usr-1'] },
          { id: 'd2', positioning: 'LUMA Coffee 的会员精品品牌', tension: '用户要归属但市场只讲交易', mission: 'm', vision: 'v', proposition: 'p', niche_basis: 'n', evidence_refs: ['self-1'] },
          { id: 'd3', positioning: 'LUMA Coffee 的效率精品品牌', tension: '精品难规模化', mission: 'm', vision: 'v', proposition: 'p', niche_basis: 'n', evidence_refs: ['comp-1'] },
        ] })
      }
      if (system.includes('品牌视觉策略师')) {
        return JSON.stringify({ primary: '#1a3c34', secondary: '#cfe3da', accent: '#e08a2c', text: '#1c1c1c', bg: '#faf8f4' })
      }
      const request = JSON.parse(user)
      const kind = request.module_kind
      const contentByKind = {
        brand_entry: { name: 'LUMA Coffee', slogan: '日常精品咖啡', one_liner: '把精品稳定带入日常', category: '精品咖啡连锁' },
        market_context: { title: '市场背景', body: 'ind-1 提醒精品咖啡连锁不能继续只卷价格，必须建立日常心智。', points: ['品类进入心智竞争'] },
        brand_definition: { title: '品牌定义', positioning: 'LUMA Coffee 的日常精品咖啡', body: 'usr-1 说明年轻白领想要稳定精品体验，LUMA Coffee 将门店和会员资产组织成日常选择。', differentiation: ['12 家直营店验证', '会员复购资产'] },
        audience_scenarios: { title: '人群与场景', body: 'usr-1 指向一线城市年轻白领的日常咖啡选择，LUMA Coffee 要解决稳定精品的复购场景。', core_audience: '一线城市年轻白领', scenarios: ['工作日前咖啡', '会员复购'] },
        strategy_core: { title: '战略核心', mission: 'm', vision: 'v', proposition: 'p', body: 'LUMA Coffee 用 ind-1 和 self-1 支撑日常精品咖啡主线。' },
        narrative_system: { title: '叙事系统', brand_story: 'LUMA Coffee 从 usr-1 的日常需求出发，把精品咖啡从偶发体验变成稳定选择。', body: '叙事围绕 LUMA Coffee 和 usr-1 展开。' },
        product_system: { title: '产品体系', product_positioning: '围绕 LUMA Coffee 日常精品咖啡组织产品', product_series: ['手冲精品咖啡', '创意特调'], body: 'self-1 显示 LUMA Coffee 已有产品资产。' },
        visual_direction: { title: '视觉方向', color_direction: '克制深绿', typography_direction: '专业清晰', symbol_concept: '日常精品', body: 'LUMA Coffee 的视觉承接 self-1 的门店资产。' },
        proof_growth: { title: '证明与增长', milestones: ['12 家直营店'], public_metrics: ['会员复购率'], future_plan: '用 self-1 的运营资产支撑增长。' },
        personality_statement: { title: '品牌人格', archetype: '可靠专家', traits: ['稳定', '专业'], tone: '克制有温度', body: 'LUMA Coffee 对 usr-1 说清楚稳定精品，而不是制造焦虑。' },
      }
      return JSON.stringify({
        content: contentByKind[kind],
        evidence_refs: ['ind-1', 'usr-1'],
        depth_level: 'L4',
      })
    },
  })
  assert.ok(modelResult.content.strategic_spine.locked)
  const modelContent = JSON.parse(await fs.readFile(path.join(modelOutputDir, 'brand-system-content.json'), 'utf8'))
  const modelDef = modelContent.modules.find(module => module.kind === 'brand_definition')
  assert.ok(modelDef.evidence_refs.length > 0)
  assert.notEqual(modelDef.content.body, modelContent.strategic_spine.positioning_statement)
  assert.ok(!modelDef.content.offline)

  const outputDir = path.join(tmp, 'offline-out')
  const offlineResult = await runBrandBookMode({
    slug: 'fixture-luma-coffee',
    opts: {
      root: path.resolve('.'),
      outputDir,
      noModel: true,
      pick: 'd1',
      outputs: ['brand-book', 'independent-site'],
    },
  })
  assert.ok(offlineResult.content.strategic_spine.locked)
  assert.ok(offlineResult.content.modules.some(module => module.kind === 'risk_check' && module.visibility === 'internal'))
  assert.ok(offlineResult.content.modules.some(module => module.content.offline === true))
  const brandBook = await fs.readFile(path.join(outputDir, 'brand-book.html'), 'utf8')
  const site = await fs.readFile(path.join(outputDir, 'independent-site.html'), 'utf8')
  assert.ok(brandBook.includes('LUMA Coffee'))
  assert.ok(site.includes('LUMA Coffee'))
  assert.ok(!brandBook.includes('单店回本测算'))
  assert.ok(!site.includes('单店回本测算'))
  assert.ok(!brandBook.includes('production_note'))
  assert.ok(!site.includes('production_note'))
  assert.ok(await fs.stat(path.join(outputDir, 'brand-system-content.json')))
} finally {
  await fs.rm(tmp, { recursive: true, force: true })
}

console.log('✅ brandbook-cli tests passed')
