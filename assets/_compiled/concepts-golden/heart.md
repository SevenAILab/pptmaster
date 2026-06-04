---
name: HEART
aliases:
  - HEART 指标体系
  - HEART
  - 用户体验指标
  - Happiness Engagement Adoption Retention Task Success
  - 体验测量
category: model
primary_source: assets/visuals/master-map/06-体验层.png
secondary_sources:
  - assets/visuals/master-map/MAP-STRUCTURE.md # MAP-STRUCTURE 新增,体验测量工具
  - assets/_raw/books/0to1-brand/ch04-user.md # 用户旅程和体验反馈
  - assets/_raw/sops/06-第三部分-品牌沟通.md # X Data/体验数据与品牌审计
  - assets/_raw/books/0to1-brand/ch14-execution.md # 服务体验触点优化
applicable_sub_agents:
  - consumer_insight
  - annual_planning
  - brand_building
application_role:
  consumer_insight: 辅助工具       # 体验洞察的指标化工具
  annual_planning: 辅助工具        # 年度体验优化指标
  brand_building: 可选引用         # 品牌体验是否兑现可用 HEART 监测
---

# HEART 指标体系 · HEART

## 定义

HEART 是一套用户体验指标框架,通常由 Happiness、Engagement、Adoption、Retention、Task Success 五类指标组成,用于衡量用户是否满意、是否参与、是否采用、是否留存、是否顺利完成任务。

本概念来自全景图 06-体验层的 "HEART 指标体系",属于 MAP-STRUCTURE 新增候选。结合 Seven SOP 中 O Data/X Data 的品牌审计思路,HEART 在 PPTAgent 中主要用于把体验问题变成可跟踪指标: 用户不仅有没有买,还要看体验是否顺、是否愿意留下、是否愿意推荐。

HEART 的价值不是列五个英文词,而是为每个体验目标选择 1-2 个真正可用的指标。

## 适用场景

- **体验指标设计**: Sub-Agent ① 将用户旅程痛点转成可测量指标
- **服务优化复盘**: 用指标判断服务蓝图优化是否有效
- **年度体验目标**: Sub-Agent ⑥ 将满意度、留存、任务成功率纳入计划
- **产品/私域体验评估**: 判断新功能、会员、售后和内容体验
- **不适合**: 没有真实触点数据时堆指标；HEART 需要可采集的数据源

## 使用步骤

### 第 1 步 · 定义体验目标

先明确要优化哪个体验: 注册、购买、咨询、试用、复购、售后、会员参与等。

输出标准: 目标体验 + 目标用户 + 关键任务。

### 第 2 步 · 选择 HEART 维度

不是每次都用五个维度。根据目标选择最关键的 2-3 个:

| 维度 | 含义 | 常见指标 |
|---|---|---|
| Happiness | 满意和情绪 | 满意度、NPS、情绪反馈 |
| Engagement | 参与深度 | 使用频次、互动、停留 |
| Adoption | 首次采用 | 新用户使用率、功能启用率 |
| Retention | 留存复购 | 复购率、回访率、留存率 |
| Task Success | 任务成功 | 完成率、耗时、错误率 |

### 第 3 步 · 设定 Goals-Signals-Metrics

每个维度都要从目标到信号再到指标。目标是想改变什么,信号是用户行为表现,指标是可采集数据。

输出标准: GSM 表。

### 第 4 步 · 建立数据来源

明确数据来自问卷、CRM、订单、客服记录、埋点、社群互动、售后系统还是人工标注。

输出标准: 指标来源和采集频率。

### 第 5 步 · 设置基线和阈值

没有基线就无法判断优化是否有效。先记录当前状态,再设目标值。

输出标准: 当前值 + 目标值 + 观察周期。

### 第 6 步 · 复盘并优化

用 PDCA 周期检查指标变化,区分短期波动和真实体验改善。

输出标准: 指标变化 + 原因判断 + 下一步动作。

## 输入输出示例

### 示例 1 · 植愈坊敏感肌咨询体验 HEART (247 书贯穿教学案例)

> **案例可追溯报告**: 植愈坊是 Seven 247 书全书贯穿的**教学性虚拟案例** (非真实商业体)。具体出处行号待 Codex 后续按 P0-4 模板填充, 当前仅标注教学属性。**禁止包装成"真实品牌成功案例"**。

背景: 植愈坊希望降低敏感肌用户从咨询到首次购买的焦虑。

