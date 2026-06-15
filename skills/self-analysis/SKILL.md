---
name: self-analysis
description: 对客户企业做自身分析，产出带决策结论的"分析卡"（判断+论据+出处+决策含义）喂给方案叙事层。核心回答两个问题：你凭什么赢、你能赢多久。先盘资产（商业模式/核心能力/资源禀赋）+ 判持续（增长引擎/组织能力/成本结构），再用"真优势=用户认×竞品无×壁垒强"剔除伪优势，用 SWOT 四象限并联交叉得出 SO/WO/ST/WT 战略，最后落到找方向/做聚焦/敢舍弃。是战略分析铁三角（用户要+对手无+我们有）里的"我们有"。用于品牌策略案/产品策略案里需要自身资产盘点、核心优势识别、真伪优势判断、SWOT 分析、差异化弹药梳理时触发。不要用于竞品深度拆解（用 competitor-analysis）、行业诊断（用 industry-analysis）、用户需求研究（用 user-insight）、或方案叙事编排与排版（用 proposal-narrative / deck-design-system）。
---

# 自身分析 (Self Analysis)

战略分析铁三角 = 用户要（user-insight）+ 对手无（competitor-analysis）+ **我们有（本 skill）**。自身分析回答两个根本问题：**你凭什么赢？你能赢多久？**（入场券 + 持续性）。产出"分析卡"交给 `proposal-narrative`。

## Important（核心纪律，先读）

| 纪律 | 说明 |
|---|---|
| **战略指向，不是列清单** | 本质是"战略指向 + 资源分配"。不是"我有什么"，而是"我有的能否被用户买单、跟竞品有无区隔"。没策略指引的自身分析 = 一堆正确的废话。 |
| **真优势 = 用户认 × 竞品无 × 壁垒强** | 优势类结论必须过这三关，否则是伪优势。三者缺一不可。 |
| **找主线** | 找到自己的主要矛盾/主线，没找到的公司很难做深做透。 |
| **铁三角联动** | "用户认"的证据来自 user-insight、"竞品无"来自 competitor-analysis——优势卡要交叉引用它们。 |

## 这个 skill 做什么

输入客户 brief + 资料，输出 `analysis_type:"self"` 的分析卡数组。**只做自身诊断、产出分析卡**，不编排方案（那是 `proposal-narrative`）。

## 输入 / 输出契约

- **输入**：`brief`（客户资料）+ 可选 user-insight / competitor-analysis 的卡（用于交叉验证真优势）。
- **输出**：分析卡 JSON（契约 A，与其他分析 skill 统一）：

```json
{ "analysis_type": "self",
  "cards": [{ "id": "self-01", "claim": "判断句(判定过的真优势/真短板，非自报特质)", "evidence": "论据",
    "source": "inputs/<slug>/... 或 url", "source_tier": "T1|T2|T3|T4",
    "implication": "资源该往哪投/该补该砍", "confidence": "high|med|low|hypothesis" }] }
```

## 两个根本问题

1. **你凭什么赢？**（入场券）→ 盘资产：商业模式 / 核心能力 / 资源禀赋。
2. **你能赢多久？**（持续性）→ 判持续：增长引擎 / 组织能力 / 成本结构。

## 工作流程（按序；详法见 reference）

1. **盘点两层**：盘"你有什么"（商业模式/核心能力/资源禀赋）+ 判"能不能持续"（增长引擎/组织能力/成本结构）。详见 `references/what-you-have.md`。
2. **判真伪优势**：用"用户认×竞品无×壁垒强"过滤，剔除三类伪优势。详见 `references/real-vs-fake-advantage.md`。
3. **SWOT 并联交叉**：SWOT 五步 + 四象限 + SO/WO/ST/WT 四战略，与资产盘点交叉（不单跑）。详见 `references/swot-matrix.md`。
4. **落到聚焦**：找方向（用户要+竞争无+壁垒强）→ 做聚焦 → 敢舍弃（短板三处理）→ SOP。详见 `references/from-analysis-to-focus.md`。
5. **产出分析卡 + 过质量门**。

## 渐进式深化（按方案时间/篇幅选档）

- **快速版**：两个根本问题 + 真优势判据，产出 3-5 张最关键的卡。
- **完整版**：两层六步全跑 + SWOT 四象限 + 落地四步。

## 质量门（交付前必跑）

```bash
python scripts/check_analysis_cards.py <cards.json>
```

确定性检查每张卡 `claim`/`implication` 非空、`source` 非空、`source_tier`/`confidence` 合法。FAIL 必须改到 PASS。

## references 导航（按需加载）

| 文件 | 何时读 |
|---|---|
| `references/what-you-have.md` | Step 1：两层六步盘点 |
| `references/real-vs-fake-advantage.md` | Step 2：真伪优势判据 |
| `references/swot-matrix.md` | Step 3：SWOT 并联交叉 |
| `references/from-analysis-to-focus.md` | Step 4：从分析到聚焦落地 |

## 示例（伪优势 vs 真优势）

❌ 自报特质（伪）：`{ "claim": "LUMA 咖啡豆品质行业领先", "implication": "" }` —— 没判定用户认不认、竞品有没有、壁垒强不强，也没说怎么用。FAIL。

✅ 判定过的真优势：`{ "claim": "LUMA 的真优势是'自建烘焙+门店现烘'形成的新鲜度心智", "evidence": "用户复购访谈高频提到'现烘香气'〔user-03〕；平价连锁多为中央工厂预制、难复制现烘〔comp-02〕；自建烘焙厂需重资产与时间积累", "implication": "资源应聚焦放大'现烘新鲜'这一真优势，而非在产地故事上与独立店比情怀", "source": "inputs/luma/summary.md", "source_tier": "T1", "confidence": "high" }`
