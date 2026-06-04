# Step 2 Phase D CP-D Note

Phase D Consulting Review LLM 化已接通，请 Claude 跑 CP-D review。

## 范围

- `scripts/consulting-review.mjs` 已从本地 regex/数学评分改为真实 LLM stress-test。
- `scripts/run-blueprint-suite.mjs` 已支持 `--real-llm --with-layout-designer --with-consulting-review`。
- Consulting Review 会写入：
  - `outputs/<slug>/_audit/llm-calls.jsonl`
  - `outputs/<slug>/_audit/consulting-reviews.jsonl`
- `BLOCK` 会抛错并停止；没有 silent fallback。
- `RETRY` 会把 review hint 传回 DeepResearch 并重跑一次 chunk + Layout Designer，不二次 review，避免无限循环。

## CP-D 验证命令

```bash
jq -r 'select(.purpose | startswith("consulting-review"))' outputs/smallrig/_audit/llm-calls.jsonl | wc -l
test -f outputs/smallrig/_audit/consulting-reviews.jsonl && wc -l outputs/smallrig/_audit/consulting-reviews.jsonl
jq -r '.insight_depth_score' outputs/smallrig/_audit/consulting-reviews.jsonl | sort -u | wc -l
```

当前结果：

```text
consulting LLM calls: 12
consulting review entries: 12
unique insight_depth_score values: 3
```

## 证据 A · LLM API Call Log

Audit: `outputs/smallrig/_audit/llm-calls.jsonl`

```json
{"timestamp":"2026-05-28T18:13:33.245Z","provider":"openai-compatible","model":"gpt-5.5","input_tokens":7296,"output_tokens":479,"cache_read_tokens":0,"cache_creation_tokens":0,"latency_ms":9797,"estimated_cost_usd":0.014537,"purpose":"consulting-review.p3-c6-focus-touchpoints"}
```

## 证据 B · Web Search Audit Log

Audit: `outputs/smallrig/_audit/web-searches.jsonl`

```json
{"timestamp":"2026-05-28T17:59:27.122Z","provider":"social:reddit","query":"SmallRig camera accessories user review","result_count":2,"results":[{"url":"https://www.reddit.com/r/PaperWhisperers/comments/1me0iht/best_camera_pin_2025_reviews_how_to_choose/"},{"url":"https://www.reddit.com/r/Nikon/comments/1h1d5nd/thoughts_on_the_nikon_zf_after_6_months/"}],"latency_ms":1133,"cache_hit":false}
```

## 证据 C · 真实 Chunk JSON

```json
{"path":"outputs/smallrig/_chunks/p2-c3-consumer-portraits.json","thinking_steps":5,"layout_designer_slides":4,"real_url_data_refs":12,"bad_object_strings":0}
{"path":"outputs/smallrig/_chunks/p3-c1-positioning-statement.json","thinking_steps":3,"layout_designer_slides":4,"real_url_data_refs":9,"bad_object_strings":0}
{"path":"outputs/smallrig/_chunks/p3-c4-marketing-strategy.json","thinking_steps":3,"layout_designer_slides":5,"real_url_data_refs":12,"bad_object_strings":0}
```

## 真实 Review 结论

最新每 chunk verdict：

```json
[
  {"chunk_id":"p2-c1-market-scan","insight_depth_score":5,"consulting_tone_score":7,"page_efficiency_score":4,"data_credibility_score":4,"verdict":"BLOCK"},
  {"chunk_id":"p2-c2-competition-status","insight_depth_score":5,"consulting_tone_score":7,"page_efficiency_score":4,"data_credibility_score":6,"verdict":"BLOCK"},
  {"chunk_id":"p2-c3-consumer-portraits","insight_depth_score":6,"consulting_tone_score":7,"page_efficiency_score":6,"data_credibility_score":5,"verdict":"RETRY"},
  {"chunk_id":"p3-c1-positioning-statement","insight_depth_score":7,"consulting_tone_score":8,"page_efficiency_score":6,"data_credibility_score":5,"verdict":"RETRY"},
  {"chunk_id":"p3-c4-marketing-strategy","insight_depth_score":6,"consulting_tone_score":8,"page_efficiency_score":6,"data_credibility_score":5,"verdict":"RETRY"},
  {"chunk_id":"p3-c6-focus-touchpoints","insight_depth_score":5,"consulting_tone_score":8,"page_efficiency_score":3,"data_credibility_score":3,"verdict":"BLOCK"}
]
```

这不是失败隐藏：真实 LLM review 已接通，并且确实拦下了内容质量不足的 chunk。BLOCK 的主要原因是缺少 SmallRig 一手销售/用户/渠道数据，现有外部 web search 只能支撑方向，不能支撑预算比例、心智占位和高价值人群量化。

## Phase E 状态

暂不启动 Phase E 完整 deck。原因：Plan 9 要求 `--with-consulting-review`，而当前真实 reviewer 会按设计对 3 个 chunk 抛 `BLOCK`。请 Claude/Seven 决定下一步：

1. 补充更强数据源后重跑被 BLOCK chunk。
2. 将 Phase E 改为记录 BLOCK 并继续生成 deck，仅用于 Seven 质检。
3. 调整 Consulting Review 阈值，但这会降低甲方视角拦截强度。
