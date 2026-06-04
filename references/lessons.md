# Lessons Learned · Phase 1

## Week 2 · SmallRig MI 升级 (Sub-Agent ④ 品牌定位)

### 跑了几轮

- 第 1 轮: examples.md 编造 SmallRig 案例 -> raw-output 与 page-124 真实 0 对应 (5/10)
- 第 2 轮: 修 examples.md + 强制 Read page-124 -> 19 个 data_refs 全部真实引用 (9/10)

### Claude review #5 评分

- 方法论严密 9/10 / 数据真实 10/10 / Action Title 9/10
- 视觉呈现 4/10 (render-deck 最小可用版,未做 Sxx 版式精雕)
- 整体可挂名度 (内容) 9/10 / (视觉) 6/10

### Agent 做对的

1. 12 页方法论结构完整 (STP/BMC/VPC/RTB/Aaker/VMV/Brand-House/Pyramid/MECE/Action-Title)
2. 100% 引用 page-124 真实字段 (FREE YOUR DREAM / Rig UP / RIG / 全生态四 RTB / 4 大产品系列)
3. Page 9 新增 RIG 命名释义专章,Page 10 区分品牌主张 vs 产品口号
4. metadata.assumptions 诚实标注事实来源

### Agent 做错的 / 需要改进的

1. Page 5 VPC 缺 Pain Relievers (左 3 右 3 只写一半)
2. Page 11 4 大产品系列被合并描述,略简化
3. Page 12 Brand-House 5 层简化为 3 层

### 已知工程债 (deferred)

- **render-deck.mjs 最小可用版未做 Sxx 版式精雕**, 渲染输出像 markdown 不像 PPT
- 计划升级窗口: Plan 3 末尾 (Sub-Agent ⑥ + 全案串联完成后)
- 最迟不晚于: Plan 5 Beta 发布前
- 升级范围: S03/S05/S09/S12/S13/S17/S22 等 7+ 核心版式按 layouts-swiss.md 骨架精雕

### 反哺动作

- [ ] examples.md 加 VPC 完整 6 模块示范
- [ ] product-house.md 黄金版加"4-12 个产品系列各自独立描述"提醒
- [ ] brand-house.md 加"必须保留 5 层不可简化"提醒
- [ ] render-deck.mjs 升级 deferred 任务 -> 写入 docs/superpowers/plans/2026-XX-render-upgrade.md (Plan 2 启动时一起规划)

---

## Phase 1 Week 3-4 (Plan 2) · Sub-Agent ①②③⑤ 补齐

### 4 个 Sub-Agent SmallRig 端到端结果

| Sub-Agent | raw-output 评分 | data_refs P0-2 合规 | web_search 调用 |
|---|---:|---|---:|
| ① consumer_insight | __ / 10 | 15/15 引用 page-NNN.md | 0 次 (可选,未触发) |
| ② industry_analysis | __ / 10 | 9/15 引用 web URL,6/15 引用 page-NNN.md | 4 次 (必用) |
| ③ competitor_analysis | __ / 10 | 15/21 引用 web URL,6/21 引用 page-NNN.md | 8 次 (必用) |
| ⑤ brand_building | __ / 10 | 14/17 引用 page-124,3/17 引用 page-109 | 0 次 (不用) |
| **平均** | __ / 10 | 0 条 summary.md / example.com 污染 | 总 12 次 |

### Plan 2 关键发现 (Codex 跑完后填)

- [x] Sub-Agent ② 行业分析的 web_search 有用,但搜索结果常出现相邻口径 (智能影像设备 / 相机配件 / 手机配件 / 跨境电商),raw-output 必须显式标注口径差异,不能硬合并成 SmallRig 精确市场规模。
- [x] Sub-Agent ③ 竞争分析的 web_search 覆盖了 SmallRig 客户档案 4 个竞品: Manfrotto / Ulanzi / Tilta / PolarPro,每个竞品 2 次搜索。
- [x] Sub-Agent ⑤ 用 page-124 完整品牌屋可以覆盖必检字段: 5 层品牌屋 / 产品屋 / 口号评估 / 视觉锤 + 语言钉 / 品牌调性。
- [x] 4 个 Sub-Agent 之间存在上游依赖: ⑤ brand_building 最适合吃 ④ brand_positioning 输出; 但本轮已通过 page-124 保证独立运行也不编造。

### Agent 做对的

1. 四个新 Sub-Agent 都沿用 ④ brand_positioning 的 8 段 prompt 结构,差异点只替换 must_load、搜索边界、必检字段和版式池。
2. ②③ 真实调用 Tavily web_search,并写入 search-log.json: industry 4 次,competitor 8 次,总成本记录 0.0012 USD。
3. ①⑤ 坚持 P0-2: consumer 输出 15 条 data_refs 全部来自 SmallRig OCR; building 输出 14 条引用 page-124,3 条引用 page-109。
4. ③ 没把 page-073 中"需数据支撑"的 RTB 写成已证实事实,而是标为待补证的竞争证据。
5. run-sub-agent.mjs 已支持 5 个 agent_id、output-suffix 和 web_search 三档配置。

