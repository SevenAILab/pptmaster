---
name: industry-analysis
description: 对一个行业做系统诊断，产出带决策结论的"分析卡"（判断+论据+出处+决策含义）喂给方案叙事层。核心是搞清三件事：这个行业怎么赚钱（谁付钱/钱怎么分/利润集中在哪）、市场大盘与趋势（规模TAM-SAM-SOM/增速CAGR/增长驱动/行业阶段/替代品）、头部玩家与关键变量（头部三看/集中度CR4-CR8/六类壁垒/Porter五力/PESTEL）。强调"信息→结论"，绝不堆资料。用于品牌策略案/产品策略案/营销方案里需要行业诊断、市场规模与趋势判断、价值链与利润分析、竞争格局与关键变量识别时触发。不要用于单个竞品的深度拆解（用 competitor-analysis）、用户需求研究（用 user-insight）、或方案叙事编排与排版（用 proposal-narrative / deck-design-system）。
---

# 行业分析 (Industry Analysis)

隔行如隔山，外行看热闹，内行看门道。行业共性决定下限，个性才决定上限。本 skill 对行业做系统诊断，产出"分析卡"交给 `proposal-narrative` 编织进方案。

## Important（核心纪律，先读）

| 纪律 | 说明 |
|---|---|
| **信息→结论** | "信息不是认知，数据也不是判断"。要的不是信息多少，是结论生成。每张分析卡必须有 `implication`。 |
| **系统而非碎片** | 用框架系统看（怎么赚钱→大盘趋势→玩家变量），不要单点碎片。 |
| **看变化与对比，不看绝对数字** | 财报/数据要看趋势（纵向时间）与排名（横向各家），绝对数字单独看没意义。 |
| **一手优先、交叉验证** | 招股书/财报/电话会议是一手；多源交叉，警惕"循环印证"假象。 |
| **不编造** | 搜不到标"暂缺"或设 `confidence:hypothesis`，绝不编数据/URL。 |

## 这个 skill 做什么

输入客户 brief（含行业）+ 联网搜证，输出 `analysis_type:"industry"` 的分析卡数组。**只做行业诊断、产出分析卡**，不编排方案（那是 `proposal-narrative`）。

## 输入 / 输出契约

- **输入**：`brief`（客户 + 根问题 + 行业）。
- **输出**：分析卡 JSON（契约 A，与其他分析 skill 统一）：

```json
{ "analysis_type": "industry",
  "cards": [{ "id": "ind-01", "claim": "判断句", "evidence": "论据(含精确数字/来源)",
    "source": "url 或 inputs/<slug>/...", "source_tier": "T1|T2|T3|T4",
    "implication": "对本方案的决策含义", "confidence": "high|med|low|hypothesis" }] }
```

## 三大根本问题（答好这三个 = 对行业有本质理解）

1. **怎么赚钱的？**（决定理解深度）钱从哪来、价值链谁占大头、利润卡在哪个环节。
2. **蛋糕多大、趋势如何？**（决定机会判断）靠增量还是存量、靠渗透率还是涨价。
3. **以前是怎么发展过来的？**（决定格局判断）从历史预判未来走向。

## 工作流程（按序；详法见 reference）

1. **搞清怎么赚钱**：谁付钱 → 钱怎么分（画价值链）→ 利润集中在哪（=话语权）。详见 `references/how-it-makes-money.md`。
2. **看市场大盘与趋势**：蛋糕多大（规模公式 + TAM/SAM/SOM）→ 还在变大吗（CAGR + 结构性增长）→ 增长驱动 → 替代品 → 行业阶段 → 行业图谱。详见 `references/market-and-trend.md`。
3. **看头部玩家与关键变量**：头部三看 + 五维打分 → 集中度 + 六类壁垒 → Porter 五力 → PESTEL 关键变量 → 动态看边界。详见 `references/players-and-variables.md`。
4. **守信源与证据纪律**：招股书/财报/电话会议/券商研报，看变化与对比，标来源分级。详见 `references/evidence-and-sources.md`。
5. **产出分析卡 + 过质量门**。

## 质量门（交付前必跑）

```bash
python scripts/check_analysis_cards.py <cards.json>
```

确定性检查每张卡 `claim`/`implication` 非空、`source` 非空、`source_tier`/`confidence` 合法。FAIL 必须改到 PASS。

## references 导航（按需加载）

| 文件 | 何时读 |
|---|---|
| `references/how-it-makes-money.md` | Step 1：商业模式与利润分布 |
| `references/market-and-trend.md` | Step 2：市场规模、增速、阶段 |
| `references/players-and-variables.md` | Step 3：头部、壁垒、五力、关键变量 |
| `references/evidence-and-sources.md` | Step 4 + 全程：信源与来源分级 |

## 与叙事层的衔接（方法论02 §7）

行业分析卡天然支撑叙事层把内容做成这些页型：产业链地图 / 市场规模与趋势图 / 竞争格局图 / 关键变量判断表 / 三大核心结论（用户关心什么·企业竞争什么·未来趋势）。本 skill **只产出分析卡**，页型呈现交给 `proposal-narrative` + `deck-design-system`。

## 示例（有结论 vs 无结论）

❌ 无结论：`{ "claim": "中国精品咖啡市场 2025 年约 X 亿，CAGR 约 Y%", "implication": "" }` —— 只有数据，没说对我们有什么用。FAIL。

✅ 有结论：`{ "claim": "精品咖啡利润正从上游烘焙向下游品牌零售迁移", "evidence": "上游烘焙毛利收窄、下游连锁品牌净利率领先〔来源〕", "implication": "LUMA 自建烘焙厂的真正价值不在成本，而在卡住正在升值的'品牌零售'环节并讲出来", "source": "https://...", "source_tier": "T2", "confidence": "med" }`
