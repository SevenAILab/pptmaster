# CONCEPT-TEMPLATE · 黄金版本量产模板

> **用途**: 给 Task 20 (batch 量产剩余 55 个概念) 使用, 保证全部 60 个黄金版本格式统一、质量可控
> **基于**: 5 个核心黄金版本 (swot / stp / business-model-canvas / brand-house / jtbd) 提炼
> **协作模式**: Codex 拿这份模板 + concepts-candidates.json 的 occurrences → 量产 → Claude 抽查终审

---

## 1. 文件路径与命名

- 路径: `assets/_compiled/concepts-golden/{slug}.md`
- slug 规则: 全小写 + 连字符, 与 `scripts/concept-dictionary.json` 的 name 字段对应 (Brand-House → `brand-house.md`)

## 2. Frontmatter 标准 (YAML)

```yaml
---
name: <概念名,与 concept-dictionary.json name 字段一致>
aliases:
  - <中文别名 1>
  - <英文别名 1>
  - <其他常见叫法>
category: model | methodology | term | sop
primary_source: <最权威单一来源的相对路径>
secondary_sources:
  - <补充来源 1 相对路径>  # 说明取了什么 (用 # 注释)
  - <补充来源 2 相对路径>
  - <视觉位置归属: assets/visuals/master-map/{X}-{layer}.png>  # 必含,如果有
applicable_sub_agents:
  - <agent_id 1>     # consumer_insight | industry_analysis | competitor_analysis | brand_positioning | brand_building | annual_planning
  - <agent_id 2>
application_role:
  <agent_id_1>: <主框架 | 辅助工具 | 可选引用>     # 必填,与 concept-application-matrix.json 的 role 字段联动
  <agent_id_2>: <主框架 | 辅助工具 | 可选引用>
---
```

### 关键约束:

- **`name`** 必须与 `concept-dictionary.json` 完全一致 (大小写敏感)
- **`aliases`** 至少 3 个 (中文 + 英文 + 常见缩写), 越多越好以兜底矩阵注入
- **`primary_source`** 只能选 1 个最权威的 (不能选多个)
- **`secondary_sources`** 必须列 2-4 个, 每个用 `# 注释` 说明从该源取了什么
- **`applicable_sub_agents`** 必须真实, 不要为了"看着覆盖广"硬塞
- **`application_role`** 三档:
  - `主框架`: 这个 Sub-Agent 跑不通该概念 → 进 must_load
  - `辅助工具`: 增强但非必需 → 进 recommended
  - `可选引用`: 偶尔用得到 → 进 optional

## 3. 正文标准 8 段结构

每个黄金版本必须包含以下 8 个 H2 标题段, **顺序不可改**:

```markdown
# {概念中文名} · {英文名} (如果有)

## 定义
## 适用场景
## 使用步骤
## 输入输出示例
## 常见误用
## 关联概念
## 多源对照参考 (Skill 内部, 用户不可见)
```

### 3.1 # 标题段

格式: `# {中文名} · {英文名}` (如 SWOT 只有英文则用 `# SWOT 分析`)

### 3.2 ## 定义 (200-400 字)

**必含**:
- 一句话定义 (≤ 50 字)
- 理论来源 + 提出者 + 提出年份 (如能查到)
- 关键术语展开 (e.g. SWOT = Strengths/Weaknesses/Opportunities/Threats)

**风格**:
- 不啰嗦, 不堆叠学术语言
- 优先取 247 书或摘要的口语化定义, 模型卡的学术定义作对照
- 如果概念有"第一性原理"或"经典隐喻" (如 JTBD 的"更快的马"), 必须放在定义段后面

### 3.3 ## 适用场景 (3-6 个 bullet)

每个 bullet 一句话, 格式:
- **场景类型**: 一句话描述这个场景下如何用该概念

**必含**:
- 至少 1 个 Sub-Agent ④/⑤ 必检字段绑定 (如适用)
- 至少 1 个"不适合"场景 (反向定义边界)

### 3.4 ## 使用步骤 (3-7 个步骤)

**结构**: 每个步骤用 `### 第 N 步 · {步骤名}` 形式

