# PPTAgent 上线前本地构建报告 + 上线执行方案

日期: 2026-05-28
范围: PPTAgent Phase 1 本地版上线前构建检查
状态: 本地构建闭环已完成, 不 push, 等 Claude review

## 1. 当前结论

PPTAgent 本地版已完成上线前主要构建闭环:

- 主 Agent 中枢: 已完成 `Chief Strategist Orchestrator`。
- 子 Agent 架构: 已完成 6 个 Sub-Agent 的 prompt / validator / blueprint mode 接入。
- 方案生成逻辑: 已从单 Agent 直接出稿升级为 blueprint-driven chunk orchestration。
- 实际案例验证: 已生成 PPTAgent 品牌定位案、PPTAgent 品牌建设案、通用品牌定位测试案、通用品牌建设测试案、SmallRig MI 测试案。
- 上线前门禁: `prelaunch:check`、blueprint demo cases、prelaunch readiness test 均已通过。

当前可进入 Claude review。真实上线前仍建议做一次人工浏览审阅和生产环境 smoke test。

## 2. 本轮沟通触发的问题与修复

### 2.1 用户指出: 方案没有真实提案逻辑

问题:

- 早期输出像“每页一个大结论 + 三个小点”的模板化内容。
- 缺少真实品牌定位案应有的推导链路: 行业分析 / 竞品分析 / 消费者洞察 / 自身分析 / 定位结论 / 落地动作。

修复:

- 新增品牌定位案 blueprint: `assets/_compiled/blueprints/brand-positioning-deck-v1.json`。
- 新增品牌建设案 blueprint: `assets/_compiled/blueprints/brand-building-deck-v1.json`。
- 每个 blueprint 明确 Part、chunk、页码、页面意图、负责 Sub-Agent、上游依赖和必须使用的方法论。
- `scripts/assemble-by-blueprint.mjs` 按 blueprint 顺序组装整案, 保证前后逻辑不是随机拼接。

### 2.2 用户确认: 需要主 Agent 作为中枢

问题:

- 如果 6 个 Agent 各自自由输出完整方案, 会造成上下文失控、结论重复、方案结构松散。

修复:

- 新增 `scripts/chief-strategist-orchestrator.mjs`。
- 新增 `docs/chief-strategist-orchestrator.md`。
- 新增 `chief-strategist-task-packet/v1` 协议。
- 当前架构是:
  - 主 Agent 接收并澄清需求。
  - 主 Agent 选择方案类型和 blueprint。
  - blueprint 将整案拆成 chunk。
  - 子 Agent 只负责自己 chunk 内的局部策略判断。
  - 下游 chunk 读取上游 summary。
  - 主流程集中汇总、校验、渲染。

### 2.3 用户指出: 素材、案例、SOP 可能没有吃完

问题:

- 用户担心“品牌定位案例(虚拟) / 品牌建设案例(虚拟) / SmallRig MI 升级案例(真实客户)”未被纳入输出逻辑。
- 用户担心 `2024品牌管理全工作手册` 等 SOP 型素材没有进入体系。

修复:

- 完成案例/SOP 纳入修复任务。
- 在 `docs/CASE-GALLERY.md` 中梳理当前案例库状态。
- 将三类案例作为方案结构和输出逻辑参考:
  - 品牌定位案例: 用于定位案 blueprint 的分析到结论链路。
  - 品牌建设案例: 用于建设案 blueprint 的战略到配称链路。
  - SmallRig MI 升级案例: 用于真实字段追溯和真实性约束。
- 当前输出不再只依赖单一 SmallRig 示例。

### 2.4 用户指出: SmallRig examples 和 raw-output 有编造风险

问题:

- 早期 `examples.md` 的 SmallRig 示例与 `page-124.md` 真实品牌屋字段不匹配。
- 早期 `raw-output.json` 引入了 LLM general knowledge 推演。

修复:

