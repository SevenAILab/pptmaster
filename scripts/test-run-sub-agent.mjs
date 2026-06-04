import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { loadBlueprintChunk, loadUpstreamChunkObjects, loadUpstreamChunksSummary, parseArgs, prepareSubAgentBundle, runRealLLMSubAgent, validateSubAgentOutput } from './run-sub-agent.mjs'

const clientSlug = 'test-client'
await fs.rm(`inputs/${clientSlug}`, { recursive: true, force: true })
await fs.rm(`outputs/${clientSlug}`, { recursive: true, force: true })
await fs.mkdir(`inputs/${clientSlug}`, { recursive: true })
await fs.writeFile(`inputs/${clientSlug}/form.json`, JSON.stringify({
  name: '测试客户',
  industry: '摄影摄像配件',
  stage: '100+ 转型升级',
  core_products: ['相机笼'],
  target_audience: ['视频创作者'],
  competitors: ['Ulanzi'],
  budget_level: '500万+',
  tonality: '理性专业',
  render_style: 'swiss',
  expected_pages: 4,
}, null, 2))
await fs.writeFile(`inputs/${clientSlug}/summary.md`, '测试客户正在从配件供应商升级为创作工具平台。')
await fs.mkdir(`inputs/${clientSlug}/first-party`, { recursive: true })
await fs.writeFile(`inputs/${clientSlug}/first-party/customer.md`, '客户一手证据。')
await fs.writeFile(`inputs/${clientSlug}/strategic-question.md`, [
  '# Strategic Question',
  '',
  '## 根问题',
  '',
  '测试客户如何证明自己不是泛工具,而是创作工具平台?',
].join('\n'))
await fs.mkdir(`outputs/${clientSlug}`, { recursive: true })
await fs.writeFile(`outputs/${clientSlug}/_research-blueprint.json`, JSON.stringify({
  category_essence: {
    category_name: '摄影摄像创作工具平台',
    who_pays: '视频创作者和采购负责人付费',
    value_chain: '设备需求进入内容生产工作流，品牌提供工具组合并获取利润',
    profit_pool: '利润集中在专业信任、生态兼容和渠道效率',
    key_variables: ['创作效率', '兼容生态', '专业信任'],
  },
  research_blueprint: {
    industry_questions: ['行业怎么赚钱', '利润在哪', '趋势是什么', '关键变量是什么'],
    competitor_targets: ['Ulanzi', 'Tilta'],
    consumer_segments: ['视频创作者', '采购负责人'],
    positioning_hypotheses_to_test: ['创作工具平台定位是否成立'],
  },
}, null, 2))

const bundleResult = await prepareSubAgentBundle('brand_positioning', clientSlug)
const bundle = await fs.readFile(bundleResult.bundlePath, 'utf8')
assert.equal(bundleResult.mustLoadCount, 4)
assert.ok(bundle.includes('Prompt Bundle · brand_positioning · test-client'))
assert.ok(bundle.includes('Concept: STP'))
assert.ok(bundle.includes('测试客户正在从配件供应商升级为创作工具平台'))
assert.ok(bundle.includes('## Strategic Question (auto-injected)'))
assert.ok(bundle.includes('测试客户如何证明自己不是泛工具'))
assert.ok(bundle.includes('## Research Blueprint (auto-injected)'))
assert.ok(bundle.includes('摄影摄像创作工具平台'))
assert.ok(bundle.includes('## Methodology Framework (auto-injected)'))
assert.ok(bundle.includes('品牌定位') || bundle.includes('品牌策略'))
assert.ok(bundle.includes('## Case Patterns (auto-injected)'))
assert.ok(bundle.includes('brand-positioning-case-pattern.md'))
assert.ok(bundle.includes('smallrig-mi-upgrade-case-pattern.md'))
assert.ok(bundle.includes('brand-management-sop-pattern.md'))
assert.ok(bundle.includes('贝比赋'))
assert.ok(bundle.includes('2024品牌管理全工作手册.pdf'))
assert.equal(bundleResult.casePatternCount, 3)

