# Deck Skeleton Rebuild Handoff

日期：2026-06-15
基线：先推 GitHub `main` 到 `c9d0d39`
本轮提交：`dffc37a` → `916ecb1` → `18d7c58` → `8ff2617` → `34bc4a5`

## 完成内容

- 引入契约 B deck skeleton：`cover/toc/brief/section_intro/content/closing/conclusion/action` 成为一等页面。
- `outline-fullcase` 改为产骨架；`draft-chapter` 只填 content 页；`fullcase-pipeline` 负责 skeleton → draft → flatten → locks → `check_deck_skeleton.py`。
- `process-locks` 按 `page_kind` 分流：结构件页只查基本标题，内容页继续查一页一观点、证据、blocks、重复。
- 新增 case-logic：按 `positioning/building/upgrade` 路由完整推导逻辑，替换旧 `case_patterns[0]` 截断注入。
- 新增 analysis-pass：industry / competitor / self / user 四类 skill 产契约 A 分析卡，并过各自 `check_analysis_cards.py`。
- `design-page` 按 `page_kind` 给结构件/内容页不同设计提示；`design-repair` 统一强调色、移除渐变，并在有 `designedPath + callModel` 时尝试对越界页重画。

## 关键文件

- `scripts/deck-skeleton.mjs`
- `scripts/outline-fullcase.mjs`
- `scripts/draft-chapter.mjs`
- `scripts/fullcase-pipeline.mjs`
- `scripts/process-locks.mjs`
- `scripts/analysis-pass.mjs`
- `scripts/case-logic.mjs`
- `scripts/detect-proposal-type.mjs`
- `scripts/design-page.mjs`
- `scripts/design-repair.mjs`
- `assets/_compiled/case-logic/*`

## 已验证

离线回归：

```bash
for t in deck-skeleton outline-fullcase draft-chapter process-locks fullcase-pipeline analysis-pass skill-injector design-page design-repair trace-log blackbox-report freeform-renderer detect-proposal-type case-logic generate-nonlocked-deck; do
  node scripts/test-$t.mjs || exit 1
done
```

Python 质量门自检：

```bash
python3 skills/proposal-narrative/scripts/check_deck_skeleton.py --selftest
python3 skills/industry-analysis/scripts/check_analysis_cards.py --selftest
python3 skills/deck-design-system/scripts/audit_visual.py --selftest
```

全部 PASS。

## 未跑真实全案

本轮没有消耗 provider 跑 `fixture-luma-coffee` 的真实 research → analysis → fullcase → design 全链路。原因：当前 shell 环境没有暴露运行变量，`.env` 有 Anthropic 配置但既往记录显示 provider/余额可能不稳定；这次先完成结构性代码改造和离线质量门，避免把真实模型验证写成不可靠结论。

建议下一步 smoke：

```bash
env -u ANTHROPIC_API_KEY -u ANTHROPIC_BASE_URL node -r dotenv/config scripts/gen-fullcase-cli.mjs \
  fixture-luma-coffee --research-rounds=3 --pages=20,30 --output=outputs/luma-rebuild
node scripts/blackbox-report.mjs outputs/luma-rebuild
node scripts/page-inspect.mjs outputs/luma-rebuild/deck.freeform.html --json > outputs/luma-rebuild/page-inspect.json
```

看点：

- `deck.json` 是否含 cover/toc/brief/section_intro/closing/conclusion/action。
- `deck.skeleton.json` 是否通过 `check_deck_skeleton.py`。
- `trace/` 是否含 `analysis`、`case-logic`、`outline`、`draft`、`design`、`visual-repair`、`visual-audit`。
- `analysis-cards.json` 是否四类分析卡齐全，且每卡有 implication。
- `audit-visual.txt` 是否 PASS；`page-inspect.json` 是否 0 越界或经返修后可接受。

## 风险和边界

- `gen-fullcase-cli` 的真实 LLM 输出质量仍取决于 provider 可用性和模型遵循契约能力；失败会 throw，不静默 fallback。
- `design-repair` 的越界重画是可选路径：需要 `designedPath`、`callModel` 和可用 Playwright；静态配色/渐变修复不依赖浏览器。
- 保留旧短 deck pipeline；`normalizeGeneratedDeck` 对结构件页不再伪造 content blocks，但无 `page_kind` 的旧 deck 仍按内容页校验。
