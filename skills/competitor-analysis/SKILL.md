---
name: competitor-analysis
description: 对竞品/标杆/替代方案做结构化竞争分析，产出带决策结论的"分析卡"（判断+论据+出处+决策含义）喂给方案叙事层。核心是"信息→分析→结论"：先用五大灵魂拷问锁定要解决的问题，定义五类竞品范围（核心/标杆/潜力/替代/避坑），按事实层-动机层-效果层三层拆解（看产品真相而非营销文案、看战略意图、找决定成败的根本变量），最后产出"借鉴什么/规避什么/我们该怎么做"的可用结论。用于品牌策略案/产品策略案/营销方案里需要竞品诊断、竞争格局判断、差异化空位识别、对标分析时触发。不要用于行业大盘与趋势分析（用 industry-analysis）、用户需求研究（用 user-insight）、或方案叙事编排与排版（用 proposal-narrative / deck-design-system）。
---

# 竞品分析 (Competitor Analysis)

竞品分析的本质是"借别人的经验解决自己的问题"。流程是 **信息 → 分析 → 结论**：信息要扣题、分析要本质、结论要落地。别人做了什么不重要，"**这对我到底有什么用**"才重要。

本 skill 产出标准格式的"分析卡"，交给 `proposal-narrative` 编织进方案故事线。

## Important（核心纪律，先读）

| 纪律 | 说明 |
|---|---|
| **有分析必有结论** | 绝不只罗列"竞品做了什么"。每张分析卡必须有 `implication`（所以我们该怎么办）。这是头号铁律——"有分析无结论的怪圈"是竞品分析最大的坑。 |
| **信息扣题** | 只搜集对"要解决的问题"真正有用的信息；信息不等于洞察，堆得多≠分析全。 |
| **分析到本质** | 看的不是表面动作，是动机与根本变量；区分主观/客观、表面/本质。 |
| **看产品真相，不是营销文案** | 看竞品实际产品/数据/用户口碑，不抄它的官方宣传话术（market-research 实证）。 |
| **结论能落地** | 结论要有策略性、极简、能引导执行。 |

## 这个 skill 做什么

输入客户 brief（含竞品线索）+ 可联网搜证，输出 `analysis_type:"competitor"` 的分析卡数组。**只做竞品诊断、产出分析卡**，不编排方案叙事（那是 `proposal-narrative`）。

## 输入 / 输出契约

- **输入**：`brief`（客户 + 根问题 + competitors 线索）。
- **输出**：分析卡 JSON（契约 A，与其他分析 skill 统一）：

```json
{ "analysis_type": "competitor",
  "cards": [{ "id": "comp-01", "claim": "判断句(非现象罗列)", "evidence": "论据(含精确事实/数字/用户原话)",
    "source": "url 或 inputs/<slug>/...", "source_tier": "T1|T2|T3|T4",
    "implication": "对本方案的决策含义(借鉴/规避/怎么做)", "confidence": "high|med|low|hypothesis" }] }
```

## 开工前：五大灵魂拷问（答不上 = 不合格，必须先答）

1. 你要解决什么问题？
2. 哪些信息对解决这个问题真正有用？
3. 你在哪里找的信息？（来源是否可靠）
4. 你的分析是主观还是客观、是表面还是本质？
5. 你的结论是什么，对本次项目有什么具体帮助？

## 工作流程（按序；详法见 reference）

1. **定义竞品范围**。用三个定位问题 + 五类竞品（核心/标杆/潜力/替代/避坑）+ April Dunford 的"用户视角替代集"圈定该分析谁。详见 `references/scope-definition.md`。
2. **三层拆解**。对每个竞品按 事实层(做什么) → 动机层(为何做，看战略意图) → 效果层(做得如何，找决定成败的根本变量) 拆解；按方案场景选专属框架。详见 `references/teardown-layers.md`。
3. **找可用结论**。每个拆解收敛为"借鉴什么/规避什么/我们该怎么做"，写进分析卡的 `implication`。详见 `references/conclusions.md`。
4. **守证据纪律 + 产出分析卡**。看产品真相、挖真实用户口碑、区分事实/推断、标来源分级。详见 `references/evidence-discipline.md`。
5. **过质量门**。

## 质量门（交付前必跑）

```bash
python scripts/check_analysis_cards.py <cards.json>
```

确定性检查：每张卡 `claim` 与 **`implication` 非空**（揪"有分析无结论"）、`source` 非空、`source_tier`/`confidence` 合法。FAIL 必须改到 PASS。

## references 导航（按需加载）

| 文件 | 何时读 |
|---|---|
| `references/scope-definition.md` | Step 1：圈定分析谁 |
| `references/teardown-layers.md` | Step 2：三层拆解 + 四场景框架 |
| `references/conclusions.md` | Step 3：把分析收敛成可落地结论 |
| `references/evidence-discipline.md` | Step 4 + 全程：证据纪律与来源分级 |

## 示例（有结论 vs 无结论）

❌ 无结论（最常见的坑）：
`{ "claim": "Manner 已开出 1500+ 门店", "implication": "" }` —— 只有现象，没说对我们有什么用。质量门判 FAIL。

✅ 有结论：
`{ "claim": "Manner 用'高质平价+极致单店模型'锁住了大众咖啡心智", "evidence": "客单 15-20 元、单店面积小、SKU 精简，2024 门店增速领先〔来源〕", "implication": "LUMA 不应在平价红海正面硬刚，应避开 Manner 占据的'高质平价'，卡'日常可及的专业精品'空位", "source": "https://...", "source_tier": "T2", "confidence": "high" }`
