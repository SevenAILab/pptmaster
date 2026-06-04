# Phase 1 Skill MVP 完整复盘

## 时间线

- 2026-05-26: Spec v1.1.1 + Plan 1 起步
- 2026-05-27: Plan 1 Sub-Agent ④ + SmallRig 品牌定位跑通
- 2026-05-28: Plan 2 Sub-Agent ①②③⑤ 补齐
- 2026-05-29: Plan 3 Sub-Agent ⑥ + 全案串联 + Sxx 核心版式精雕
- 2026-05-30: Plan 4 跨模型 / 跨 Agent 验证
- 2026-05-31: Plan 5 Beta 发布包 + 案例库 + 内容种草准备
- 2026-05-31: 追加案例/SOP 纳入修复,把品牌定位案例、品牌建设案例、SmallRig MI、2024 品牌管理全工作手册编译成 case-patterns 并自动注入 prompt bundle

## 北极星指标验收

| 指标 | 目标 | 当前记录 | 状态 |
|---|---|---|---|
| 真实/拟稿案例 N | 5-10 份 | SmallRig 1 份真案例 + 4 份公开品牌拟稿 input / prompt bundle,raw-output 待生成 | 进行中 |
| Seven 自用替代率 | >= 50% | 待 Seven 实战回填 | 待评估 |
| 资产编译完整度 | 60 概念 + 矩阵 >= 90% | 61 个黄金概念文件 + 162 matrix entries;Plan 目标 60 已覆盖 | 达标 |
| 方法论命中率 | >= 80% | SmallRig review 内容 9/10;6 Sub-Agent 全案 61 页 | 达标 |
| 多模型可跑性 | delta < 20% | dry-run 结构验证 delta 0%;真实 API 因 key 缺失仍需补跑 | 条件达标 |
| 跨 Agent 装载 | Claude Code / Cursor / Cline 三家 | Claude Code Skill + Cursor + Cline + OpenAI API + Anthropic API + Qwen API | 达标 |
| 资产 ingest 完整度 | >= 90% | 书 / 模型 / 案例 / SOP 已纳入,并补 case-patterns 自动注入 | 达标 |
| 内容种草 | 2-3 篇 | 3 篇草稿框架已准备,待 Seven 成文发布 | 待发布 |
| 外部数据引用率 | Sub-Agent ②③ >= 60% | Plan 2 SmallRig: ② 9/15 web URL,③ 15/21 web URL | 达标 |
| Search 成本控制 | <= ¥30/月 | Plan 2 记录 12 次搜索约 0.0012 USD;上线月成本待观察 | 条件达标 |

## 交付清单

| 模块 | 产物 | 状态 |
|---|---|---|
| 发布包 | README / QUICKSTART / CHANGELOG / CASE-GALLERY | 已完成 |
| 6 Sub-Agent | ① consumer_insight,② industry_analysis,③ competitor_analysis,④ brand_positioning,⑤ brand_building,⑥ annual_planning | 已完成 |
| 全案串联 | `run-full-suite.mjs` + `merge-full-deck.mjs` | 已完成 |
| 渲染层 | `render-deck.mjs` + 7 个核心 Sxx 版式精雕 | 已完成,仍有版式债 |
| 搜索层 | Tavily / Serper wrapper + cache + audit log | 已完成 |
| 跨模型 | Claude / OpenAI / Qwen clients + adapter 示例 | dry-run 通过,真实 API 待补 key |
| 案例/SOP 注入 | `assets/_compiled/case-patterns/` + `readCasePatterns()` | 已完成 |
| 公开品牌拟稿 | Oatly / 元气森林 / 蜜雪冰城 / 泡泡玛特 input + prompt bundle | 已准备,待 raw-output |

## 内容种草发布数据