- `prompts/brand_positioning/examples.md` 已改为强制使用 SmallRig `page-124.md` 真实字段。
- SmallRig 示例约束包含:
  - 全球影像场景产品生态开创者
  - FREE YOUR DREAM
  - Rig UP
  - RIG 命名释义
  - 全生态 / 全场景 / 全兼容 / 快制造
  - 相机支撑 / 储能 / 手机支撑 / 灯光控制
- 新的 SmallRig MI blueprint demo 已保留真实字段追溯。

### 2.5 用户指出: 每页下面出现乱七八糟的来源和方法论碎片

问题:

- 早期渲染会把 data_refs、方法论标签、路径文本等内容直接暴露到页面视觉层。

修复:

- renderer 和 demo 输出逻辑已清理页面正文呈现。
- data_refs 保留在 JSON 结构内用于追溯, 不再作为页面正文堆到用户可见区域。
- 页面正文优先呈现提案结论、结构图和执行信息。

### 2.6 用户指出: 每页呈现形式不能完全一样

问题:

- 早期页面结构过度统一, 不像真实咨询提案。

修复:

- blueprint page intent 细分不同页面职责。
- renderer 已支持更多页面类型和内容结构。
- 当前输出按不同内容使用不同表达:
  - 市场判断页
  - 竞品矩阵页
  - 人群洞察页
  - SWOT / STP / BMC / VPC / Brand House 页
  - 命名释义页
  - 执行路线页
  - 总结页

### 2.7 用户要求: 用首次用户流程重新跑 PPTAgent 案例

用户输入的 PPTAgent 信息已作为客户资料生成两份实际输出:

- PPTAgent 品牌定位案: `outputs/pptagent-blueprint/index.html`
- PPTAgent 品牌建设案: `outputs/pptagent-building-blueprint/index.html`

修复重点:

- 避开通用 AI PPT 红海。
- 定位为面向品牌策划场景的 AI Agent 框架。
- 目标用户聚焦甲方品牌方 / 市场部人员。
- 核心壁垒来自 Seven 私有方法论资产、真实案例库和品牌策略专用 workflow。

### 2.8 自审发现: 软件 / AI Agent 品牌混入实体消费品触点

问题:

- PPTAgent 是 Web App / AI Agent 框架, 但早期 blueprint demo 继承了消费品案例中的“包装 / 门店 / 杯身 / 茶饮”等触点。

修复:

- `scripts/generate-blueprint-demo.mjs` 增加 `isStrategySoftware` 判断。
- 新增软件类品牌适配层:
  - `softwareDeckText`
  - `adaptBlueprintChunkForContext`
- 软件 / AI Agent 品牌触点改为:
  - 官网
  - 产品界面
  - demo deck
  - 帮助文档
  - 私域试用
  - onboarding 表单
  - 链接分享页
- `scripts/assemble-by-blueprint.mjs` 优先保留 chunk 输出里的适配后 `page_intent` / `page_subtitle`, 避免组装器反写原始消费品措辞。
- `scripts/test-blueprint-demo-cases.mjs` 新增策略软件测试用例, 防止串味回归。

## 3. 当前构建完成清单

### 3.1 Agent 架构

- `Chief Strategist Orchestrator`: 已完成。
- 6 个 Sub-Agent prompt: 已接入 blueprint mode。
- 6 个 Sub-Agent validators: 已接入 blueprint check。
- task packet protocol: 已完成。
- 上下文流转方式: 已完成。

### 3.2 Blueprint Flow

- 品牌定位案 blueprint: 已完成, 80 页。
- 品牌建设案 blueprint: 已完成, 95 页。
- strategic question: 已自动生成与注入。
- chunk prompt bundle: 已自动生成。
- upstream chunk summary: 已接入。
- chunk assembly: 已完成。
- consulting review: 已有本地规则版。
- HTML render: 已完成最小可上线前审阅版。

### 3.3 文档

已同步更新:

