# Skill 接入 Pipeline + 黑箱 Trace Handoff

日期：2026-06-14  
对象：`fixture-luma-coffee`  
输出目录：`outputs/luma-integration/`

## 本次完成

- 新增 `skill-injector.mjs`：按阶段确定性读取 skill references，并注入 prompt。
- 新增 `trace-log.mjs`：把 outline / draft / design / visual-audit 黑箱过程落盘到 `trace/`。
- 新增 `blackbox-report.mjs`：把 trace 串成 Seven 可读的过程报告。
- 接入叙事层：`outline-fullcase.mjs`、`draft-chapter.mjs`、`fullcase-pipeline.mjs`。
- 接入设计层：`design-page.mjs`、`freeform-renderer.mjs`、`gen-fullcase-cli.mjs`。
- 跑通 LUMA 真实 fixture 的 research → methodology → outline → draft → design → visual audit → blackbox report。

## 计划执行时做过的必要修正

1. `trace` 写入需要兼容 resume。原计划只按文件数递增，实际运行会反复 resume，所以实现里会检测已有 step，避免 outline/draft 重复写多份 trace。
2. `outline-only` 不应加载 draft references。实现改成只在进入 draft 阶段后再加载 draft guidance。
3. 设计校验器原本会误杀内层语义化 `<section>`。真实模型输出的顶层仍是一个 `section.slide`，只是内部用了 `<section>` 做布局分区，所以 `isWellFormedSection` 改为只要求“一个顶层 section 完整闭合”，允许内部 section。
4. 设计失败时需要保留模型原文。`designPage` 现在把最后一次违规 HTML 挂到 `error.rawOutput`，CLI 会写进 `generation-error.txt`。
5. `--critic` 当前会在 `revise` 时提前退出，导致 design/audit/blackbox 不执行；本次为了验证 skill 注入和黑箱链路，最终用不带 `--critic` 的命令完成设计，并把 critic 失败作为风险记录。

## 关键命令

离线回归：

```bash
for t in skill-injector trace-log outline-fullcase draft-chapter design-page fullcase-pipeline blackbox-report assemble-freeform-deck freeform-renderer; do
  node scripts/test-$t.mjs || exit 1
done
```

真实 fixture 主体生成：

```bash
env -u ANTHROPIC_API_KEY -u ANTHROPIC_BASE_URL node -r dotenv/config scripts/gen-fullcase-cli.mjs \
  fixture-luma-coffee --critic --research-rounds=3 \
  --outline-attempts=2 --max-pages-per-chapter-call=2 \
  --output=outputs/luma-integration
```

设计阶段继续运行（critic 未 pass 后，用同一目录复用已有 research/outline/draft）：

```bash
env -u ANTHROPIC_API_KEY -u ANTHROPIC_BASE_URL node -r dotenv/config scripts/gen-fullcase-cli.mjs \
  fixture-luma-coffee --research-rounds=3 \
  --outline-attempts=2 --max-pages-per-chapter-call=2 \
  --output=outputs/luma-integration
```

黑箱报告：

```bash
node scripts/blackbox-report.mjs outputs/luma-integration
```

渲染体检：

```bash
node scripts/page-inspect.mjs outputs/luma-integration/deck.freeform.html --json \
  > outputs/luma-integration/page-inspect.json
```

## 产物清单

- 黑箱报告：`outputs/luma-integration/blackbox-report.md`
- HTML deck：`outputs/luma-integration/deck.freeform.html`
- 设计稿 JSON：`outputs/luma-integration/deck.designed.json`
- 内容 deck：`outputs/luma-integration/deck.json`
- trace：`outputs/luma-integration/trace/`
- 视觉审计：`outputs/luma-integration/audit-visual.txt`
- 渲染体检：`outputs/luma-integration/page-inspect.json`
- critic 记录：`outputs/luma-integration/critic-rounds.json`

## Trace 摘要

| step | 注入 skill | refs | 结果 |
|---|---|---|---|
| outline | `proposal-narrative` | `scqa-pyramid`, `deck-structure`, `writing-discipline` | 5 章叙事骨架 |
| draft | `proposal-narrative` | `dual-axis`, `page-craft`, `writing-discipline` | 24 页内容稿 |
| design | `deck-design-system` | `design-tokens-and-themes`, `layout-system`, `anti-ai-slop`, `visual-qa` | 24 页 freeform HTML |
| visual-audit | 无 | 无 | FAIL，已落盘 |

## 真实验证结果

- Research：124 findings / 30 sources。
- Methodology：选中 `stp`, `perceptual-map`, `brand-positioning-triangle`, `4p`。
- Process locks：PASS，24 页。
- Methodology usage：PASS，10/24 页使用方法论。
- Design：24/24 页完成，`deck.freeform.html` 生成成功。
- Blackbox：`blackbox-report.md` 生成成功，能看到每步喂了哪些 skill references。

## 未通过项

### Critic 未 pass

`--critic` 最终仍为 `revise`。主要阻断点：

- 中段仍有重复页问题，例如第 15 页与第 14 页重复。
- 第 17 页承诺拆 Place / 门店触点，但后文没有独立门店体验配称页。
- 第 24 页仍有跨页承接表述错误，提到第 3 页放行指标，但实际应承接第 23 页。

另一个 pipeline 行为需要修：critic 写回的 `deck.json` 在重跑 CLI 时会被 `chapters/*.json` 重新合并覆盖，导致 critic 修订不能跨重跑累积。

### Visual audit 未 pass

`audit-visual.txt`：

- 多个强调色：`#002fa7`, `#5b7bff`, `#ff6b35`。
- 出现 gradient 渐变。

### Render inspect 未 pass

`page-inspect.json`：

- 第 1 页 footer/底部说明区域越界。
- 第 24 页 main / blockquote 越界。

## 给 Seven 看哪里

1. 先看黑箱：`outputs/luma-integration/blackbox-report.md`
2. 再看成品：`outputs/luma-integration/deck.freeform.html`
3. 再看质量门：`outputs/luma-integration/audit-visual.txt` 和 `outputs/luma-integration/page-inspect.json`
4. 如果要判断内容稿是否值得继续修，读 `outputs/luma-integration/critic-rounds.json` 的 final audit。

## 下一步建议

1. 给 design 阶段加“审计失败 → 定位违规页 → 只重画违规页”的自动返修 loop。
2. 修 critic resume 语义：若 `deck.json` 已经被 critic 修订，重跑时不要无条件从 `chapters/*.json` 覆盖。
3. 给 Place / 门店触点补一页专门配称框架，替换中段重复页。
4. 视觉审计可以先做确定性后处理：统一 accent、删除 gradient，再交给模型重画仍越界的页。
