---
name: AARRR-Funnel
aliases:
  - AARRR
  - 海盗指标
  - 海盗模型
  - AARRR Funnel
  - 用户增长漏斗
category: model
primary_source: assets/_raw/models/aarrr.md
secondary_sources:
  - assets/visuals/master-map/07-增长层.png    # 位置归属: 增长层 / AARRR
  - assets/visuals/master-map/01-total.png     # 总览图中的 AARRR 位置
  - assets/_raw/qa/37-052-什么是品牌年案.md    # 年度规划效果评估语境
applicable_sub_agents:
  - annual_planning
  - brand_positioning
application_role:
  annual_planning: 主框架       # Sub-Agent ⑥ 必检字段 "AARRR 增长漏斗"
  brand_positioning: 可选引用   # 检查定位是否能支撑获取、激活、留存
---

# AARRR Funnel · 海盗增长漏斗

## 定义

AARRR 是用户增长漏斗模型,用于设计一套可循环裂变的用户增长体系。模型卡的表达很直接: 让用户看到就想来,来了就想留,留下就想付费,付费后还想邀请朋友。

五个阶段:

- **Acquisition 获取**: 用户如何找到我们?
- **Activation 激活**: 用户首次体验是否感到价值?
- **Retention 留存**: 用户会回来吗?
- **Revenue 收入**: 如何赚到更多钱?
- **Referral 推荐**: 用户是否愿意邀请朋友?

## 适用场景

- **年度规划必检**: Sub-Agent ⑥ 用 AARRR 跟踪增长链路
- **品牌动作效果评估**: 将传播、转化、复购和推荐接成闭环
- **私域/会员/内容增长**: 设计激活、留存和推荐机制
- **MVP 验证**: 看用户是否从认知走到真实付费和推荐
- **不适合**: 只追获客而忽略品牌心智；AARRR 是增长漏斗,需要和 4A/品牌资产一起看

## 使用步骤

### 第 1 步 · 定义每一层的目标用户行为

不要只写概念,要定义行为:

| 阶段 | 行为定义 |
|---|---|
| Acquisition | 看到内容、搜索品牌、点击落地页、进入店铺 |
| Activation | 领取小样、完成首次咨询、加入社群、首次使用 |
| Retention | 二次访问、复购、持续打开内容或社群 |
| Revenue | 首购、复购、客单提升、订阅/会员 |
| Referral | 分享、晒单、邀请、UGC、推荐码 |

### 第 2 步 · 设置每层指标

每层 1-3 个核心指标即可。指标要能被采集,否则无法复盘。

### 第 3 步 · 找漏斗断点

看哪一层转化掉得最多:
- 有曝光没激活: 内容吸引但价值不清
- 有首购没留存: 产品体验或复购机制不足
- 有复购没推荐: 缺少分享理由或社交货币

### 第 4 步 · 设计增长动作

每层对应动作:
- Acquisition: 内容、SEO、达人、PR、广告
- Activation: 试用、首单、引导、场景化教程
- Retention: 私域、会员、周期提醒、内容栏目
- Revenue: 套装、订阅、升级、交叉销售
- Referral: UGC、推荐奖励、社交分享素材

### 第 5 步 · 建立闭环复盘

AARRR 的关键是循环。推荐带来新获取,老客内容带来新激活,复购数据反向指导产品和内容。

## 输入输出示例

### 示例 1 · 植愈坊 AARRR (247 书贯穿教学案例)

> **案例可追溯报告**: 植愈坊是 Seven 247 书全书贯穿的**教学性虚拟案例** (非真实商业体)。具体出处行号待 Codex 后续按 P0-4 模板填充, 当前仅标注教学属性。**禁止包装成"真实品牌成功案例"**。

| 阶段 | 指标 | 动作 |
|---|---|---|
| Acquisition | 小红书曝光、搜索点击、店铺访问 | 疗愈洗澡内容、敏感肌科普、KOC 种草 |
| Activation | 小样领取率、首单转化率 | 3 款小样组合、肤质/情绪场景推荐 |
| Retention | 90 天复购率、私域活跃 | 节气限定、疗愈日记、使用提醒 |
| Revenue | 客单价、礼盒占比 | 礼盒、套装、会员复购权益 |
| Referral | 晒单率、推荐率、UGC 数 | 礼盒故事卡、用户疗愈故事征集 |