- `README.md`
- `SKILL.md`
- `docs/QUICKSTART.md`
- `docs/CHANGELOG.md`
- `docs/CASE-GALLERY.md`
- `docs/chief-strategist-orchestrator.md`
- `docs/handoffs/2026-05-28-blueprint-refactor-handoff.md`

### 3.4 测试与门禁

新增或更新:

- `scripts/prelaunch-readiness.mjs`
- `scripts/test-prelaunch-readiness.mjs`
- `scripts/test-blueprint-demo-cases.mjs`
- `scripts/test-blueprint-demo-generator.mjs`
- `scripts/test-blueprint-end-to-end.mjs`
- `scripts/test-blueprint-suite.mjs`
- `scripts/test-blueprint-assemble.mjs`
- `scripts/test-chief-strategist-orchestrator.mjs`
- `package.json` 新增 `prelaunch:check`

## 4. 当前可审阅输出

以下文件在本地 `outputs/` 下, 不进入 git:

| 输出 | 类型 | 页数/section | 当前用途 |
|---|---:|---:|---|
| `/Users/seven/Documents/文档/PPT方案大师/pptmaster/outputs/pptagent-blueprint/index.html` | PPTAgent 品牌定位案 | 80 页 / 81 sections | 核心审阅对象 |
| `/Users/seven/Documents/文档/PPT方案大师/pptmaster/outputs/pptagent-building-blueprint/index.html` | PPTAgent 品牌建设案 | 95 页 / 96 sections | 核心审阅对象 |
| `/Users/seven/Documents/文档/PPT方案大师/pptmaster/outputs/test-positioning-case-blueprint/index.html` | 通用品牌定位测试案 | 80 页 / 81 sections | 回归测试 |
| `/Users/seven/Documents/文档/PPT方案大师/pptmaster/outputs/test-building-case-blueprint/index.html` | 通用品牌建设测试案 | 95 页 / 96 sections | 回归测试 |
| `/Users/seven/Documents/文档/PPT方案大师/pptmaster/outputs/smallrig-mi-blueprint/index.html` | SmallRig MI 测试案 | 95 页 / 96 sections | 真实案例追溯测试 |

PPTAgent 两份输出静态检查结果:

- duplicateTitles = 0
- 未发现以下实体消费品串味词: 茶语 / 一杯茶 / 茶饮 / 东方生活方式 / 鲜果 / 年轻女性 / 门店 / 杯身 / 包装 / 英雄阻碍盟友

## 5. 最新验证记录

本轮重新执行并通过:

```bash
npm run prelaunch:check
node scripts/test-blueprint-demo-cases.mjs
node scripts/test-prelaunch-readiness.mjs
```

结果:

- `npm run prelaunch:check`: PASS
- `node scripts/test-blueprint-demo-cases.mjs`: PASS
- `node scripts/test-prelaunch-readiness.mjs`: PASS

当前输出静态指标:

| 文件 | HTML bytes | sections | duplicateTitles |
|---|---:|---:|---:|
| `outputs/pptagent-blueprint/index.html` | 262650 | 81 | 0 |
| `outputs/pptagent-building-blueprint/index.html` | 308083 | 96 | 0 |
| `outputs/test-positioning-case-blueprint/index.html` | 259173 | 81 | 0 |
| `outputs/test-building-case-blueprint/index.html` | 305500 | 96 | 0 |
| `outputs/smallrig-mi-blueprint/index.html` | 304763 | 96 | 0 |

## 6. 当前已知限制与风险

### 6.1 真实 LLM chunk 自动调用仍需上线环境验证

当前 `generate-blueprint-demo.mjs` 是 deterministic demo generator, 用来验证结构、链路、页面意图和渲染结果。生产版应继续使用 `run-blueprint-suite.mjs` 生成 prompt bundle, 再接入真实模型输出 chunk JSON。

风险等级: P1
处理方式: 上线 smoke test 阶段必须用真实模型跑 1 个轻量案例。

### 6.2 Web Search 真实联网链路需要线上再验

Task 7-8 已设计 Tavily / Serper 真实 source URL 流程, 但上线环境需要重新验证:

