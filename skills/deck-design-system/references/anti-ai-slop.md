# 反 AI Slop 与审美硬约束

让 deck 不一眼像 AI 生成、不掉档。来源：huashu §6（反 AI slop）+ §5（系统纪律）+ guizang 瑞士风硬约束。

目录：
- 反 AI slop 清单
- 瑞士风审美硬约束
- 系统纪律

---

## 反 AI slop 清单（huashu §6，critical）

这些是训练数据的"视觉最大公约数"，一眼 AI、抹掉品牌识别度——禁用：
- ❌ 紫色渐变（purple gradient）
- ❌ emoji 当图标（用 lucide：`<i data-lucide="name"></i>`）
- ❌ 圆角卡片 + 左侧 border accent 的套路
- ❌ 用 SVG 画人脸/插画
- ✅ 取而代之：严格用品牌 spec、serif display 字体（杂志风）或无衬线（瑞士风）、单一强调色、极致克制。"一千个 no 换一个 yes。"

---

## 瑞士风审美硬约束（guizang）

- **无衬线字体**（瑞士风）/ serif display（杂志风），一份 deck 不混。
- **直角、纯色、不透明**——这是瑞士风硬规则。
- ❌ 不要渐变（任何 linear/radial gradient）。
- ❌ 不要给 accent 加阴影 / 圆角 / 透明度。
- ✅ 仅 1px hairline 分割线允许。
- 极致字号对比（主标题:正文 ≥ 8:1，大字字重可到 200）。

> `audit_visual.py` 会扫 `linear-gradient/radial-gradient`、非零非 hairline 的 `border-radius`、`box-shadow`，命中则按风格 WARN/FAIL。

---

## 系统纪律（huashu §5）

- **每个元素必须挣得它的位置**——靠构图对抗空洞，绝不用内容填充凑数（content padding）。
- Placeholder > 烂实现（huashu §4）：真图未就位时用带标签的诚实灰块，而不是硬凑一个丑 SVG。
- 同一张图片不在 deck 里重复出现（方法论15 #55：会显得素材匮乏）。
