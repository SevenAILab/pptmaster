---
name: MECE
aliases:
  - MECE
  - 相互独立完全穷尽
  - 完全穷尽
  - 互斥穷尽
  - 相互独立
  - Mutually Exclusive Collectively Exhaustive
  - 不遗漏重要讯息
  - 不遗漏
  - 核心要点
category: methodology
primary_source: assets/_raw/models/pdca.md
secondary_sources:
  - assets/_raw/models/pyramid-principle.md       # 金字塔原理的结构化表达基础
  - assets/_raw/books/0to1-brand/ch03-competitor.md # 竞品信息结构化与模型脚手架
  - assets/_raw/methodologies/summaries/07-swot.md # SWOT 四象限结构化分析
  - assets/visuals/master-map/00-总览.png          # 位置归属: 总览 / 结构化思考
applicable_sub_agents:
  - consumer_insight
  - competitor_analysis
  - brand_positioning
  - annual_planning
application_role:
  consumer_insight: 辅助工具       # 用户标签/需求分类不能重叠漏项
  competitor_analysis: 辅助工具    # 竞品维度和分析结论需要结构完整
  brand_positioning: 辅助工具      # 定位选项和论证结构需要互斥穷尽
  annual_planning: 辅助工具        # 年度任务拆解和预算分类需要清晰边界
---

# MECE · 相互独立完全穷尽

## 定义

MECE 是 Mutually Exclusive, Collectively Exhaustive 的缩写,中文常译为相互独立、完全穷尽。它要求分类之间不重叠,整体上不遗漏。

虽然当前本地材料对 MECE 的直接命中较少,但 5W2H 模型卡中明确强调结构化问题分析要 "抓住核心要点,不遗漏重要讯息"；金字塔原理要求论据分层有逻辑；SWOT、4P、STP 等模型本质上也都依赖 MECE 的分类纪律。咨询级 PPT 的清晰感,很大一部分来自 MECE: 维度边界清楚,读者不用猜哪些内容被重复或漏掉。

在 PPTAgent 中,MECE 是所有 Sub-Agent 的横切质检规则,用于检查分析框架、页面结构和输出清单是否重叠、遗漏、层级混乱。

## 适用场景

- **用户分类**: Sub-Agent ① 拆人群、场景、需求时避免标签重叠
- **竞品维度设计**: Sub-Agent ③ 设计竞品矩阵字段时避免重复和漏项
- **定位选项比较**: Sub-Agent ④ 列战略选项时确保每个选项边界清楚
- **年度任务拆解**: Sub-Agent ⑥ 拆 OKR、预算、渠道和项目时避免责任不清
- **不适合**: 创意发散早期过度追求 MECE；先发散再收敛,不要用结构压死想象力

## 使用步骤

### 第 1 步 · 定义同一层级问题

先明确你要拆的对象是什么: 用户、需求、渠道、竞品、成本、传播动作还是风险。不同层级不能混在一起。

输出标准: 一个清晰母问题。

### 第 2 步 · 选择分类维度

选择一个主要切分维度,例如按人群、按场景、按渠道、按价值链、按旅程阶段。不要一边按人群、一边按价格、一边按渠道混切。

输出标准: 分类维度说明。

### 第 3 步 · 检查相互独立

任意两个子项之间不应大面积重叠。若 "高端用户" 和 "敏感肌用户" 可能重叠,说明它们不是同一维度。

输出标准: 重叠项清单 + 调整方案。

### 第 4 步 · 检查完全穷尽

问 "还有没有遗漏的情况?" 可加入 "其他/未知" 作为过渡,但最终要继续细分或说明边界。

输出标准: 漏项清单 + 边界说明。

### 第 5 步 · 调整层级

把不同层级拆开: 战略/战术、问题/原因、渠道/内容、用户/场景不能并列。

输出标准: 两到三层树状结构。

### 第 6 步 · 用标题表达结论

MECE 不是只为了分类,最终要服务表达。每个分组都要能支撑一个结论标题。

输出标准: MECE 结构 + 每组 Action Title。

## 输入输出示例

### 示例 1 · 植愈坊用户需求分类 (247 书贯穿教学案例)

> **案例可追溯报告**: 植愈坊是 Seven 247 书全书贯穿的**教学性虚拟案例** (非真实商业体)。具体出处行号待 Codex 后续按 P0-4 模板填充, 当前仅标注教学属性。**禁止包装成"真实品牌成功案例"**。

错误拆法:

