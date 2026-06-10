# P8 研究反思循环实验交接

日期：2026-06-10
阶段：P8 research reflection loop
输入：`inputs/fixture-luma-coffee`
输出目录：`outputs/p8-fixture-luma-coffee-fullcase`

## 结论

P8 已实现并真实跑通：每个研究问题最多多轮搜索、提取、反思缺口、生成下一查询，并记录 `search_calls_used` 与 `per_question`。

相比 P7，P8 明显增加研究覆盖深度：

- P7：15 findings / 6 sources。
- P8：76 findings / 26 sources，`search_calls_used=22`，覆盖 5 个研究问题。

完整 fullcase 输出也跑通：24 页、5 章、过程锁通过、方法论 usage 通过、重复率 0。

## 运行命令

```bash
env -u ANTHROPIC_API_KEY -u ANTHROPIC_BASE_URL node -r dotenv/config scripts/gen-fullcase-cli.mjs \
  fixture-luma-coffee \
  --research-rounds=3 \
  --outline-only \
  --output=outputs/p8-fixture-luma-coffee-fullcase \
  --outline-attempts=2 \
  --max-pages-per-chapter-call=2

env -u ANTHROPIC_API_KEY -u ANTHROPIC_BASE_URL node -r dotenv/config scripts/gen-fullcase-cli.mjs \
  fixture-luma-coffee \
  --research-rounds=3 \
  --output=outputs/p8-fixture-luma-coffee-fullcase \
  --outline-attempts=2 \
  --max-pages-per-chapter-call=2

node scripts/score-deck.mjs outputs/p8-fixture-luma-coffee-fullcase/deck.json --json --budget 20,30 \
  > outputs/p8-fixture-luma-coffee-fullcase/score.json
```

## 指标对照

| 指标 | P7 | P8 |
| --- | ---: | ---: |
| deck 页数 | 26 | 24 |
| research findings | 15 | 76 |
| sources | 6 | 26 |
| search_calls_used | - | 22 |
| process locks | PASS | PASS |
| methodology usage | 22/26 | 19/24 |
| sourcedRatio | 1 | 1 |
| strongRatio | 0 | 0 |
| externalEmpiricalRatio | 0 | 0 |
| repetitionRate | 0 | 0 |

## 修正项

- 新增 `buildReflectionPrompt` / `parseReflectionResponse`。
- 新增 `researchQuestionWithReflection`：搜索、提取、反思、下一查询、早停、预算追踪。
- 新增 `gatherResearchDeep`：多问题串行、全局来源去重/重编号。
- 两个 CLI 新增 `--research-rounds=N`。
- 修复真实搜索中长查询 0 结果问题：首轮 0 结果时生成短关键词变体重试；仍 0 结果才 throw。
- 修复 P9 前置语义：`gen-fullcase-cli --outline-only` 现在真正停在大纲，不再继续章节生成。

## 未达成项

P8 增加了研究广度与来源数，但没有提升 strong source ratio：本轮 26 个来源仍全部被本地 source classifier 判为 T3。因此 P8 达到了“反思循环可运行 + 覆盖更深”的目标，但没有达到“强证据 T1/T2 ≥50%”的目标。

建议 P8.5 增加 source targeting：

- 研究问题 prompt 显式要求优先搜索咨询公司、券商、统计局、行业协会、上市公司年报。
- `webSearch` 或 `gatherResearchDeep` 支持强来源优先的 query variants，如 `site:gov.cn`、`site:statista.com`、`site:mckinsey.com`、`site:iiMedia.cn` 等，按行业配置白名单。
- score 前增加“强来源不足时补搜”的 deterministic gate。

## 双模型回归

当前环境完成了 OpenAI-compatible smoke：

```bash
node scripts/test-cross-model-validate.mjs
node scripts/test-real-llm-smoke.mjs
```

结果：`gpt-5.5` OpenAI-compatible provider 正常返回。没有独立第二 provider/key 可切换，因此完整第二 provider deck 回归本轮标记为 SKIPPED（环境限制）。