| 渠道 | 主题 | 当前状态 | 发布链接 | 24-48 小时数据 |
|---|---|---|---|---|
| 小红书 | 我用 AI 把 SmallRig 品牌升级方案做了一遍: 8 分钟 vs 8 天 | 草稿框架已准备 | Seven 待填 | Seven 待填 |
| 公众号 | PPTAgent 的设计哲学: 资产编译 + 4 层 fallback + 跨 LLM 模型无关 | 草稿框架已准备 | Seven 待填 | Seven 待填 |
| 即刻 / X | PPTAgent v1.0 发布 | 草稿框架已准备 | Seven 待填 | Seven 待填 |

## Plan 1-5 关键 Lessons

### Plan 1 · 品牌定位 MVP

1. 真实案例优先级高于模型推理: SmallRig page-124 一旦作为事实源,输出质量从"像策略案"变成"可追溯策略案"。
2. examples.md 的示例会强烈污染输出风格,所以示例必须和真实 OCR 对齐。
3. metadata.assumptions 必须诚实记录推演边界,不能把 strategy assumption 写成客户事实。

### Plan 2 · Sub-Agent ①②③⑤

1. 四个新 Sub-Agent 沿用 ④ brand_positioning 的 8 段 prompt 结构,能显著降低实现偏差。
2. ②③ 的 web_search 有用,但必须标注行业口径差异,不能把相邻赛道数据硬合并。
3. ⑤ brand_building 最适合吃 ④ 的上游输出;没有上游时,必须从真实 OCR 或 case patterns 中取证。

### Plan 3 · 全案串联 + Sxx 渲染

1. `run-full-suite` 需要兼容历史目录和新 suffix 目录,否则全案合并会漏 ④ brand_positioning。
2. 61 页 SmallRig 全案证明 6 Sub-Agent 可以串起来,但高管阅读版可能需要另做摘要版。
3. Sxx 精雕是"客户级 PPT 感"的关键;只靠 HTML 结构 validator 不足以判断视觉质量。

### Plan 4 · 模型无关

1. 模型无关的重点不是让不同模型写得一样,而是让资产、prompt、validator 和 adapter 形成同一条轨道。
2. dry-run 可以验证结构和脚本,但真实 API call 才能验证质量 delta。
3. Cursor / Cline / API adapter 的 README 和示例降低了迁移门槛。

### Plan 5 · 产品化收官

1. 案例/SOP 不能只作为 raw assets 存在,必须被自动注入 Sub-Agent prompt bundle,否则模型会回到泛化案例写法。
2. 公开品牌拟稿必须显式标注"基于公开资料的拟稿,非真实品牌策略案",并把 raw-output 生成留给后续 review。
3. 发布包文档要服务首次使用者: 安装、密钥、运行、输出边界都要直说。

## 工程债清单

- [ ] render-deck.mjs 剩余 Sxx 版式继续精雕,至少补齐 S01/S02/S04/S06/S07/S08/S10/S11/S14/S15/S16/S18/S19/S20/S21
- [ ] PPTX 高保真导出
- [ ] 多人协作 / 实时编辑
- [ ] API 开放
- [ ] 行业数据库接入
- [ ] 公开品牌拟稿案例的 raw-output 生成、人工 review、截图入库
- [ ] 内容种草发布数据回传
- [ ] 真实 API 跨模型验证补跑,替换 dry-run 报告

## Plan 6 (Phase 1.5 Web App) 启动判断

通过条件:

- [ ] 北极星指标全部达成或明确 deferred
- [ ] 内容种草问询率验证甲方真有需求
- [ ] Seven 决策 Web App 是否启动

## 推荐下一步

1. Seven 成文并发布 3 篇内容种草,24-48 小时后回填阅读 / 点赞 / 评论 / 私信。
2. 从 Oatly / 元气森林 / 蜜雪冰城 / 泡泡玛特中选 1 个,先完整生成 6 个 raw-output 并做人工 review。
3. 补跑真实 API 跨模型验证,把 `docs/model-agnostic-validation.md` 从 dry-run 更新为真实结果。
4. 决策 Phase 1.5 Web App 是否启动;如果启动,优先完成域名、Supabase、Vercel、Auth、埋点和支付沙箱准备。

## Seven 个人反思

Seven 待填。