每步必含:
- 具体可执行动作 (不是"思考一下"这种虚词)
- 输出标准 (做完这步应该产出什么)
- 关键约束 (避免常见错误)
- 优先取 247 书的实操步骤 (247 书几乎每章都给 "AI 实操步骤")

如果有需要,加表格 / 公式 / 模板句:
- 表格用 `| 列 | 列 |` 标准 markdown 格式
- 公式/模板句用代码块 \```...\```

### 3.5 ## 输入输出示例 (2-3 个示例)

**必含 ≥ 2 个示例, 优先级**:
1. **植愈坊** (247 书贯穿案例, 必含至少 1 个) — 247 书完整推演,质量最高
2. **SmallRig** (有标杆案例 PDF 可用时, 强烈推荐)
3. **公开知名品牌** (小米/苹果/Nespresso/Dropbox/Oatly 等, 247 书各章有不同案例)
4. **反例** (像 JTBD 共享单车头盔 / BMC 苹果 Touch Bar — 说明误用后果)

格式:
```markdown
### 示例 1 · {案例名} ({案例描述})

> **案例可追溯报告**: {案例性质 — 真实公知品牌 / 教学性虚拟案例 / 真实公知反例}。本示例 {具体内容范围} **完全来自** `{真实 _raw 文件路径}` {行号} 原文 ({Seven/作者在该章节给出的背景说明}), 未做任何 LLM 改写。{如果有 Claude 综合的部分, 必须明确标注哪些是 Claude 综合 + 综合的依据}。

{背景 1-2 句}

{结构化输出 — 代码块或表格}

