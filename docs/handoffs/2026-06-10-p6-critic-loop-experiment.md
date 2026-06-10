# P6 内容/逻辑自检 Loop + 方法论 Pull 实验记录

日期：2026-06-10  
仓库：`/Users/seven/Documents/文档/PPT方案大师/pptmaster`  
Provider：`openai-compatible` / `gpt-5.5`

## 实验设置

- 输入：`pptagent-phase3-validation-20260602-155549`
- 输出：`outputs/p6-pptagent-critic/`
- 命令：先跑 `gen-deck-cli --research --critic`；provider 在 deck 生成阶段返回 524。随后复用已落盘 `research-brief.json` / `methodology-selection.json` 完成 deck 生成与 critic loop。
- 初稿 gates：process locks PASS；methodology usage PASS，4/5 页。

## 结果

| 指标 | P5 A 组 | P6 critic 后 |
|---|---:|---:|
| pages | 5 | 5 |
| process locks | PASS | PASS |
| methodology usage | PASS，3/5 页 | PASS |
| semanticRepetitionRate | 20% | 0% |
| newInsightRate | 100% | 100% |
| actionability | 100% | 100% |
| empiricalRatio | 40% | 40% |
| externalEmpiricalRatio | 0% | 0% |

## Critic Loop 判读

- 第 1 轮 verdict=revise，真实触发 pull：`competitor-matrix`、`ice`。
- 第 2 轮仍 verdict=revise，但剩余问题集中在“关键证据线不够硬”，不是叙事主线错误。
- 修订后质量指标不降，且语义重复率从 20% 降到 0，说明 critic loop 对减少重复和澄清假设有效。

## 发现并修复的实现问题

- `mergeRevisedSlides` 原先只覆盖 `blocks`，未同步 `content_blocks`，导致第二轮 critic 读到旧内容并指出自相矛盾。已修复：修订页带 `blocks` 时同步覆盖 `content_blocks`。
- 修订模型曾输出非法 block type（`scorecard` / `process`），已在 revision prompt 中显式列出 `ALLOWED_BLOCK_TYPES`，过程锁保持 hard fail。

## Acceptance Gates

| Gate | 结果 |
|---|---|
| critic loop 收敛 | 未达成：≤2 轮后仍 revise |
| 自检后指标不差于 P5 -5pp | PASS，且 semanticRepetitionRate 改善 |
| pull 真实发生 | PASS，真实 pulledSlugs 非空 |
| 人工判读有改善 | PASS，竞品/ICP/RTB 页更明确标为待验证假设 |

结论：P6 机制和代码可进入下一阶段；实验未收敛的原因是证据闭环不足，正好应由 P8 研究反思循环解决，不建议在 P6 通过增加修订轮数硬刷 pass。
