---
name: user-insight
description: 对客户的目标用户做需求与洞察分析，产出带决策结论的"分析卡"（判断+论据+出处+决策含义）喂给方案叙事层。核心是用户分析九字诀：定用户（痛感最强的种子用户/能否低成本触达/现有方案缺陷）→ 判真假（够真痛痒爽 × 够多市场规模 × 够落地交付）→ 挖深度（看行为替代卡点冲突/场景五要素/5Why挖底层动机/JTBD功能情感社交），再提炼需求洞察与营销洞察（情绪势差：反向冲突/正向深挖）。强调看行为不看说、替用户说出说不出的话、合成洞察必标假设。是战略分析铁三角（用户要+对手无+我们有）里的"用户要"。用于品牌策略案/产品策略案里需要目标用户定义、真伪需求判断、用户痛点场景动机挖掘、用户洞察、persona 时触发。不要用于竞品拆解（用 competitor-analysis）、行业诊断（用 industry-analysis）、自身分析（用 self-analysis）、或方案叙事编排与排版（用 proposal-narrative / deck-design-system）。
---

# 用户洞察 (User Insight)

战略分析铁三角里的"**用户要**"。用户分析不是贴常规标签做表象总结，而是做生意判断：这个需求是真是假、值不值得赌钱/人力/时间。本 skill 产出"分析卡"交给 `proposal-narrative`。

## Important（核心纪律，先读）

| 纪律 | 说明 |
|---|---|
| **看行为，不看说** | 判断真伪不是问用户，而是看行为、看场景、看支付意愿。嘴上说买和真去买是两码事。 |
| **替用户说出说不出的话** | 洞察 = 意料之外 × 情理之中。是在表象诉求里找他们说不出、却真正驱动行为的东西。 |
| **不要宽泛标签** | "25-35岁一线白领"这类标签没有指引性。要从问题出发：谁痛感最强、付费意愿最高。 |
| **合成/假设洞察必标 hypothesis** | 无真实用户证据的洞察（含 AI 合成 persona）只是"快速定性信号"，`confidence` 必须设 hypothesis，写明需真实验证。 |

## 这个 skill 做什么

输入客户 brief + 资料（+ 可联网/读评论），输出 `analysis_type:"user"` 的分析卡数组。**只做用户诊断、产出分析卡**，不编排方案（那是 `proposal-narrative`）。

## 输入 / 输出契约

- **输入**：`brief`（客户 + 目标人群线索）+ 可选用户评论/访谈素材。
- **输出**：分析卡 JSON（契约 A，与其他分析 skill 统一）：

```json
{ "analysis_type": "user",
  "cards": [{ "id": "user-01", "claim": "判断句(真需求/真洞察，非宽泛标签)", "evidence": "论据(含用户原话/行为证据)",
    "source": "inputs/<slug>/... 或 url", "source_tier": "T1|T2|T3|T4",
    "implication": "方案/品牌该如何用这个洞察", "confidence": "high|med|low|hypothesis" }] }
```

## 九字诀：定用户 → 判真假 → 挖深度

## 工作流程（按序；详法见 reference）

1. **定用户 + 判真假**：三问法定种子用户；三个够（够真痛痒爽 × 够多市场 × 够落地交付）验真伪需求。详见 `references/define-and-validate.md`。
2. **挖深度**：行为（看替代/卡点/冲突）→ 场景五要素 → 5Why 挖底层动机 → JTBD 三层。详见 `references/deep-dig.md`。
3. **提炼洞察**：需求洞察 vs 营销洞察；找文化共识；提炼情绪势差（反向冲突/正向深挖）；用故事演绎。详见 `references/insight-craft.md`。
4. **守证据纪律 + 综合**：六维提取、置信度分层、VOC 原话、persona 反模式、合成洞察标记。详见 `references/evidence-and-synthesis.md`。
5. **产出分析卡 + 过质量门**。

## 质量门（交付前必跑）

```bash
python scripts/check_analysis_cards.py <cards.json>
```

确定性检查每张卡 `claim`/`implication` 非空、`source` 非空、`source_tier`/`confidence` 合法。FAIL 必须改到 PASS。

## references 导航（按需加载）

| 文件 | 何时读 |
|---|---|
| `references/define-and-validate.md` | Step 1：定用户 + 真伪需求 |
| `references/deep-dig.md` | Step 2：行为/场景/动机 + JTBD |
| `references/insight-craft.md` | Step 3：需求/营销洞察 + 情绪势差 |
| `references/evidence-and-synthesis.md` | Step 4 + 全程：六维提取/置信度/合成标记 |

## 示例（宽泛标签 vs 真洞察）

❌ 宽泛标签：`{ "claim": "目标用户是 25-35 岁一线城市白领女性", "implication": "" }` —— 没痛点、没洞察、没说怎么用。FAIL。

✅ 真洞察：`{ "claim": "白领买精品咖啡的底层动机是'忙碌里给自己的掌控感与小确幸'，而非单纯提神", "evidence": "复购访谈高频出现'犒劳自己''仪式感'，未经提示主动提及，跨 3 个受访者一致", "implication": "LUMA 应主打'日常里的专业犒赏'场景，门店氛围与文案强化仪式感，而非比性价比", "source": "inputs/luma/interviews.md", "source_tier": "T1", "confidence": "high" }`
