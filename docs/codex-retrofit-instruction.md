# Codex Retro-fix 指令 (Task 20 量产 29 文件的 case 校正)

> **背景**: Codex 在 CONCEPT-TEMPLATE.md 升级 (新增 P0-6 4 层 Fallback 策略) 之前就量产了 29 个概念黄金版本, 这些文件**普遍将所有概念硬绑 SmallRig + 植愈坊双案例**, 导致部分 B/C/D 层概念出现案例编造 / source 引用不准 / 缺案例可追溯报告等问题。
>
> 本指令让 Codex 按升级后的 TEMPLATE retro-fix 这 29 个文件 + 补全 INDEX。

---

## 必读

1. `assets/_compiled/CONCEPT-TEMPLATE.md` (357+ 行, 重点读 §3.5.X P0-1 至 P0-6 + §5 Wave 1 Tier 标记)
2. 已完成的 5 个核心黄金版本作为风格基准:
   - `assets/_compiled/concepts-golden/swot.md` (T1+T4 双例: 小米 + 植愈坊)
   - `assets/_compiled/concepts-golden/stp.md` (T1+T4: Oatly + 植愈坊)
   - `assets/_compiled/concepts-golden/business-model-canvas.md` (T1+T1+T2: Nespresso + 植愈坊 + Touch Bar 反例)
   - `assets/_compiled/concepts-golden/brand-house.md` (T4+T1: 植愈坊 + SmallRig page-124)
   - `assets/_compiled/concepts-golden/jtbd.md` (T1+T4+T2: Dropbox + 植愈坊 + 共享头盔反例)

---

## 29 个文件 retro-fix 分组

### A 组 · 8 个文件 — SmallRig 引用基本准确, 只需校精度 + 加可追溯报告

这些文件的 SmallRig 引用是从真实 page-NNN 取的, 但 source 行号不准或跨页拼接没标。**保留 SmallRig 示例, 只修引用精度 + 补可追溯报告**。

| 文件 | 操作 |
|---|---|
| `vmv.md` | SmallRig VMV 内容真实 (来自 page-124), 但 source 标了 page-109 (实际是其他品牌对照表)。改为 secondary_sources 标 `page-124.md` (Mission/Vision 真实出处), 加 T1 可追溯报告 |
| `rtb.md` | "全生态/全场景"内容真实 (来自 page-124 差异 RTB), 但 source 标了 page-073 (实际是 4 个候选 RTB)。改为 secondary_sources 同时引用 `page-073.md` (RTB 框架) + `page-124.md` (最终选用), 加 T1 可追溯报告 |
| `persona-5w2h.md` | SmallRig 画像基于 page-037 但加了 28-40 岁等细节。grep 找 page-014/page-024/page-035 等用户分析页, 列全 source pages, 加 T1 可追溯报告 |
| `value-prop-canvas.md` | "SmallRig 模块化创作工具生态..." 这段陈述句是改写的, **删掉这段定位陈述**, 改用 page-124 真实的"全球影像场景产品生态开创者", 加 T1 可追溯报告 |
| `aaker-brand-personality.md` | 检查 SmallRig 人格映射 (理性专业+工程美学+与创作者站一起), 这些是 page-124 真实调性吗? 如果不是, 改用 Tier 2 经典案例 (可口可乐兴奋/IBM 能力/Dove 真诚) + Tier 4 植愈坊 |
| `brand-positioning-triangle.md` | SmallRig 定位三角是不是从 page-124 抽出? grep 找原文核对, 不准就删 SmallRig 改用 T2 (其他公知品牌定位三角案例) + T4 植愈坊 |
| `user-journey.md` | SmallRig 用户旅程在案例 PDF 哪一页? 找不到就改 T1 (247 书 ch04 有用户旅程内容) + T4 植愈坊 |
| `tows.md` | SmallRig TOWS 矩阵在案例 PDF 哪一页? 找不到就改 T1 小米 (247 书 ch05 §5.4 有) + T4 植愈坊 |

### B 组 · 13 个文件 — 行业通用模型, 删 SmallRig 改 Tier 2 经典案例 + 保留植愈坊

这些是 B 层概念, SmallRig 案例里基本不会有专门体现, 当前 SmallRig 示例多为编造。**删 SmallRig, 改为 Tier 2 经典案例 (按 TEMPLATE §3.5.X P0-6 Tier 2 经典案例库) + 保留/补植愈坊 (Tier 4)**。

| 文件 | 改用 Tier 2 推荐案例 (只描述框架,禁编数据) |
|---|---|
| `pestel.md` | 中国电动车产业 (P 政策驱动) |
| `industry-lifecycle.md` | 智能手机行业 (导入→成长→成熟) |
| `porter-5-forces.md` | 中国新茶饮赛道 (喜茶/奈雪/蜜雪冰城) |
| `value-chain.md` | 苹果供应链 (设计/品牌在美, 制造在中国/越南) |
| `s-curve.md` | 苹果产品线 (iPhone S 曲线) |
| `maslow.md` | 苹果设计 (自我实现层) / 奢侈品 (高层级需求) |
| `competitor-matrix.md` | 中国新能源车竞品矩阵 (蔚小理 + 比亚迪) |
| `perceptual-map.md` | 汽车品牌知觉地图 (BBA vs 二线豪华) |
| `pain-gain-map.md` | (247 书 ch04 有 Dropbox 等) + 植愈坊 |
| `4a-funnel.md` | 宝洁经典广告 AIDA 教程 |
| `imc.md` | 可口可乐"分享一瓶可乐"整合营销 |
| `product-house.md` | (Seven 摘要 12 有产品屋结构, 用) + 植愈坊 |
| `slogan-7-principles.md` | 经典广告语 (耐克 Just Do It / 农夫山泉有点甜 / M&M 不溶在手) + 植愈坊 |

