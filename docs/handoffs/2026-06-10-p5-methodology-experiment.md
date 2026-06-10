# P5 方法论接入 + 去过拟合实验记录

日期：2026-06-10  
仓库：`/Users/seven/Documents/文档/PPT方案大师/pptmaster`  
Provider：`openai-compatible` / `gpt-5.5`（经 `claude-client.mjs` 适配）

## 实验设置

- A 组：`pptagent-phase3-validation-20260602-155549`，带 research + methodology，输出 `outputs/p5-pptagent-with-methodology/`
- B 组：同一 brief、同一 research-brief，关闭 methodology，输出 `outputs/p5-pptagent-no-methodology/`
- 跨行业 fixture：`fixture-luma-coffee`，带 research + methodology，输出 `outputs/p5-fixture-luma-coffee/`
- 说明：完整 CLI A 组曾两次因外部调用耗时超时（120s/300s）；最终复用已落盘 `research-brief.json` 与 `methodology-selection.json` 直接生成 deck，避免重复 web search / research 归纳。咖啡 fixture 第一次遇到 `mdlbus.com ECONNRESET`，第二次重跑成功。

## A/B 结果

| 指标 | 无方法论 | 带方法论 |
|---|---:|---:|
| pages | 5 | 5 |
| process locks | PASS | PASS |
| methodology usage | N/A | PASS，3/5 页 |
| frameworks | N/A | STP / JTBD / Brand-House |
| deterministic repetitionRate | 0% | 0% |
| semanticRepetitionRate | 20% | 20% |
| newInsightRate | 80% | 100% |
| actionability | 100% | 100% |
| sourcedRatio | 100% | 100% |
| externalEmpiricalRatio | 0% | 0% |

`externalEmpiricalRatio=0` 是当前评分口径的弱点：deck 有外部研究 URL 和数字，但 scorer 仍把外部 empirical 页计为 0；这应进入 P8 研究证据评分优化。

## 人工判读

- Page 2 `[框架: STP]`：用于收窄 0-1 目标人群，落到甲方品牌/市场负责人优先、顾问作为第二增长曲线，不是复述 STP 定义。
- Page 3 `[框架: JTBD]`：用于解释用户雇佣 PPTAgent 的任务是形成可被相信的品牌判断，而不是生成页面，不是定义复述。
- Page 4 `[框架: Brand-House]`：用于把定位、RTB、Sub-Agent、Seven 私有资产收进同一品牌屋结构，不是品牌屋概念说明。
- A 组比 B 组少了 B 组 page 3/5 那种“再说一次不是 AI PPT 工具”的重复，语义 newInsightRate 从 0.8 提升到 1.0。

## Fixture 结果

- `fixture-luma-coffee`：process locks PASS；methodology usage PASS，4/5 页。
- 选中框架：STP / Perceptual-Map / Brand-Positioning-Triangle / 4P。
- HTML 渲染：`outputs/p5-fixture-luma-coffee/deck.html` 生成成功。
- 研究问题抽查：无 `site:`；无 Gamma / Beautiful.ai / Canva / PPT 竞品污染；内容聚焦精品咖啡、Manner、M Stand、瑞幸、目标人群与扩张。

## 跨模型 Smoke

SKIPPED：本机 `.env` 仅有 `ANTHROPIC_API_KEY` / `ANTHROPIC_BASE_URL` / `ANTHROPIC_WIRE_API` / `ANTHROPIC_MODEL`；`OPENAI_API_KEY`、`DASHSCOPE_API_KEY`、`DEEPSEEK_API_KEY` 均缺失。未静默跳过。

## Acceptance Gates

| Gate | 结果 |
|---|---|
| 全量离线测试 | PASS |
| A 组 process locks + methodology usage | PASS，usage 3/5 页 |
| A 组 semanticRepetitionRate | PASS，20%，不高于 B 组 |
| A 组 actionability | PASS，100% |
| A 组人工判读 | PASS，框架落到客户判断，无整页定义复述 |
| fixture-luma-coffee 真跑 | PASS，locks + usage + HTML 渲染 |
| 跨模型 smoke | SKIPPED，缺第二 provider key |
| 红线：无 source ref 不伪造 | PASS，`test-generate-nonlocked-deck.mjs` 覆盖 |

## P6/P8 建议

- P6 自检 loop 应重点批评“框架标注页是否真的产生新判断”，避免模型只为了过 usage gate 插标签。
- P8 应修正外部证据评分：当 data_refs 为真实 URL 且页内有对应数字时，不应全部落入 `externalEmpiricalRatio=0`。
- 真实 CLI 运行需要更强的超时/重试/阶段复用能力：研究、方法论选择、生成已经有落盘产物，应支持从中间产物恢复，避免 provider 抖动导致整条链重跑。
