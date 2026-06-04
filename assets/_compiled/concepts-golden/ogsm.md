---
name: OGSM
aliases:
  - OGSM
  - OGSM 模型
  - 目标策略衡量
  - Objective Goals Strategies Measures
  - 战略落地工具
category: model
primary_source: assets/visuals/master-map/02-战略层.png
secondary_sources:
  - assets/visuals/master-map/MAP-STRUCTURE.md # 战略层工具: OGSM 模型
  - assets/_raw/sops/04-第一部分品牌战略.md     # 愿景、阶段战略目标和竞争战略
  - assets/_raw/frameworks/品牌年度规划方案.md # 年度策略、目标+战术、预算节奏
  - assets/_raw/models/企业-strategy-屋.md      # 经营目标、战略、战术的屋状结构
applicable_sub_agents:
  - industry_analysis
  - annual_planning
  - brand_positioning
application_role:
  industry_analysis: 可选引用      # 将机会洞察转成战略路线
  annual_planning: 辅助工具        # 年度目标-策略-衡量落地
  brand_positioning: 可选引用      # 定位后的战略落地表达
---

# OGSM 模型 · Objective-Goals-Strategies-Measures

## 定义

OGSM 是一种战略落地框架,用 Objective、Goals、Strategies、Measures 四个部分把战略方向转成可衡量行动。

本概念来自全景图 02-战略层的 "OGSM 模型",属于 MAP-STRUCTURE 新增候选,缺 P1 七书专章。结合 Seven 品牌战略 SOP 中 "愿景/战略目标/竞争战略/商业模式落地" 的逻辑,OGSM 在 PPTAgent 中用于连接战略与年度执行: Objective 说明方向,Goals 量化目标,Strategies 说明怎么打,Measures 定义如何衡量。

一句话: OGSM 让 "战略方向" 不停留在口号,而变成目标、策略和指标。

## 适用场景

- **年度规划框架**: Sub-Agent ⑥ 将年度策略拆成目标、策略、衡量
- **定位落地**: Sub-Agent ④ 输出定位后,说明未来 6-12 个月如何验证
- **战略路线图**: Sub-Agent ②/⑥ 将机会洞察转成阶段性战略
- **跨部门对齐**: 把品牌、产品、渠道、传播的动作放到同一目标下
- **不适合**: 战略方向仍未明确时硬填表；OGSM 是落地工具,不是替代战略判断

## 使用步骤

### 第 1 步 · Objective 方向

写一句清晰、鼓舞但具体的战略方向。它回答 "今年最重要的战略命题是什么"。

输出标准: 1 个 Objective,不超过 30 字。

### 第 2 步 · Goals 量化目标

将方向转成 2-4 个可衡量目标,例如品牌认知、销售、复购、渠道覆盖、内容资产、体验指标。

输出标准: 目标值 + 时间范围 + 口径。

### 第 3 步 · Strategies 策略路径

说明为达成目标选择哪些路径,通常 3-5 条即可。策略是取舍,不是动作清单。

输出标准: 策略路径 + 不做事项。

### 第 4 步 · Measures 衡量指标

为每条策略设置领先指标和结果指标。领先指标看动作是否发生,结果指标看目标是否达成。

输出标准: KPI/指标表。

### 第 5 步 · 拆到项目和负责人

将 Strategies 拆成季度项目、负责人、预算和里程碑。

输出标准: 项目表 + RACI/负责人。

### 第 6 步 · 建立复盘节奏

用 PDCA 周期复盘 Measures,必要时调整策略而不是只调整动作。

输出标准: 月度/季度复盘机制。

## 输入输出示例

### 示例 1 · 植愈坊年度 OGSM

> **案例可追溯报告**: 植愈坊是 Seven 247 书全书贯穿的**教学性虚拟案例** (非真实商业体)。本示例内容来自 247 书相应章节的植愈坊推演 (具体行号待 Codex 后续按 P0-4 填充)。**禁止包装成"真实品牌成功案例"**。