| HEART | Goal | Signal | Metric |
|---|---|---|---|
| Happiness | 用户觉得被专业照顾 | 咨询后正向反馈 | 咨询满意度/NPS |
| Task Success | 用户能顺利选到合适产品 | 完成香型/肤质选择 | 咨询到下单转化率、平均咨询轮次 |
| Adoption | 新用户愿意尝试 | 首单试用装购买 | 试用装购买率 |
| Retention | 试用后愿意回来 | 30 天内复购 | 30 天复购率 |

**关键洞察**: 植愈坊不应只看小红书曝光,还要看用户是否顺利完成 "安心选择" 这个任务。

### 示例 2 · 假设阅读 App X 的 HEART 体验指标 (Tier 3 抽象示例)

> **案例可追溯报告**: 抽象演示案例 (非真实品牌, 用于演示 HEART 5 维度体验指标). 任何与真实品牌的相似性纯属巧合。本示例不应被引用为"真实案例佐证"。

背景: 假设一家阅读 App X 想用 HEART 衡量体验质量:

| HEART | Goal | Signal | Metric |
|---|---|---|---|
| **Happiness** | 用户觉得阅读体验流畅 | 评分/评论/NPS | 应用商店评分、NPS、负评率 |
| **Engagement** | 用户愿意每天读 | 单日阅读时长、阅读次数 | 日均阅读分钟、周阅读天数 |
| **Adoption** | 新功能被采用 | 新功能首次使用率 | 笔记/标注/分享首次率 |
| **Retention** | 用户长期留下 | 月活/留存曲线 | 30/90 天留存率 |
| **Task Success** | 用户找得到想读的书 | 搜索成功率、推荐转化率 | 搜索→打开率、推荐点击率 |

**关键洞察**: HEART 的**5 维度互相补充** — 单看 Happiness 满意度高可能用得少 (没 Engagement), 单看 Engagement 高可能任务成功率低 (用户在挣扎)。**完整 5 维度才能看到体验全貌**, 这是 Google UX 团队总结的最大经验教训。

## 常见误用

1. **五个维度全用**: 指标太多没人看 → 应选择最关键维度
2. **指标不对应目标**: 想提升满意度却只看曝光 → 无法指导体验优化
3. **没有数据来源**: 指标写得漂亮但采不到 → 无法执行
4. **只看平均值**: 忽略关键人群和关键场景差异 → 问题被平均数掩盖
5. **没有基线**: 优化后不知道是否真的变好
6. **把短期活动当留存**: 活动刺激的回访不等于真实 Retention
7. **不接服务蓝图**: 指标发现问题但不落到流程断点 → 无法改进

## 关联概念

- **Service-Blueprint** → `concepts-golden/service-blueprint.md` (HEART 衡量服务蓝图优化结果,强配对)
- **User-Journey** → `concepts-golden/user-journey.md` (指标应绑定旅程节点,强配对)
- **PDCA** → `concepts-golden/pdca.md` (HEART 指标进入复盘闭环,下游)
- **AARRR-Funnel** → `concepts-golden/aarrr-funnel.md` (留存/激活与增长漏斗联动,同层)
- **Pain-Gain-Map** → `concepts-golden/pain-gain-map.md` (体验指标来自痛点收益,上游)
- **KANO** → `concepts-golden/kano.md` (不同需求类型对应不同体验指标,同层)
- **Brand-Asset-5-Star** → `concepts-golden/brand-asset-5-star.md` (体验改善影响品牌健康度,下游)

## 多源对照参考 (Skill 内部, 用户不可见)

| 维度 | 取自 | 说明 |
|---|---|---|
| **定义** | MAP-STRUCTURE 06 体验层 + HEART 通用框架 (P2/P3) | MAP-STRUCTURE 新增,缺 P1 Seven 原创专章 |
| **适用场景** | spec §4.3/§4.8 + 体验层全景图 (P2) | 用户体验和年度体验优化 |
| **步骤 1-3** | HEART 通用 Goals-Signals-Metrics (P3) | 目标、信号、指标 |
| **步骤 4-6** | SOP 06 O/X Data + PDCA (P2) | 数据来源、基线和复盘 |
| **示例 植愈坊** | 247 书用户旅程 + Claude 综合 (P1) | 敏感肌咨询体验指标 |
| **示例 假设品牌 X (Tier 3)** | Claude 综合抽象案例 (非真实品牌) | 框架演示用, 不应被引用为真实案例佐证 |
| **常见误用** | Claude 综合 | 防止指标堆砌和无数据来源 |
| **关联概念** | Claude 综合 + MAP-STRUCTURE 体验层/增长层 | 与服务蓝图、旅程、AARRR 和 PDCA 联动 |
