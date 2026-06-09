# P4 自主排版实验记录

## 结论

P4 已完成最小闭环：在 P3 研究增强后的 5 页内容 deck 之后，加一层 agent design pass，让模型逐页输出完整 `<section class="slide ...">...</section>`，再注入现有 swiss shell。新 HTML 没有走 `SMART_LAYOUT_TO_SXX` / `renderSxx` 固定映射。

判定：方向成立。旧版 5 页分别落到 S03/S09/S15/S17/S13 固定 renderer；新版 5 页都由模型生成 freeform section，其中至少 3 页结构明显随内容变化：流程自动化页变成路线图，RTB 页变成资产矩阵，ICP 页变成任务验证板。

## 实验设置

- 输入内容 deck：`outputs/pptagent-phase3-validation-20260602-155549-nonlocked/deck.json`
- 旧固定渲染：`outputs/pptagent-phase3-validation-20260602-155549-nonlocked/deck.html`
- 新自主排版：`outputs/pptagent-phase3-validation-20260602-155549-nonlocked/deck.freeform.html`
- 设计中间产物：`outputs/pptagent-phase3-validation-20260602-155549-nonlocked/deck.designed.json`
- 模型：本机临时 `tokenclub_free` provider；项目 `.env` 未修改
- 说明：项目 `.env` 的 `mdlbus.com / gpt-5.5` 仍返回 `INSUFFICIENT_BALANCE`，本次按 P3 同样方式临时覆盖环境变量

## 结构对比

| 页 | 旧固定版式 | 新 freeform 结构观察 |
|---|---|---|
| 1 | S03 split statement | 品类锚定页，左右/阶段化判断，突出 Stop / Anchor / Week 1 / 90 Days |
| 2 | S09 dot matrix | 流程自动化页，围绕 Gartner 60% 信号组织成 M1 / M2-3 路线图 |
| 3 | S15 matrix fill | RTB 页，围绕 247 页、132 模型、8 图谱、案例库做资产矩阵 |
| 4 | S17 system diagram | ICP 冷启动页，组织成 ICP focus、三类任务、8-week validation |
| 5 | S13 three forces | 品牌屋闭环页，围绕 promise / evidence / 90 天指标收束 |

## Smoke 与安全检查

- HTML HTTP smoke：`http 200`，下载约 `125KB`
- 非注释 `<section>` 数：5
- `data-page` 数：5
- `#deck` / `#nav`：存在
- `deck.designed.json`：5 页，`section_html` 均 well-formed
- 注入安全扫描：未发现 `<script>`、`<style>`、`<html>`、`<head>`、`<body>`、`<link>`、`<iframe>`、外部 `src/href`、事件属性或 `javascript:` URL

## 命令记录

```bash
node scripts/test-design-page.mjs
node scripts/test-assemble-freeform-deck.mjs
node scripts/test-render-deck.mjs
node scripts/renderers/test-renderers.mjs
node scripts/test-generate-nonlocked-deck.mjs
node scripts/test-process-locks.mjs
```

真实验使用临时 provider，不写入 repo：

```bash
ANTHROPIC_API_KEY="$TOKENCLUB_KEY" \
ANTHROPIC_BASE_URL="http://69.5.20.196:8080/v1" \
ANTHROPIC_WIRE_API="responses" \
ANTHROPIC_MODEL="gpt-5.5" \
node -r dotenv/config scripts/design-and-render.mjs \
  outputs/pptagent-phase3-validation-20260602-155549-nonlocked/deck.json \
  outputs/pptagent-phase3-validation-20260602-155549-nonlocked/deck.freeform.html \
  --style=swiss --max-tokens=2200 --temperature=0.1 --max-attempts=2
```

## Notes

- `outputs/` 继续作为 ignored 本地产物，不提交到 repo。
- `design-and-render.mjs` 支持逐页 checkpoint/resume：每完成一页即写 `deck.designed.json`，避免真实模型慢或超时时丢掉已完成页。
- 本阶段只做 HTML smoke + 人眼核对入口，不做 P5 内容/逻辑自检 loop，也不做截图视觉自检。
