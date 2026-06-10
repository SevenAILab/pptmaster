# P7 全案规模化实验交接

日期：2026-06-10
阶段：P7 fullcase hierarchical generation
输入：`inputs/fixture-luma-coffee`
输出目录：`outputs/p7-fixture-luma-coffee-fullcase`

## 结论

P7 已跑通 20-30 页全案规模化：真实输出 26 页、6 章，过程锁通过，方法论 usage 通过，跨页语义重复率为 0。

这次真实运行暴露并修复了三个工程问题：

- 大纲模型可能低于页数预算：已加 `outlineAttempts`，失败后把确定性校验错误反馈给模型重试。
- Provider 在长章 JSON 输出上会出现 524 / socket close：已在 LLM client 增加 transient retry，重试耗尽仍 throw，不做 fallback。
- 单章 4-5 页一次生成仍可能断流：已加 `--max-pages-per-chapter-call=2`，章内按页组生成，仍保持章级 checkpoint 与全局过程锁。
- 模型会输出 `mixed` / `empirical+hypothesis` 等漂移枚举：已在 normalize 阶段收敛到合法 `hypothesis`，并保留 `model_evidence_kind` 便于审计。

## 运行命令

```bash
env -u ANTHROPIC_API_KEY -u ANTHROPIC_BASE_URL node -r dotenv/config scripts/gen-fullcase-cli.mjs \
  fixture-luma-coffee \
  --output=outputs/p7-fixture-luma-coffee-fullcase \
  --outline-attempts=2 \
  --max-pages-per-chapter-call=2

node scripts/score-deck.mjs outputs/p7-fixture-luma-coffee-fullcase/deck.json --json --budget 20,30 \
  > outputs/p7-fixture-luma-coffee-fullcase/score.json
```

## 关键产物

- `outline.json`：6 章，页数预算 4/5/4/4/4/5，总计 26 页。
- `chapters/ch-1.json` ... `chapters/ch-6.json`：全部已完成，可 resume。
- `deck.json`：最终 26 页 fullcase deck。
- `process-locks.json`：`ok: true`。
- `methodology-usage.json`：`ok: true`，22/26 页带方法论使用标注。
- `score.json`：页数合规、重复率 0、insight density 1。

## 指标

- 页数：26，符合 20-30 页。
- 章节：6。
- 过程锁：PASS。
- 方法论 usage：PASS，22/26。
- 研究：15 findings / 6 sources。
- 重复率：0。
- sourcedRatio：1。
- strongRatio：0。
- externalEmpiricalRatio：0。

## 观察

P7 的层级生成与 resume 机制成立：大纲先定叙事弧和章预算，逐章/页组生成，失败后可复用已完成章节继续。当前弱点不是 P7 的结构，而是 P8 要解决的研究质量：P7 复用的研究来源主要是 T3，导致 strongRatio 与 externalEmpiricalRatio 不达标。

## 下一步

进入 P8：实现 research reflection loop，用多轮搜索和缺口自评把研究拉向更多独立来源与更强来源，再跑同一 fullcase 对照 P7。
