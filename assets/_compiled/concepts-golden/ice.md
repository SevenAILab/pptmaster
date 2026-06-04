---
name: ICE
aliases:
  - ICE 优先级
  - ICE 模型
  - Impact Confidence Ease
  - 增长实验排序
  - 优先级评分模型
category: model
primary_source: assets/visuals/master-map/MAP-STRUCTURE.md
secondary_sources:
  - assets/_raw/frameworks/品牌年度规划方案.md # 年度规划聚焦和资源分配
  - assets/_raw/models/aarrr.md              # 增长实验可作用于 AARRR 节点
  - assets/_raw/models/pdca.md               # 计划-执行-复盘迭代
  - assets/visuals/master-map/07-增长层.png  # ICE 在增长层的位置来源
applicable_sub_agents:
  - annual_planning
  - brand_positioning
  - consumer_insight
application_role:
  annual_planning: 辅助工具       # 年度行动优先级和增长实验排序
  brand_positioning: 可选引用       # 多个定位动作取舍时辅助判断
  consumer_insight: 可选引用        # 洞察转行动时排序验证项目
---

# ICE 优先级模型 · ICE

## 定义

ICE 是一种优先级评分模型,用 Impact (影响力)、Confidence (信心)、Ease (易实施度) 三个维度评估行动、实验或项目的优先级。

本概念来自 MAP-STRUCTURE 07-增长层的 "ICE 优先级模型",属于全景图新增候选,缺少 247 书中的独立专章。本地年度规划材料反复强调资源有限、预算要聚焦、传播有主次,ICE 正好用于把一堆想做的事情排出先后顺序。

在 PPTAgent 中,ICE 不是战略判断本身,而是战略落地后的行动排序器: 当用户提出很多动作时,用 ICE 帮 Sub-Agent ⑥ 判断先做哪个、暂缓哪个、验证哪个。

## 适用场景

- **年度行动排序**: Sub-Agent ⑥ 对传播、渠道、内容、私域、活动项目排序
- **增长实验管理**: 选择先优化哪个漏斗/飞轮节点
- **定位落地取舍**: 多个落地动作资源冲突时辅助决策
- **洞察转验证**: Sub-Agent ① 将用户洞察转成小实验时排序
- **不适合**: 用 ICE 替代战略判断；如果目标错了,分数再高也没用

## 使用步骤

### 第 1 步 · 列出候选动作

把所有想做的项目拆成可执行动作,避免把 "做品牌升级" 这种大词直接打分。

输出标准: 候选动作清单。

### 第 2 步 · 定义评分口径

明确 1-10 分含义: Impact 看对目标的影响,Confidence 看证据把握,Ease 看资源/时间/难度。

输出标准: 评分规则表。

### 第 3 步 · 分别打分

对每个动作给出 I/C/E 分数和简短理由,必要时请团队分别评分再取平均。

输出标准: ICE 评分表。

### 第 4 步 · 计算优先级

常见算法是 (Impact × Confidence × Ease) 或三项平均,但必须保持同一项目内一致。

输出标准: 排序结果。

### 第 5 步 · 加入约束校验

检查预算、时间、团队能力、依赖关系、品牌风险,避免高分动作无法启动。

输出标准: 最终优先级 + 依赖/风险说明。

### 第 6 步 · 进入执行和复盘

把 Top 动作放入 PDCA 或增长实验节奏,验证后更新 Confidence。

输出标准: 实验计划和复盘记录。

## 输入输出示例

### 示例 1 · 植愈坊年度动作 ICE 排序 (247 书贯穿教学案例)

> **案例可追溯报告**: 植愈坊是 Seven 247 书全书贯穿的**教学性虚拟案例** (非真实商业体)。具体出处行号待 Codex 后续按 P0-4 模板填充, 当前仅标注教学属性。**禁止包装成"真实品牌成功案例"**。

背景: 植愈坊预算有限,需要从多个增长动作中选优先级。

| 候选动作 | Impact | Confidence | Ease | 结论 |
|---|---:|---:|---:|---|
| 敏感肌 FAQ + 试用问诊表 | 8 | 8 | 9 | 优先做,低成本提升信任 |
| 小红书 KOC 试用 30 人 | 8 | 7 | 7 | 第二优先,可验证真实口碑 |
| 线下快闪活动 | 7 | 4 | 3 | 暂缓,成本高且证据不足 |
| 全量包装升级 | 6 | 5 | 4 | 待定位和视觉稳定后再做 |

