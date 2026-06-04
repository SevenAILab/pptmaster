---
name: Brand-Positioning-Triangle
aliases:
  - 品牌定位三角
  - 定位三角
  - 奥美品牌定位三角
  - Brand Positioning Triangle
  - TA-RTB-Benefit
category: model
primary_source: assets/_raw/models/brand-positioning-triangle-ogilvy.md
secondary_sources:
  - assets/_raw/models/brand-positioning-triangle-ogilvy-2.md  # 奥美定位三角补充条目
  - assets/_raw/books/0to1-brand/ch06-vmv-positioning.md       # STP 与定位陈述语境
  - assets/visuals/master-map/03-品牌层.png                    # 位置归属: 品牌层 / 定位输出
applicable_sub_agents:
  - brand_positioning
  - brand_building
application_role:
  brand_positioning: 主框架       # Sub-Agent ④ 必检字段 "品牌定位主张"
  brand_building: 辅助工具        # 作为 Brand-House 第 1 层战略的输入
---

# Brand Positioning Triangle · 品牌定位三角

## 定义

品牌定位三角是奥美常用的定位表达模型,围绕三个关键点构建品牌定位:

- **TA (Target Audience)**: 为了什么样的人
- **Benefit / Positioning**: 提供什么样的核心好处,占据什么心智位置
- **RTB (Reason to Believe)**: 凭什么相信你能做到

模型卡中的简化句式是: "我 (xx 品牌) 是 ________, 为了什么样的人, 提供什么样的好处。" 在 PPTAgent 中,它与 STP 的 P 步骤、RTB 和价值主张画布一起,把复杂分析压缩成可被客户复述的一句话。

## 适用场景

- **品牌定位案核心输出**: Sub-Agent ④ 必须形成一条清晰定位主张
- **STP 后的收束工具**: 将 target、category frame、key benefit、RTB 组织成一句话
- **品牌屋战略层输入**: Brand-House 第 1 层需要定位三角作为地基
- **口号与传播 brief**: 口号可以更短,但不能背离定位三角
- **不适合**: 在没有用户、竞品和价值证据前直接套句式；定位三角不是创意文案模板

## 使用步骤

### 第 1 步 · 锁定 TA

承接 STP 的 Targeting 和 Persona-5W2H,明确服务谁、不服务谁。TA 不能写成"所有追求品质生活的人",要足够具体。

输出标准: 核心人群 + 场景 + 关键任务。例如: "注重情绪疗愈与生活仪式感的都市年轻女性"。

### 第 2 步 · 定义 Category Frame

用户把你放在哪个品类里理解? 品类 frame 决定比较对象。植愈坊可以是"手工皂",也可以试图开创"情绪疗愈洁肤"子品类。

输出标准: 品类/子品类 + 选择理由 + 主要替代品。

### 第 3 步 · 提炼 Key Benefit

从 Pain-Gain、JTBD、Value-Prop-Canvas 中选一个最强利益点。它必须对 TA 有价值、与竞品不同、品牌能兑现。

不要把 benefit 写成品牌想说的口号,要写用户得到的结果。

### 第 4 步 · 填写 RTB

RTB 是让定位可信的证据,包括资质、技术、配方、专利、案例、用户证言、数据、创始人专业背景等。

输出标准: 2-4 个最硬 RTB,每个都能支撑 key benefit。

### 第 5 步 · 写成定位陈述句

推荐模板:

```text
对 [TA],
我们是 [category frame] 中,
唯一/更适合 [key benefit] 的品牌,
因为 [RTB]。
```

### 第 6 步 · 压力测试

用三问检查:
- 用户会在意吗?
- 竞品是否也能轻易说同样的话?
- RTB 是否足以让人相信?

## 输入输出示例

### 示例 1 · 植愈坊定位三角 (247 书贯穿教学案例)

> **案例可追溯报告**: 植愈坊是 Seven 247 书全书贯穿的**教学性虚拟案例** (非真实商业体)。具体出处行号待 Codex 后续按 P0-4 模板填充, 当前仅标注教学属性。**禁止包装成"真实品牌成功案例"**。

| 组件 | 内容 |
|---|---|
| TA | 都市年轻女性,25-35 岁,注重情绪疗愈与生活仪式感 |
| Category Frame | 手工皂 / 情绪疗愈洁肤 |
| Key Benefit | 温和清洁的同时,把洗澡变成 15 分钟自我疗愈 |
| RTB | 创始人芳疗师专业 + 天然精油配方 + 敏感肌测试 + 设计师包装 |

