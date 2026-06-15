---
name: deck-design-system
description: 把方案 deck 骨架渲染成统一、专业、不出 AI 味的视觉成品（横向翻页 HTML PPT）。融合 guizang 瑞士/电子杂志风格与 22 个登记版式，加 huashu 的品牌资产协议与反 AI slop 纪律。核心：全局只锁一套 design token（单一强调色全程不换）、版式跟内容走但吸附登记骨架、SVG 内禁写文字、交付前必过视觉审计脚本（查配色不统一/文字翻转/元素重叠/溢出）。用于把 proposal-narrative 产出的 deck 骨架渲染成最终 PPT、统一配色与版式调性、排查并修复视觉 bug（配色跳变、黑块遮挡、坐标轴文字翻转、文字溢出）时触发。不要用于方案的叙事结构与文案编排（用 proposal-narrative）、也不要用于行业/竞品/自身/用户分析（用对应分析 skill）。
---

# 方案设计系统 (Deck Design System)

把 `proposal-narrative` 产出的 deck 骨架，渲染成统一、专业、不一眼像 AI 的横向翻页 HTML PPT。**视觉风格用 guizang，过程纪律用 huashu，正确性用审计脚本强制 enforce**——这是治视觉 bug 的关键：现有 `design-page.mjs` 让 agent 自由画却没 enforce 这些约束，所以才出 bug。

## Important（设计纪律，先读）

| 纪律 | 治什么 |
|---|---|
| **全局只锁一套 design token，单一强调色全程不换** | 配色跳变（橙突然变蓝）|
| **版式跟内容走，但吸附 guizang 登记版式骨架，不自由发明** | 黑块遮挡 / 文字叠压 / 乱叠 |
| **SVG 只画几何，绝不在 `<svg>` 内写文字** | 坐标轴/图表竖排文字翻转 |
| **反 AI slop**：无渐变/无 emoji 图标/无圆角+左border套路/无 SVG 画像 | 一眼 AI、掉档 |
| **交付前必过 `audit_visual.py`** | 上面所有 bug 的机器兜底 |

## 这个 skill 做什么

输入 deck 骨架（proposal-narrative 产物）+ design token，逐页渲染成 `<section class="slide">` 并组装成单文件横向翻页 HTML deck，再过视觉审计。**复用现有 `scripts/design-page.mjs`（逐页设计+安全/结构校验）与 `scripts/freeform-renderer.mjs`（checkpoint+组装），不重造**；本 skill 在其上补"设计纪律 + 视觉正确性审计"。

> 沿用 guizang 单文件横向翻页架构，不用 huashu 的多文件+3D overview；不做动画/叙事视频（不在方案范围）。

## 输入 / 输出契约

- **输入**：deck 骨架（见 proposal-narrative 契约 B）+ design token（`{accent, ink, paper, font_sans, grid:12}`，见 `references/design-tokens-and-themes.md`）。
- **输出**：`deck.freeform.html`（单文件横向翻页 PPT）+ `audit-visual.json`（审计报告）。

## 工作流（按序；详法见 reference）

1. **锁 design token**：用 huashu 品牌资产协议从客户 VI 抓一套色，或从 guizang 4 主题选一套；全 deck 只此一套，单一强调色。详见 `references/design-tokens-and-themes.md`。
2. **逐页设计**：版式跟内容走、吸附 guizang 登记版式骨架、SVG 禁文字、中文大标题字号分档防溢出。复用 `design-page.mjs` / `freeform-renderer.mjs`。详见 `references/layout-system.md`。
3. **守反 AI slop + 系统纪律**：无渐变/无 emoji/无套路卡片；每元素挣得位置。详见 `references/anti-ai-slop.md`。
4. **视觉质检**：跑 `audit_visual.py` 静态审计（必跑）+ 渲染审计（建议）+ 人工核对。详见 `references/visual-qa.md`。
5. **修订回路**：审计 FAIL → 复用 `designPage` 带反馈重画该页 → 重审，≤2 轮。

## 质量门（交付前必跑）

```bash
python scripts/audit_visual.py <deck.freeform.html>            # 静态审计（零依赖）
python scripts/audit_visual.py <deck.freeform.html> --render   # 加渲染审计（需 playwright）
```

静态审计揪：多强调色、SVG 内文字、渐变。渲染审计揪：元素重叠、溢出。FAIL 必须改到 PASS。

## references 导航（按需加载）

| 文件 | 何时读 |
|---|---|
| `references/design-tokens-and-themes.md` | Step 1：锁 token、选主题、单 accent |
| `references/layout-system.md` | Step 2：版式映射、登记骨架、SVG 禁文字、字号分档 |
| `references/anti-ai-slop.md` | Step 3：反 slop 清单、瑞士风硬约束 |
| `references/visual-qa.md` | Step 4-5：审计用法、人工核对、修订回路 |

## 你在治的 bug（对应规则）

| 你报过的 bug | 根因 | 这里怎么治 |
|---|---|---|
| 橙色突然变蓝 | 没锁 token、多 accent | Step1 单一 token + audit 查多强调色 |
| 坐标轴竖排文字翻转 | 文字塞进了 SVG | SVG 禁文字 + audit 查 `<svg>` 内 `<text>` |
| 黑块盖住下方内容 / 文字叠压 | 脱离登记骨架自由堆叠 | 吸附登记版式 + audit 渲染查重叠/溢出 |
