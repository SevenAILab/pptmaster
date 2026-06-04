---
name: SCQA
aliases:
  - SCQA
  - SCR 框架
  - SCQA 模型
  - Situation Complication Question Answer
  - 情景冲突疑问回答
category: model
primary_source: assets/_raw/models/scqa.md
secondary_sources:
  - assets/_raw/models/pyramid-principle.md # SCQA 与金字塔原理同源
  - assets/_raw/books/0to1-brand/ch01-cognition.md # 品牌建设章节叙事结构
  - assets/_raw/methodologies/raw/01-essence.md # 问题定义和找本质
  - assets/visuals/master-map/00-总览.png # 位置归属: 总览 / 叙事结构
applicable_sub_agents:
  - brand_positioning
  - competitor_analysis
  - brand_building
  - annual_planning
application_role:
  brand_positioning: 辅助工具      # 定位方案开场叙事
  competitor_analysis: 辅助工具    # 竞品分析从市场事实引出关键问题
  brand_building: 辅助工具         # 品牌故事和提案章节开头
  annual_planning: 辅助工具        # 年度规划引出增长命题和行动答案
---

# SCQA 模型 · Situation-Complication-Question-Answer

## 定义

SCQA 是一种结构化叙事模型,由 Situation、Complication、Question、Answer 四部分组成: 先讲共同情景,再指出冲突,引出关键问题,最后给出答案。

模型卡显示,SCQA 来源于麦肯锡咨询顾问 Barbara Minto 的《金字塔原理》。S 是情景,从大家熟悉的事实切入；C 是冲突,现实与目标出现矛盾；Q 是疑问,我们应该怎么办；A 是回答,也就是解决方案。

在 PPTAgent 中,SCQA 适合用在方案开场、章节转场和关键建议页,帮助客户从 "我知道这些事实" 自然走到 "所以必须采取这个策略"。

## 适用场景

- **方案开场页**: 用市场事实和业务冲突引出本案核心问题
- **定位建议铺垫**: Sub-Agent ④ 从用户/竞品/自我冲突引出定位答案
- **竞品分析总结**: Sub-Agent ③ 从市场格局引出差异化机会
- **年度规划命题**: Sub-Agent ⑥ 从上一年表现和新环境冲突引出年度重点
- **不适合**: 已经需要直接给执行清单的页面；SCQA 用于叙事引入,不是替代行动计划

## 使用步骤

### 第 1 步 · Situation 情景

写一个客户会同意的事实背景,通常来自市场、用户、行业或企业现状。不要一上来就下判断。

输出标准: 1-3 条事实,可被证据支持。

### 第 2 步 · Complication 冲突

指出现实和目标之间的矛盾: 增长放缓、同质化、用户不信任、渠道成本上升、定位模糊等。

输出标准: 一个明确冲突,不是泛泛的 "竞争激烈"。

### 第 3 步 · Question 疑问

把冲突转成需要回答的战略问题。问题越好,答案越聚焦。

输出标准: 一个主问题,通常可写成 "我们应该如何...?"

### 第 4 步 · Answer 回答

给出你的核心答案,也就是后续方案的塔尖结论。Answer 不应只是 "我们需要品牌升级",而要有具体方向。

输出标准: 一句策略答案。

### 第 5 步 · 检查因果链

检查 S 是否自然引出 C,C 是否自然引出 Q,Q 是否被 A 准确回答。如果跳跃,客户会觉得硬拐。

输出标准: SCQA 链路检查。

### 第 6 步 · 页面化表达

将 SCQA 拆成一页或两页: 开场页可用 S+C+Q,下一页给 A；短页面可用一页四格。

输出标准: 页面标题 + 四段文案。

## 输入输出示例

### 示例 1 · 植愈坊定位开场 SCQA (247 书贯穿教学案例)

> **案例可追溯报告**: 植愈坊是 Seven 247 书全书贯穿的**教学性虚拟案例** (非真实商业体)。具体出处行号待 Codex 后续按 P0-4 模板填充, 当前仅标注教学属性。**禁止包装成"真实品牌成功案例"**。

