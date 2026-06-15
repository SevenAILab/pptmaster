# 方案结构件与数据契约

目录：
- 契约 A：分析卡（输入）
- 契约 B：deck 骨架（输出，权威 schema）
- 结构件清单（缺一不可）
- 简版 / 详版

---

## 契约 A：分析卡（输入，由 4 个分析 skill 产出）

```json
{ "analysis_type": "industry|competitor|self|user",
  "cards": [{ "id": "ind-01", "claim": "判断句(非现象)", "evidence": "论据(含精确数字)",
    "source": "url 或 inputs/<slug>/...", "source_tier": "T1|T2|T3|T4",
    "implication": "对方案的决策含义", "confidence": "high|med|low|hypothesis" }] }
```

消费规则：每页论据用 `evidence_refs` 引用分析卡的 `id`，证明这页是消化分析得来、不是凭空写。

---

## 契约 B：deck 骨架（输出，权威 schema —— 质量门脚本据此校验）

```json
{
  "cover": { "title": "方案标题(可含主张)", "subtitle": "客户/项目/日期" },
  "toc": ["第1章 ...", "第2章 ...", "第3章 ..."],
  "brief_opening": {
    "situation": "客户当前客观局面(事实)",
    "complication": "出现了什么变化/矛盾让现状不可持续",
    "question": "因此本方案要回答的那一个核心问题(= 根问题)"
  },
  "sections": [
    {
      "section_no": 1,
      "title": "章节标题",
      "transition_question": "章首过渡页用的引导问题",
      "pages": [
        {
          "page_no": 1,
          "governing_thought": "本页唯一核心判断(完整判断句)",
          "points": ["论据1", "论据2", "论据3"],
          "evidence_refs": ["ind-01", "comp-03"],
          "layout_hint": "big-number|comparison|timeline|matrix|statement|quote|diagram|bullets"
        }
      ],
      "closing_judgment": "本章收束判断(下一章承接它)"
    }
  ],
  "conclusion": { "governing_thought": "全案顶层结论(金字塔顶)", "action_items": ["可执行行动1", "..."] }
}
```

硬规则（质量门 FAIL 项）：
- 每个 `page` 有且仅有一个 `governing_thought`。
- `governing_thought` 是完整判断句，不是话题词（"品牌定位"是话题词，"LUMA 应占据日常可及的专业精品定位"是判断句）。
- `points` 数量 ≤ 4（>4 说明这页是两个观点，拆页）。
- 每个 `page` 的 `evidence_refs` 非空。
- `brief_opening` 三段齐全，且 `question` 即根问题。
- 每个 `section` 有 `transition_question` 与 `closing_judgment`。

---

## 结构件清单（缺一不可；来源：方法论15 #35/#74/#78 + 业界 SCQA）

```
封面                      标题可直接打出核心主张
目录                      方案的地图(纯创意案可省，方案案必备 — #35/#36)
Brief / 问题定义页         SCQA 的 S+C+Q：现状 → 冲突 → 核心问题
┌ 第N章 章首过渡页          用一个问题引出本章("要回答 X，先得搞清 Y")
│  内容页 ×K               一页一观点
│  本章收束判断             本章得出什么结论、如何接下一章
└ ...
总结论页                  SCQA 的 A、金字塔顶：把各章结论收成一个总判断
行动/落地页               #72 区分"必须做"与"可以做"；给可执行 next steps
(可选) 内部销售弹药页       #74：一页精华，方便客户拿去向上汇报
```

结尾不写 "Thanks"，再次强调核心主张或留一句记忆点（#78）。

---

## 简版 / 详版（方法论15 #99）

同一方案可出两套：
- **简版 10-15 页**：只走主线——brief → 各章顶层判断 → 总结论 → 行动。说"路径"。
- **详版 20-50 页**：每个判断展开论据与推导。说"逻辑"。

骨架先按详版搭全，简版 = 详版里每章只保留 `governing_thought` 为顶层的那几页。

---

## 与流水线的衔接（anthropics 官方 pitch-agent 印证）

我们的链路「分析卡 → 叙事骨架 → 设计成品」与 anthropics/financial-services 官方 `pitch-agent` 同款架构：它是 `comps/dcf（数据）→ pitch-deck（叙事结构）→ pptx-author（成品）` 的多 skill 串联，叙事环节只负责"用前序分析数据搭出 deck 结构"，不碰数据采集、也不碰最终排版。

落到本 skill：**叙事层吃分析卡、产出 deck 骨架、交给 `deck-design-system` 渲染**——关注点分离，一层只做一件事。所以本 skill 的产物永远是骨架 JSON，不要越界写 HTML/配色。