const parsed = parseArgs([
  'consumer_insight',
  clientSlug,
  '--real-llm',
  '--blueprint',
  'assets/_compiled/blueprints/brand-positioning-deck-v1.json',
  '--chunk-id',
  'p2-c3-consumer-portraits',
  '--upstream-chunks',
  'p2-c1-market-scan,p2-c2-competition-status',
  '--with-layout-designer',
])
assert.equal(parsed.realLLM, true)
assert.equal(parsed.withLayoutDesigner, true)
assert.equal(parsed.blueprintPath, 'assets/_compiled/blueprints/brand-positioning-deck-v1.json')
assert.equal(parsed.chunkId, 'p2-c3-consumer-portraits')
assert.deepEqual(parsed.upstreamChunks, ['p2-c1-market-scan', 'p2-c2-competition-status'])

const blueprintChunk = await loadBlueprintChunk(
  'assets/_compiled/blueprints/brand-positioning-deck-v1.json',
  'p2-c3-consumer-portraits',
)
assert.equal(blueprintChunk.chunk_id, 'p2-c3-consumer-portraits')
assert.equal(blueprintChunk.driving_sub_agent, 'consumer_insight')
assert.equal(blueprintChunk.pages.length, 4)

const annualBlueprintChunk = await loadBlueprintChunk(
  'assets/_compiled/blueprints/brand-positioning-deck-v1.json',
  'p3-c6-focus-touchpoints',
)
assert.equal(annualBlueprintChunk.driving_sub_agent, 'annual_planning')

await fs.mkdir(`outputs/${clientSlug}/_chunks`, { recursive: true })
await fs.writeFile(`outputs/${clientSlug}/_chunks/p2-c2-competition-status.json`, JSON.stringify({
  chunk_takeaway: '竞争空位来自专业创作工具平台',
  chunk_insights: ['竞品偏硬件', '用户需要工作流'],
  slides: [{ page_no: 21, action_title: '竞品偏硬件导致平台机会出现', data_refs: [{ value: 'old', source: 'https://example.com/old' }] }],
}, null, 2))
const upstreamSummary = await loadUpstreamChunksSummary(clientSlug, ['p2-c2-competition-status', 'missing-chunk'])
assert.ok(upstreamSummary.includes('竞争空位来自专业创作工具平台'))
assert.ok(upstreamSummary.includes('missing-chunk'))