- 环境变量是否注入。
- `.env` 是否仍未进入 git。
- 搜索缓存与 search audit log 是否可写。
- source URL 是否真实可访问。

风险等级: P1
处理方式: 上线环境跑 `npm run search:test` 和一个真实竞品检索。

### 6.3 render-deck 视觉仍不是最终客户级精雕

当前 HTML 已可用于内部审阅和 demo, 但还不是 Plan 3 末尾定义的 Sxx 版式精雕最终版。

风险等级: P2
处理方式: 不阻断本地版上线前审阅, 但对外收费交付前需要继续升级 S03 / S05 / S09 / S12 / S13 / S17 / S22 等核心版式。

### 6.4 输出目录不进入 git

`inputs/` 和 `outputs/` 被 `.gitignore` 忽略, 这是正确的密钥与客户资料安全策略。但这意味着 Claude review 如需看实际 HTML, 需要 Seven 本地打开或另行打包发送。

风险等级: P2
处理方式: review 时同时提供本报告和本地 HTML 路径。

### 6.5 当前只完成两类方案 blueprint

当前已重点完成:

- 品牌定位案
- 品牌建设案

其他方案类型, 如年度传播案、产品策略案、整合营销案, 仍属于后续扩展范围。

风险等级: P2
处理方式: 首版上线范围明确限定为品牌定位 / 品牌建设。

## 7. 上线执行方案

### Phase 0: Claude Review 冻结前审查

目标: 确认当前本地版没有 P0/P1 阻断。

执行:

1. Claude 阅读本报告。
2. Claude 阅读:
   - `docs/chief-strategist-orchestrator.md`
   - `docs/handoffs/2026-05-28-blueprint-refactor-handoff.md`
   - `assets/_compiled/blueprints/brand-positioning-deck-v1.json`
   - `assets/_compiled/blueprints/brand-building-deck-v1.json`
3. Claude 打开两份 PPTAgent 输出:
   - `outputs/pptagent-blueprint/index.html`
   - `outputs/pptagent-building-blueprint/index.html`
4. Claude 给出 P0 / P1 / P2 分级意见。

通过标准:

- 无 P0。
- P1 不阻断本地首版上线, 或已有明确修复任务。

### Phase 1: 发布前代码冻结

目标: 固定可上线版本。

执行:

1. 确认 `git status` 只有允许的未跟踪文件。
2. 确认 `.env` 未出现在 git status。
3. 运行:

```bash
npm run prelaunch:check
node scripts/test-blueprint-demo-cases.mjs
node scripts/test-prelaunch-readiness.mjs
```

4. 记录 commit hash。
5. 打 tag, 例如:

```bash
git tag phase1-local-prelaunch-2026-05-28
```

通过标准:

- 三条门禁全部 PASS。
- 无密钥和客户隐私文件进入 git。

### Phase 2: 线上运行环境准备

目标: 准备可运行的生产或 staging 环境。

执行:

1. 选择部署方式:
   - Web App 后端 + worker。
   - 或先以 CLI / 内部控制台形态上线。
2. 配置 Node 版本。
3. 安装依赖。
4. 注入环境变量:
   - Tavily API key
   - Serper API key
   - 模型 API key
5. 确认运行环境可写:
   - search cache
   - audit log
   - temporary outputs

通过标准:

- 环境变量只存在于部署平台 secret manager。
- 线上日志不打印完整 key。
- `.env` 不上传、不提交。

### Phase 3: 真实模型链路接入与 smoke test

目标: 验证真实 Sub-Agent chunk 生成可以跑通。

执行:

1. 用一个轻量虚拟品牌跑品牌定位案:

```bash
npm run blueprint:suite -- <slug> --scheme brand_positioning_case --force --fail-fast
npm run blueprint:assemble -- <slug> --scheme brand_positioning_case --output-slug <slug>-blueprint
node scripts/render-deck.mjs outputs/<slug>-blueprint/raw-output.json outputs/<slug>-blueprint/index.html --style=swiss
```

