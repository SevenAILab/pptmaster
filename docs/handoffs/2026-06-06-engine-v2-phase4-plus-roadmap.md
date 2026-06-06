# Engine V2 · Phase 4+ 完整开发路线图（Phase 3 成功之后）

> 日期: 2026-06-06 ｜ 作者: Claude（计划）｜ 执行: Codex ｜ 复核: Claude 独立 CP
> 前置: Engine V2 Phase 3（方法论驱动品类调研）已**真跑验收通过**，详见下 §0。
> 红线（全程不可松动）: 失败必抛错、不静默兜底、不伪造数据；每个数字可追溯(来源+日期+T1–T4)；无源内容只能进 assumptions 并标 hypothesis+basis+method；模板示例数字严禁进产出。

---

## §0 现状基线（Claude 已核实，2026-06-06）

**Phase 3 CP-3 真跑产物** `outputs/pptagent-phase3-validation-20260602-155549(-blueprint)`：

| 验收项 | 结果 |
|---|---|
| 研究蓝图存在 + 结构完整 | ✅ `category_essence`(5字段) + `research_blueprint`(4数组) |
| 整卷完整 | ✅ 80/80 页，validation_checklist 6 条 |
| **红线违规** | ✅ **0**（旧版曾 71） |
| data_ref 带 source_tier | ✅ **188/188** |
| 诚实假设页 | ✅ 6 页 evidence_status=hypothesis |
| 离线测试 | ✅ 全绿（research-blueprint / methodology-injection / assumption-policy / guardrail / phase-a / blueprint-suite / consulting-review）|

**结论:** 引擎已能对「零市场数据的新品牌」产出**零编造、全可追溯、假设老实标注**的完整方案。核心质量门槛达成。

**唯一遗留缺口（Codex 真跑时跳过的 Task 1）:** 方法论 config 级注入**只在 industry-analysis 完成**，其余 5 专家仍 **0 注入**（仅靠 orchestrator bundle 旁路拿到，deepresearch 的 plan/write 提示词仍是裸的）。
```
industry-analysis: 6   competitor: 0   consumer: 0   positioning: 0   building: 0   annual: 0
```

---

## §1 路线图总览（按价值与防返工排序）

| Phase | 名称 | 性质 | 为什么是这个顺序 |
|---|---|---|---|
| **4** | 专家方法论深化（注入收口 + 外部框架借鉴合并） | 内容质量 | 遗留缺口与 Part B 改同一批文件，合并做最省事；直接提升每本方案的专业度。**只改 prompt，不碰编排脚本** |
| **5** | **Run State + Event Ledger**（= Agent OS Phase 2 切片，提前） | 运维/可观测 | 治你亲历的「空转看不到进度 / 崩了重烧 token」；放在 Phase 6 昂贵整卷真跑之前，让那些真跑可断点续跑、又省钱 |
| **6** | building_case 全卷验收 + 第二主体回归 | 广度/稳健 | 目前只验过 positioning 单主体；要证明引擎不只在「证据薄」路径能跑。**受益于 Phase 5 的续跑能力** |
| **7** | PPTX 导出层重构（brand-deck 借鉴 Part A） | 交付保真 | 当前导出依赖硬编码外部转换器，是最脆环节；独立专项 |
| **8**（可选/靠后） | Intake 一句话需求 | 体验 | 引擎已可用，降低使用门槛的锦上添花 |

> **Agent OS Phase 0-3 不整块做，拆开按价值分置**——详见 §6 对账表。要点：Run State(他们的 Phase 2) 提前到本路线图 Phase 5；Registry+命名冻结(他们的 Phase 0-1) 与 DAG(他们的 Phase 3) **延后并设明确触发条件**，现在做只是双份维护债。

---

## §2 Phase 4 — 专家方法论深化（**下一个要执行的，完整 TDD**）

**Goal:** 让 6 个专家**全部**拿到 config 级方法论+蓝图注入（收口缺口），并把外部成熟框架的**输出结构**吸收进对应专家——使每本方案的竞品/用户/定位/品牌章节更专业、更可横向对比，同时**红线一寸不让**。

