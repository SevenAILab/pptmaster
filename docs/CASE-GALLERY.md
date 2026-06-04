# PPTAgent · 案例库展示

## SmallRig MI 升级 (标杆案例)

- 来源: SmallRig 官方品牌升级 PDF (125 页)
- 产出: 6 Sub-Agent 全案串联, HTML 横向翻页 PPT
- 内容评分: 9/10 (Claude review #5 final pass)
- 输出: `outputs/smallrig-mi-blueprint/index.html`
- 关键事实源: `assets/_raw/cases/标杆案例/smallrig/page-124.md`
- 关键页面: page-124 品牌屋字段, 包括 FREE YOUR DREAM / Rig UP / RIG 命名释义 / 全生态四 RTB / 4 大产品系列
- 备注: `outputs/` 默认不进 git, 公开展示需另行截屏或部署脱敏版本

## 拟稿案例 (公开品牌)

以下案例用于 Plan 5 案例库扩张。所有内容必须基于公开资料, 并标注"基于公开资料的拟稿, 非真实品牌策略案"。

## 本地 Blueprint Demo

以下 demo 用于上线前本地验收,默认不进 git:

| 案例 | 类型 | 页数 | 输出 |
|---|---|---:|---|
| 茶语品牌定位案 | 虚拟品牌定位案 | 80 | `outputs/test-positioning-case-blueprint/index.html` |
| 启程品牌建设案 | 虚拟品牌建设案 | 95 | `outputs/test-building-case-blueprint/index.html` |
| SmallRig MI 升级 | 真实客户 MI 升级案 | 95 | `outputs/smallrig-mi-blueprint/index.html` |

这些 demo 走 `Chief Strategist Orchestrator + blueprint-driven` flow。`generate-blueprint-demo.mjs` 为 deterministic 本地生成器,用于验证结构、链路和渲染;真实生产版仍应由 LLM 读取各 chunk prompt bundle 后产出 `_chunks/*.json`。

| 品牌 | 方向 | 状态 | 输出 |
|---|---|---|---|
| Oatly | 可持续食品定位 | 本地公开资料拟稿 input 已准备;6 个 prompt bundle 已生成;raw-output 待 Claude/Seven 生成与 review | `outputs/oatly-full/index.html` |
| 元气森林 | 健康饮料升级 | 本地公开资料拟稿 input 已准备;6 个 prompt bundle 已生成;raw-output 待 Claude/Seven 生成与 review | `outputs/yuanqi-senlin-full/index.html` |
| 蜜雪冰城 | 低价 4P 经典 | 本地公开资料拟稿 input 已准备;6 个 prompt bundle 已生成;raw-output 待 Claude/Seven 生成与 review | `outputs/mixue-bingcheng-full/index.html` |
| 泡泡玛特 | IP 全球化 | 本地公开资料拟稿 input 已准备;6 个 prompt bundle 已生成;raw-output 待 Claude/Seven 生成与 review | `outputs/pop-mart-full/index.html` |
| 三顿半 | 精品速溶咖啡 | 候选 | `outputs/saturnbird-full/index.html` |
| Lululemon | 运动服饰社群 | 候选 | `outputs/lululemon-full/index.html` |
| Allbirds | 可持续运动鞋 | 候选 | `outputs/allbirds-full/index.html` |
| 完美日记 | 国货美妆 | 候选 | `outputs/perfect-diary-full/index.html` |
| 小红书 | 社区平台 | 候选 | `outputs/xiaohongshu-full/index.html` |

> Oatly / 元气森林 / 蜜雪冰城 / 泡泡玛特四个案例均为"基于公开资料的拟稿,非真实品牌策略案"。本地 `inputs/` 和 `outputs/` 默认不进 git;当前只记录案例库状态,不提交未复核的 prompt bundle 或 raw output。

## 教学案例

- 植愈坊: 247 页《AI 实战, 从 0 到 1 打造你的品牌》贯穿教学案例, 非真实品牌

## 评分维度

每个案例完成后按 5 个维度记录:

| 维度 | 说明 |
|---|---|
| 方法论严密 | 是否正确调用 must_load 概念, 是否有策略推导链 |
| 数据真实 | 是否引用真实公开来源, 是否避免编造 |
| Action Title | 每页标题是否结论先行 |
| 视觉呈现 | Sxx 版式是否匹配内容结构 |
| 可挂名度 | Seven 是否愿意以自己名义展示 |

通过线: 整体可挂名度 >= 7/10。
