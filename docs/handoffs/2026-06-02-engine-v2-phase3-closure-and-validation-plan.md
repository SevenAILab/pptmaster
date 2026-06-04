# Engine V2 · Phase 3 收尾 + 验收实施计划（Closure & Validation Plan）

> **性质:** 这是给 Codex 的 **TDD 实施计划**，由 `2026-06-02-engine-v2-phase3-methodology-driven-category-research-design.md`（设计稿）落地而来。
> **角色:** Claude 写计划 → Codex 实现 → Claude 独立 CP 复核。
> **前提结论（Claude 已核实，2026-06-02）:** Phase 3 三大块的代码**已大部分写完且未提交**，离线单测**全绿**。本计划不是从零开发，而是**收口缺口 + 切干净提交 + 真跑验收**。

---

## §0 现状核实（已由 Claude 跑过，Codex 接手前先复跑确认）

未提交工作区（`git status -s`）已含 Phase 3 改动：`assumption-policy.mjs`、`run-blueprint-suite.mjs`、`run-sub-agent.mjs`、`deepresearch-common.mjs`、`industry-analysis-deepresearch.mjs` + 对应测试；新增文件 `scripts/sub-agents/research-blueprint.mjs`、`scripts/sub-agents/methodology-injection.mjs`、`scripts/test-research-blueprint.mjs`、`scripts/test-methodology-injection.mjs`。

**离线单测现状（全绿）：**
```
test-research-blueprint        PASS   ← 块1 Stage0
test-methodology-injection     PASS   ← 块2 方法论注入
test-assumption-policy         PASS   ← 块3 分场景闸
test-consulting-review         PASS
test-deepresearch-guardrail    PASS   ← 红线护栏仍硬抛错
test-phase-a-deepresearch-runners PASS ← repo-popularity 仍硬拦
test-run-sub-agent             PASS
test-blueprint-suite           PASS
```

**已确认正确落地的部分（不要重写）：**
- 块1 Stage 0 `ensureResearchBlueprint` 已挂进 `run-blueprint-suite.mjs`（在 `ensureStrategicQuestion` 之后），产 `outputs/<slug>/_research-blueprint.json`，失败抛错、`force=false` 复用。✅
- 块3 `assumption-policy.mjs`：`classifySlideJudgmentType`(descriptive/prescriptive)、`hasRealEvidence`(T1/T2/T3)、分场景 `evaluateChunkAssumptions` 已实现。**`assumptionRatio>0.4` 已正确降级为软信号 `hypothesisHeavy`，不再 hardBlock**；hardBlock 现在只在「坏假设 / 无源描述性事实 / 秃断言」触发——符合设计 §5 与红线。✅

**Codex 第一步（不改码）：** 复跑上面 8 个测试，确认全绿；`git stash list` 确认无遗漏；再开始 Task。

---

## §1 唯一实质缺口 — 方法论注入只做了 1/6（块2 未完工）

**事实（Claude 已 grep 确认）：** 只有 `industry-analysis-deepresearch.mjs` 用 `appendMethodologyToSystem` + `buildBlueprintContextSnippet` 把「方法论框架 + 品类蓝图切片」注入了 **planSystem / planUser / writeSystem**。其余 5 个专家配置 **0 处注入**：

```
industry-analysis      4 hits  ✅ 参考实现
competitor-analysis    0 hits  ❌
consumer-insight       0 hits  ❌
brand-positioning      0 hits  ❌
brand-building         0 hits  ❌
annual-planning        0 hits  ❌
```

> **为什么这是必须补的：** Phase 3 的核心目标是「把 15 篇方法论从事后校验器 → 调研时的导航」。现在 6 个专家里只有 1 个拿到了导航，目标仅达成 1/6。竞品/用户/定位三个专家恰恰是「新品牌品类调研」最吃方法论的环节，不能漏。
>
> **注意：** `run-sub-agent.mjs` 的 `prepareSubAgentBundle` 确实给所有 agent 的 orchestrator-bundle 注入了方法论+蓝图——但那是**编排包**路径；competitor/consumer/positioning/building/annual 走的是各自 config 的 `planSystem`/`writeSystem` 常量，deepresearch 真正发给 LLM 的 plan/write 提示词**绕过了 bundle**，所以仍是裸的。必须按 industry 的方式在 config 层注入。

