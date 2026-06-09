# P2 非锁页小闭环实验记录

## 结论

P2 工具链已落地并完成同源真实验：新增非锁页生成、过程锁、scorecard 对照和 CLI；使用同一输入生成 5 页非锁页 deck，并完成过程锁、确定性评分、语义评分和 HTML render smoke。

结果支持“少而精、少重复”的 harness 方向：页数从 80 页降到 5 页，确定性重复率从 7.5% 降到 0%，语义重复率从 91.25% 降到 20%，新洞察率从 71.25% 提升到 100%。但短 deck 的 actionability 只有 40%，外部实证比例为 0，后续 prompt 仍需要强化“可执行动作”和外部强证据引用。

环境说明：项目 `.env` 中的 `mdlbus.com / gpt-5.5` provider 当前返回 `INSUFFICIENT_BALANCE`；本次真实验使用本机已存在的 `tokenclub_free` provider 临时环境变量完成，未修改 `.env`。

## 同源输入

- 输入 slug：`pptagent-phase3-validation-20260602-155549`
- 输入文件：`inputs/pptagent-phase3-validation-20260602-155549/{form.json,summary.md,strategic-question.md}`
- 基线 chunks：`outputs/pptagent-phase3-validation-20260602-155549/_chunks`

## P0.5 语义基线 Gate

命令：

```bash
env -u ANTHROPIC_API_KEY -u ANTHROPIC_BASE_URL node -r dotenv/config scripts/score-deck.mjs outputs/pptagent-phase3-validation-20260602-155549/_chunks --chunks --semantic --json > outputs/_quality-baseline/pptagent-phase3-validation-semantic.json
```

结果：

| 指标 | 值 |
|---|---:|
| 页数 | 80 |
| deterministic repetitionRate | 0.075 |
| semanticRepetitionRate | 0.9125 |
| semantic - deterministic | 0.8375 |
| newInsightRate | 0.7125 |
| empiricalRatio | 0.0625 |
| deductiveRate | 0.4625 |
| hypothesisRate | 0.475 |

Gate 通过：语义重复率显著高于确定性重复率，且超过 `>=0.20` / `+0.15` 的建议阈值。

## 真实验产物

本次生成的 `deck.json` 明确标记为 `generation_mode: "model"`。

产物目录：

`outputs/pptagent-phase3-validation-20260602-155549-nonlocked/`

产物：

- `deck.json`
- `deck.html`
- `process-locks.json`
- `score-deterministic.json`
- `score-comparison.md`
- `generation-run.json`
- `prompt-bundle.md`
- `raw-response.txt`

结果指标：

| 指标 | 值 |
|---|---:|
| generation_mode | model |
| 页数 | 5 |
| process locks | PASS |
| deterministic repetitionRate | 0 |
| insightDensity | 1 |
| actionability | 0.4 |
| semanticRepetitionRate | 0.2 |
| newInsightRate | 1 |
| empiricalRatio | 0.4 |
| deductiveRate | 0.4 |
| hypothesisRate | 0.2 |
| HTML smoke | PASS |

对照摘要：

| 指标 | 80 页 blueprint | 5 页 nonlocked | delta |
|---|---:|---:|---:|
| pages | 80 | 5 | -75 |
| deterministic repetitionRate | 7.5% | 0% | -7.5pp |
| insightDensity | 92.5% | 100% | +7.5pp |
| actionability | 67.5% | 40% | -27.5pp |
| externalEmpiricalRatio | 1.25% | 0% | -1.25pp |
| semanticRepetitionRate | 91.25% | 20% | -71.25pp |
| newInsightRate | 71.25% | 100% | +28.75pp |
| empiricalRatio | 6.25% | 40% | +33.75pp |
| hypothesisRate | 47.5% | 20% | -27.5pp |

## 后续重跑命令

默认 `.env` provider 恢复后，直接重跑：

```bash
node -r dotenv/config scripts/gen-deck-cli.mjs pptagent-phase3-validation-20260602-155549
node scripts/process-locks.mjs outputs/pptagent-phase3-validation-20260602-155549-nonlocked/deck.json --json
node scripts/score-deck.mjs outputs/pptagent-phase3-validation-20260602-155549-nonlocked/deck.json --json --budget 5,8 > outputs/pptagent-phase3-validation-20260602-155549-nonlocked/score-deterministic.json
node -r dotenv/config scripts/score-deck.mjs outputs/pptagent-phase3-validation-20260602-155549-nonlocked/deck.json --semantic --json --budget 5,8 > outputs/pptagent-phase3-validation-20260602-155549-nonlocked/score-semantic.json
node scripts/render-deck.mjs outputs/pptagent-phase3-validation-20260602-155549-nonlocked/deck.json outputs/pptagent-phase3-validation-20260602-155549-nonlocked/deck.html --style=swiss
node scripts/compare-decks.mjs outputs/_quality-baseline/pptagent-phase3-validation-semantic.json outputs/pptagent-phase3-validation-20260602-155549-nonlocked/score-semantic.json --scorecards --labels blueprint,nonlocked > outputs/pptagent-phase3-validation-20260602-155549-nonlocked/score-comparison.md
```

若 `gen-deck-cli` 非 0 退出，仍优先查看 `outputs/pptagent-phase3-validation-20260602-155549-nonlocked/generation-error.txt` 或保留的 `deck.json` / `process-locks.json`。

本次临时 provider 跑法（不把 key 写入 repo；`TOKENCLUB_KEY` 来自本机已有 auth 快照）：

```bash
ANTHROPIC_API_KEY="$TOKENCLUB_KEY" \
ANTHROPIC_BASE_URL="http://69.5.20.196:8080/v1" \
ANTHROPIC_WIRE_API="responses" \
ANTHROPIC_MODEL="gpt-5.5" \
node -r dotenv/config scripts/gen-deck-cli.mjs pptagent-phase3-validation-20260602-155549
```