2. 检查:
   - chunk JSON 是否齐全。
   - upstream summary 是否被读取。
   - thinking_log 是否保留在结构内。
   - data_refs 是否真实。
   - 页面标题是否重复。
   - HTML 是否可打开。

通过标准:

- 方案成功生成。
- validator 无 P0。
- 至少 1 个真实搜索 source URL 可追溯。

### Phase 4: Web App 使用流程接入

目标: 从用户输入到 HTML 输出形成闭环。

执行:

1. 前端只让用户选择方案类型, 不允许自由拼 blueprint。
2. 后端将 `scheme_type` 映射到固定 blueprint:
   - `brand_positioning_case`
   - `brand_building_case`
3. 用户输入标准化为:
   - 品牌名称
   - 行业/赛道
   - 品牌阶段
   - 产品/服务
   - 目标用户
   - 竞品
   - 当前问题
   - 期望解决目标
   - 调性偏好
   - 可用资料
4. 主 Agent 生成 strategic question。
5. Orchestrator 派发 chunk。
6. 子 Agent 生成局部结论。
7. 汇总为 raw-output。
8. renderer 生成 HTML。
9. 返回可分享链接。

通过标准:

- 新用户无需理解内部 Agent 架构。
- 失败时能看到明确错误, 不产生半截不可解释结果。

### Phase 5: 首批内测

目标: 用真实用户输入检验策略质量。

建议样本:

- 2 个 0-1 新品牌。
- 2 个已有品牌升级。
- 1 个真实客户资料较完整案例。
- 1 个资料极少的冷启动案例。

记录维度:

- 提案逻辑是否像真实咨询案。
- 结论是否可挂名。
- 方法论是否过度堆砌。
- 页面是否重复。
- 搜索来源是否可信。
- 用户是否愿意继续编辑和交付。

通过标准:

- 内容质量平均 7/10 以上。
- 无真实性 P0。
- 无明显行业串味。

### Phase 6: 上线后监控与复盘

目标: 形成持续优化闭环。

上线后记录:

- 每次生成的 scheme。
- validator 结果。
- search audit。
- retry 次数。
- 用户人工修改最多的页面。
- Claude / Seven review 评分。

优先优化:

- 高频失败 chunk。
- 视觉最弱页面。
- 信息不足时的追问策略。
- 真实搜索 source 质量。

## 8. 给 Claude 的 Review 请求清单

请 Claude 重点审:

1. 主 Agent / Sub-Agent / blueprint 的职责边界是否清晰。
2. 当前“主 Agent 定义需求 + blueprint 拆分 + 子 Agent 独立思考 + 主流程汇总”的结构是否适合上线。
3. 品牌定位案 blueprint 是否符合真实提案逻辑。
4. 品牌建设案 blueprint 是否符合真实提案逻辑。
5. PPTAgent 软件类品牌适配是否已经摆脱消费品案例串味。
6. SmallRig 真实性约束是否仍满足 P0-2。
7. 当前 renderer 质量是否足以支持内测, 还是必须先做版式升级。
8. 上线前是否还有 P0/P1 阻断项。

## 9. 建议 Claude 输出格式

建议 Claude 按以下格式反馈:

```markdown
# PPTAgent Prelaunch Review

## 结论
- 通过 / 有条件通过 / 阻断

## P0 阻断
- ...

## P1 上线前必须修
- ...

## P2 可 deferred
- ...

## 对 Agent 架构的判断
- ...

## 对两类 blueprint 的判断
- ...

## 对 PPTAgent 实际案例的判断
- ...

## 是否允许进入 staging / 内测
- ...
```

## 10. 当前建议

我的建议是:

- 可以把当前版本提交给 Claude 做 prelaunch review。
- 如果 Claude 无 P0, 进入 staging / 内测准备。
- 首版上线范围限定为品牌定位案和品牌建设案。
- render-deck 客户级视觉精雕继续作为后续专项, 不阻断当前内容链路验收。
