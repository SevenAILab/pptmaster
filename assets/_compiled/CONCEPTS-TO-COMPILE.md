# 60 个核心概念 · 待编译清单

> Task 18 checkpoint #1。本清单按 Spec v1.1.1 §4.3-4.9 的 must_load/recommended 先保证覆盖，再按 occurrences、quality_score、247 页书 + 全景图双证据排序补足。

- checklist total: 60
- selection rule: spec 必选/推荐 > 多源高频高质量 > 全景图位置证据 > MAP-STRUCTURE 新增但需补证据
- review note: status 含“0 命中/新增候选”的条目，请 Seven/Claude 在 checkpoint review 时确认是否保留或替换。

## Sub-Agent ① consumer_insight (9 个)

覆盖用户是谁、为什么买、如何体验；优先绑定 247 页书 Ch4、体验层全景图与用户模型卡。

- [ ] JTBD (occ: 10, avg_q: 3.9, sources: 247页书 + 案例PPT + 模型卡, status: 文本证据可用)
- [ ] Persona-5W2H (occ: 60, avg_q: 4.55, image: 2, sources: 247页书 + 案例PPT + 框架PDF + 方法论文章 + QA资料, status: 双证据优先)
- [ ] User-Journey (occ: 23, avg_q: 4.48, image: 3, sources: 247页书 + 框架PDF + QA资料 + 全景图, status: 双证据优先)
- [ ] 4A-Funnel (occ: 3, avg_q: 5, sources: 词典PDF + 框架PDF, status: 文本证据可用)
- [ ] Maslow (occ: 18, avg_q: 4.61, sources: 247页书 + 模型卡 + 历史Prompt, status: 文本证据可用)
- [ ] Pain-Gain-Map (occ: 14, avg_q: 4.43, sources: 247页书 + 方法论文章 + QA资料, status: 文本证据可用)
- [ ] Service-Blueprint (occ: 0, sources: MAP-STRUCTURE 06-体验层 + 全景图工具: 服务蓝图 Service Blueprint, status: 新增候选，来自体验层全景图，需 Task 19+ 补黄金版)
- [ ] HEART (occ: 0, sources: MAP-STRUCTURE 06-体验层 + 全景图工具: HEART 指标体系, status: 新增候选，来自体验层全景图，作为体验测量辅助)
- [ ] KANO (occ: 0, sources: MAP-STRUCTURE 04-产品层 + 全景图工具: KANO 模型, status: 新增候选，来自产品层全景图，用于需求优先级判断)

## Sub-Agent ② industry_analysis (8 个)

覆盖宏观环境、行业结构、生命周期、价值链与战略目标落地。

- [ ] PESTEL (occ: 12, avg_q: 4.58, image: 2, sources: 247页书 + 历史Prompt + QA资料 + 全景图, status: 双证据优先)
- [ ] Industry-Lifecycle (occ: 50, avg_q: 4.06, sources: 247页书 + 案例PPT + 词典PDF + 框架PDF + 模型卡, status: 文本证据可用)
- [ ] Porter-5-Forces (occ: 28, avg_q: 4.71, image: 3, sources: 模型卡 + 历史Prompt + 全景图, status: 双证据优先)
- [ ] Value-Chain (occ: 13, avg_q: 4.54, image: 2, sources: 247页书 + 模型卡 + QA资料 + 全景图, status: 双证据优先)
- [ ] S-Curve (occ: 15, avg_q: 4.47, image: 1, sources: 247页书 + 框架PDF + 全景图, status: 双证据优先)
- [ ] OGSM (occ: 0, sources: MAP-STRUCTURE 02-战略层 + 全景图工具: OGSM 模型, status: 新增候选，来自战略层全景图，用于目标-策略-衡量落地)
- [ ] Ansoff-Matrix (occ: 5, avg_q: 5, sources: 模型卡, status: 文本证据可用)
- [ ] North-Star-Metric (occ: 0, sources: MAP-STRUCTURE 07-增长层 + 全景图工具: 北极星指标, status: 新增候选，来自增长层全景图，用于统一增长目标)

## Sub-Agent ③ competitor_analysis (8 个)

