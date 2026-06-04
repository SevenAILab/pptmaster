# Plan 7 Blueprint Refactor Handoff

日期: 2026-05-28  
范围: PPTAgent Phase 1 blueprint-driven refactor  
状态: 本地构建完成, 不 push

## 1. 完成情况

### Phase A: Blueprint 设计

- 已新增 `assets/_compiled/blueprints/brand-positioning-deck-v1.json`
  - 方案类型: `brand_positioning_case`
  - 目标页数: 80
  - chunk 数: 13
  - 结构: 项目背景 / 分析 / 定位 + 沟通落地 / 总结回顾
- 已新增 `assets/_compiled/blueprints/brand-building-deck-v1.json`
  - 方案类型: `brand_building_case`
  - 目标页数: 95
  - chunk 数: 15
  - 结构: 分析 / 战略 / 配称 / 总结
- 已新增 `scripts/validate-blueprint.mjs`, 两份 blueprint 均 PASS。

### Phase B: Sub-Agent Blueprint Mode

- 6 个 Sub-Agent prompt 已加入 BLUEPRINT MODE。
- 6 个 user prompt 已加入 `{{blueprint_chunk}}` / `{{upstream_chunks_summary}}` 占位。
- 6 个 examples 已加入 blueprint few-shot。
- 6 个 validators 已接入 `blueprintCheck`。
- `scripts/run-sub-agent.mjs` 已支持:
  - `--blueprint`
  - `--chunk-id`
  - `--upstream-chunks`
  - 自动注入 strategic question。

### Phase C: Orchestrator

- 已新增 `scripts/run-blueprint-suite.mjs`
  - 按 scheme 加载 blueprint。
  - 按 chunk 顺序准备 prompt bundle。
  - 支持 `_chunks/<chunk_id>.json` 输出目录。
  - 自动确保 `inputs/<slug>/strategic-question.md` 存在。
- 已新增 `scripts/assemble-by-blueprint.mjs`
  - 按 blueprint 顺序组装 chunk outputs。
  - 保留 `blueprint_page_no` / `chunk_id` / `part_no`。
  - 输出最终 `raw-output.json`。
- 已新增 `scripts/consulting-review.mjs`
  - 在 chunk 层做结构、洞察、咨询语气、页面效率 review。
- 已新增 `scripts/strategic-question.mjs`
  - 为每个客户输入生成整案根问题。

### Phase D: 端到端验证

已重新生成 3 份端到端 demo:

| 输出 | 类型 | 页数 | 路径 |
|---|---:|---:|---|
| 茶语品牌定位案 | 品牌定位案 | 80 | `outputs/test-positioning-case-blueprint/index.html` |
| 启程品牌建设案 | 品牌建设案 | 95 | `outputs/test-building-case-blueprint/index.html` |
| SmallRig MI 升级案 | 品牌建设案 | 95 | `outputs/smallrig-mi-blueprint/index.html` |

额外当前可查看输出:

- `outputs/pptagent-blueprint/index.html`
- `outputs/pptagent-blueprint/raw-output.json`

## 2. 用户关心的核心架构问题

结论: 目标逻辑是“各部分 Agent 独立思考得出局部结论, 再由蓝图集中汇总成整案”, 但不是让 6 个 Agent 各自自由写完整方案再拼起来。

更准确的工程逻辑是:

1. `inputs/<slug>/strategic-question.md` 先定义整案根问题。
2. blueprint 决定:
   - 方案类型
   - Part 顺序
   - chunk 边界
   - 页码
   - 每页意图
   - 由哪个 Sub-Agent 负责
   - 允许使用哪些方法论概念
   - 需要读取哪些上游 chunk。
3. 每个 chunk 由对应 Sub-Agent 独立负责这一段的策略判断, 输出:
   - `chunk_takeaway`
   - `chunk_insights`
   - `thinking_log`
   - `slides`
4. 下游 chunk 读取上游 chunk summary, 保证前后有因果关系。
5. `outputs/<slug>/_insights.json` 汇总所有 chunk 的结论。
6. `scripts/assemble-by-blueprint.mjs` 按 blueprint 顺序集中组装成最终 `raw-output.json`。
7. `scripts/render-deck.mjs` 把 `raw-output.json` 渲染为 HTML 横向翻页 PPT。