定位陈述:

```text
对注重情绪疗愈与生活仪式感的都市年轻女性,
植愈坊是手工皂品类中,
更能把温和清洁变成自我疗愈仪式的品牌,
因为它拥有芳疗师专业配方、敏感肌安全证据和设计师级包装体验。
```

**关键洞察**: "天然手工皂"只是品类入口,"自我疗愈仪式"才是心智差异。

### 示例 2 · SmallRig 定位三角

> **案例可追溯报告**: ⚠️ **待人工校对** — 本示例的 SmallRig 内容需逐字与 `assets/_raw/cases/标杆案例/smallrig/*.md` 真实页对照。如案例 PDF 中无对应内容, 必须按 P0-6 4 层 Fallback 改用 Tier 2 经典案例或 Tier 3 抽象示例, 禁止 LLM 编造 SmallRig 案例。

| 组件 | 内容 |
|---|---|
| TA | 全球摄影/视频创作者与小型工作室 |
| Category Frame | 创作者相机配件 / 模块化创作工具生态 |
| Key Benefit | 让不同拍摄任务快速搭建可靠工作流 |
| RTB | 全球创作者共创、快速机型适配、模块化产品线、专利与全球渠道 |

定位陈述:

```text
对全球影像创作者,
SmallRig 是创作工具生态中,
更能让复杂拍摄工作流快速可靠落地的品牌,
因为它以创作者共创、模块化工程和全球适配能力持续构建工具基础设施。
```

**关键洞察**: SmallRig 的定位不应停留在"便宜好用的配件",而应升维为"创作者工作流基础设施"。

## 常见误用

1. **TA 太宽**: "年轻人""中产女性"没有场景和任务 → 定位无法击中
2. **Benefit 写成产品功能**: "天然精油手工皂"是产品描述,不是用户利益
3. **没有 Category Frame**: 不说明用户把你放在哪类里比较 → 竞品边界模糊
4. **RTB 软弱**: 只有"我们很专业""品质好" → 用户没有相信理由
5. **一句话太长**: 所有卖点都塞进去 → 没有主张
6. **口号替代定位**: Slogan 可以感性,定位三角必须结构完整
7. **不做竞品压力测试**: 竞品也能说同样的话 → 定位没有独特性

## 关联概念

- **STP** → `concepts-golden/stp.md` (定位三角承接 STP 的 P 步骤,强配对)
- **RTB** → `concepts-golden/rtb.md` (三角中的相信理由,强配对)
- **Value-Prop-Canvas** → `concepts-golden/value-prop-canvas.md` (key benefit 的需求与供给匹配来源,上游)
- **Persona-5W2H** → `concepts-golden/persona-5w2h.md` (TA 的具象化输入,上游)
- **Perceptual-Map** → `concepts-golden/perceptual-map.md` (心智位置与空白判断,上游)
- **Brand-House** → `concepts-golden/brand-house.md` (定位三角进入品牌屋第 1 层,下游)
- **Slogan-7-Principles** → `concepts-golden/slogan-7-principles.md` (定位压缩为传播口号,下游)

## 多源对照参考 (Skill 内部, 用户不可见)

| 维度 | 取自 | 说明 |
|---|---|---|
| **定义** | 132 模型卡 brand-positioning-triangle-ogilvy (P3) | TA/RTB/定位和句式来自奥美模型卡 |
| **适用场景** | spec §4.6 brand_positioning (P2) | Sub-Agent ④ 必检定位主张 |
| **步骤 1-3** | STP 黄金版 + 247 书 ch06 (P1) | TA、品类战略与定位利益承接 STP |
| **第 4 步 RTB** | RTB 概念候选 + Brand-House 黄金版 | RTB 是定位可信的底座 |
| **示例 植愈坊** | 247 书 ch06/ch08 + Claude 综合 (P1) | 从植愈坊定位与价值主张推演 |
| **示例 SmallRig** | SmallRig 案例 + Claude 综合 (P2) | 从 MI 升级和创作者工具生态推演 |
| **常见误用** | Claude 综合 | 防止口号替代定位和 RTB 软弱 |
| **关联概念** | Claude 综合 + spec §4.6/§4.7 | 与 STP/VPC/RTB/Brand-House 联动 |