覆盖竞品对比、差异化机会、组合策略与 SWOT/TOWS 转行动。

- [ ] SWOT (occ: 78, avg_q: 4.5, image: 2, sources: 247页书 + 案例PPT + 框架PDF + 方法论文章 + 模型卡, status: 双证据优先)
- [ ] Competitor-Matrix (occ: 3, avg_q: 4, sources: 247页书 + 案例PPT, status: 文本证据可用)
- [ ] Perceptual-Map (occ: 17, avg_q: 4.41, sources: 247页书, status: 文本证据可用)
- [ ] 4P-Comparison (occ: 12, avg_q: 4.83, sources: 247页书 + 模型卡, status: spec推荐概念，当前用 4P 证据映射为竞品 4P 对比法)
- [ ] BCG-Matrix (occ: 5, avg_q: 5, sources: 模型卡, status: 文本证据可用)
- [ ] TOWS (occ: 1, avg_q: 5, sources: 247页书, status: 文本证据可用)
- [ ] 4P (occ: 12, avg_q: 4.83, sources: 247页书 + 模型卡, status: 文本证据可用)
- [ ] 4C (occ: 10, avg_q: 4.8, image: 1, sources: 247页书 + 模型卡 + SOP资料 + 全景图, status: 双证据优先)

## Sub-Agent ④ brand_positioning (11 个)

Phase 1 核心模块，覆盖定位、价值主张、商业模式、人格调性与输出表达。

- [ ] STP (occ: 22, avg_q: 4.45, image: 2, sources: 247页书 + 框架PDF + 模型卡 + 历史Prompt + 全景图, status: 双证据优先)
- [ ] Brand-Positioning-Triangle (occ: 9, avg_q: 4.78, sources: 模型卡, status: 文本证据可用)
- [ ] Business-Model-Canvas (occ: 36, avg_q: 4.47, image: 1, sources: 247页书 + 案例PPT + 模型卡 + 历史Prompt + 全景图, status: 双证据优先)
- [ ] Value-Prop-Canvas (occ: 12, avg_q: 4.33, image: 5, sources: 247页书 + 全景图, status: 双证据优先)
- [ ] Aaker-Brand-Personality (occ: 19, avg_q: 4.63, sources: 247页书 + 案例PPT + 词典PDF, status: 文本证据可用)
- [ ] RTB (occ: 65, avg_q: 4.58, image: 1, sources: 247页书 + 案例PPT + 词典PDF + 框架PDF + 方法论文章, status: 双证据优先)
- [ ] VMV (occ: 33, avg_q: 4.39, image: 3, sources: 247页书 + 全景图, status: 双证据优先)
- [ ] SCQA (occ: 5, avg_q: 5, sources: 模型卡, status: 文本证据可用)
- [ ] Big-Idea (occ: 5, avg_q: 5, sources: 词典PDF, status: 文本证据可用)
- [ ] Brand-Architecture (occ: 0, sources: MAP-STRUCTURE 03-品牌层 + 全景图工具: 品牌架构图, status: 新增候选，来自品牌层全景图，用于品牌延伸与架构管理)
- [ ] GTM (occ: 0, sources: MAP-STRUCTURE 05-传播层/07-增长层 + 传播与渠道拓展模块, status: 新增候选，用于连接定位、上市打法与渠道节奏)

## Sub-Agent ⑤ brand_building (9 个)

覆盖品牌屋、产品屋、口号、视觉锤、品牌故事与资产管理。