```text
敏感肌用户 / 高端用户 / 喜欢香味的人 / 小红书用户
```

问题: 人群、价格、偏好和渠道混在一起,彼此重叠。

MECE 修正:

| 维度 | 分类 |
|---|---|
| 主要需求 | 安全温和 / 情绪放松 / 审美礼赠 / 成分探索 |
| 购买场景 | 日常自用 / 睡前放松 / 礼物赠送 / 旅行便携 |
| 渠道触点 | 小红书种草 / 微信私域 / 电商搜索 / 线下体验 |

**关键洞察**: 同一页里只用一个主要维度切分,其他维度作为补充字段,读者才不会混乱。

### 示例 2 · SmallRig 创作者场景拆解

> **案例可追溯报告**: ⚠️ **待人工校对** — 本示例的 SmallRig 内容需逐字与 `assets/_raw/cases/标杆案例/smallrig/*.md` 真实页对照。如案例 PDF 中无对应内容, 必须按 P0-6 4 层 Fallback 改用 Tier 2 经典案例或 Tier 3 抽象示例, 禁止 LLM 编造 SmallRig 案例。

错误拆法:

```text
摄影师 / Vlogger / 户外拍摄 / 直播用户 / 专业用户
```

MECE 修正:

| 维度 | 分类 |
|---|---|
| 创作者类型 | 个人创作者 / 小型团队 / 商业制作团队 / 教育机构 |
| 拍摄场景 | 桌面拍摄 / 户外移动 / 直播访谈 / 商业片场 |
| 工具任务 | 保护机身 / 扩展接口 / 稳定承托 / 快速切换 |

**关键洞察**: SmallRig 的产品矩阵可以按 "场景 × 工具任务" 组织,而不是把人群和场景混成一堆。

## 常见误用

1. **跨维度并列**: 把人群、场景、渠道、价格放在同一层 → 分类失效
2. **为了整齐硬凑**: 强行凑 3 点或 4 点 → 漏掉关键事实
3. **重叠不处理**: 一个案例同时落进多个分类 → 后续数据和策略重复计算
4. **穷尽变成无限细分**: 为了不遗漏拆到无法决策 → 结构过载
5. **把 MECE 当内容质量**: 分类清楚但洞察平庸 → 只是整理,不是策略
6. **忽略未知项**: 对信息不足的情况不标注 → 让输出看起来过度确定
7. **只做结构不做结论**: 树状图很好看,但没有 Action Title → PPT 缺少观点

## 关联概念

- **Pyramid-Principle** → `concepts-golden/pyramid-principle.md` (MECE 是金字塔论据分组纪律,强配对)
- **SCQA** → `concepts-golden/scqa.md` (问题叙事后需要 MECE 拆解论证,强配对)
- **Action-Title** → `concepts-golden/action-title.md` (MECE 分组最终服务结论标题,下游)
- **SWOT** → `concepts-golden/swot.md` (S/W/O/T 四象限需要边界清楚,同层)
- **Competitor-Matrix** → `concepts-golden/competitor-matrix.md` (矩阵维度需要 MECE,同层)
- **Persona-5W2H** → `concepts-golden/persona-5w2h.md` (用户画像字段不能混层,上游/同层)
- **OKR** → `concepts-golden/okr.md` (目标和 KR 拆解要避免重叠,下游)

## 多源对照参考 (Skill 内部, 用户不可见)

| 维度 | 取自 | 说明 |
|---|---|---|
| **定义** | 咨询通用 MECE + 模型卡 5W2H (P3) | 直接别名命中少,用 "不遗漏重要讯息" 和结构化分析支撑 |
| **适用场景** | spec §4.3-§4.8 (P2) | 所有 Sub-Agent 都需要结构质检 |
| **步骤 1-5** | 金字塔原理 + 5W2H + Claude 综合 (P3) | 同层级、同维度、互斥穷尽、层级调整 |
| **步骤 6** | Action-Title/Pyramid 结构要求 (P3) | MECE 最终服务咨询表达 |
| **示例 植愈坊** | 247 书 ch04 + Claude 综合 (P1) | 用户需求、场景、渠道分层 |
| **示例 SmallRig** | SmallRig 案例 + Claude 综合 (P2) | 创作者类型、场景和工具任务分层 |
| **常见误用** | Claude 综合 | 防止跨维度并列和结构主义空转 |
| **关联概念** | Claude 综合 + spec 横切工具 | 与金字塔、SCQA、行动标题和矩阵工具联动 |
