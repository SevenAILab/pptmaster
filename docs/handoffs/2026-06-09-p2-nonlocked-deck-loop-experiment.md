# P2 非锁页小闭环实验记录

## 结论

P2 工具链已落地：新增非锁页生成、过程锁、scorecard 对照和 CLI，且同源输入的本地 smoke 产物可以通过过程锁、确定性评分和 HTML 渲染。

真实模型生成尚未完成。P0.5 语义基线已成功跑通，但 P2 生成阶段调用当前 `ANTHROPIC_WIRE_API=chat_completions` / `ANTHROPIC_MODEL=gpt-5.5` provider 时先后遇到网关超时，最后返回 `INSUFFICIENT_BALANCE`。因此本次不能声称已完成真实模型对照，只能确认工具链和前置 gate 已准备好，待模型余额恢复后重跑实验。

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

## 本地 Smoke 产物

由于真实生成被模型余额阻断，本次只生成明确标记为 `generation_mode: "dry-run"` 的本地 smoke deck，用来验证 P2 链路。

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

Smoke 指标：

| 指标 | 值 |
|---|---:|
| generation_mode | dry-run |
| 页数 | 5 |
| process locks | PASS |
| deterministic repetitionRate | 0 |
| insightDensity | 1 |
| actionability | 0.4 |
| HTML smoke | PASS |

说明：dry-run 产物只用于验证 CLI、过程锁、评分和渲染链路，不作为真实模型质量结论。

## 后续重跑命令

模型余额恢复后，直接重跑：

```bash
node -r dotenv/config scripts/gen-deck-cli.mjs pptagent-phase3-validation-20260602-155549
node scripts/process-locks.mjs outputs/pptagent-phase3-validation-20260602-155549-nonlocked/deck.json --json
node scripts/score-deck.mjs outputs/pptagent-phase3-validation-20260602-155549-nonlocked/deck.json --json --budget 5,8 > outputs/pptagent-phase3-validation-20260602-155549-nonlocked/score-deterministic.json
node -r dotenv/config scripts/score-deck.mjs outputs/pptagent-phase3-validation-20260602-155549-nonlocked/deck.json --semantic --json --budget 5,8 > outputs/pptagent-phase3-validation-20260602-155549-nonlocked/score-semantic.json
node scripts/render-deck.mjs outputs/pptagent-phase3-validation-20260602-155549-nonlocked/deck.json outputs/pptagent-phase3-validation-20260602-155549-nonlocked/deck.html --style=swiss
node scripts/compare-decks.mjs outputs/_quality-baseline/pptagent-phase3-validation-semantic.json outputs/pptagent-phase3-validation-20260602-155549-nonlocked/score-semantic.json --scorecards --labels blueprint,nonlocked > outputs/pptagent-phase3-validation-20260602-155549-nonlocked/score-comparison.md
```

若 `gen-deck-cli` 非 0 退出，仍优先查看 `outputs/pptagent-phase3-validation-20260602-155549-nonlocked/generation-error.txt` 或保留的 `deck.json` / `process-locks.json`。
