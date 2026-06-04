# Engine V2 · Phase 3 设计 — 方法论驱动的品类调研（Methodology-Driven Category Research）

> **性质:** 这是**设计文档(spec)**,不是实现计划。经 Seven 审阅确认后,再用 writing-plans 产出给 Codex 的 TDD 实现计划。
> **角色:** Claude 设计/写规格 → Seven 决策 → Codex 实现 → Claude 独立 CP 复核。

**Goal:** 让引擎面对一个**新品牌**(自身无市场数据,如 PPTAgent)时,能像真顾问一样:先推演品类本质 → 用方法论框架灵活设计并执行"行业/竞品/用户"调研 → 据真实资料推演定位 —— 而不是因为"搜不到某个一手数字"就降级罢工(无限 BLOCK)。

**Why:** 实测发现两个根因。① **方法论只是"浅层校验器"**:15 篇方法论被摄取并编译成概念词典,且每个 sub-agent 有 `validators/<agent>/methodology-check.mjs`,但它只在产出后检查"用没用 SWOT/竞品矩阵关键词",**完全没注入到 plan/read/write 调研提示词**——LLM 调研时脑中没有方法论框架(仪表盘,而非导航)。② **取证闸一刀切**:`assumption-policy.mjs` 的"假设占比 > 0.4 → hardBlock",对"自身无市场数据的新品牌"必然触发(前瞻定位判断本就只能是假设),导致正确调研后仍罢工。

**红线(继承,不可松动):** 失败必抛错、不静默兜底、不伪造数据;每个数字可追溯(来源+日期+T1–T4);没有 source 的内容只能写入 assumptions,不得伪装成事实;开源模板里的示例假数字严禁进入产出。**本设计扩展"诚实假设"的合法边界,但绝不放宽"不许编造"。**

---

## §1 现状锚点(实现时按此对接,不要新造重复件)

- **调研引擎:** `scripts/sub-agents/deepresearch-common.mjs` 的 `runFiveStepDeepResearch(args, config)` —— 5 步:plan→search→read→synthesize→write。plan 用 `config.planSystem` + `config.planUser(context)`,产 `sub_questions`;`config.fallbackQuestions(context)` 兜底。
- **各 sub-agent config:** `scripts/sub-agents/{industry-analysis,competitor-analysis,consumer-insight,brand-positioning,brand-building,annual-planning}-deepresearch.mjs`。competitor/consumer/positioning/building/annual 用 `planSystem`/`planUser`/`fallbackQuestions` 模式。
- **每卷一次的前置步先例:** `scripts/run-blueprint-suite.mjs:257` 的 `ensureStrategicQuestion(clientSlug, schemeType, …)`,在 chunk 循环前跑一次。**Stage 0 蓝图步与它并列挂载。**
- **agent 注册表 + 应用矩阵:** `scripts/run-sub-agent.mjs` 的 `SUB_AGENTS[agentId] = { promptsDir, runner }`;`loadMatrixForAgent(agentId)` 返回 `matrix.matrix[agentId] = { must_load, recommended, optional }`(由方法论编译而来)。
- **方法论资产:** `assets/_raw/methodologies/summaries/<NN>-<slug>.md`,每篇约 1000 字,带"## 核心方法 / ## 文章目录(N 步框架) / 各步详解"。可直接抽"框架"段注入。映射:行业→`02-industry-analysis`、竞品→`03-competitor-analysis`、自身→`04-self-analysis`、用户→`05-user-analysis`+`06-user-insight`、定位/品牌→`09-brand-strategy`+`13-brand-house`、本质(横切)→`01-essence`。
- **取证闸:** `scripts/assumption-policy.mjs`:`classifySlideEvidence(slide)`→`'evidenced'|'hypothesis'|'unsupported'|'descriptive'`;`evaluateChunkAssumptions`→`{hardBlock, blockReason, assumptionRatio, …}`;`KEY_JUDGMENT_RE`、`ASSUMPTION_RATIO_CAP=0.4`、`hasStrongEvidence`(只认 T1/T2)。
- **写手降级:** `deepresearch-common.mjs` 的 `downgradePositioningSlides`(Phase 2e)。

---

## §2 架构总览(三块,数据流)

```
form(品类/竞品/人群/产品)
        │
        ▼
[Stage 0] 品类研究蓝图  ← 注入《01 如何找到本质》框架
   产出 outputs/<slug>/_research-blueprint.json
   { category_essence, research_blueprint }
        │  (共享给所有 sub-agent)
        ▼
[各 chunk] runFiveStepDeepResearch
   plan ← 注入对应方法论框架 + 读 blueprint  ← 块2
   search → read → synthesize
   write → downgradePositioningSlides
        │
        ▼
[评审] consulting-review + assumption-policy
   分场景取证闸(描述性 vs 建议性)  ← 块3
   verdict: APPROVE / RETRY / BLOCK(仅真违规)
```

---

## §3 第 1 块 — Stage 0「品类研究蓝图」(新增,每卷一次)

