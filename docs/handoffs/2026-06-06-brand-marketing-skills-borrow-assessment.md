# 外部 Skill 借鉴评估 — brand-deck 研究 + 6 专家 Prompt 借鉴清单

> 日期: 2026-06-06 ｜ 作者: Claude（研究/决策稿）｜ 执行: Codex（仅 Part B 可执行；Part A 先由 Seven 决策）
> 来源: https://jeorrysyd.github.io/brand-marketing-skills/ （34 skills）
> 红线继承: 一切借鉴只能"借框架/借结构"，**不得引入会绕过本项目证据分级(T1–T4)、no-fabrication、validators 的逻辑**。

---

## Part A — brand-deck 深度研究 + build-vs-borrow 决策

**仓库:** https://github.com/Jeorrysyd/brand-deck （MIT，作者 Joyce Sun，与该 skills 站同一人）

### A.1 它到底是什么（已 clone 核实）
- 定位: "turn any content into brand-compliant PPTX"——喂品牌资料 → 出**原生可编辑 PPTX**。
- **技术栈: Python + `python-pptx`**（直接写 .pptx），辅以 `pdfplumber`/`python-docx` 读源料、`anthropic`+`google-genai` 生成内容/配图、`jsonschema` 校验结构化内容。
- **架构:**
  - `src/brand_deck/renderers/` 按**版式分文件**: `cover / bullets / table / storyboard / text_image / end_card`——每种 slide 类型一个原生 PPTX renderer。
  - `theme.py`: 品牌主题（色/字/版式）集中配置；输入是 `brands/<name>.yaml`（品牌画像 YAML，附 `_template.yaml` + therabody 示例）。
  - `builder.py` 编排、`validator.py`(jsonschema) 校验、`ai.py` 调模型、`cli.py` 入口、`prompts/system.py` 系统提示。

### A.2 和本项目的关键差异（核实）
| 维度 | brand-deck | PPT方案大师（现状） |
|---|---|---|
| 语言 | Python | Node/ESM |
| PPTX 生成 | **直接 `python-pptx` 原生写** | **HTML → 外部第三方转换器** `html2ppt-sales-tool-v26.1.1`（`deck-to-pptx.mjs` 硬编码 `~/Downloads` 路径，靠数 `<table>` 标签验证表格保真） |
| 研究/证据引擎 | **无**（不做调研、无证据分级、无 no-fabrication） | 有完整 deepresearch + 证据分级 + validators + 蓝图（远比 brand-deck 强） |
| 品牌主题 | YAML 驱动 theme | style（swiss 等），无品牌级 theme 配置 |

### A.3 决策建议（第一性原理）
1. **不要整体迁移、不要换语言。** brand-deck 没有本项目最难、最值钱的部分（调研+证据+不许编）。它只解决"内容→好看 PPTX"。你的引擎更强，**不能为它牺牲**。
2. **唯一真正值得借鉴的是渲染/导出层**——因为你现在的 PPTX 链路是**最脆的一环**：依赖一个硬编码路径的外部第三方 HTML→PPTX 工具，保真/可编辑性靠"数表格"验证。这是技术债。
3. **可借鉴的三个具体点（思路，不是代码）：**
   - **(借鉴-1) 直出 PPTX 的路线**: 在 Node 侧用 `pptxgenjs` 做一条"结构化 chunk JSON → 原生 PPTX"的并行导出路径，摆脱外部 html2ppt 二进制。Web 预览继续用 HTML，PPTX 走原生生成。
   - **(借鉴-2) per-layout renderer 分解**: 把你的 Sxx layout 对照 brand-deck 的 `cover/bullets/table/storyboard/text_image/end_card`，做成"每个版式一个 renderer 函数"的清晰映射。
   - **(借鉴-3) 品牌 theme YAML**: 引入 `brands/<slug>.yaml`（色/字/logo/版式偏好），渲染时统一套用，替代散落的 style 开关。
4. **建议节奏: 先不动。** 当前优先级是 Engine V2 Phase 3 收尾 + 真跑（内容质量）。渲染层重构是**独立的下一期专项**，需单独立 spec + build-vs-borrow 评审。本文件只标记"已研究、已确认值得做、排期靠后"。

> **给 Seven 的一句话决策:** brand-deck 不抄引擎、不换语言；只在"PPTX 导出层"未来单独立项时，借它"直出原生 PPTX + 按版式分 renderer + 品牌 theme YAML"这三招，替掉现在那个硬编码外部转换器。**现在不做，先收口 Phase 3。**