**接入点:** `scripts/sub-agents/methodology-injection.mjs`（已有 `loadMethodologyFramework`/`buildBlueprintContextSnippet`/`appendMethodologyToSystem`/`injectBlueprintSnippetIntoContext`）。参考实现 = `industry-analysis-deepresearch.mjs`（已注入 plan/write 各处）。
**借鉴来源:** 见 `docs/handoffs/2026-06-06-brand-marketing-skills-borrow-assessment.md` Part B（competitor-profiling / customer-research 已 clone 核实；positioning-messaging / brand-storytelling / competitive-analysis 为 anthropic 官方 skill，Codex 落地前取真实 SKILL.md，取不到则按该文档 B.1 公认框架，**不得编造其内部细节**）。

**约束:** 注入只提供「思考结构 + 输出该覆盖哪些维度」；具体内容仍**必须来自真实搜索 + 证据分级**，禁止照搬模板占位/示例数字；推断一律走 hypothesis+basis+method。

### Task 4.0 — 共享证据戒律（全 6 专家）
- **先写失败测试**（扩 `test-methodology-injection.mjs`）：断言 6 专家 writeSystem 均含 4 条戒律关键词（Facts-over-opinions/可追溯、Structured-comparable、Current-data-注明日期、Honest-assessment）。
- **实现**：在 `methodology-injection.mjs` 加一个共享前缀常量，`appendMethodologyToSystem` 统一附加。
- 跑绿 + 回归 `test-deepresearch-guardrail` / `test-phase-a-deepresearch-runners`。

### Task 4.1 — 收口 5 专家的 config 级注入
对 `competitor-analysis / consumer-insight / brand-positioning / brand-building / annual-planning` 各自：
- **先写失败测试**：断言该 config 的 planSystem/writeSystem 经注入后含「## 调研方法论框架」与蓝图切片标记。
- **实现**（照 industry 形态，注意各自是 `runFiveStepDeepResearch(args,{planSystem:PLAN_SYSTEM,...})` 模式）：
  - `planSystem: await appendMethodologyToSystem(PLAN_SYSTEM, '<agent_id>')`；`writeSystem` 同理；
  - `planUser(context)` 内 `injectBlueprintSnippetIntoContext(context, await buildBlueprintContextSnippet(slug,'<agent_id>'))`。
- **每改一个专家**：该专家测试绿 + guardrail/phase-a 回归绿，再下一个。**禁止一次性大改 5 个**。

### Task 4.2 — 各专家注入借鉴的输出结构（Part B）
逐专家把 B.1 的结构写进 writeSystem 的「输出要求」段（先写断言测试再实现）：
- **competitor_analysis**: 竞品横向对比表维度（tagline/目标人群/定位角度/定价/免费档/关键强弱项）+ 定位双轴图（Positioning Map）作为一个 chunk 页结构候选。
- **consumer_insight**: VOC 用户原话（须带来源）+ JTBD + 3 痛点/3 wish。
- **brand_positioning**: 一页 messaging 骨架（对谁说/说什么/**不说什么**/价值主张/差异点/proof/pillars）。
- **brand_building**: 叙事弧（主角=客户/冲突/转折/品牌角色）。
- **industry_analysis + competitor_analysis**: competitive-analysis 的「真威胁 vs 长得像但不抢」威胁分级。

### Task 4.3 — 真跑冒烟（防过度，单/双 chunk）
- 对 pptagent 跑竞品 chunk（如 `--only-chunk p2-c2-competition-status --real-llm`，带成本/时间硬上限、env unset 自检——沿用 2026-05-30-phase2d §0/§2 护栏）。
- 肉眼确认输出更像「可横向对比的竞品表 / 清晰定位骨架」，且红线硬验 = 0。
- **不**整卷重跑（省 token）；整卷留到 Phase 5。

### Phase 4 验收
- [ ] 6 专家方法论 config 注入计数全部 ≥1（`grep -c` 验证）。
- [ ] 6 专家 writeSystem 含共享戒律；竞品/用户/定位/品牌含各自借鉴结构（测试断言）。
- [ ] 全部红线护栏测试绿；repo-popularity / 竞品自家页 / 编造数字仍硬抛错。
- [ ] 竞品 chunk 真跑冒烟：结构更专业 + 红线违规 0。
- [ ] 每 Task 独立 commit（含协作署名）。

---

## §3 Phase 5 — Run State + Event Ledger（= Agent OS Phase 2 切片，提前执行）

