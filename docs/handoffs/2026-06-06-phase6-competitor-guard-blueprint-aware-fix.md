# Phase 6 阻断修复 — 竞品护栏改为「按蓝图页概念」而非写死页码

> 日期: 2026-06-06 ｜ 作者: Claude（根因诊断 + 修复 spec）｜ 执行: Codex（TDD）｜ 复核: Claude 独立 CP
> 触发: Phase 6 building_case 真跑在 chunk `p1-c2-competition-format` page 22 撞硬护栏失败（Codex 正确停下、未硬磨）。

## §1 根因（Claude 已核实，证据确凿）

失败护栏：`scripts/sub-agents/deepresearch-common.mjs:917`
```js
if (slide.page_no === 22 && /空位|心智|占位|抢占|专业\s*Agent|策略工作流/i.test(text)) {
  throw competitorPositioningError('NO-FALLBACK violation: page 22 must stay a competitor matrix, not repeat the positioning/perceptual-map conclusion', slide)
}
```
**它把"结构规则"硬绑在绝对页码 22 上。** 两个蓝图的 page 22 概念不同：

| 页 | positioning | building |
|---|---|---|
| p21 | Competitor-Matrix | Competitor-Matrix |
| **p22** | **Competitor-Matrix** | **Perceptual-Map（竞争小结）** |
| p23 | Perceptual-Map | JTBD |

building 蓝图 `brand-building-deck-v1.json` 的 p22 明确定义：
`concept_for_this_page: "Perceptual-Map"`、`page_intent: "竞争小结：新品牌应选择差异化领导/跟随/细分突破"`、`data_source_hint: "竞争 chunk 综合"`。
→ **写手照蓝图把 p22 写成 Perceptual-Map 竞争小结是对的，护栏误杀。** 这是护栏 bug，不是写手错。

## §2 修复 1（主因）：护栏改为按 `concept_for_this_page` 门控

**目标:** 只有「蓝图概念 = Competitor-Matrix」的页禁止漂移成知觉图/定位结论；「概念 = Perceptual-Map」的页放行。
- positioning p22(Matrix) → 规则仍生效（**行为不回归**）。
- building p22(Perceptual-Map) → 规则跳过（**解锁**）。

**接线:**
- `assertCompetitorPositioningEvidence(result, options)` 已有 `options`。把**蓝图 chunk 的 page→concept 映射**通过 `options.pageConcepts`（或 `options.chunkPages`）传入。调用处在 `runWriteStep`（约 line 1348）与 line 1001——它们能拿到 chunk spec（line 595 已用 `spec.concept_for_this_page`），把 `{ [page_no]: concept_for_this_page }` 传进来。
- line 917 改为：
  ```js
  const concept = (options.pageConcepts && options.pageConcepts[slide.page_no]) || slide.concept_for_this_page
  if (concept === 'Competitor-Matrix' && /空位|心智|占位|抢占|专业\s*Agent|策略工作流/i.test(text)) { throw ... }
  ```
  （兜底：若拿不到概念映射，保持旧的 `page_no===22` 行为以防 positioning 回归——但优先用概念。）

**测试（TDD，先红后绿）** 扩 `scripts/test-deepresearch-guardrail.mjs`：
- 概念=Competitor-Matrix 的页含「空位/心智」→ **抛错**（保住 positioning 行为）。
- 概念=Perceptual-Map 的页含「空位/心智」→ **不抛错**（building 解锁）。
- 无概念映射、page_no=22 + 该内容 → 仍抛错（兜底不回归）。

## §3 修复 2（伴生）：竞争小结/综合页不得用 summary.md，应为诚实假设

building p22 写手把 `inputs/pptagent/summary.md` 当 data_ref（红线禁止）。该页是「竞争 chunk 综合 + 前瞻定位判断」，对 pptagent 这种证据薄主体，**应像 positioning 的 p24 竞争小结一样降级为诚实假设**（`evidence_status=hypothesis` + `hypothesis_basis` + `validation_method`，进 validation_checklist），而不是挂 summary.md 充当事实。

- 排查 `downgradePositioningSlides`（line 849）为何没覆盖 building 的 Perceptual-Map 小结页（很可能它的页面识别条件没命中该页）。
- 让综合/小结类页（`data_source_hint` 含「综合/小结」或概念=Perceptual-Map 且做定位跃迁）：要么继承上游**真实**来源，要么走诚实假设降级；**任何情况下都不得以 `summary.md` 作为 data_ref**（既有红线护栏保留）。
- 测试：building 形态的 Perceptual-Map 小结页（含定位跃迁 + 仅 summary.md 源）→ 经 downgrade 后变为 hypothesis（带 basis+method），不再触红线、不被误杀。

## §4 红线（不可松动）
- summary.md / assets/_raw/cases / 无源 仍**禁止**作 data_ref。
- repo-popularity / 竞品自家页当需求证据仍硬抛错。
- 修复只是「让合法的 Perceptual-Map 小结页走诚实假设通道」，**不是**放宽"不许编造"。

## §5 验证（先离线，再续跑——不浪费已成功 chunk）
1. 离线：`test-deepresearch-guardrail` + `test-positioning-downgrade`(若有) + `test-phase-a-deepresearch-runners` + `test-blueprint-suite` 全绿；**positioning 既有断言不得改坏**。
2. **续跑**（利用 Phase 5 断点续跑，p1-c1 已成功不重烧）：
   ```bash
   unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL
   node scripts/run-blueprint-suite.mjs pptagent --scheme brand_building_case --real-llm --run-id phase6-building
   ```
   - 成本硬上限 $8、墙钟 45 分钟；触顶抛错停下。
   - 期望：p1-c2 通过（p22 作为 Perceptual-Map 诚实假设小结，零红线），suite 继续推进。
3. 跑完按原 Phase 6 CP-6 A–F 验收。

## §6 提交 + 回报
- 每个修复独立 commit（署名规范）。
- 回报：新增/改动测试结果、positioning 回归是否绿、续跑后 p1-c2 是否通过 + p22 的 evidence_status、整卷 A–F。
- 任一红线触发或异常：停下贴日志交回，不硬磨。

## 给小白的讲解
- **出了什么事:** Phase 6 跑"品牌建设"方案，在竞品那一章第 22 页被自家的"安全闸"拦下了。我查了根因——**不是程序在编数据，是这道闸写得太死**：它写死了"第 22 页必须是竞品对比表"，可这是按"品牌定位"方案定的；换到"品牌建设"方案，第 22 页本来就该是另一种图（竞争小结）。所以是闸误伤了正确的内容。
- **怎么修:** 把这道闸从"认页码"改成"认这页在蓝图里的用途"——是"对比表"的页才管，是"小结图"的页就放行。这样原来的"品牌定位"方案不受影响，"品牌建设"方案也能过。另外那一页还顺手把一个不该当来源的文件（summary.md）当了数据，要按老规矩改成老实标"这是待验证假设"。
- **好消息:** 上一步装的"断点续跑"这次正好派上用场——已经成功的第一章不用重跑、不重烧钱，修完接着从第二章跑。
- **怎么自己核查:** 这份诊断在 `docs/handoffs/2026-06-06-phase6-competitor-guard-blueprint-aware-fix.md`，§1 那张"两个蓝图第 22 页不一样"的表就是误杀的铁证。修完 Codex 会回报"第 22 页这次过了、标成了假设、红线 0"。