**关键洞察**: 植愈坊不能只看小红书曝光,如果小样激活和复购不成立,品牌声量就不会变成生意闭环。

### 示例 2 · SmallRig AARRR

> **案例可追溯报告**: ⚠️ **待人工校对** — 本示例的 SmallRig 内容需逐字与 `assets/_raw/cases/标杆案例/smallrig/*.md` 真实页对照。如案例 PDF 中无对应内容, 必须按 P0-6 4 层 Fallback 改用 Tier 2 经典案例或 Tier 3 抽象示例, 禁止 LLM 编造 SmallRig 案例。

| 阶段 | 指标 | 动作 |
|---|---|---|
| Acquisition | 新机适配内容触达、搜索、官网访问 | 装机视频、兼容表、创作者测评 |
| Activation | 首件配件购买、教程观看 | 新机套装、工作流指南 |
| Retention | 跨品类复购、账号注册、邮件打开 | 模块化升级路径、项目清单 |
| Revenue | 套装客单价、复购频次 | 场景套装、专业工作室方案 |
| Referral | 创作者案例、UGC、推荐链接 | 共创计划、项目展示 |

**关键洞察**: SmallRig 的增长闭环来自"首件适配 → 工作流扩展 → 创作者分享",而不是单次配件销售。

## 常见误用

1. **只做获客**: Acquisition 很热闹,Retention 和 Revenue 断掉 → 增长不可持续
2. **阶段定义不清**: 激活到底是注册、下单还是使用? 团队口径不一
3. **指标太多**: 每层十几个指标 → 无法聚焦
4. **把 Referral 写成口号**: 没有分享理由和机制 → 用户不会自然推荐
5. **忽略品牌信任**: 没有 RTB 和体验,激活与留存会很弱
6. **不接营销日历**: 漏斗动作没有时间安排 → 执行落空
7. **不做闭环**: 推荐和留存数据不回流到内容/产品 → 模型失效

## 关联概念

- **Marketing-Calendar** → `concepts-golden/marketing-calendar.md` (AARRR 动作需要日历落地,强配对)
- **4P-Rhythm** → `concepts-golden/4p-rhythm.md` (增长动作分布在 4P 节奏中,强配对)
- **4A-Funnel** → `concepts-golden/4a-funnel.md` (品牌漏斗与增长漏斗互补,同层)
- **OKR** → `concepts-golden/okr.md` (AARRR 指标可成为 KR,上游)
- **PDCA** → `concepts-golden/pdca.md` (AARRR 需要循环复盘,下游)
- **North-Star-Metric** → `concepts-golden/north-star-metric.md` (AARRR 围绕北极星指标组织,同层)
- **LTV-CAC** → `concepts-golden/ltv-cac.md` (收入与获客效率评估,下游)

## 多源对照参考 (Skill 内部, 用户不可见)

| 维度 | 取自 | 说明 |
|---|---|---|
| **定义** | 132 模型卡 aarrr (P3) | 五阶段和"看到就想来..."表达来自模型卡 |
| **增长层位置** | master-map 07 (P2) | AARRR 位于增长层 |
| **年度评估语境** | QA 052 品牌年案 (P2) | 年度规划需要效果评估 |
| **步骤结构** | Claude 综合 + AARRR 经典实践 (P3) | 行为定义、指标、断点、动作、闭环 |
| **示例 植愈坊** | 247 案例 + Claude 综合 (P1) | 从内容种草到小样、复购、推荐闭环 |
| **示例 SmallRig** | SmallRig 案例 + Claude 综合 (P2) | 从新机适配到工作流扩展和共创分享 |
| **常见误用** | Claude 综合 | 防止只获客和指标过载 |
| **关联概念** | Claude 综合 + spec §4.8 | 与年度日历、4P 节奏、OKR 和 PDCA 联动 |
