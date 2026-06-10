# P8.5 证据硬化与收口实验 Handoff

日期：2026-06-10  
对象：`fixture-luma-coffee`  
产物：`outputs/p85-fixture-luma-coffee-fullcase/`

## 本轮完成

- 中文来源分级补齐：`stats.gov.cn`、`.edu.cn`、艾媒、头豹、CBNData、QuestMobile、易观、Mob、CNNIC、沙利文中国、CIC 灼识、浦银国际等可识别为 T2；报告聚合站/媒体仍保持 T3。
- Research 增加强来源定向：弱来源比例低于阈值时会显式触发 `strong-source followup`，并在 `research-brief.json` 记录真实比例。
- Critic 支持 `blocking/advisory`：advisory-only 不阻塞；旧字符串 issue 保守视为 blocking；最后一轮修订后新增 final audit。
- Fullcase 章节 prompt 增加语义去重纪律与跨章已用主张摘要；章节 JSON 语法错误与非法 `evidence_kind` 会显式重试一次。
- 生成 P8.5 25 页 deck、freeform HTML、普通评分、语义评分、critic final audit、页面溢出体检。

## 关键结果

| Gate | Target | Result | Status |
|---|---:|---:|---|
| 页数 | 20-30 | 25 | PASS |
| 过程锁 | PASS | PASS | PASS |
| methodology usage | 不回退 | 13/25 | PASS |
| critic loop | final pass | final audit PASS | PASS |
| 页面溢出 | 0 | 0 | PASS |
| deterministic repetition | 低重复 | 0% | PASS |
| semanticRepetitionRate | <= 20% | 24% | FAIL |
| strongRatio | >= 50% | scorer 0%；新分类器重算 research 3/36=8.3% | FAIL |
| externalEmpiricalRatio | >= 30% | 0% | FAIL |

## 产物路径

- Deck JSON：`outputs/p85-fixture-luma-coffee-fullcase/deck.json`
- HTML：`outputs/p85-fixture-luma-coffee-fullcase/deck.freeform.html`
- 普通评分：`outputs/p85-fixture-luma-coffee-fullcase/score.json`
- 语义评分：`outputs/p85-fixture-luma-coffee-fullcase/score-semantic.json`
- Critic：`outputs/p85-fixture-luma-coffee-fullcase/critic-rounds.json`、`critic-final-audit.json`
- 溢出体检：`outputs/p85-fixture-luma-coffee-fullcase/page-inspect.json`

## 观察

- P8 语义重复率为 54.17%；P8.5 降到 24%，方向有效但还差 1 页左右才能进 20% gate。
- 本轮 semantic restatement pairs：P9->P6、P16->P9、P18->P13、P19->P13、P24->P14、P25->P3。
- 强来源 followup 已触发，但真实结果仍弱：`research-brief.json` 记录为 `strong_source_followup=true`，原始记录 `0/36`；补充分级后重算仅 `3/36`。
- 当前最大的未收口项不是 critic，也不是页面结构，而是强来源检索质量与 deck data_refs 的 T1/T2 传播。

## 未完成/外部依赖

- 双 provider 回归：SKIPPED，缺第二 provider key。
- P9 真人 walkthrough：SKIPPED，需要 Seven 本人以小白视角走完整浏览器流程。

## 下一步建议

1. P8.6 先做“强来源 provider/query 策略”，不要继续只靠自然语言 followup：对行业研究机构、券商研报、统计局/协会、品牌年报做可配置强源 query templates，并把命中强源作为研究阶段 gate。
2. deck 生成时对 URL 重新归一 `source_tier`，不要采信模型写入的旧 tier；否则分类器修复无法反映到 scorer。
3. 语义重复继续压缩 P9/P16、P13/P18/P19、P14/P24、P3/P25 这些链路，让定位表达页与执行页分工更硬。