### 参考实现（industry-analysis，照抄此形态）
```js
// planUser 的 context 里注入蓝图切片
}, await buildBlueprintContextSnippet(slug, 'industry_analysis'))
const planSystem  = await appendMethodologyToSystem('<原 planSystem 文案>', 'industry_analysis')
const writeSystem = await appendMethodologyToSystem('<原 writeSystem 文案>', 'industry_analysis')
```
可用 helper（均已存在于 `methodology-injection.mjs`）：
`loadMethodologyFramework(agentId)`、`buildBlueprintContextSnippet(slug, agentId)`、`appendMethodologyToSystem(systemPrompt, agentId)`、`injectBlueprintSnippetIntoContext(context, snippet)`。

### 形态差异（重要，别照错模板）
- `competitor/consumer/positioning/building/annual` 用的是 **`runFiveStepDeepResearch(args, { planSystem: PLAN_SYSTEM, planUser, fallbackQuestions, writeSystem: WRITE_SYSTEM })`** 模式（模块级常量 + `planUser(context)` 函数）。
- 因此注入方式是：把传入 config 的 `planSystem`/`writeSystem` 改为 `await appendMethodologyToSystem(PLAN_SYSTEM, '<agent_id>')` / `await appendMethodologyToSystem(WRITE_SYSTEM, '<agent_id>')`，并在 `planUser(context)` 内用 `injectBlueprintSnippetIntoContext(context, await buildBlueprintContextSnippet(slug, '<agent_id>'))`（`slug` 从 `context`/`args` 取，与 industry 一致）。
- **不要**把 industry 的「标准件 inline 结构」搬到这 5 个上——保持各自原结构，只加注入。

### Task 1（TDD）— 补齐 5 个专家的方法论注入

1. **先写失败测试**（红）：扩 `scripts/test-methodology-injection.mjs`（或新建 `test-methodology-injection-coverage.mjs`），断言对 `['competitor_analysis','consumer_insight','brand_positioning','brand_building','annual_planning']` 每个 agentId：
   - `loadMethodologyFramework(agentId)` 返回非空且含该方法论关键词（按 §2 映射：竞品含「差异/流派」、用户含「JTBD/分层」、定位含「心智/空位」等，取该 summary 里确有的词）；
   - 构造出的 plan/write system 经注入后包含框架标题串（如「## 调研方法论框架」）；
   - 构造的 planUser context 含蓝图切片标记。
   - 跑红，确认 5 个当前 FAIL。
2. **最小实现**（绿）：逐个 config 按上面「形态差异」注入。每个 config 改完即跑该测试 + `test-phase-a-deepresearch-runners` + `test-deepresearch-guardrail`，绿了再下一个。
3. **回归**：8 个测试全绿，**红线护栏未被削弱**（repo-popularity / 竞品自家页 / 编造数字仍硬抛错）。

**验收（Task 1）：**
```bash
node scripts/test-methodology-injection.mjs       # 6/6 agent 覆盖
node scripts/test-phase-a-deepresearch-runners.mjs
node scripts/test-deepresearch-guardrail.mjs
grep -c appendMethodologyToSystem scripts/sub-agents/{competitor-analysis,consumer-insight,brand-positioning,brand-building,annual-planning}-deepresearch.mjs  # 每个 ≥1
```

---

## §2 切干净提交（当前是一坨未提交混合改动）