---

## Part B — 6 专家 Prompt 借鉴清单（可执行，交 Codex）

> **接入点:** Phase 3 已建 `scripts/sub-agents/methodology-injection.mjs`（`loadMethodologyFramework(agentId)` 注入各专家 plan/write）。本清单的借鉴框架**作为各专家方法论框架的"补充结构"**融入——**不新建 skill、不引外部运行时**，只把"输出结构 + 思考清单"吸收进对应专家的 system/framework 文本，并在合适处映射到 blueprint 页结构。
> **红线:** 这些外部框架只提供"该覆盖哪些维度 / 输出长什么样"；**具体内容仍必须来自真实搜索 + 证据分级**，禁止照搬模板里的占位/示例。所有"推断"必须按本项目规则标 `hypothesis` + basis + validation_method。

### B.0 总原则（来自 marketingskills，与本项目红线天然一致——已核实原文）
competitor-profiling 的 Core Principles 与我们红线高度同构，建议提炼为**所有专家共享的输出戒律**，加进每个 writeSystem 末尾：
- **Facts Over Opinions** — 每条主张可追溯来源；推断必须**显式标注**（对应我们 `evidence_status`）。
- **Structured & Comparable** — 同类内容用同一模板，便于横向对比（对应 blueprint 页结构稳定）。
- **Current Data** — 标注生成日期，发现过期数据要 flag（对应我们 `retrieved_at` / source_tier）。
- **Honest Assessment** — 不夸大竞品弱点、不淡化其强项（对应 no-fabrication）。

### B.1 借鉴映射表（第一档 skill → 专家 → 借什么 → 怎么落地）

| 来源 skill（仓库） | 目标专家 | 借鉴内容（结构/清单） | 落地动作 |
|---|---|---|---|
| **competitor-profiling**（coreyhaines31/marketingskills，已 clone）`references/templates.md` | `competitor_analysis` | 4 个成熟模板: **Quick Scan**(tagline/目标人群/定价/免费档/流量) ·**Summary Comparison Table**(竞品×维度横向表) ·**Positioning Map**(双轴定位图) ·**Competitive SWOT** | 把"Summary Comparison Table"列维度写进竞品专家 writeSystem 的输出要求；把"Positioning Map 双轴"作为竞品章节的一个 chunk 页结构候选 |
| **customer-research**（marketingskills，已 clone） | `consumer_insight` | 两种模式(分析既有素材 / 主动找料)；**VOC 用户原话提取**、**JTBD**、痛点/wish 清单；找料场景(评论/社区/G2/论坛) | 把"提取用户真实语言 + JTBD + 3痛点/3wish"写进用户洞察专家 plan 子问题模板；强调"原话引用须带来源" |
| **competitive-analysis**（anthropic 官方 skill，需 Codex 取） | `industry_analysis` / `competitor_analysis` | **"真威胁 vs 长得像但不抢"的威胁分级**框架 | 接入行业/竞品专家，作为竞争格局判断的筛选逻辑 |
| **positioning-messaging**（anthropic 官方，需 Codex 取） | `brand_positioning` | **一页 messaging framework**: 对谁说 / 说什么 / **不说什么** / 价值主张 / 差异点 / proof points / messaging pillars | 作为定位专家的**核心输出骨架**；其中每条 claim 仍走我们证据/假设标注 |
| **brand-storytelling**（anthropic 官方，需 Codex 取） | `brand_building` | **叙事弧**: 主角(=客户) / 冲突 / 转折 / 品牌角色 | 作为品牌建设章节的叙事结构模板 |
| **brief-analyst** + 工作流原则（jinggreen15/ai-design-team，已 clone） | （未来 Intake/Deck Architect 阶段） | 拆 Brief → 必讲事项 / 雷区 / 隐性 KPI / 需回问的问题；**工作流原则: 需求不清时先 brief-analyst → 研究 → content-planner 定结构** | 记入未来 Intake Strategist spec（本期不实现，只登记） |

> **anthropic 官方 skill 获取说明（给 Codex）:** positioning-messaging / brand-storytelling / competitive-analysis / pricing-strategy 不在上面两个已 clone 的仓库里。落地前**先从 Anthropic 官方 skills 来源取到真实 SKILL.md 再移植框架**；取不到则按本表"借鉴内容"列的公认框架落地，**不得凭空编造其内部细节**。