因此 Sub-Agent 的角色是“蓝图约束下的局部策略判断者”, 不是“自由章节作者”。整案叙事由 blueprint 和 strategic question 控制。

## 3. 本轮额外修复

针对通用品牌定位 demo 的污染问题, 已补强 `scripts/generate-blueprint-demo.mjs`:

- 非 PPTAgent 的品牌定位案不再复用 PPTAgent 专属话术。
- 通用品牌定位案会走 `genericPositioningPageContent`。
- `chunk_takeaway` 按客户类型分流:
  - SmallRig: 严格回到 page-124 品牌屋字段。
  - PPTAgent: 保留“避开通用 AI PPT 红海”的新品类叙事。
  - 其他品牌: 回到人群 / 场景 / 利益 / RTB 的定位判断。
- `scripts/test-blueprint-demo-cases.mjs` 已增加断言:
  - 茶语定位案不得包含 `PPTAgent`
  - 不得包含 `AI PPT`
  - 不得包含 `甲方品牌方和市场部`

## 4. 验证结果

已通过命令:

```bash
node scripts/test-validate-blueprint.mjs
node scripts/test-blueprint-validators.mjs
node scripts/test-run-sub-agent.mjs
node scripts/test-blueprint-suite.mjs
node scripts/test-blueprint-assemble.mjs
node scripts/test-blueprint-end-to-end.mjs
node scripts/test-consulting-review.mjs
node scripts/test-strategic-question.mjs
node scripts/test-blueprint-demo-generator.mjs
node scripts/test-blueprint-demo-cases.mjs
npm run blueprint:validate -- assets/_compiled/blueprints/brand-positioning-deck-v1.json assets/_compiled/blueprints/brand-building-deck-v1.json
```

三份 demo 页数验证:

- `test-positioning-case-blueprint`: 80 页
- `test-building-case-blueprint`: 95 页
- `smallrig-mi-blueprint`: 95 页

SmallRig 自查:

- `raw-output.json` 包含 `全球影像场景产品生态开创者` / `FREE YOUR DREAM` / `Rig UP` / `全生态`。
- 95 个 data_refs 全部指向 `assets/_raw/cases/标杆案例/smallrig/page-124.md`。

## 5. 使用方法

生成一份品牌定位案 demo:

```bash
node scripts/generate-blueprint-demo.mjs <client-slug> --scheme brand_positioning_case --output-slug <client-slug>-blueprint --force
```

生成一份品牌建设案 demo:

```bash
node scripts/generate-blueprint-demo.mjs <client-slug> --scheme brand_building_case --output-slug <client-slug>-blueprint --force
```

真实 blueprint 分步流程:

```bash
npm run blueprint:suite -- <client-slug> --scheme brand_positioning_case --force --fail-fast
npm run blueprint:assemble -- <client-slug> --scheme brand_positioning_case --output-slug <client-slug>-blueprint
node scripts/render-deck.mjs outputs/<client-slug>-blueprint/raw-output.json outputs/<client-slug>-blueprint/index.html --style=swiss
```

## 6. 已知边界

1. 当前 `generate-blueprint-demo.mjs` 是 deterministic 本地 demo generator, 用于验证结构、链路和样例输出。
2. 生产版仍需要把真实 LLM 调用接入 `run-blueprint-suite.mjs`, 让 Sub-Agent 根据 prompt bundle 生成 chunk JSON。
3. `consulting-review.mjs` 当前是本地规则 review, 未来可升级为 LLM stress-test + retry。
4. `render-deck.mjs` 已有 S03/S05/S09/S12/S13/S14/S15/S17/S19/S21/S22 等 renderer, 但视觉层仍是最小可用版, 客户级版式精雕 deferred 到后续 render upgrade。
5. 产品策略案、年度传播案等更多 scheme 仍是 P1/P2 范围, 目前只完成品牌定位案和品牌建设案两类 blueprint。

## 7. 下一步建议

1. Seven/Claude review 三份实际输出, 优先看提案逻辑是否像真实案例。
2. 若逻辑通过, 进入真实 LLM chunk 生成接入。
3. Web App 后端只接受 `scheme_type`, 由后端映射到固定 blueprint, 不允许前端自由拼结构。
4. 等 6 个 Sub-Agent 都能真实生成 chunk 后, 再启动 render-deck 版式精雕。