### C 组 · 6 个文件 — 跨域增长 / 管理工具, 删 SmallRig + 植愈坊, 改 Tier 2 + Tier 3 抽象

这些是 C 层概念, 与品牌策划体系交集很小, 植愈坊和 SmallRig 都没有真实素材。**删 SmallRig 和植愈坊编造内容, 改为 Tier 2 经典案例 (互联网行业知名) + Tier 3 抽象示例**。

| 文件 | Tier 2 案例 | 注意 |
|---|---|---|
| `aarrr-funnel.md` | Dropbox 引荐增长 + Airbnb 早期口碑 | 不编留存率/转化率具体数字 |
| `okr.md` | Google + 字节跳动 (公开介绍) | 不编具体 OKR 内容/季度评分 |
| `pdca.md` | 丰田生产体系 (戴明 → 丰田源头) | 只讲循环, 不编具体改善数据 |
| `marketing-calendar.md` | 中国电商节日营销 (618/双 11/双 12) | 框架性描述, 不编 GMV |
| `4p-rhythm.md` | Tier 3 抽象示例 (某消费品 SKU 节奏) | 真案例稀缺, 抽象演示 |
| `communication-theory-34.md` | 14 篇摘要 14 已有 34 理论 | 直接引用学术理论, 不需具体品牌 |

### D 组 · 2 个文件 — 元方法, 改 Tier 2 学术源头

| 文件 | Tier 2 案例 |
|---|---|
| `5-why-essence.md` | 丰田生产线问题诊断 (教科书源头) |
| `pyramid-principle.md` (如缺则建) | 麦肯锡 SCQA + Barbara Minto 著作 |

---

## 修复流程 (每个文件按此 4 步)

### Step 1 · 读现状

```bash
cat assets/_compiled/concepts-golden/<slug>.md | head -100  # 看示例段
```

### Step 2 · 按 Tier 决策

按 P0-6 决策树:
- A 组: T1 + T4, 校 source 精度
- B 组: 删 SmallRig 改 T2, 加 T4
- C 组: 删 SmallRig + 植愈坊编造, 改 T2 + T3
- D 组: T2 学术源头

### Step 3 · 用 Edit 工具按 P0-4 模板重写每个示例段

每个示例必须:
- 标题: `### 示例 N · {案例名} ({Tier 标识})`
- 标题下立刻加 `> **案例可追溯报告**: ...` blockquote (按 P0-4 三种模板之一)
- 示例正文按 Tier 约束 (T1 逐字 / T2 只框架不编数据 / T3 抽象占位 / T4 教学标注)

### Step 4 · 跑 P0-5 self-check

```bash
# 每个文件改完后跑:
grep -c "案例可追溯报告" assets/_compiled/concepts-golden/<slug>.md  # 应该 ≥ 1
grep -i "smallrig\|斯莫格" assets/_compiled/concepts-golden/<slug>.md | wc -l  # 应该 = 0 (除非 A 组保留的真实引用)
```

---

## 批量 Commit 规范

29 个文件按 4 组分批 commit, 不要一次性 commit 29 个:

```
# A 组 8 文件 commit
git add (A 组 8 文件)
git commit -m "compile(retrofit): A组 8 concepts校正 SmallRig source 精度+加可追溯报告"

# B 组 13 文件 commit
git add (B 组 13 文件)
git commit -m "compile(retrofit): B组 13 concepts SmallRig→Tier2 经典案例+保留植愈坊"

# C 组 6 文件 commit
git add (C 组 6 文件)
git commit -m "compile(retrofit): C组 6 concepts SmallRig+植愈坊→Tier2 经典+Tier3 抽象"

# D 组 2 文件 commit
git add (D 组 2 文件)
git commit -m "compile(retrofit): D组 2 concepts 元方法→Tier2 学术源头"

# INDEX 更新
git add assets/_compiled/concepts-golden/INDEX.md
git commit -m "compile(retrofit): regenerate INDEX with 34 concepts + Tier 标记"
```

---

## 完成后打印

```
✅ Task 20 retro-fix complete. 29 files updated by 4-tier fallback strategy:
   - A 组 8 文件: SmallRig source 精度校正
   - B 组 13 文件: Tier 2 经典案例 + 植愈坊
   - C 组 6 文件: Tier 2 + Tier 3 抽象
   - D 组 2 文件: Tier 2 学术
Commits: 5 (4 retrofit + 1 INDEX). Not pushed.
Ready for Claude review (sample 5-10 files).
🛑 Checkpoint #2 final ready.
```

---

## ⚠️ Codex 重要提醒

1. **修之前必须重新 Read CONCEPT-TEMPLATE.md 完整版** (尤其 P0-6 4 层策略 + 经典案例库)
2. **B/C 组改 Tier 2 时, 严格遵守"只描述框架, 不编数据"约束** — 写"Google 用 OKR 管理目标"OK, 写"Google 2023 Q3 OKR 评分 0.85"绝不允许
3. **Tier 3 抽象示例必须明确标注** "假设示例, 不代表真实品牌"
4. **每个示例必须有"案例可追溯报告" blockquote** (P0-4 强约束)
5. **任何遇到判断不准的概念, 立刻 `❓ Need Seven decision` 暂停** — 宁可慢也不要继续编造
