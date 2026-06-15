# 视觉质检（交付前必过）

交付前必须做视觉核对——不只看代码，要看渲染后的样子。来源：huashu 质量门（playwright 截图 + 零 console）+ guizang Step4 视觉自检清单。

目录：
- 两层质检
- audit_visual.py 用法
- 人工视觉核对清单
- 修订回路

---

## 两层质检（静态 + 渲染）

1. **静态审计**（零依赖，必跑）：扫 HTML 源码查"机器能判的硬伤"——多强调色、SVG 内含文字、渐变/圆角/阴影。
2. **渲染审计**（需 playwright，强烈建议）：打开渲染后的页面，用 boundingBox 查元素重叠、溢出。huashu 铁律：交付前 browser test + playwright 截图 + 零 console 错误。

---

## audit_visual.py 用法

```bash
# 静态审计（零依赖）
python scripts/audit_visual.py <deck.freeform.html>
# 加渲染审计（需 playwright：npm i -D playwright && npx playwright install chromium）
python scripts/audit_visual.py <deck.freeform.html> --render
```

静态审计 FAIL 项（对应你报过的 bug）：
- **多个强调色** → 配色不统一（橙变蓝）。
- **`<svg>` 内有 `<text>`** → 坐标轴文字翻转的根因。
- **渐变 / 阴影 / 大圆角** → 违反瑞士风、显 AI slop。

渲染审计 FAIL 项：
- **元素重叠**（子元素 boundingBox 相交且非预期层叠）→ 黑块遮挡。
- **溢出**（子元素超出 section 边界）→ 文字叠压、越界。

---

## 人工视觉核对清单（guizang Step4，机器查不了的）

机器过了之后，人（或 MLLM 截图）还要核对：
- [ ] 整体调性统一，没有一页跳脱。
- [ ] 一页一观点，没有信息过载（这一条其实在 proposal-narrative 已把关，这里复核视觉密度）。
- [ ] 图片比例正确、不变形、不重复。
- [ ] 留白舒服，层级清晰，重点突出。
- [ ] 章节过渡页、封面、目录视觉到位。

---

## 修订回路

audit_visual FAIL → 定位到具体页 → 复用 `design-page.mjs` 的 `designPage` 重画那一页（带上"上次违反了 X 规则"反馈，现有 designPage 已支持重试反馈）→ 重新 audit，直到 PASS。≤2 轮。