**Goal:** 把「脚本执行」升级为「可审计、可断点续跑的 run」。直接治你亲历的两个痛：① 真跑时看不到进度/卡在哪；② 跑到一半崩了得从头重烧 token。**这是从 Agent OS 计划里挑出来、独立于"未来方案类型"也成立的一块。**
**为什么放这里（Phase 4 后、Phase 6 前）:** Phase 4 只改 prompt、不碰编排脚本，做完后 `run-blueprint-suite.mjs` 处于稳定态；而紧接的 Phase 6 要跑好几本约 $8 的整卷真跑——**正是最需要"看得到、崩了能续"的时候**。在它之前建好最划算。
**新增（照 Agent OS 计划 §3 范围，但不带 registry/DAG）:**
- `core/runtime/run-state.mjs`、`core/runtime/event-ledger.mjs`
- `schemas/run-state.schema.json`、`schemas/run-event.schema.json`
- `scripts/test-run-state.mjs`、`scripts/test-event-ledger.mjs`
- 输出: `outputs/<slug>/_runs/<run_id>/{state.json, events.jsonl}`
**改造 `run-blueprint-suite.mjs`（最小侵入，不改执行循环结构）:**
- 支持 `--run-id`（缺省自动生成）。
- chunk 的 started/completed/skipped/failed/retry 写入 `events.jsonl`；每次更新 `state.json`。
- 失败事件必须含 `error_message` + `termination_reason`（+ chunk_id/worker_id/retry_of_event_id 适用时）。
- chunk metadata 增写 `run_id`（其余 scheme_id/worker_id 等新字段**可选**，不强制——那些属于 registry，本期不做）。
- **支持基于 `state.json` 跳过已成功 chunk**（断点续跑的核心收益）。
**红线:** 失败仍按既有红线**抛错停下**，event ledger 只是"如实记录"，**不得**变成静默兜底的借口。
**验收:**
```bash
node scripts/test-run-state.mjs && node scripts/test-event-ledger.mjs
node scripts/run-blueprint-suite.mjs pptagent --scheme brand_positioning_case --only-chunk p2-c1-market-scan --run-id smoke --real-llm  # 烧 1 chunk
test -f outputs/pptagent/_runs/smoke/events.jsonl && test -f outputs/pptagent/_runs/smoke/state.json
# 再跑一次同 run-id，应跳过已成功 chunk（不重烧）
```
**不做:** DAG scheduler、并行 LLM、scheme/worker registry——见 §6 对账。

---

## §4 Phase 6 — building_case 全卷验收 + 第二主体回归（scoped）

**Goal:** 证明引擎不只在「证据薄新品牌 / positioning」路径成立。**受益于 Phase 5：整卷真跑现在可断点续跑、不重烧。**
**做:**
- pptagent **brand_building_case** 全卷真跑 → 组装 → 渲染，过 CP-3 同款 A–G 验收（红线 0、全分级、完整卷、假设标注）。
- 选**一个证据更充足的真实品牌**（如 smallrig/oatly，inputs 已存在）跑 positioning 全卷，确认「有真数据」时假设页应显著减少、evidenced 页增多（反向验证分场景闸没把真证据误降级）。
**验收:** 两主体均出完整可渲染卷、红线 0；证据充足主体的 hypothesis 比例明显低于 pptagent。
**护栏:** 成本/时间硬上限 + env unset 自检，沿用既有真跑手册。

---

## §5 Phase 7 — PPTX 导出层重构（brand-deck 借鉴 Part A，独立专项）

**Goal:** 摆脱硬编码外部 `html2ppt-sales-tool` 转换器，建一条**受控的「结构化 chunk JSON → 原生可编辑 PPTX」**路径。
**借鉴**（见借鉴评估 Part A，**借思路不迁 Python**）:
- Node 侧用 `pptxgenjs` 直出 PPTX；HTML 继续作 Web 预览。
- 按版式分 renderer（对照 brand-deck 的 cover/bullets/table/storyboard/text_image/end_card ↔ 本项目 Sxx layout）。
- 品牌 theme：引入 `brands/<slug>.yaml`（色/字/logo/版式偏好）统一套用。
**先决:** 单独 spec + build-vs-borrow 评审（是否保留 html 路径并行、迁移成本、保真验收标准）。
**验收:** 原生 PPTX 表格/文本框可编辑；与 HTML 预览内容一致；不再依赖 `~/Downloads` 外部二进制。

---