- [ ] Brand-House (occ: 32, avg_q: 4.66, image: 1, sources: 案例PPT + 框架PDF + 方法论文章 + QA资料 + 全景图, status: 双证据优先)
- [ ] Product-House (occ: 10, avg_q: 4.8, sources: 方法论文章, status: 文本证据可用)
- [ ] Slogan-7-Principles (occ: 59, avg_q: 4.54, sources: 247页书 + 案例PPT + 方法论文章 + QA资料, status: 文本证据可用)
- [ ] Visual-Hammer-Verbal-Nail (occ: 17, avg_q: 4.59, sources: 247页书 + 词典PDF, status: 文本证据可用)
- [ ] Brand-Asset-5-Star (occ: 3, avg_q: 4, image: 3, sources: 全景图, status: 双证据优先)
- [ ] Brand-Story-Hero-Journey (occ: 131, avg_q: 4.27, image: 2, sources: 247页书 + 案例PPT + 词典PDF + 框架PDF + 模型卡, status: 双证据优先)
- [ ] Brand-Asset-Management (occ: 0, sources: MAP-STRUCTURE 03-品牌层 + MAP-STRUCTURE 08-管理层, status: 新增候选，来自品牌资产管理与管理制度模块)
- [ ] KOL-KOC (occ: 0, sources: MAP-STRUCTURE 05-传播层 + 全景图模块: KOL/KOC 合作, status: 新增候选，来自传播层全景图，用于口碑与内容触达)
- [ ] Crisis-Management (occ: 0, sources: MAP-STRUCTURE 08-管理层 + 全景图工具: 危机管理流程, status: 新增候选，来自管理层全景图，用于品牌风险与预案)

## Sub-Agent ⑥ annual_planning (10 个)

覆盖年度目标、节奏、整合营销、增长实验、预算与复盘机制。

- [ ] OKR (occ: 4, avg_q: 5, sources: 模型卡, status: 文本证据可用)
- [ ] Marketing-Calendar (occ: 3, avg_q: 4.67, sources: 词典PDF + QA资料 + 402工具表, status: 文本证据可用)
- [ ] 4P-Rhythm (occ: 3, avg_q: 5, sources: 词典PDF, status: 文本证据可用)
- [ ] AARRR-Funnel (occ: 6, avg_q: 4.67, image: 2, sources: 模型卡 + 全景图, status: 双证据优先)
- [ ] PDCA (occ: 32, avg_q: 4.19, image: 1, sources: 模型卡 + SOP资料 + 全景图, status: 双证据优先)
- [ ] IMC (occ: 28, avg_q: 4.61, image: 1, sources: 247页书 + 全景图, status: 双证据优先)
- [ ] Growth-Flywheel (occ: 0, sources: MAP-STRUCTURE 07-增长层 + 全景图工具: 增长飞轮模型, status: 新增候选，来自增长层全景图，用于年度增长机制)
- [ ] ICE (occ: 0, sources: MAP-STRUCTURE 07-增长层 + 全景图工具: ICE 优先级模型, status: 新增候选，来自增长层全景图，用于增长实验排序)
- [ ] Budget-Allocation (occ: 0, sources: MAP-STRUCTURE 08-管理层 + 全景图输出: 预算分配方案, status: 新增候选，来自年度规划预算管理场景)
- [ ] LTV-CAC (occ: 0, sources: MAP-STRUCTURE 07-增长层 + 全景图工具: LTV/CAC 生命周期价值模型, status: 新增候选，来自增长层全景图，用于商业化效率评估)

## 横切方法论 (5 个)

不是单独 Sub-Agent，而是所有模块共享的推理、结构与表达工具箱。

- [ ] 5-Why-Essence (occ: 1, avg_q: 5, sources: 方法论文章, status: 文本证据可用)
- [ ] Communication-Theory-34 (occ: 6, avg_q: 5, sources: 方法论文章, status: 文本证据可用)
- [ ] MECE (occ: 7, avg_q: 4.43, sources: 词典PDF + 方法论文章 + 模型卡 + 历史Prompt + SOP资料, status: 文本证据可用)
- [ ] Pyramid-Principle (occ: 6, avg_q: 5, sources: 模型卡, status: 文本证据可用)
- [ ] Action-Title (occ: 3, avg_q: 4, sources: 247页书 + 模型卡, status: 文本证据可用)

## Review 风险提示

- `4A-Funnel`、`Pain-Gain-Map`、`Slogan-7-Principles`、`MECE` 已通过 alias 补强获得文本证据；黄金版仍需在 Task 19/20 精修 primary/secondary source。
- `4P-Comparison` 当前以 `4P` 的证据承接；黄金版应写成“竞品 4P 对比矩阵”，不要只写营销组合定义。
- `Service-Blueprint`、`HEART`、`KANO`、`OGSM` 等 MAP-STRUCTURE 新增概念，需在 Task 19/20 编译时补 primary/secondary source。
