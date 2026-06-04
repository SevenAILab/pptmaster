# Step 1 Real LLM DeepResearch Spike Handoff

日期: 2026-05-28
分支: `step1-real-llm-spike`
状态: Task 1-9 本地完成, 不 push, 等 Seven CP-3 终审

## 1. 结论

Step 1 已接通 LLM。

本次真实接通范围很窄: 只接通 `industry_analysis` 在 blueprint chunk `p2-c1-market-scan` 上的 5 步 DeepResearch loop, 并用 SmallRig 跑通一次真实端到端 chunk 输出。

本次没有接通其他 5 个 Sub-Agent, 没有跑完整 deck, 没有升级 renderer, 没有把 consulting-review LLM 化。

## 2. 真调用范围

### 已接通 LLM

- `scripts/run-sub-agent.mjs`
  - 新增 `--real-llm`
  - `industry_analysis + blueprint chunk` 时进入 DeepResearch loop
  - 其他 agent 保留单次真实 LLM 调用路径, 但本 Step 没扩展验证
- `scripts/llm-clients/claude-client.mjs`
  - 保留 `callClaude` 入口名
  - 支持 Anthropic messages
  - 支持 OpenAI-compatible `chat_completions` 网关
- `scripts/sub-agents/industry-analysis-deepresearch.mjs`
  - 真实执行 plan / search / read / synthesize / write

### 已接通 Web Search

- `scripts/web-search.mjs`
  - Tavily / Serper 真实 API
  - 每次带 `slug` 的搜索写入 `outputs/<slug>/_audit/web-searches.jsonl`

### 已接通 Audit Log

- `scripts/audit-log.mjs`
  - `appendLLMAuditLog`
  - `appendWebSearchAuditLog`
  - `readLLMAuditLog`
  - `readWebSearchAuditLog`
  - `summarizeLLMUsage`
  - `estimateCost`

## 3. 真实产物

真实运行命令:

```bash
node scripts/run-sub-agent.mjs industry_analysis smallrig \
  --real-llm \
  --blueprint assets/_compiled/blueprints/brand-positioning-deck-v1.json \
  --chunk-id p2-c1-market-scan
```

真实输出:

- `outputs/smallrig/_chunks/p2-c1-market-scan.json`
- `outputs/smallrig/_audit/llm-calls.jsonl`
- `outputs/smallrig/_audit/web-searches.jsonl`

关键数据:

| 指标 | 结果 |
|---|---:|
| LLM 调用 | 4 |
| Web Search | 8 |
| thinking_log | 5 steps |
| slides | 5 |
| data_refs 真 URL | 15/15 |
| 来源域名 | 8 |
| 估算成本 | $0.106634 |
| LLM latency 合计 | 200413ms |

chunk takeaway:

> 相机配件行业窗口更支持 SmallRig 从“专业配件单品”升级为“专业化底座上的场景化与效率化创作解决方案”，高端化应服务于无反、视频、直播、短剧等具体工作流，而不是孤立提价。

## 4. Mock / Placeholder 仍然存在的范围

以下内容仍未接通 LLM, 不应被误认为完成:

- 其他 5 个 Sub-Agent 的 DeepResearch loop: 未接通
- 完整 13 chunk 品牌定位 deck: 未真实跑
- `generate-blueprint-demo.mjs`: 仍是历史本地 demo generator (未接通 LLM), 本 Step 只用作 baseline 对比, 没扩展它
- `consulting-review.mjs`: 仍是本地规则 review, 未 LLM 化
- renderer 视觉精修: 未做
- Web App: 未做

## 5. 反 Mock 自检

| 红线 | 结果 |
|---|---|
| 新增未接通 LLM 的模板生成器 | 未新增 |
| regex 假冒 LLM 评分 | 未新增 |
| 假来源 data_refs | 真实 chunk 为 15/15 URL |
| thinking_log 空或少于 5 step | 真实 chunk 为 5 step |
| 静默降级到假数据 | 未发现 |
| hardcode API key | 未发现, key 在 `.env` |
| handoff 模糊化 mock 状态 | 本 handoff 明确标注已接通 / 未接通范围 |

## 6. 验证命令

已通过:

```bash
node scripts/test-audit-log.mjs
node scripts/test-real-llm-smoke.mjs
node scripts/test-web-search.mjs
node scripts/test-deepresearch-retry.mjs
node scripts/test-run-sub-agent.mjs
```

已通过旧 validator:

```bash
validateSubAgentOutput('industry_analysis', 'smallrig', p2-c1-market-scan)
```

CP-2 关键检查:

```bash
grep -E 'callClaude|tavilySearch|serperSearch|webSearch' scripts/sub-agents/*.mjs scripts/web-search.mjs | wc -l
# 18

wc -l outputs/smallrig/_audit/llm-calls.jsonl
# 4

jq -r '.blueprint_chunk_id + ": " + ((.thinking_log|length)|tostring) + " steps"' outputs/smallrig/_chunks/p2-c1-market-scan.json
# p2-c1-market-scan: 5 steps
```

## 7. Seven CP-3 请看

请重点看:

1. `outputs/_baseline-mock/COMPARISON.md`
2. `outputs/smallrig/_chunks/p2-c1-market-scan.json`
3. `outputs/smallrig/_audit/llm-calls.jsonl`
4. `outputs/smallrig/_audit/web-searches.jsonl`

建议判断标准:

- 真实版是否明显强于 mock 版
- 来源是否足够可信
- 这个 loop 是否值得复制到其他 5 个 Sub-Agent
- 是否需要先调优 search query/source quality, 再进入 Step 2