await fs.writeFile(`outputs/${clientSlug}/_chunks/upstream-a.json`, JSON.stringify({
  blueprint_chunk_id: 'upstream-a',
  chunk_takeaway: '上游 A',
  chunk_insights: [{ insight: 'A insight', source_url: 'https://example.com/a-insight' }],
  slides: [
    {
      page_no: 1,
      action_title: 'A1',
      data_refs: [
        { value: 'A', source: 'https://example.com/a', source_tier: 'T2' },
        { value: 'duplicate', source: 'https://example.com/dup', source_tier: 'T3' },
      ],
    },
    {
      page_no: 2,
      action_title: 'A2',
      data_refs: [
        { value: 'client', source: `inputs/${clientSlug}/first-party/customer.md`, source_tier: 'T1' },
        { value: 'case should not pass', source: 'assets/_raw/cases/标杆案例/smallrig/page-124.md', source_tier: 'T1' },
      ],
    },
  ],
}, null, 2))
await fs.writeFile(`outputs/${clientSlug}/_chunks/upstream-b.json`, JSON.stringify({
  blueprint_chunk_id: 'upstream-b',
  metadata: { run_id: 'current-run' },
  chunk_takeaway: '上游 B',
  chunk_insights: [{ insight: 'B insight', source_url: 'https://example.com/b-insight' }],
  slides: [
    {
      page_no: 3,
      action_title: 'B1',
      data_refs: [
        { value: 'B', source: 'https://example.com/b', source_tier: 'T2' },
        { value: 'duplicate again', source: 'https://example.com/dup', source_tier: 'T3' },
      ],
    },
  ],
}, null, 2))
await fs.writeFile(`outputs/${clientSlug}/_chunks/upstream-stale.json`, JSON.stringify({
  blueprint_chunk_id: 'upstream-stale',
  metadata: { run_id: 'old-run' },
  chunk_takeaway: '旧 run 不应进入新一轮 source_pool',
  chunk_insights: [{ insight: 'stale', source_url: 'https://example.com/stale-insight' }],
  slides: [
    {
      page_no: 9,
      action_title: 'stale',
      data_refs: [{ value: 'stale', source: 'https://example.com/stale', source_tier: 'T2' }],
    },
  ],
}, null, 2))
const upstreamObjects = await loadUpstreamChunkObjects(clientSlug, ['upstream-a', 'upstream-b'], { maxDataRefs: 3 })
assert.equal(upstreamObjects[0].data_refs.length, 3)
assert.equal(upstreamObjects[0].data_refs[0].from_chunk_id, 'upstream-a')
assert.equal(upstreamObjects[0].data_refs.find(ref => ref.source === 'https://example.com/a').from_page_no, 1)
assert.ok(upstreamObjects[0].data_refs.some(ref => ref.source === `inputs/${clientSlug}/first-party/customer.md`))
assert.ok(upstreamObjects.every(item => item.data_refs.every(ref => !String(ref.source).startsWith('assets/_raw/cases/'))))
const upstreamSummaryWithRefs = await loadUpstreamChunksSummary(clientSlug, ['upstream-a', 'upstream-b'], { maxDataRefs: 3 })
const duplicateMatches = upstreamSummaryWithRefs.match(/https:\/\/example\.com\/dup/g) || []
assert.equal(duplicateMatches.length, 1)
assert.ok(upstreamSummaryWithRefs.includes('"from_chunk_id": "upstream-a"'))
const staleFilteredSummary = await loadUpstreamChunksSummary(clientSlug, ['upstream-b', 'upstream-stale'], { maxDataRefs: 3, requireRunId: 'current-run' })
assert.ok(staleFilteredSummary.includes('上游 B'))
assert.ok(!staleFilteredSummary.includes('https://example.com/stale'))
assert.ok(staleFilteredSummary.includes('run_id mismatch'))

const blueprintBundleResult = await prepareSubAgentBundle('consumer_insight', clientSlug, {
  blueprintPath: 'assets/_compiled/blueprints/brand-positioning-deck-v1.json',
  chunkId: 'p2-c3-consumer-portraits',
  upstreamChunks: ['p2-c2-competition-status'],
})
const blueprintBundle = await fs.readFile(blueprintBundleResult.bundlePath, 'utf8')
assert.equal(blueprintBundleResult.outputDirName, `${clientSlug}/_chunks`)
assert.ok(blueprintBundleResult.rawPath.endsWith(`outputs/${clientSlug}/_chunks/p2-c3-consumer-portraits.json`))
assert.ok(blueprintBundle.includes('"chunk_id": "p2-c3-consumer-portraits"'))
assert.ok(blueprintBundle.includes('竞争空位来自专业创作工具平台'))
assert.ok(blueprintBundle.includes('视频创作者'))
assert.ok(blueprintBundle.includes(`outputs/${clientSlug}/_chunks/p2-c3-consumer-portraits.json`))

const dryRunRealLLM = await runRealLLMSubAgent('brand_positioning', clientSlug, {
  outputSuffix: 'dry-run-llm',
  model: 'claude-sonnet-4-5-20250929',
  maxTokens: 100,
  temperature: 0,
  dryRun: true,
})
assert.ok(dryRunRealLLM.output.dry_run)
assert.equal(dryRunRealLLM.usage.input_tokens, 0)
assert.ok(await fs.stat(`outputs/${clientSlug}-dry-run-llm/raw-output.json`))

