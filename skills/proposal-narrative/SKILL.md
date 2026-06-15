---
name: proposal-narrative
description: 把行业/竞品/自身/用户的分析结论消化成一份有逻辑递进、能推导出专业结论的方案故事线与逐页 deck 骨架，而不是把资料一页页罗列。强制一页一观点、SCQA 开场、金字塔结构、章节过渡页，融合横纵双轴叙事与说服文案公式。用于把调研/分析素材组织成完整专业方案（品牌策略案/产品策略案/营销方案/竞标提案）的叙事主线与大纲时；当需要排方案逻辑、设计目录与章节过渡、把高密度干货拆成一页一观点、或给每页定一个判断句标题时触发。不要用于单页视觉设计与配色（用 deck-design-system）、也不要用于原始资料搜集与分析（用 industry-analysis / competitor-analysis / self-analysis / user-insight）。
---

# 方案叙事架构师 (Proposal Narrative)

一份专业方案不是干货的集合，是一条**故事线**：从一个问题出发，带读者看证据、做推导，最后落到让人信服的结论与行动。本 skill 把零散的分析结论编织成这条线，产出 deck 骨架交给设计层渲染。

## Important（贯穿全程的硬纪律，先读）

| 纪律 | 对治的烂方案毛病 |
|---|---|
| **一页一观点**：一页只讲一个核心判断 + ≤4 条支撑论据；讲不完拆两页 | 每页都是干货、信息密度爆炸、人读不进去 |
| **消化不罗列**：每条论据必须挂在一个判断下、并标出处；孤立资料不上页 | 把搜来的资料/数据一页页列出来 |
| **SCQA 开场**：先讲清现状→冲突→本方案要回答的核心问题 | 没有开头，上来就讲内容 |
| **观点先行（金字塔）**：每页标题是完整判断句不是话题词；先抛结论再给支撑 | 通篇平铺、没有结论、或结论藏在最后 |
| **章章递进**：每章末给收束判断，下一章承接它；章首用问题引导过渡 | 章节硬切、读者不知道下一段要干嘛 |

> 这五条是 FAIL 项。任何一条违反，回去改，不要交付。

## 这个 skill 做什么

输入分析卡（4 类分析 skill 的产物），输出 deck 骨架（封面/目录/brief 开场/章节/一页一观点/总结论）。**只产出骨架与文案，不碰视觉/配色/HTML**（那是 `deck-design-system` 的事）。

## 输入 / 输出契约

- **输入**：`brief`（客户 + 根问题）+ `analysis_cards`（见 `references/deck-structure.md` 契约 A）。**只消费分析卡，不回头翻原始资料**——分析层已替你消化过。
- **输出**：deck 骨架 JSON（schema 见 `references/deck-structure.md` 契约 B）。

## 工作流程（按序执行，每步详法见对应 reference）

1. **吃透 brief 与分析卡**。先读 `references/writing-discipline.md` 的"会看会想 brief"——brief 上写的不一定是真问题，提炼出最精炼的核心问题。
2. **用 SCQA 锁主线**。一句话写清 S 现状 / C 冲突 / Q 核心问题 / A 顶层主张。详见 `references/scqa-pyramid.md`。
3. **用金字塔搭骨架**。先定顶层结论 A，再拆出支撑它的 3-5 个论点（= 章节）。各章标题连读应能讲通 A。详见 `references/scqa-pyramid.md`。
4. **用横纵双轴组织每章**。纵向讲演变、横向讲对比、交汇出本章判断；用"层层剥开"展开。详见 `references/dual-axis.md`。
5. **切页：一页一观点**。每页写 `governing_thought`（判断句标题）+ ≤4 条论据 + `evidence_refs`（挂到分析卡）。用文案公式让每页有说服力，注意情绪弧。详见 `references/page-craft.md`。
6. **插结构件**。补齐封面/目录/brief 开场/章首过渡页/章节收束/总结论/行动页。详见 `references/deck-structure.md`。
7. **过写作纪律 + 质量门**。全程守 `references/writing-discipline.md` 的 AI 味禁区与"用人话写"；产出后跑质量门脚本。

## 质量门（交付前必跑）

```bash
python scripts/check_deck_skeleton.py <deck_skeleton.json>
```

它确定性检查五条纪律：一页一观点、结构件齐全、标题是判断句、论据 ≤4、evidence_refs 非空、章节递进。**FAIL 必须改到 PASS 再交付**（错误信息会指出第几页第几条违反）。

## references 导航（按需加载）

| 文件 | 何时读 |
|---|---|
| `references/scqa-pyramid.md` | Step 2-3：搭开场与金字塔骨架 |
| `references/dual-axis.md` | Step 4：组织每章内容、出交汇洞察 |
| `references/page-craft.md` | Step 5：切页、写判断句标题、选文案公式 |
| `references/deck-structure.md` | Step 6 + 全程：结构件清单、契约 A/B 的 schema |
| `references/writing-discipline.md` | Step 1 + 全程：会看会想 brief、AI 味禁区、用人话写 |

## 微型示例（消化 vs 罗列）

❌ 罗列：标题"咖啡市场数据"，堆 6 个数字（规模/增速/客单/门店/复购/融资）。读者无法吸收，也不知道你想说什么。

✅ 叙事（本 skill）：
- 标题（判断句）：`精品咖啡的增长正从"开店红利"切到"复购红利"`
- 论据：① 头部门店增速 2024 首次放缓至个位数〔ind-03〕；② 复购每升 10pp、单店利润升约 X%〔ind-05〕；③ LUMA 复购 41% 高于行业但见顶〔self-02〕。
- 一个判断、三条带出处论据，这页"说清一件事"，下一页才接着推。