**关键洞察**: {1-2 句总结}
```

---

## ⚠️ §3.5.X **P0 红线** — 案例真实性强约束 (2026-05-26 增补)

> **背景**: 第一版黄金版本生成时, 出现了一次严重的"SmallRig 案例编造"事件 (Brand-House 示例 2 与 page-124 真实内容 0% 重合)。为防再次发生, 量产剩余 55 个时必须严格遵守以下 P0 红线。

### P0-1 · 真实品牌案例必须能在 _raw/ 找到原文

写真实品牌案例 (如小米/Nespresso/Dropbox/Oatly/SmallRig 等) 时:
- **必须先 Read 真实出处文件** (不能只看 candidates.json 的 excerpt 200-300 字片段)
- **逐字核对**生成的示例内容与原文是否一致
- 在"案例可追溯报告"里**明确标明行号** (e.g. `L362-376`)
- 如果 _raw/ 找不到该品牌的原文, **禁止用 LLM general knowledge 编造该品牌的案例**
- **替代方案**: 用 247 书已有的其他真实案例 (小米/Oatly/Nespresso/Dropbox 等 247 各章都有), 或者用植愈坊 (但标注"教学性虚拟案例")

### P0-2 · SmallRig 案例特别规则 (因为有标杆案例 PDF, 编造立即穿帮)

SmallRig 是 Phase 1 唯一的标杆真实客户案例, 有 125 页拆解原稿在 `_raw/cases/标杆案例/smallrig/`。**写 SmallRig 示例必须遵守**:

1. **内容只能从 `_raw/cases/标杆案例/smallrig/*.md` 取**, **禁止从** `inputs/smallrig/summary.md` (Seven 写的客户档案) 或 LLM 对 SmallRig 的 general knowledge 推演
2. 写之前必须 `grep` 找 SmallRig 案例中与该概念相关的所有页面, 然后 Read 全文 (不是只看 excerpt)
3. **如果该概念在 SmallRig 案例中没有对应内容, 直接不用 SmallRig 示例**, 改用其他真实公知品牌或植愈坊
4. SmallRig 示例的"案例可追溯报告"必须标明具体页码 (e.g. `page-124.md` 是 SmallRig 品牌屋, `page-079.md` 是定位主张)
5. **示范案例** (brand-house.md 示例 2 已修复): 100% 还原 page-124 9 层信息屋 + 映射到通用 5 层 + 提炼"学习要点", 不改写任何字段值

### P0-3 · 植愈坊必须标"教学性虚拟案例"

植愈坊是 Seven 247 书贯穿的教学性虚拟案例, **不是真实成功品牌**。所有植愈坊示例必须:
- 在标题后标注 "(247 书贯穿教学案例)" 或 "(247 书 §X.X 推演)"
- 在"案例可追溯报告"开头写 "植愈坊是 Seven 247 书全书贯穿的**教学性虚拟案例** (非真实商业体)"
- **禁止包装成"植愈坊成功上市"/"植愈坊年销千万"等虚构数据**
- 植愈坊适合做**方法论展示样例** (展示"这个概念按 247 书的方法应该怎么用"), 不适合做"真实成功案例佐证"

### P0-4 · 每个示例必须有"案例可追溯报告" blockquote

格式 (强制):

```markdown
### 示例 N · {案例名} ({案例性质})

> **案例可追溯报告**: {案例性质}。本示例 {内容范围} **完全来自** `{真实路径}` {行号} 原文 ({背景描述}), 未做任何 LLM 改写。{Claude 综合的部分必须明确标注 — e.g. "X 是 Claude 基于该原文做的框架化拆解, 不是原文用词"}。

{示例正文}
```

**3 种典型可追溯报告模板**:

**模板 A · 真实公知品牌 (内容完全来自 247 书)**:
> 真实公知品牌。本示例 4 象限内容 **完全来自** `assets/_raw/books/0to1-brand/ch05-self-swot.md` L362-376 原文 (Seven 在 247 书 §5.3 给出的小米 SWOT 经典案例), 未做任何 LLM 改写。

**模板 B · 教学性虚拟案例 (植愈坊)**:
> 植愈坊是 Seven 247 书全书贯穿的**教学性虚拟案例** (非真实商业体)。本示例 SWOT 4 象限内容 **完全来自** `assets/_raw/books/0to1-brand/ch05-self-swot.md` L411-470 原文 (Seven 在 §5.3 完整给出的"植愈坊 SWOT 分析表示例")。**禁止包装成"真实品牌成功案例"**。

**模板 C · 部分原文 + Claude 综合推演**:
> 真实公知品牌。本示例核心叙述 ("xxx") **完全来自** `<file>` L<XX> 原文 (背景)。**框架化拆解** (如 BMC 9 模块映射 / JTBD 结构化) 是 Claude 基于该原文做的框架化归类, 不是原文用词。**禁止包装成"原文已有的 9 模块/8 步骤拆解"**。

### P0-5 · 量产前 self-check 清单

Codex 在 §3.D Step D 自检 (生成完每个黄金版本后) 必须额外检查:

- [ ] 每个示例都有"案例可追溯报告" blockquote
- [ ] 报告里的文件路径真的存在 (用 `ls` 验证)
- [ ] 报告里的行号 (如有) 真的对应原文 (用 `grep -n` 验证关键短语)
- [ ] 真实品牌示例的核心叙述与原文逐字对照 (不允许"近似"或"reframing")
- [ ] 植愈坊示例已标"教学性虚拟案例"
- [ ] SmallRig 示例只来自 `_raw/cases/标杆案例/smallrig/*.md`

任意一项不通过 → 立刻 `❓ Need Seven decision`, 不要往下走

### 3.6 ## 常见误用 (5-9 条)

每条编号 + 一句话标题 + 一句话解释 + (可选) → 后果

格式:
```
1. **{误用名}**: {具体描述} → {导致的失败模式}
```

**风格**:
- 直接说"这样做错了", 不绕弯子
- 优先反映 Seven 247 书强调的"小结" + 摘要的"局限性"
- 每个概念至少 5 条, 最多 9 条

### 3.7 ## 关联概念 (5-9 个)

格式:
```
- **{概念名}** → `concepts-golden/{slug}.md` ({这个关联的本质是什么}, {强配对 | 上游 | 下游 | 同层})
```

**关联类型**:
- 强配对: 必须一起用 (如 BMC ↔ Value-Prop-Canvas)
- 上游: 该概念的输入依赖 (如 STP 的上游是 SWOT)
- 下游: 该概念的输出去向 (如 STP 的下游是 Brand-Positioning-Triangle)
- 同层: 跨 Sub-Agent 的姊妹工具 (如 Brand-House ↔ Product-House)

**约束**: 双向链接, 即如果 A 关联 B, 那么 B 的黄金版本里也应关联 A

### 3.8 ## 多源对照参考 (Skill 内部, 用户不可见)

格式必须是表格 (markdown):

```markdown
| 维度 | 取自 | 说明 |
|---|---|---|
| **定义** | {来源} (P1/P2/P3/P4) | 说明取了什么 |
| **适用场景** | {来源} | 说明 |
| **第 N 步** | {来源} | 说明 |
| **示例 X** | {来源} | 说明 |
| **常见误用 X-Y** | {来源} | 说明 |
| **关联概念** | Claude 综合 + spec §4.X | 说明 |
```

**优先级编码** (在每个来源后括号标 P1-P4):
- **P1**: Seven 原创深度版本 (247 页书相关章节)
- **P2**: 全景图位置定义 (Seven GPT 系统化输出)
- **P3**: 132 模型库 / 经典学术定义
- **P4**: 14 篇外部方法论文章 (作为补充视角)

**作用**: 让 Seven / Claude 后续 review 时能快速看到"这个段落的依据是什么", 便于审计和改进

---

### P0-6 · **4 层 Fallback 案例策略** — 60 个概念不应硬绑两个案例

**背景**: 60 个概念里, 只有约 30% (体系核心如 SWOT/STP/BMC) 在 Seven 247 书 + SmallRig 案例里有真实素材。如果对所有概念都硬塞 SmallRig + 植愈坊双案例, 必然导致编造。**正确做法是按概念"案例素材丰富度"分 4 层 fallback**。

#### Tier 1 · Seven 体系内真实案例 (最优, 用于 A 层体系核心概念)

- 来源: Seven 247 书原文真实案例 (小米/Nespresso/Dropbox/Oatly/西南航空/老干妈/Lululemon/特斯拉/GoPro/Dyson 等) + SmallRig 案例 PDF + 8 类沉淀 + 案例 PPTX 拆解
- 约束: 必须能在 `_raw/` grep 找到原文, **逐字核对** (不能改写, 不能近似)
- 报告模板: "真实公知品牌。本示例 X **完全来自** `<path>` L<NN> 原文 (背景说明), 未做任何 LLM 改写。"

#### Tier 2 · 行业公认经典案例 (次优, 用于 B/C/D 层通用模型 / 跨域工具 / 元方法)

- 来源: 业内教科书 + 公开行业案例 (业内人尽皆知, **不需要 Seven 写过**)
- 🔴 **核心约束**: 只用**战略框架层内容**, 描述"该品牌**用了**这个模型 / 这个模型**说明了**什么道理"
- 🔴 **绝对禁止**:
  - ❌ 编造**具体数字** ("销售额 +30%" / "用户增长 10X")
  - ❌ 编造**具体口号** ("Google 的 OKR 是 XX")
  - ❌ 编造**具体事件/季度** ("字节 2023 Q3 OKR 评分 0.85")
  - ❌ 编造**内部数据** (任何非公开数据)
- ✅ 允许: 公开可验证的框架描述 ("Google/字节都公开介绍用 OKR 管理目标, 三层穿透 + 季度评分 0-1")
- 报告模板: "行业公认经典案例 (非 Seven 素材也非案例库, 但 X 在 Y 的应用是公开教科书级事实)。本示例**只描述框架**, 不引用任何具体数字/口号/季度内容/业绩数据。"

#### Tier 3 · 抽象示例 (兜底, 用于极小众概念)

- 来源: 用 `[假设 X 品牌 / 假设 SaaS 产品 Y / 假设消费品 Z]` 占位符
- 适用: Tier 1+2 都找不到合适案例 (主要是 MAP-STRUCTURE 新增的小众概念)
- 🔴 约束: 必须明确标"假设示例, 用于演示框架, 不代表真实品牌, 任何与真实品牌的相似性纯属巧合"
- 报告模板: "抽象演示案例 (非真实品牌, 用于演示 X 框架的应用)。本示例不应被引用为'真实案例佐证'。"

#### Tier 4 · 植愈坊 (教学性虚拟案例, 与 Tier 1 平行的"学习示范")

- 来源: Seven 247 书贯穿教学案例 (ch04/05/06/07/08/09/10 各章都有植愈坊推演)
- 适用: A/B 层概念 (与品牌策划体系紧密绑定)
- 🔴 约束:
  - 标题必标 "(247 书贯穿教学案例)" 或 "(247 书 §X.X 推演)"
  - 报告必标 "教学性虚拟案例 (非真实商业体)"
  - **禁止包装** "植愈坊年销千万 / 植愈坊估值 X 亿" 等虚构数据
- 适合做**方法论展示样例** (展示"按 247 书方法应该怎么用"), 不适合做"真实成功案例佐证"
- 注意: Tier 4 不是 Tier 3 后的备选, 是与 Tier 1 平行的"教学示范" — 与 Tier 1 真实案例搭配使用 (Tier 1 让用户信"有效", Tier 4 让用户学"怎么用")

#### Tier 2 经典案例库 (推荐, 不限于此)

| 概念 | 推荐 Tier 2 案例 | 仅描述框架层 |
|---|---|---|
| **AARRR-Funnel** | Dropbox 引荐增长 / Airbnb 早期口碑 | 只讲漏斗结构, 不编具体留存数据 |
| **OKR** | Google (Andy Grove → Intel → John Doerr → Google) / 字节跳动 (飞书 OKR 模块) | 只讲三层穿透+0-1 评分+解耦绩效, 不编具体 OKR 内容 |
| **PDCA** | 丰田生产体系 (戴明 → 丰田) | 教科书级源头, 只讲循环框架 |
| **5-Why-Essence** | 丰田生产线问题诊断 | 教科书级源头, 不编具体问题数据 |
| **MECE** | 麦肯锡咨询表达框架 | 框架描述, 不引用具体咨询案例 |
| **Pyramid-Principle** | 麦肯锡 SCQA 经典表达法 | 框架描述, Barbara Minto 著作 |
| **Maslow** | 苹果设计哲学 (自我实现层) / 奢侈品定位 (爱马仕/LV 满足高层级需求) | 只讲层级映射, 不编销售数据 |
| **Porter-5-Forces** | 中国新茶饮赛道 (喜茶 vs 奈雪 vs 蜜雪冰城) / 中国新能源车市场 | 讲五力关系, 不编市占率数据 |
| **PESTEL** | 中国电动车产业 (P 政策驱动) | 讲政策/经济/技术驱动, 不编具体补贴数字 |
| **BCG-Matrix** | 宝洁产品组合管理 (教科书) / 三星电子事业部组合 | 讲明星/金牛/问题/瘦狗四象限, 不编市场份额 |
| **Ansoff-Matrix** | 苹果从 iPhone 到 iPad/Apple Watch (产品开发 + 市场开发) | 讲四象限映射, 不编具体营收 |
| **Value-Chain** | 苹果供应链 (设计/品牌在美, 制造在中国/越南) | 讲价值链结构, 不编成本数据 |
| **Industry-Lifecycle** | 智能手机行业 (导入→成长→成熟→衰退) | 讲生命周期, 不编具体出货量 |
| **Aaker-Brand-Personality** | 可口可乐 (兴奋) / IBM (能力) / Dove (真诚) | 教科书经典对照, 不编市场调研 |
| **4P-Marketing-Mix** | 蜜雪冰城 (低价 4P 经典) | 讲 4P 协同, 不编具体毛利 |
| **STP** | (已用 247 书 Oatly + 植愈坊) | — |
| **IMC** | 可口可乐"分享一瓶可乐"整合营销 (教科书) | 讲多触点统一, 不编 KPI |
| **4A-Funnel / AIDA** | 宝洁经典广告教程 (Awareness→Interest→Desire→Action) | 教科书级源头 |
| **Communication-Theory-34** | 14 篇文章摘要 14 已有 34 个理论 | 直接引用 + 公开来源 |
| **MAP-STRUCTURE 新增 6 个** | Service-Blueprint/HEART/KANO/OGSM/Growth-Flywheel/ICE/LTV-CAC | 多用 Tier 3 抽象示例 (互联网产品概念, 真案例少) |

#### 4 层 Fallback 决策树 (写示例时按此顺序问)

```
Q1: Seven 247 书 + SmallRig 案例里能 grep 找到该概念的真实应用吗?
   YES → Tier 1 + Tier 4 双例 (推荐 A 层概念)
   NO  → Q2

Q2: 行业内有公认教科书级经典案例吗 (业内人尽皆知不需 Seven 写过)?
   YES → Tier 2 + Tier 4 双例 (推荐 B/C/D 层概念) ← 只用框架层, 禁编数据
   NO  → Q3

Q3: 是极小众概念, Tier 1+2 都不合适?
   YES → Tier 3 抽象示例 + Tier 4 植愈坊 (MAP-STRUCTURE 新增概念兜底)

⛔ 任何 Tier 都禁止:
   - 编造真实公知品牌的具体数据/事件/口号
   - 用 LLM general knowledge 推演"某真实品牌应该是 XX 战略"
   - 把"假设示例"伪装成"真实成功案例"
```

---

## 4. 黄金版本生成的 Batch Workflow

Codex 量产 1 个新黄金版本时, 严格按以下顺序:

### Step A. 拉 batch context

```bash
node scripts/compile/build-golden.mjs <ConceptName>
```

输出 top 10 occurrences 对照表

### Step B. 评估资源完备性

- 占多少出处?
- primary_source 最权威的是哪个? (按优先级 247 书 > 全景图 > 模型卡 > 摘要)
- secondary_sources 有几个? 它们各自贡献什么独特视角?
- 如果 occurrences < 3 且没有 247 书的章节支撑 → ⚠️ STOP, 打印 `❓ Need Seven decision: {concept} 资源不足` 等 Seven 拍板

### Step C. 草稿生成 (按本模板 8 段)

- frontmatter 严格按 §2
- 8 段正文严格按 §3
- 示例至少 2 个, 优先植愈坊 + SmallRig

### Step D. 自检 (Codex 完成后跑)

- [ ] frontmatter 全部字段填写完整
- [ ] slug 与 concept-dictionary.json 一致
- [ ] 8 段标题齐全, 顺序对
- [ ] 示例 ≥ 2 个
- [ ] 常见误用 ≥ 5 条
- [ ] 关联概念 ≥ 5 个, 全部带 `concepts-golden/{slug}.md` 路径
- [ ] 多源对照参考表完整, 每段都有 P1-P4 编码

### Step E. Claude 抽查 (每 5-10 个 batch 后 review 1 次)

Codex 完成一批 5-10 个 batch 后, 通知 Seven 让 Claude 抽查:
- 抽 3-5 个概念评 5 维度 (定义/步骤/示例/融合/关联) 1-5 分
- 平均 ≥ 4/5 通过, 继续下一批
- < 4/5 退回 Codex 修改

---

## 5. 优先级建议 (剩余 55 个概念量产顺序 + Tier 案例分配 v2)

> **Tier 标记 (v2 新增, 与 P0-6 对应)**:
> - **T1+T4**: A 层体系核心 → Tier 1 真实案例 + Tier 4 植愈坊 (双例)
> - **T2+T4**: B 层行业通用 → Tier 2 经典案例 + Tier 4 植愈坊 (双例)
> - **T2+T3**: C 层跨域工具 → Tier 2 经典 + Tier 3 抽象兜底 (不强求植愈坊)
> - **T2**: D 层元方法 → Tier 2 教科书源头
> - **T3+T4**: MAP-STRUCTURE 新增 → Tier 3 抽象 + Tier 4 植愈坊 (案例稀缺时)


按 spec §4.3-4.8 各 Sub-Agent 的 must_load 优先, 然后 recommended, 最后 optional:

### Wave 1 (15 个 must_load - 必须先做完, 是 Sub-Agent prompt 注入的硬依赖)

- consumer_insight: `persona-5w2h.md` **(T1+T4)** / `user-journey.md` **(T1+T4)**
- industry_analysis: `pestel.md` **(T2+T4, 用中国电动车产业)** / `industry-lifecycle.md` **(T2, 用智能手机)** / `porter-5-forces.md` **(T2, 用新茶饮)**
- competitor_analysis: `competitor-matrix.md` **(T1+T4)** / `perceptual-map.md` **(T1+T4)**
- brand_positioning: `brand-positioning-triangle.md` **(T1+T4)** / `value-prop-canvas.md` **(T1+T4)** (其余 STP/BMC 已完成)
- brand_building: `product-house.md` **(T1+T4)** / `slogan-7-principles.md` **(T2, 用经典广告语)** / `visual-hammer-verbal-nail.md` **(T2, 用脑白金/海飞丝)**
- annual_planning: `okr.md` **(T2, 用 Google/字节)** / `marketing-calendar.md` **(T2+T3, 节日营销)** / `4p-rhythm.md` **(T3+T4)** / `aarrr-funnel.md` **(T2, 用 Dropbox)**

### Wave 2 (25 个 recommended)

包括: Aaker-Brand-Personality / RTB / VMV / 5-Why-Essence / TOWS / Value-Chain / S-Curve / Maslow / 4A-Funnel / Pain-Gain-Map / Communication-Theory-34 / IMC / PDCA / 等

### Wave 3 (15 个 optional / MAP-STRUCTURE 新增)

包括: BCG-Matrix / Ansoff-Matrix / Service-Blueprint / HEART / KANO / OGSM / North-Star-Metric / Brand-Architecture / GTM / Brand-Asset-Management / KOL-KOC / Crisis-Management / Growth-Flywheel / ICE / LTV-CAC

### MAP-STRUCTURE 0 命中概念特别提示:

对 occurrences = 0 的 MAP-STRUCTURE 新增候选 (如 OGSM / Growth-Flywheel / Service-Blueprint), 必须:
- primary_source 用全景图相应层 (assets/visuals/master-map/0X-{layer}.png)
- secondary_sources 配合 web search 拉外部权威定义 (用 scripts/web-search.mjs)
- 在"多源对照参考"里明确标注 "MAP-STRUCTURE 新增, 缺 P1 Seven 原创支撑, primary 取 P2 全景图位置 + 外部权威补充"
- 标记 Sub-Agent ① 必读, 但不能进 must_load (因证据不足), 只能进 recommended 或 optional

---

## 6. 验收标准

Task 20 batch 量产完成的 Definition of Done:

- [ ] `concepts-golden/` 至少 60 个 .md 文件 (含已完成的 5 个核心)
- [ ] 全部文件通过 §3.D 自检清单
- [ ] Wave 1 (15 个 must_load) 100% 完成且 Seven 终审过 5-10 个
- [ ] Wave 2 (25 个 recommended) ≥ 90% 完成
- [ ] Wave 3 (15 个 optional) ≥ 80% 完成
- [ ] `concepts-golden/INDEX.md` 自动生成 (脚本)
- [ ] `concept-application-matrix.json` 矩阵覆盖率 ≥ 90% (按 spec §3.5.4)
- [ ] Claude 抽查至少 3 轮, 整体质量稳定在 ≥ 4/5 分

完成后进 Checkpoint #3 (Task 21 矩阵生成完成) review。

---

## 7. 已完成的 5 个核心黄金版本 (作为风格基准)

| 序 | 概念 | 路径 | 多源融合度 | 备注 |
|---|---|---|---|---|
| 1 | SWOT | `concepts-golden/swot.md` | 4 源 (247书ch05 + 132模型卡 + 摘要07 + 全景图02) | TOWS 策略矩阵详写, 含小米/植愈坊双案例 |
| 2 | STP | `concepts-golden/stp.md` | 3 源 (247书ch06 + 132模型卡 + 全景图02/03) | 含品类战略 + 植愈坊 5 维度评分 + Oatly 赛道重定义 |
| 3 | Business-Model-Canvas | `concepts-golden/business-model-canvas.md` | 4 源 (247书ch07 + 132模型卡 + 摘要08 + 全景图02) | 9 模块详解 + 流动效率视角 + Nespresso/植愈坊/Touch Bar 三案例 |
| 4 | Brand-House | `concepts-golden/brand-house.md` | 5 源 (摘要13 + 案例PPTX slide-079 + smallrig p124 + 框架PDF + 摘要12) | 5 层金字塔, 含植愈坊 + SmallRig MI 升级双案例 |
| 5 | JTBD | `concepts-golden/jtbd.md` | 4 源 (247书ch04 + 247书ch08 + 摘要05 + 摘要06) | "更快的马" 隐喻 + 真需求/伪需求三维度 + Dropbox/植愈坊/共享头盔三例 |

后续 55 个量产请以这 5 个为风格基准, 不要降低质量。

---

**模板版本**: v1.0 (2026-05-26 by Claude)
**Owner**: Seven (审定) + Claude (批量 review)
**下一步**: Codex 拿这份模板按 §5 Wave 1 顺序量产 15 个 must_load 黄金版本, 完成后通知 Claude 抽查