现工作区把块1/2/3 混在一起未提交。**Codex 按逻辑拆成可追溯的小提交**（每提交前对应测试须绿）：
1. `feat(engine-v2): add Stage 0 research blueprint (category essence + research plan)` — research-blueprint.mjs + 挂载 + test。
2. `feat(engine-v2): inject methodology framework + blueprint into research prompts` — methodology-injection.mjs + industry 注入 + run-sub-agent bundle 注入 + test。
3. `feat(engine-v2): scenario-based evidence gate (descriptive vs prescriptive), drop hard 0.4 overflow block` — assumption-policy.mjs + test。
4. `feat(engine-v2): extend methodology/blueprint injection to all six experts` — Task 1 成果。

> 每条 commit 末尾保留协作署名规范。**不要**一坨大提交；CP 复核要按块核对。

---

## §3 CP-3 真跑验收（Codex 执行，Claude 复核；唯一能证明 Phase 3 成立的步骤）

> **红线 & 防空转（继承 2026-05-30-phase2d 真跑手册 §0/§2，不可省）：**
> - 跑前 `unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL`（env 遮蔽坑，见 memory `project-pptmaster-env-shadowing`），并先花 1 次调用做渠道连通自检。
> - **硬上限：** 累计成本超 $X（Seven 定，建议 $8，本期 13 chunk 比单 chunk 贵）或墙钟超 45 分钟 → **抛错停下写日志，不烧、不组装半成品**。
> - 同一 chunk 连续 BLOCK 达重试上限 → **整跑失败退出**，贴该 chunk 的 `_chunks/<id>.json` + `_audit/consulting-reviews.jsonl` 交回判断，**不自行连改 20 次硬磨**。

**命令序列（pptagent，positioning 全卷 13 chunk）：**
```bash
unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL
node scripts/run-blueprint-suite.mjs pptagent --scheme brand_positioning_case --real-llm 2>&1 | tee outputs/_logs/pptagent-phase3-suite.log
node scripts/assemble-by-blueprint.mjs pptagent --scheme brand_positioning_case --output-slug pptagent-phase3-blueprint 2>&1 | tee outputs/_logs/pptagent-phase3-assemble.log
node scripts/render-deck.mjs pptagent-phase3-blueprint 2>&1 | tee outputs/_logs/pptagent-phase3-render.log
```

**CP-3 逐项验收（任一不达标不算通过）：**
- [ ] **A. 不罢工自然结束**：套件在成本/时间上限内成功或明确失败，无无限 BLOCK 空转。
- [ ] **B. 先有研究蓝图**：`outputs/pptagent/_research-blueprint.json` 存在，含 `category_essence` 五字段 + `research_blueprint` 四数组，内容是真品类推演（非模板占位）。
- [ ] **C. 出完整可渲染整卷**：`outputs/pptagent-phase3-blueprint/raw-output.json` 的 `total_pages` 接近 `target_pages`，`index.html` 能打开。
- [ ] **D. 零编造（红线，硬验）**：
  ```bash
  node -e 'const o=require("./outputs/pptagent-phase3-blueprint/raw-output.json");const bad=[];for(const s of (o.slides||[]))for(const r of (s.data_refs||[])){const src=String(r.source||r.source_url||r.url||"");if(src.includes("summary.md")||src.includes("assets/_raw/cases/")||!src)bad.push([s.page_no,src||"(empty)"])}console.log("RED-LINE violations:",bad.length)'
  ```
  期望 `RED-LINE violations: 0`。
- [ ] **E. 描述性事实页全部有源**：竞品做了什么/市场规模/趋势页，每条 data_ref 带 `source_tier`（T1/T2/T3）。
- [ ] **F. 定位页是「有据推演+标注+验证方法」**：定位/空位/主打类页 `evidence_status='hypothesis'` 且 `hypothesis_basis`、`validation_method` 非空，并汇入 `metadata.validation_checklist`。
- [ ] **G. 高假设卷带醒目标记**：若 `hypothesisHeavy`，组装产物 `metadata.hypothesis_heavy:true`（渲染层横幅本期只打标，不做 UI）。

