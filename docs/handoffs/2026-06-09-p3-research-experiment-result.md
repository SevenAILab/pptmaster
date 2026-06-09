# P3 研究 Worker + Actionability 强化实验记录

## 结论

P3 完成同源真实验：在 P2 非锁页生成链路上新增单趟研究 worker，并把研究简报注入 5 页非锁页生成。结果闭合了 P2 暴露的两个 gap：外部实证从 0 提升到 20%，actionability 从 40% 提升到 100%，同时语义重复率维持在 20%。

判定：P3 方向成立，达到本阶段 acceptance。它不是最终研究架构，只是证明“先研究、再短 deck”的 harness 增强有效。下一步可以进入 P4 的 PPTEval/HITL，或把研究 worker 升级为 lead + 并行子 Agent。

## 实验设置

- 输入 slug：`pptagent-phase3-validation-20260602-155549`
- 生成模式：`generation_mode: "model"`
- 研究模式：单趟 `deriveResearchQuestions -> webSearch -> gatherResearch -> generation prompt`
- 搜索：每题 3 条结果，最终 `10 findings / 7 sources`
- 模型：本机临时 `tokenclub_free` provider；项目 `.env` 未修改
- 产物目录：`outputs/pptagent-phase3-validation-20260602-155549-nonlocked/`

## 三方对照

| 指标 | 80 页 blueprint | P2 nonlocked | P3 research nonlocked |
|---|---:|---:|---:|
| pages | 80 | 5 | 5 |
| deterministic repetitionRate | 7.5% | 0% | 0% |
| insightDensity | 92.5% | 100% | 100% |
| actionability | 67.5% | 40% | 100% |
| externalEmpiricalRatio | 1.25% | 0% | 20% |
| strongRatio | 52.5% | 0% | 40% |
| semanticRepetitionRate | 91.25% | 20% | 20% |
| newInsightRate | 71.25% | 100% | 80% |
| empiricalRatio | 6.25% | 40% | 80% |
| hypothesisRate | 47.5% | 20% | 0% |

## Acceptance

| Gate | Target | Result |
|---|---:|---:|
| process locks | PASS | PASS |
| pages | 5-8 | 5 |
| externalEmpiricalRatio | >= 20% | 20% |
| actionability | >= 60% | 100% |
| semanticRepetitionRate | <= 20% | 20% |
| newInsightRate | >= 80% | 80% |
| HTML smoke | PASS | PASS |

## Notes

- `research-brief.json` 中有 7 个来源，其中 4 个被本地 `classifySource` 识别为 T2；生成后 HTTP 来源会被本地分级覆盖，避免模型自报 T1/T2 虚高。
- P3 为了命中外部实证，要求短 deck 页面同时写出精确数字和外部 T1/T2 URL；本次外部实证页为 1 页，所以比例为 20%。
- P3 的新洞察率从 P2 的 100% 回落到 80%，但仍达标；这是引入研究证据后部分页围绕同一定位主线展开的合理代价。
- `outputs/` 继续作为本地 ignored 产物保留，不提交到 repo。