**关键洞察**: 植愈坊当前应优先做信任和反馈闭环,不要用大预算活动掩盖基础体验问题。

### 示例 2 · 假设 B2B SaaS 产品 X 的 ICE 实验池 (Tier 3 抽象示例)

> **案例可追溯报告**: 抽象演示案例 (非真实品牌, 用于演示 ICE 优先级排序框架). 任何与真实品牌的相似性纯属巧合。本示例不应被引用为"真实案例佐证"。

背景: 假设一家 B2B SaaS 产品 X (中小企业 CRM) 当季有 4 个候选增长动作需要排序:

| 候选动作 | Impact | Confidence | Ease | 结论 |
|---|---:|---:|---:|---|
| 注册流程从 5 步简化为 2 步 | 9 | 8 | 7 | 优先做, 降低首次摩擦 |
| 详情页加客户案例视频 | 7 | 8 | 8 | 优先做, 提升信任 |
| 在头部播客做广告投放 | 7 | 5 | 3 | 暂缓, 转化链不清 |
| 给免费用户加打卡奖励 | 6 | 6 | 5 | 跟进做, 验证后再扩 |

**关键洞察**: ICE 的核心价值是**高 Confidence + 高 Ease 的组合应优先于高 Impact 但低 Confidence 的实验**。ICE 不是"分数最高的就做", 而是"用同一把尺子, 让团队对齐讨论顺序"。

## 常见误用

1. **动作颗粒度太大**: 给 "做增长" 打分 → 分数无法指导执行
2. **评分没有证据**: 全靠拍脑袋 → Confidence 失去意义
3. **Ease 分数方向搞反**: 越难分越高 → 排序失真
4. **只看总分不看战略匹配**: 高分但不服务核心目标 → 资源被带偏
5. **忽略依赖关系**: 后置动作分高却缺前置条件 → 执行卡住
6. **一次打分永不更新**: 实验后不修正 Confidence → 无法学习
7. **把 ICE 当唯一决策**: 品牌风险、时机和组织能力没纳入 → 结果机械

## 关联概念

- **PDCA** → `concepts-golden/pdca.md` (ICE 排序后的动作进入执行复盘,强配对)
- **North-Star-Metric** → `concepts-golden/north-star-metric.md` (Impact 必须服务核心指标,强配对)
- **Growth-Flywheel** → `concepts-golden/growth-flywheel.md` (用于排序飞轮节点优化动作,上游)
- **AARRR** → `concepts-golden/aarrr.md` (增长实验可按漏斗节点排序,上游)
- **Budget-Allocation** → `concepts-golden/budget-allocation.md` (排序结果影响预算分配,下游)
- **Marketing-Calendar** → `concepts-golden/marketing-calendar.md` (高优先级动作进入日历,下游)
- **User-Journey** → `concepts-golden/user-journey.md` (洞察问题转行动后用 ICE 排序,上游)

## 多源对照参考 (Skill 内部, 用户不可见)

| 维度 | 取自 | 说明 |
|---|---|---|
| **定义** | MAP-STRUCTURE 07 增长层 (P2) | MAP-STRUCTURE 新增,缺 P1 Seven 原创专章 |
| **适用场景** | 年度规划资源聚焦 + 增长层全景图 (P2) | 行动、实验和资源排序 |
| **步骤 1-3** | ICE 通用定义 + Claude 综合 (P3) | 候选动作、评分口径和打分 |
| **步骤 4-6** | PDCA/年度规划逻辑 (P1/P2) | 排序、约束校验和复盘 |
| **示例 植愈坊** | 247 书植愈坊案例 + Claude 综合 (P1) | 小预算动作排序 |
| **示例 假设品牌 X (Tier 3)** | Claude 综合抽象案例 (非真实品牌) | 框架演示用, 不应被引用为真实案例佐证 |
| **常见误用** | Claude 综合 | 防止机械打分 |
| **关联概念** | Claude 综合 + MAP-STRUCTURE 增长层 | 与北极星、PDCA、预算和日历联动 |