**新文件:** `scripts/sub-agents/research-blueprint.mjs`,导出 `ensureResearchBlueprint(clientSlug, schemeType, { realLLM, force })`。

**输入:** `inputs/<slug>/form.json`(品类 `industry`、`competitors`、`target_audience`、`core_products`、`stage`)。
**方法论:** 注入《01 如何找到本质》框架(谁付钱 / 钱怎么流 / 利润·话语权在哪 / 关键变量)。
**LLM 产物(JSON,强约束 expectedKeys):**
```json
{
  "category_essence": {
    "category_name": "品类一句话定义",
    "who_pays": "谁付钱(B/C、决策者vs使用者、客单频次)",
    "value_chain": "钱怎么流(上中下游角色)",
    "profit_pool": "利润/话语权集中在哪",
    "key_variables": ["决定这个品类成败的 3-5 个关键变量"]
  },
  "research_blueprint": {
    "industry_questions": ["该查的行业方向(市场大盘/趋势/关键变量),≥4"],
    "competitor_targets": ["种子竞品 + 从品类推演出的应补查竞品(可超出 form 申报)"],
    "consumer_segments": ["该洞察的人群分层 + 各自 JTBD 方向"],
    "positioning_hypotheses_to_test": ["待验证的定位假设(供后续标注与验证清单)"]
  }
}
```
**保存:** `outputs/<slug>/_research-blueprint.json`。**所有 sub-agent 的 plan 步骤共享读取它**,保证全卷对准同一品类框架。
**挂载:** `run-blueprint-suite.mjs` 在 `ensureStrategicQuestion` 之后调用 `ensureResearchBlueprint(...)`;单 chunk 跑(`--only-chunk`)也先确保 blueprint 存在(不存在则生成),解决"孤立 chunk 无上游证据"的不公平。
**错误处理:** LLM 失败/JSON 不合规 → 抛错停下(红线:不静默兜底)。`force=false` 且已有产物则复用(省 token)。

---

## §4 第 2 块 — 方法论注入「想/搜/写」(仪表盘→导航)

**新文件:** `scripts/sub-agents/methodology-injection.mjs`,导出:
- `loadMethodologyFramework(agentId)` → 读对应 summary,抽"## 核心方法 + ## 文章目录(框架步骤)"段,返回精炼字符串(≤1200 字,带缓存)。映射表硬编码在此文件(见 §2 末)。
- `buildBlueprintContextSnippet(slug)` → 读 `_research-blueprint.json`,返回注入用的紧凑文本(category_essence + 该 agent 相关的 blueprint 切片)。

**改造点(每个 sub-agent config 的 `planSystem` / `planUser`):**
- `planSystem` 末尾追加:`\n\n## 调研方法论框架(必须据此设计子问题)\n<loadMethodologyFramework(agentId)>`。
- `planUser(context)` 注入 `buildBlueprintContextSnippet(slug)`:让子问题**围绕品类本质 + 蓝图方向**,而非只围品牌名 + 已知竞品。
- 同样把方法论框架精要追加进 `writeSystem`(让成稿结构遵循方法论:行业页覆盖"怎么赚钱/利润卡点/关键变量";竞品页覆盖"流派/差异空缺";用户页覆盖"分层/JTBD/洞察")。

**约束:** 注入是"框架引导",不是"填模板"。方法论只提供**思考结构**;具体内容仍必须来自真实搜索结果(红线:不许照搬方法论里的范例数字)。

---

## §5 第 3 块 — 分场景取证闸(治罢工,守红线)

**改造 `scripts/assumption-policy.mjs`。**

**(a) 新增"判断类型"分类** —— 把 slide 分成:
- `descriptive`(描述性事实):竞品做了什么、市场规模、趋势、用户现状。
- `prescriptive`(建议/预测性判断):应如何定位、空位在哪、该主打什么、未来会怎样。
- 判别:新增 `PRESCRIPTIVE_RE`(应/应该/建议/抢占/占据/定位为/主打/发力/将会/预计/空位/心智…)与"描述性"区分;`evidence_status==='hypothesis'` 直接归 prescriptive-hypothesis。

**(b) 分场景规则:**
| 类型 | 通过条件 | 否则 |
|---|---|---|
| 描述性事实 | 必须挂真实来源(T1/T2/T3 皆可，按 tier 标注) | **hardBlock**(红线:无源事实) |
| 建议性判断 | 必须"有据":`hypothesis_basis`(引用具体行业/竞品证据 + 类比逻辑) **且** `validation_method` 非空 | **hardBlock**(秃断言) |
| 建议性判断(已诚实标注) | 满足上行即视为**合格诚实产出** | 计入 validation_checklist,**不算违规** |