**失败上报格式（不自行硬磨）：** 失败在哪步/哪 chunk → 失败类型（描述性无源 hardBlock？秃断言？成本/时间触顶？）→ 贴日志末尾 + 出问题 chunk 的 `_chunks/<id>.json` → 不改码不改数据，交回 Seven/Claude。

---

## §4 与「Agent OS Phase 0-3」（registry/run-state/DAG）的关系 —— 本期**不动**

项目里另有一份 Codex 的「Agent OS Phase 0-3」计划（scheme/worker registry、run-state/event-ledger、DAG scheduler）。**本期明确搁置，不与 Phase 3 交叉施工。** 理由：
1. 它是「为未来方案类型打地基」的基础设施，**不产出任何用户可见的 PPT 质量提升**；当前真实痛点是「新品牌客户要基于品类调研给定位」，正是 Engine V2 Phase 3 在解决的。
2. Agent OS Phase 3（DAG）要重构 `run-blueprint-suite.mjs` 的执行循环——而 Phase 3 刚改完这个文件。**两条线同时改同一编排脚本会互相抖散**，必须先让内容线收口、真跑绿，再谈地基。
3. 唯一值得将来提前挑出来的是 Agent OS 的 **run-state + event-ledger**（治「空转 3 小时看不到进度」），但那是**下一期**的事，且应在 Phase 3 真跑验收通过、编排脚本稳定后再接。

---

## §5 范围与非目标（YAGNI）
- **做：** 补齐 5 专家方法论注入（Task 1）、切干净提交、CP-3 全卷真跑验收。
- **不做：** Agent OS registry/DAG/run-state（搁置）；渲染层 hypothesis_heavy 横幅 UI（只打 metadata 标）；方法论全文注入（只用 ≤1200 字框架摘要）；重构 industry-analysis 标准件结构。

---

## 给小白的讲解

- **现在做的是什么：** 你问"这套新框架（Phase 3：让 AI 像顾问一样先研究品类再定位）是不是该开发了"。我去翻了代码，发现一个关键事实——**它其实已经被偷偷写好了一大半，而且我跑了 8 项离线自测全是绿的（零件都能转）**，只是还没正式存盘、也没真刀真枪跑过一次。所以我没让你"从头再来"，而是写了一份"收尾+验收"的清单交给 Codex。
- **我发现的唯一大窟窿：** 这套"调研导航"本该装到 6 个专家脑子里，结果**只装了 1 个（行业分析），另外 5 个（竞品、用户、定位、品牌、年度）还是空的**。而竞品和用户、定位恰恰是新品牌最需要方法论带路的环节。所以方案第一件事就是把另外 5 个补上，并且先写测试卡住它。
- **怎么守住红线：** 验收清单里 D 项专门用一行命令查"有没有编数据"，必须是 0；定位这种"该怎么打"的判断，必须写清"凭什么这么推 + 怎么验证"，否则照样被程序拦下。**改宽的只是"允许诚实地标注假设"，没放宽"禁止编造"。**
- **另一条"打地基"的计划（Agent OS）我建议先放着**——它不会让你的 PPT 变好看一点，而且会和刚改完的代码打架。等这次真跑出一本干净的 PPT 后再说。
- **你怎么自己核查：** ① 计划在 `docs/handoffs/2026-06-02-engine-v2-phase3-closure-and-validation-plan.md`。② 想确认"已经写好大半"，看 §0 那 8 行 PASS。③ 想确认"窟窿真存在"，看 §1 那张 `0 hits / 4 hits` 表。④ 最终是骡是马，看 §3 真跑后的 A–G 七项，尤其 D 项"红线违规 0"。
- **需要你拍板的一件事：** §3 真跑会烧 token，我建议成本上限设 **$8**、时间 **45 分钟**。你认可这个上限、且渠道（newcli）已接好的话，就可以让 Codex 照这份计划跑了。