| 模块 | 内容 |
|---|---|
| Objective | 建立 "芳香疗愈清洁仪式" 的早期品牌心智 |
| Goals | 小红书有效笔记 100 篇；首批试用 500 单；30 天复购率 18%；私域会员 1000 人 |
| Strategies | KOC 种草验证场景；敏感肌 RTB 降低信任成本；睡前仪式内容沉淀资产 |
| Measures | 收藏率、咨询转化率、试用复购、私域留存、NPS |

**关键洞察**: OGSM 把 "做品牌" 变成了可衡量的心智、试用和复购路径。

### 示例 2 · 假设母婴品牌 X 年度 OGSM (Tier 3 抽象示例)

> **案例可追溯报告**: 抽象演示案例 (非真实品牌, 用于演示 OGSM 4 层结构). 任何与真实品牌的相似性纯属巧合。本示例不应被引用为"真实案例佐证"。

| 模块 | 内容 |
|---|---|
| **Objective** | 从"婴儿用品供应商"升级为"新生家庭陪伴品牌" |
| **Goals** | 复购率提升; 用户活跃时长增长; 新客覆盖增长; 品牌主张认知度提升 |
| **Strategies** | 用"成长阶段套装"重组产品体系; 建社群让新手妈妈互助; 与儿科 KOL 共创内容矩阵 |
| **Measures** | 套装客单价、社群周活、医生 KOL 内容观看率、品牌主张认知调研 |

**关键洞察**: OGSM 的**4 层穿透价值** — Objective 给战略方向, Goals 给可量化目标, Strategies 给路径选择, Measures 给反馈机制。**4 层缺任何一层都会导致战略空转**。

## 常见误用

1. **Objective 太虚**: "成为行业领先品牌" → 没有战略焦点
2. **Goals 不量化**: 只写提升、加强、优化 → 无法评估
3. **Strategies 写成动作清单**: 发 20 篇笔记不是策略,只是动作
4. **Measures 只看结果**: 没有领先指标 → 等发现失败已经太晚
5. **目标过多**: 什么都想做 → 资源无法聚焦
6. **没有不做事项**: 策略没有取舍 → 团队仍然发散
7. **不复盘**: OGSM 写在年初 PPT 里,之后没人看 → 失去落地价值

## 关联概念

- **OKR** → `concepts-golden/okr.md` (OGSM 与 OKR 都用于目标落地,强配对)
- **TOWS** → `concepts-golden/tows.md` (TOWS 生成策略选项,OGSM 承接落地,上游/下游)
- **Marketing-Calendar** → `concepts-golden/marketing-calendar.md` (OGSM 项目进入年度排期,下游)
- **PDCA** → `concepts-golden/pdca.md` (Measures 进入复盘闭环,下游)
- **North-Star-Metric** → `concepts-golden/north-star-metric.md` (North Star 可作为核心 Goal/Measure,同层)
- **Brand-Positioning-Triangle** → `concepts-golden/brand-positioning-triangle.md` (定位后的战略方向输入,上游)
- **Budget-Allocation** → `concepts-golden/budget-allocation.md` (策略路径需要预算配置,下游)

## 多源对照参考 (Skill 内部, 用户不可见)

| 维度 | 取自 | 说明 |
|---|---|---|
| **定义** | MAP-STRUCTURE 02 战略层 + OGSM 通用框架 (P2/P3) | MAP-STRUCTURE 新增,缺 P1 Seven 原创专章 |
| **适用场景** | spec §4.4/§4.8 + 年度规划框架 (P2) | 战略和年度规划落地 |
| **步骤 1-4** | OGSM 通用框架 + SOP 04 战略目标逻辑 (P2/P3) | Objective/Goals/Strategies/Measures |
| **步骤 5-6** | 年度规划方案 + PDCA (P2) | 项目、预算、复盘 |
| **示例 植愈坊** | 247 书贯穿案例 + Claude 综合 (P1) | 年度品牌心智目标 |
| **示例 假设品牌 X (Tier 3)** | Claude 综合抽象案例 (非真实品牌) | 框架演示用, 不应被引用为真实案例佐证 |
| **常见误用** | Claude 综合 | 防止目标虚、策略变动作清单 |
| **关联概念** | Claude 综合 + 战略/年度层 | 与 OKR、TOWS、北极星和预算联动 |