### B.2 执行任务（TDD，逐专家小步）
1. **Task 0（共享戒律）**: 把 B.0 四条原则补进一个共享片段（如 `methodology-injection.mjs` 的通用前缀），注入全部 6 专家 writeSystem。**写测试**断言每个专家的 writeSystem 含这四条关键词。
2. **Task 1（competitor_analysis）**: 把 Summary Comparison Table 的维度 + Positioning Map 双轴写进竞品专家 writeSystem 的"输出结构"段。测试断言注入存在；**回归 `test-deepresearch-guardrail` 全绿（红线不松）**。
3. **Task 2（consumer_insight）**: 注入 VOC/JTBD/痛点-wish 结构进 planSystem 子问题模板 + writeSystem。同样测试 + 回归。
4. **Task 3（brand_positioning / brand_building）**: 先取 anthropic 两个 skill 的真实框架 → 注入 positioning 的"对谁说/说什么/不说什么/pillars"、building 的叙事弧。测试 + 回归。
5. **Task 4（industry/competitor 威胁分级）**: 注入 competitive-analysis 的"真威胁vs长得像"筛选。测试 + 回归。
6. **每个 Task 独立 commit**，且**每个 Task 后必须**: ① 该专家离线测试绿；② `test-deepresearch-guardrail` + `test-phase-a-deepresearch-runners` 绿（证明借鉴没削弱红线护栏）。

### B.3 验收
- [ ] 6 专家 writeSystem 均含 B.0 四条戒律（测试断言）。
- [ ] 竞品/用户/定位/品牌 4 个专家各自含对应借鉴结构（测试断言）。
- [ ] 全部红线护栏测试仍绿；repo-popularity / 竞品自家页 / 编造数字仍硬抛错。
- [ ] 对 pptagent 跑一个 chunk（如竞品 `p2-c2`）真跑冒烟，肉眼确认输出结构更像"可横向对比的竞品表/定位骨架"，且**零红线违规**。

### B.4 非目标（YAGNI）
- 不引入 xiaohongshu/feishu/social/seo/cold-email 等分发类 skill（与本项目无关）。
- 不把外部 skill 作为独立 runtime 安装；只吸收其**框架文本**进现有 prompt。
- brand-deck 渲染层重构（Part A）= 独立下一期，不在本清单内。

---

## 给小白的讲解

- **现在做的是什么:** 你要的两件事我都做完了，写成一份给 Codex 的文档。**A 部分**：我把 brand-deck（一个和你做的事很像的开源工具）扒开看了。结论是——它**只会"把内容排成好看的 PPT"，不会做调研、也没有"不许编数据"的规矩**，所以你的引擎比它强得多，不能换。但它有一招值得偷：它**直接生成可编辑 PPT**，而你现在是"先做网页、再用一个放在下载文件夹里的外部小工具转成 PPT"——这是你最容易出毛病的环节。建议**以后单独立个项目**把这块换掉，**现在先别动**，先把 Phase 3 收尾。
- **B 部分**：我从那批技能里挑出真正对口的几个（竞品分析、用户研究、定位、品牌故事），把它们"该怎么列竞品对比表""怎么抓用户原话""定位该说什么/不说什么"这些**现成框架**，整理成一张表，告诉 Codex 怎么塞进你那 6 个专家的提示词里。**最妙的是**：其中那个竞品技能的规矩（"事实要有出处、推断要标出来、要诚实"）和你项目的红线一模一样，等于免费帮你加固。
- **怎么自己核查:** 文档在 `pptmaster/docs/handoffs/2026-06-06-brand-marketing-skills-borrow-assessment.md`。① A 部分看 A.2 那张对比表，尤其"PPTX 生成"那行——能看出你现在的导出方式确实脆。② B 部分看 B.1 那张映射表，每行就是"哪个技能 → 借给哪个专家 → 借什么"。
- **需要你拍板:** ① brand-deck 渲染层重构，我建议**排到 Phase 3 之后**——你同意就先搁着。② B 部分这份借鉴清单，**要不要现在就让 Codex 做**，还是排在 Phase 3 真跑通过之后？（我建议 Phase 3 先收口，B 紧随其后，因为 B 正好是给 Phase 3 的"方法论注入"加料。）