## §5.5 Phase 8（可选/靠后）— Intake Strategist

- 一句话需求 → 5 维成熟度澄清 → 生成 form/summary/research-brief（借鉴 brief-analyst 框架）。降低使用门槛。
- 非阻塞，待 Phase 4–7 价值兑现后再评估。

---

## §6 Agent OS Phase 0-3 对账（你问的"有没有融入、何时做"）

| Agent OS 块 | 本路线图处置 | 触发条件 / 理由 |
|---|---|---|
| **Phase 0 命名冻结** | **延后**，与 Phase 1 捆绑 | 纯文档、零功能价值；单独做没意义，等做 registry 时一起 |
| **Phase 1 Scheme/Worker Registry** | **延后** | **触发条件：真有第二种方案类型（融资/产品发布等）上日程。** 现在只有 1 个 scheme，加 registry+manifest 还要保留旧 `SUB_AGENTS`/`SCHEME_TO_BLUEPRINT` 作 fallback = 双份真相、双份维护债，零当前回报。Phase 3 刚证明硬编码路径完全够用 |
| **Phase 2 Run State + Event Ledger** | **采纳，提前到本路线图 Phase 5** | 唯一独立于"未来方案类型"也成立的一块；治真实痛点（空转/重烧）。但**只取 state/event/resume，不带 registry 字段强制** |
| **Phase 3 DAG Scheduler** | **延后** | **触发条件：真跑的耗时/成本被实测确认是瓶颈。** 它要重构编排执行循环（最高风险），而其主要近期收益"断点续跑"已被 Phase 5 的 state.json skip 覆盖；并行 LLM 在 13-chunk 量级收益有限、风险高 |

> 一句话：**Agent OS 不是"做不做"，是"拆开按价值和时机分置"。** 有用的（Run State）提前；为未来铺路的（Registry/DAG/命名）设明确触发条件，时机未到不做，避免过早抽象与双份维护债。

---

## §7 非目标（YAGNI）
- 不做 Agent OS registry / DAG scheduler（设触发条件，未到不做，见 §6）。
- 不引入外部 skill 作为独立 runtime；只吸收框架文本。
- Phase 7 导出重构在其专项 spec 通过前不动代码。
- 不为「未来方案类型」预先建抽象。

---

## 给小白的讲解

- **现在做的是什么:** 我先去把 Codex 上次 Phase 3 的真跑结果**逐项验了**——好消息：**成了**。引擎给 pptagent 这种"自己没数据的新品牌"出了一本完整 80 页方案，**一个数据都没编（红线违规 0，对比旧版的 71 处）**，188 条引用全带出处等级，还有 6 页老实标着"这是假设、待验证"。这就是你一直想看到的"成型结果"。
- **你这次问的"那份 Agent OS 计划融进去了吗":** 融了，但我把它**拆开**了——不是整块做，因为它三部分价值差很多（见 §6 对账表）。
  - 其中"**给每次跑批装个黑匣子+断点续跑**"（叫 Run State）确实有用，治你上次"空转 3 小时看不到、崩了重烧钱"的痛——我把它**提前**排进了 Phase 5。
  - 另外两块（"为未来别的方案类型建登记表"和"并行调度器"）现在做纯属给还不存在的需求铺路，还要维护两套，所以我**设了明确的启动条件**：等真要做第二种方案类型、或真跑慢到受不了时再做。现在不做。
- **接下来怎么走（顺序）:** Phase 4 深化 6 个专家（只改提示词，最稳）→ Phase 5 装黑匣子+续跑 → Phase 6 跑"品牌建设"和"有数据品牌"验证引擎够通用 → Phase 7 换掉最脆的"出 PPT 文件"那步 → Phase 8（可选）一句话启动。
- **怎么自己核查:** 计划在 `pptmaster/docs/handoffs/2026-06-06-engine-v2-phase4-plus-roadmap.md`。① §0 是 Phase 3 成绩单（看"红线违规 0"）。② §2 是马上要做的 Phase 4。③ **§6 专门回答你这次的问题**——那份 Agent OS 计划每一块我怎么处置、为什么。
- **需要你拍板:** 直接让 Codex 开跑 **Phase 4** 吗？（大部分离线改 prompt + 写测试，只有最后一个竞品 chunk 真跑烧点 token，建议上限 $3。）Phase 5 的"黑匣子"等 Phase 4 完了再启。
