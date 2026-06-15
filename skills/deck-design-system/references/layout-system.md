# 版式系统（治黑块遮挡 / 文字翻转 / 乱叠）

版式跟内容走，但走在 guizang 登记版式的骨架里——不自由发明。来源：guizang swiss-layout-lock + 现有 design-page.mjs。

目录：
- 内容 → 版式映射
- 登记版式（用骨架，不自由发明）
- SVG 禁文字（治坐标轴翻转）
- 中文大标题字号分档（防溢出）
- 12 列网格与对齐

---

## 内容 → 版式映射（结构跟内容走）

- 数据/数字 → 大数字 Data Hero / 矩阵 / 横向条形
- 流程 → 时间线 / 循环 / 系统图
- 对比 → 左右对照
- 并列判断 → 等权卡片 / 网格
- 结论 → manifesto / 大字 statement

> 这是审美标尺不是固定模板——但落地时要吸附到下面的登记版式骨架，避免每页脱缰乱画。

---

## 登记版式：用骨架，不自由发明（治乱叠/黑块遮挡）

guizang 瑞士主题登记了 22 个版式（S01-S22），每个有"必须保留的骨架"。正文页应从登记版式里选并标 `data-layout="Sxx"`，**不要临时发明 P23/P24 这类未登记结构**。详细 22 版式骨架见项目 `templates/guizang-refs/swiss-layout-lock.md` 与 `layouts-swiss.md`。

为什么这条治"黑块遮挡/文字叠压"：乱叠几乎都来自脱离登记骨架自由堆叠元素。吸附到登记版式的网格槽位，元素各就各位，就不会互相压。需要图片用 `S22 Image Hero`，多图用 `S15/S16` 网格骨架。

---

## SVG 禁文字（治坐标轴竖排文字翻转）

**SVG 只负责几何线条、圆、箭头、路径，绝不在 `<svg>` 里写 `<text>` 可见文字**（guizang swiss-layout-lock 第 4 条）。所有文字标签用 HTML 放在网格/卡片/caption 里。

坐标轴文字翻转、竖排写倒，根因就是把文字塞进了 SVG（SVG 文字旋转易出方向错误）。`audit_visual.py` 会扫 `<svg>` 内是否含 `<text>`，有则 FAIL。

---

## 中文大标题字号分档（防溢出）

中文大标题用 `font-size:min(Xvw, Yvh)` 双约束限高防溢出（现有 design-page 已要求）。按字数分档，字越多上限越低。详细分档见 `templates/guizang-refs/swiss-layout-lock.md`。

---

## 12 列网格与对齐

- 12 列网格，左对齐，贴近左上内容轴。
- 顶部中文大标题默认左对齐，**禁止 `text-align:center`**（除 S03/S09/S10 这类 statement/split 版式）。
- 大幅留白做非对称美学。