**(c) 取消一刀切 overflow 硬拦:**
- 删除/改造"`assumptionRatio > 0.4` → hardBlock"。前瞻定位卷里建议性判断本就占多数,不应被罚。
- `assumptionRatio` 降级为**软信号**:仅用于驱动 `validation_checklist` 的醒目程度 + 在 metadata 标 `hypothesis_heavy: true`(供渲染层加显眼"探索性方案,使用前须验证"横幅)。
- **真造假仍硬抛错(不变):** repo-popularity 当需求证据、竞品自家页当需求证据、编造数字、把无源结论当事实 —— 全部继续 `downgradePositioningSlides` 拦截 + 写手 hard-guard 抛错。

**(d) data_credibility 评分的随机抖动:** LLM 评审给的 `data_credibility_score` 4↔6 抖动会让同样内容时而 BLOCK 时而 RETRY。改为:**确定性闸(分场景规则)为主决策**;LLM rubric 仅作 RETRY 建议(降一档:LLM 想 BLOCK 但确定性闸通过 → 最多 RETRY 一次,不直接 BLOCK)。

---

## §6 错误处理与红线对照表

| 场景 | 行为 |
|---|---|
| Stage 0 LLM 失败/JSON 不合规 | 抛错停下,不兜底 |
| 描述性事实无真实来源 | hardBlock(红线) |
| 建议性判断无 basis/无 validation_method | hardBlock(秃断言) |
| 建议性判断有据有验证方法 | 通过,进验证清单 |
| 编造数字 / repo-star 当需求 / 竞品自家页当需求 | 硬抛错(不变) |
| 方法论范例假数字流入产出 | 写手/校验器拦截(不变) |
| 假设占比高但都诚实标注 | 通过 + 标 hypothesis_heavy + 验证清单(不再 BLOCK) |

---

## §7 测试策略(全程 TDD)

**单测(离线,mock LLM):**
1. `test-research-blueprint.mjs`:给定 form,blueprint 步产出含 category_essence 五字段 + research_blueprint 四数组;LLM 返回缺键 → 抛错。
2. `test-methodology-injection.mjs`:`loadMethodologyFramework('industry_analysis')` 含"怎么赚钱/利润"字样;映射齐全;未知 agentId 抛错。plan prompt 注入后含框架 + blueprint 切片。
3. `test-assumption-policy.mjs`(扩充):描述性无源→hardBlock;描述性有 T3 源→通过;建议性有 basis+method→通过(不违规);建议性秃断言→hardBlock;高假设占比+全诚实→不 BLOCK(仅 hypothesis_heavy)。
4. 回归:`test-deepresearch-guardrail`、`test-positioning-downgrade`、`test-phase-a-deepresearch-runners` 全绿;repo-popularity 仍硬抛错。

**验收真跑(CP-3,Codex 执行 + Claude 复核):** pptagent **完整 13 chunk** 真跑 → 组装 → 渲染。逐项核对:① 不罢工自然结束;② 描述性事实页全部有源(零红线违规);③ 定位页是"有据推演 + 标注 + 验证方法";④ 出完整可渲染 PPT;⑤ assumption 重的卷带醒目"待验证"横幅。

---

## §8 范围与非目标(YAGNI)

- **做:** Stage 0 蓝图、方法论注入 plan/write、分场景取证闸、配套单测、一次完整验收真跑。
- **不做(本期):** 动态多轮 research agent 自主派生任务;方法论全文(只用摘要框架);渲染层横幅 UI 细节(只在 metadata 打标,渲染层后续接);重构既有 industry-analysis 标准件结构。

---

## §9 开放问题(实现前可定,不阻塞设计)

1. 方法论框架抽取:取整段"核心方法+目录"还是人工精炼?→ 建议先取整段(≤1200字截断),效果不足再精炼。
2. Stage 0 是否对所有 scheme 都跑?→ 是(positioning/building/annual 都受益)。
3. hypothesis_heavy 横幅文案与阈值 → 渲染期再定,本期只打 metadata 标。

---

## 给小白的讲解

- **现在做的是什么:** 我把我们刚敲定的"Phase 3 升级"写成了一份正式设计图纸。三件事:① 调研前先让 Agent 想清"这个品类的本质 + 该查什么"(开个研究简报);② 把你那 15 篇方法论从"事后检查"变成"调研时的导航";③ 把评审改成"分场景"——竞品做了什么这种事实必须有出处,而"该怎么定位"这种建议允许有理有据地推演并标'待验证',不再因为"假设太多"就罢工。
- **目的·为什么:** 你的客户很多是像 PPTAgent 一样的新品牌,自己没数据,要的就是"基于品类去调研行业/竞品/人群再给定位"。之前引擎搜错了对象、又卡在"数字不够"上罢工。这份图纸就是把它改成真顾问的干法,同时死守"一个数据都不许编"。
- **你怎么自己核查:** ① 图纸在 `docs/handoffs/2026-06-02-engine-v2-phase3-methodology-driven-category-research-design.md`,开头 Goal 和这段讲解能看出是不是你要的。② §6 那张"红线对照表"列了每种情况程序会怎么做,你重点看"编造数字"那几行都还是"硬抛错"——红线没松。③ §7 写了验收方式:最后会拿 pptagent 完整跑一遍、出一本能打开的 PPT 给你看。