| 模块 | 内容 |
|---|---|
| S 情景 | 天然手工皂市场已有大量品牌,用户对成分安全、颜值和体验都有明确需求 |
| C 冲突 | 但多数品牌仍停留在 "天然/手作/好看" 的同质化表达,难以建立强心智 |
| Q 疑问 | 植愈坊如何避免成为又一个小众手工皂品牌? |
| A 回答 | 从 "天然手工皂" 升维为 "都市女性的芳香疗愈清洁仪式" |

**关键洞察**: SCQA 让定位不是凭空提出,而是从市场同质化冲突中自然长出来。

### 示例 2 · SmallRig 品牌升级 SCQA

> **案例可追溯报告**: ⚠️ **待人工校对** — 本示例的 SmallRig 内容需逐字与 `assets/_raw/cases/标杆案例/smallrig/*.md` 真实页对照。如案例 PDF 中无对应内容, 必须按 P0-6 4 层 Fallback 改用 Tier 2 经典案例或 Tier 3 抽象示例, 禁止 LLM 编造 SmallRig 案例。

| 模块 | 内容 |
|---|---|
| S 情景 | 全球影像创作者的设备组合和拍摄场景越来越复杂 |
| C 冲突 | 单一配件卖点难以承载创作者对全流程效率和可靠性的需求 |
| Q 疑问 | SmallRig 如何从配件竞争中升维,建立更高层级的品牌认知? |
| A 回答 | 将品牌定义为支持创作者完成作品的模块化工作流工具生态 |

**关键洞察**: SmallRig 的升级逻辑不是 "换个更高级口号",而是回应创作者工作流变化。

## 常见误用

1. **S 写成观点**: 情景阶段就开始下结论 → 客户还没进入共同事实
2. **C 太泛**: "市场竞争激烈" 没有具体冲突 → 问题没有张力
3. **Q 问得太大**: "我们如何成功" → 后续答案失焦
4. **A 不回答 Q**: 问定位,答传播；问增长,答视觉 → 叙事断裂
5. **把 SCQA 写太长**: 每段一大段背景 → 开场拖沓
6. **没有证据支撑 S/C**: 情景和冲突凭感觉 → 客户不买账
7. **只做叙事不接金字塔**: Answer 出来后没有论据展开 → 方案缺少支撑

## 关联概念

- **Pyramid-Principle** → `concepts-golden/pyramid-principle.md` (SCQA 引出塔尖结论,强配对)
- **MECE** → `concepts-golden/mece.md` (Answer 后的论证需要 MECE 分组,强配对)
- **Action-Title** → `concepts-golden/action-title.md` (SCQA 的 A 常转成行动标题,下游)
- **5-Why-Essence** → `concepts-golden/5-why-essence.md` (Q 的质量来自问题定义,上游)
- **SWOT** → `concepts-golden/swot.md` (S/C 可来自内外部态势,上游)
- **Perceptual-Map** → `concepts-golden/perceptual-map.md` (定位冲突可来自心智地图,上游)
- **Brand-Positioning-Triangle** → `concepts-golden/brand-positioning-triangle.md` (A 可收束为定位三角,下游)

## 多源对照参考 (Skill 内部, 用户不可见)

| 维度 | 取自 | 说明 |
|---|---|---|
| **定义** | 模型卡 scqa (P3) | S/C/Q/A 定义和明托来源来自模型卡 |
| **适用场景** | PPTAgent 输出要求 + spec §4.5-§4.8 (P2) | 方案开场、定位、竞品和年度规划都需要叙事引入 |
| **步骤 1-4** | SCQA 模型卡 (P3) | 情景、冲突、疑问、答案的基本流程 |
| **步骤 5-6** | 金字塔原理 + Claude 综合 (P3) | 检查因果链并转成 PPT 页面 |
| **示例 植愈坊** | 247 书 ch02/ch06 + Claude 综合 (P1) | 从天然手工皂同质化引出定位 |
| **示例 SmallRig** | SmallRig 案例 + Claude 综合 (P2) | 从创作者工作流变化引出品牌升级 |
| **常见误用** | Claude 综合 | 防止开场观点化和答案跑题 |
| **关联概念** | Claude 综合 + 横切方法论 | 与金字塔、MECE、行动标题和定位三角联动 |
