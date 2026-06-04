# Changelog

## [1.0.0] - 2026-05-30 (Phase 1 Skill MVP)

### Added

- 6 个 Sub-Agent: ① 消费者洞察 / ② 行业分析 / ③ 竞争分析 / ④ 品牌定位 / ⑤ 品牌建设 / ⑥ 年度规划
- 60 个黄金概念库 + `concept-application-matrix.json`
- Chief Strategist Orchestrator: 主 Agent 负责需求澄清、根问题定义、blueprint 选择、任务派发、上下文裁剪、证据核查和整案汇总
- blueprint-driven 全案串联: `scripts/run-blueprint-suite.mjs` + `scripts/assemble-by-blueprint.mjs`
- 兼容旧入口: `scripts/run-full-suite.mjs` + `scripts/merge-full-deck.mjs` 已标记 deprecated
- render-deck.mjs Sxx 版式精雕: S03 / S05 / S09 / S12 / S13 / S17 / S22
- Web Search 双引擎: Tavily + Serper, 含 cache 与 audit log
- 5 个 adapter: Claude Code / Cursor / Cline / OpenAI API / Anthropic API / Qwen API
- SmallRig 标杆案例, 内容评分 9/10
- 跨模型验证框架, 支持 Claude / GPT-4o / Qwen / DeepSeek dry-run 与真实调用门禁

### Documentation

- 247 页《AI 实战, 从 0 到 1 打造你的品牌》14 章 ingest
- `CONCEPT-TEMPLATE.md`: P0-1 至 P0-6 红线 + 4 层 fallback 策略
- `docs/QUICKSTART.md`: 5 分钟上手
- `docs/chief-strategist-orchestrator.md`: 主 Agent 中枢架构与 task packet 协议
- `docs/CASE-GALLERY.md`: 案例库展示与评分维度
- `docs/model-agnostic-validation.md`: 跨模型验证报告

### Known Limitations

- Plan 4 真实跨模型 API validation 需要补齐 LLM API key 并确认预算后运行
- `outputs/` 与 `inputs/` 默认被 `.gitignore` 排除, 公开案例需要另行部署或截屏
- 剩余 15 个非核心 Sxx 版式精雕推迟到 Phase 1.5 / Phase 2
