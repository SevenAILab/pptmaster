---
name: Action-Title
aliases:
  - 行动标题
  - Action Title
  - 结论标题
  - 结论先行标题
  - 行动型标题
  - Action title
  - 先说结论
  - 结论先行
  - 鼓励行动
category: term
primary_source: assets/_raw/models/pyramid-principle.md
secondary_sources:
  - assets/_raw/models/scqa.md                  # 从问题到答案的标题结构
  - assets/_raw/books/0to1-brand/ch12-channel.md # 传播触点中的行动引导
  - assets/_raw/books/0to1-brand/ch13-imc.md     # 核心信息和内容标题
  - assets/visuals/master-map/00-总览.png        # 位置归属: 总览 / PPT 表达
applicable_sub_agents:
  - brand_positioning
  - competitor_analysis
  - brand_building
  - annual_planning
application_role:
  brand_positioning: 辅助工具      # 定位页必须用结论标题
  competitor_analysis: 辅助工具    # 竞品页标题需表达洞察而非描述图表
  brand_building: 辅助工具         # 品牌故事/资产页用行动标题收束
  annual_planning: 辅助工具        # 年度计划页标题要推动决策
---

# Action Title · 行动标题

## 定义

Action Title 是咨询式 PPT 页面标题写法,用一句结论或行动建议概括本页观点,而不是只描述图表内容。

它的底层来自金字塔原理的 "先说结论,后说论据"。模型卡强调,表达要先总结所以,后过程因为；塔尖用一两句话说出结论,下方再用论据支持。Action Title 就是把这个原则落到每一页 PPT: 标题先告诉客户 "这一页要得出什么判断",图表和正文负责证明。

在 PPTAgent 中,Action Title 是 HTML 横向翻页 PPT 的质量闸门。没有行动标题,页面容易变成资料陈列；有行动标题,页面才像咨询方案。

## 适用场景

- **所有分析页**: 竞品、用户、行业、SWOT、感知地图都应使用结论标题
- **定位建议页**: Sub-Agent ④ 用标题直接表达推荐方向
- **品牌建设页**: Sub-Agent ⑤ 用标题说明品牌屋/口号/故事的作用
- **年度行动页**: Sub-Agent ⑥ 用标题推动资源决策
- **不适合**: 封面、目录、章节幕封等功能性页面可用短标题,不必强行行动化

## 使用步骤

### 第 1 步 · 先写页面结论

看完本页内容后,客户应该记住什么? 先写这一句话,再决定放什么图表。

输出标准: 一句 12-28 字中文结论。

### 第 2 步 · 避免描述型标题

将 "用户画像分析" 改为 "核心用户买的不是天然皂,而是下班后的自我照顾"。描述主题不够,要表达判断。

输出标准: 描述型 → 结论型改写。

### 第 3 步 · 加入动作或含义

好的标题通常包含 "所以要怎么做" 或 "这意味着什么"。分析页可以给洞察,策略页必须给动作。

输出标准: 洞察/含义/行动三类标签。

### 第 4 步 · 与正文证据对齐

标题必须能被本页图表、数据、案例或模型证明。不能标题很猛,证据很弱。

输出标准: 标题 → 证据映射。

### 第 5 步 · 控制长度和语气

标题要具体、有判断、可读,但不能像广告口号。避免夸张词和无证据绝对化。

输出标准: 不超过两行,无空泛大词。

### 第 6 步 · 串成章节叙事

将一组页面的 Action Title 连起来,应该能读出完整故事线。

输出标准: 章节标题串读检查。

## 输入输出示例

### 示例 1 · 植愈坊页面标题改写

> **案例可追溯报告**: 植愈坊是 Seven 247 书全书贯穿的**教学性虚拟案例** (非真实商业体)。本示例内容来自 247 书相应章节的植愈坊推演 (具体行号待 Codex 后续按 P0-4 填充)。**禁止包装成"真实品牌成功案例"**。