await fs.writeFile(`outputs/${clientSlug}/raw-output.json`, JSON.stringify({
  agent_id: 'brand_positioning',
  client_profile: { name: '测试客户', render_style: 'swiss' },
  slides: [
    {
      page_no: 1,
      layout: 'S03',
      action_title: '从配件供应商升级为创作工具平台',
      core_points: ['p1', 'p2', 'p3'],
      data_refs: [{ value: '100%', source: '测试资料', type: 'stat' }],
      models_used: ['STP'],
    },
    {
      page_no: 2,
      layout: 'S13',
      action_title: '品牌定位三角: 工具 × 社群 × 赋能',
      core_points: ['Target', 'Frame', 'RTB'],
      data_refs: [],
      models_used: ['Brand-Positioning-Triangle'],
    },
    {
      page_no: 3,
      layout: 'S17',
      action_title: '商业模式画布: 共创循环驱动开放生态',
      core_points: ['活动', '价值', '关系'],
      data_refs: [],
      models_used: ['Business-Model-Canvas'],
    },
    {
      page_no: 4,
      layout: 'S22',
      action_title: '品牌人格: 真诚 + 能力的工具伙伴',
      core_points: ['真诚', '能力', '坚毅'],
      data_refs: [],
      models_used: ['Aaker-Brand-Personality'],
    },
  ],
}, null, 2))

const validation = await validateSubAgentOutput('brand_positioning', clientSlug)
assert.equal(validation.passed, true)
assert.ok(await fs.stat(`outputs/${clientSlug}/index.html`))

for (const [agentId, suffix, expected] of [
  ['consumer_insight', 'consumer', { mustLoadCount: 3, webSearch: 'optional', maxSearches: 3, concept: 'Concept: JTBD' }],
  ['industry_analysis', 'industry', { mustLoadCount: 3, webSearch: 'required', maxSearches: 8, concept: 'Concept: PESTEL' }],
  ['competitor_analysis', 'competitor', { mustLoadCount: 3, webSearch: 'required', maxSearches: 12, concept: 'Concept: SWOT' }],
  ['brand_building', 'building', { mustLoadCount: 4, webSearch: false, maxSearches: 0, concept: 'Concept: Brand-House' }],
  ['annual_planning', 'annual', { mustLoadCount: 4, webSearch: 'optional', maxSearches: 4, concept: 'Concept: OKR' }],
]) {
  const result = await prepareSubAgentBundle(agentId, clientSlug, { outputSuffix: suffix })
  const generatedBundle = await fs.readFile(result.bundlePath, 'utf8')
  assert.equal(result.outputDirName, `${clientSlug}-${suffix}`)
  assert.equal(result.mustLoadCount, expected.mustLoadCount)
  assert.equal(result.webSearch, expected.webSearch)
  assert.equal(result.maxSearches, expected.maxSearches)
  assert.ok(generatedBundle.includes(`Prompt Bundle · ${agentId} · ${clientSlug}`))
  assert.ok(generatedBundle.includes(`outputs/${clientSlug}-${suffix}/raw-output.json`))
  assert.ok(generatedBundle.includes(expected.concept))
  assert.ok(generatedBundle.includes('## Case Patterns (auto-injected)'))
  assert.ok(result.casePatternCount >= 2)
}

await fs.rm(`inputs/${clientSlug}`, { recursive: true, force: true })
await fs.rm(`outputs/${clientSlug}`, { recursive: true, force: true })
for (const suffix of ['consumer', 'industry', 'competitor', 'building', 'annual']) {
  await fs.rm(`outputs/${clientSlug}-${suffix}`, { recursive: true, force: true })
}
await fs.rm(`outputs/${clientSlug}-dry-run-llm`, { recursive: true, force: true })
console.log('✅ run-sub-agent test passed')