### Agent 做错的 / 需要改进的

1. web_search CLI 原本只打印结果,不会自动写 search-log.json; 本轮用 SearchLogger 手动落日志,Plan 3 应把日志写入封装进 orchestrator。
2. ② 行业分析部分搜索结果偏相邻赛道,需要 Plan 3 进一步设计 query 质量和 source 分级。
3. ③ 竞品搜索部分来源混有 Instagram / YouTube / 渠道页,可用于动态线索,但客户交付前应补官网、新闻稿或权威媒体。
4. prompt-bundle.md 和 index.html 仍被 outputs/ 忽略,本轮只强制提交 raw-output/search-log; 后续若 review 需要完整证据包,需明确是否追踪 bundle。

### 反哺动作

- [ ] 如果 Sub-Agent ② web_search 8 次上限被频繁触发 -> 升级到 12 次
- [ ] 如果 Sub-Agent ③ 竞品搜索 source 重复或来源质量弱 -> 用 Serper 替代 Tavily 做多源对比
- [ ] 如果 Sub-Agent ⑤ 候选口号质量低 -> 在 slogan-7-principles.md 黄金概念里加更多评估示例
- [ ] 将 SearchLogger 自动接入 scripts/run-sub-agent.mjs 或新增 scripts/run-search-batch.mjs,避免手工记录 search-log
- [ ] 如果 4 个 Sub-Agent 间有协作问题 -> Plan 3 (全案串联) 重点解决

### 已知工程债 (Plan 3 接手)

- render-deck.mjs Sxx 版式精雕 (Plan 1 末发现,Plan 3 末解决)
- Sub-Agent ⑥ 年度规划 (Plan 3 新增)
- 6 个 Sub-Agent 全案串联 (Plan 3 新增)
- 模型无关化验证 (Plan 4)

### Seven 总体评分 (5 维度,Plan 2 末填)

- 4 个 Sub-Agent 平均: __ / 10
- 备注: ___

---

## Phase 1 Week 5 (Plan 3) · Sub-Agent ⑥ + 全案串联 + render-deck 升级

### 三件事完成情况

| 任务 | 状态 | 备注 |
|---|---|---|
| Sub-Agent ⑥ annual_planning 三件套 | ✅ | 沿用 Plan 2 模板,新增 OKR / Marketing-Calendar / 4P-Rhythm / AARRR 校验 |
| 6 Sub-Agent 全案串联 | ✅ | run-full-suite + merge-full-deck,SmallRig 合并为 61 页 |
| render-deck Sxx 精雕 (7 版式) | ✅ | S03/S05/S09/S12/S13/S17/S22 完成,其他版式用 fallback |

### SmallRig 全案 60-80 页 5 维度评分

| 维度 | Plan 1 末 | Plan 3 末 | 提升 |
|---|---|---|---|
| 方法论严密 | 9/10 | __ / 10 | |
| 数据真实 | 10/10 | __ / 10 | |
| Action Title 力度 | 9/10 | __ / 10 | |
| 视觉呈现 | 4/10 (最小可用版) | __ / 10 (Sxx 精雕后) | |
| 整体可挂名度 | 6/10 | __ / 10 | |

### Plan 3 关键发现

- [x] annual_planning 必须把年度动作标注为 strategy assumption: SmallRig 没有完整年度规划 OCR 页,只能基于 page-124 品牌屋、page-002 项目回顾、page-076/077 落地线索和上游 ④⑤ 输出推演。
- [x] run-full-suite 需要兼容历史目录: Plan 1 的 ④ brand_positioning 输出仍在 `outputs/smallrig/raw-output.json`,而新 agent 使用 `outputs/smallrig-{suffix}/raw-output.json`。
- [x] merge-full-deck 生成 61 页,符合 50-80 页目标；每个 section 都加 S12 幕封,保留 source_agent 和 section 字段。
- [x] render-deck dispatch 后 `outputs/smallrig-full/index.html` 通过 `node validators/validate-swiss-deck.mjs outputs/smallrig-full/index.html`,共 61 页。
- [x] validate-swiss-deck 仍有 10 条非阻断 warning: 部分 S13/S17/S22 页面使用 fr/fr 分栏,需 Seven 浏览器肉眼确认不是居中标题 hack。
- [x] 当前本地未安装 Playwright 包,未做自动截图；本轮用 render-deck 测试、renderer 单测、HTML section 计数和 Swiss validator 验证。

### Plan 3 反哺动作

- [ ] 其他 15 Sxx 版式 (S01/S02/S04/S06/S07/S08/S10/S11/S14/S15/S16/S18/S19/S20/S21) 是否需要精雕? Plan 4-5 决定
- [ ] 全案 60-80 页是否过长? 是否需要"高管摘要 + 详情"两个版本?
- [ ] 给 render-deck 增加可选截图验证依赖或浏览器验证脚本,避免只靠 HTML 结构判断视觉质量
- [ ] 把 annual_planning 的预算/KPI 数值校准入口放进输入表单,避免后续年案只能给比例和待确认口径