| 原标题 | Action Title |
|---|---|
| 用户画像 | 核心用户买的不是天然皂,而是下班后的自我照顾 |
| 竞品分析 | 竞品都在讲天然手作,疗愈仪式仍是可占据空白 |
| SWOT 分析 | 芳疗师专业和设计能力,是植愈坊切入情绪疗愈的主杠杆 |
| 品牌定位 | 植愈坊应从手工皂升维为芳香疗愈清洁仪式 |

**关键洞察**: Action Title 让客户不看正文也能读懂方案主线。

### 示例 2 · SmallRig 页面标题改写

> **案例可追溯报告**: ⚠️ **待人工校对** — 本示例的 SmallRig 内容需逐字与 `assets/_raw/cases/标杆案例/smallrig/*.md` 真实页对照。如案例 PDF 中无对应内容, 必须按 P0-6 4 层 Fallback 改用 Tier 2 经典案例或 Tier 3 抽象示例, 禁止 LLM 编造 SmallRig 案例。

| 原标题 | Action Title |
|---|---|
| 行业趋势 | 创作者需求正从单品配件转向全场景工作流 |
| RTB 支撑 | 共创、模块化和快适配共同证明 SmallRig 的工具生态能力 |
| 品牌人格 | "支持者" 人格能把工程能力转化为创作者情感信任 |
| 品牌升级建议 | SmallRig 应从相机配件品牌升级为创作者工作流工具生态 |

**关键洞察**: 标题串起来,就是一条完整的品牌升级论证链。

## 常见误用

1. **主题型标题**: "市场分析/用户洞察/竞品对比" → 没有观点
2. **口号型标题**: "破局增长,赢战未来" → 看似有力但没有具体判断
3. **标题证据不匹配**: 标题说 "明显领先",图表只显示轻微差距 → 信任受损
4. **一页多个结论**: 标题、图表、注释讲三件事 → 页面焦点分散
5. **过长难读**: 标题塞满背景和结论 → 失去扫读效率
6. **全部写成命令句**: 分析页也硬写 "必须..." → 语气僵硬
7. **章节标题不连贯**: 单页标题不错,串起来没有故事线 → 整 deck 松散

## 关联概念

- **Pyramid-Principle** → `concepts-golden/pyramid-principle.md` (Action Title 是结论先行的页面化,强配对)
- **SCQA** → `concepts-golden/scqa.md` (A 可转成行动标题,强配对)
- **MECE** → `concepts-golden/mece.md` (每组标题需要支撑结构清楚,上游)
- **Brand-Positioning-Triangle** → `concepts-golden/brand-positioning-triangle.md` (定位页标题表达核心主张,下游)
- **Perceptual-Map** → `concepts-golden/perceptual-map.md` (感知地图页需要结论标题,同层)
- **RTB** → `concepts-golden/rtb.md` (强标题需要可信证据,上游)
- **IMC** → `concepts-golden/imc.md` (传播核心信息可转成页面标题,同层)

## 多源对照参考 (Skill 内部, 用户不可见)

| 维度 | 取自 | 说明 |
|---|---|---|
| **定义** | 金字塔原理模型卡 (P3) | 先说结论和结论先行是 Action Title 的理论依据 |
| **适用场景** | PPTAgent HTML deck 输出要求 (P2) | 咨询级 PPT 页面需要行动标题 |
| **步骤 1-4** | Pyramid + SCQA + Claude 综合 (P3) | 页面结论、改写、证据对齐 |
| **步骤 5-6** | 247 书传播内容 + Claude 综合 (P1) | 标题要可读、串成叙事 |
| **示例 植愈坊** | 247 书贯穿案例 + Claude 综合 (P1) | 将各类页面标题行动化 |
| **示例 SmallRig** | SmallRig 案例 + Claude 综合 (P2) | 品牌升级页标题串读 |
| **常见误用** | Claude 综合 + 咨询表达经验 | 防止主题型标题和口号型标题 |
| **关联概念** | Claude 综合 + 横切表达工具 | 与金字塔、SCQA、MECE 和 RTB 联动 |
