# Layout Designer Protocol

Layout Designer 是 PPTAgent Step 2 Plan 9 Phase C 的第 7 个 sub-agent。它只负责读取已有 chunk output 并选择 smart layout，不生成 slide 内容，不替代 DeepResearch，也不做 renderer 视觉升级。

## Input

输入是已由 DeepResearch 写入的 chunk JSON:

```json
{
  "agent_id": "brand_positioning",
  "blueprint_chunk_id": "p3-c1-positioning-statement",
  "chunk_takeaway": "...",
  "chunk_insights": [{ "insight": "...", "source_url": "https://..." }],
  "thinking_log": [{ "step": "plan", "content": "..." }],
  "slides": [
    {
      "page_no": 41,
      "layout": "S05",
      "action_title": "...",
      "core_points": ["..."],
      "data_refs": [{ "value": "...", "source": "https://...", "type": "quote" }],
      "models_used": ["STP"]
    }
  ]
}
```

`slide.layout` 是 blueprint 的 `recommended_layout` 或上游生成结果。Layout Designer 必须把它视为 fallback hint，而不是硬约束。

## Output

Layout Designer 必须返回严格 JSON:

```json
{
  "thinking_log": [
    { "step": "read_content", "content": "..." },
    { "step": "classify_slide_intent", "content": "..." },
    { "step": "choose_layouts", "content": "..." }
  ],
  "layout_decisions": [
    {
      "page_no": 41,
      "original_layout": "S05",
      "smart_layout": "matrix-2x2",
      "smart_layout_reason": "本页是双轴对比，用 2x2 矩阵比三层堆叠更清晰。",
      "layout_variant_hints": {
        "title_position": "top-left",
        "accent_data": "4%",
        "secondary_data_format": "small",
        "diagram_type": "matrix-2x2"
      }
    }
  ]
}
```

写回 chunk 后，每页 slide 会变成:

```json
{
  "layout_original": "S05",
  "layout": "matrix-2x2",
  "layout_designer": {
    "page_no": 41,
    "original_layout": "S05",
    "smart_layout": "matrix-2x2",
    "smart_layout_reason": "...",
    "layout_variant_hints": {}
  }
}
```

chunk 顶层也会增加:

```json
{
  "layout_designer": {
    "agent_id": "layout_designer",
    "thinking_log": [],
    "layout_decisions": []
  },
  "metadata": {
    "layout_designer_applied": true,
    "layout_designer_layout_count": 3
  }
}
```

## Allowed Smart Layouts

必须从以下 13 个 smart layout 中选择:

| smart_layout | 用途 |
|---|---|
| `hero-statement` | 大字单一判断，适合 takeaway 类页 |
| `split-statement` | 大字判断 + 小字 3-5 条论据 |
| `three-layers` | 三个并列要素或三段论 |
| `matrix-2x2` | 双轴对比、SWOT、二乘二判断 |
| `matrix-3x3` | 多维度候选项比较 |
| `flow-arrow` | 步骤推演、动作链路 |
| `timeline` | 历史、阶段、未来节奏 |
| `pyramid` | 从基础到顶层的层级 |
| `tree` | 一对多拆解 |
| `kpi-card` | 大字数据 + 小字注解 |
| `framework-grid` | PESTEL / 4P / 5C 等框架格子 |
| `brand-house-9-layer` | 品牌屋九层结构 |
| `image-hero` | 视觉锤、大图主导页面 |

## Current Renderer Mapping

Phase C 只做智能选 layout。`render-deck.mjs` 暂时把 smart layout 映射到现有 Sxx renderer，不重写 11 个 renderer，也不做视觉升级:

| smart_layout | Current Sxx |
|---|---|
| `hero-statement` | `S22` |
| `split-statement` | `S03` |
| `three-layers` | `S05` |
| `matrix-2x2` | `S17` |
| `matrix-3x3` | `S15` |
| `flow-arrow` | `S09` |
| `timeline` | `S09` |
| `pyramid` | `S13` |
| `tree` | `S13` |
| `kpi-card` | `S22` |
| `framework-grid` | `S15` |
| `brand-house-9-layer` | `S17` |
| `image-hero` | `S22` |

## Validation Rules

- Must call `callClaude`; no deterministic layout template is allowed.
- LLM failure must throw. No silent fallback.
- `thinking_log.length >= 3`.
- `layout_decisions.length === slides.length`.
- Every `page_no` must match an input slide.
- Every `smart_layout` must be in the allowed list.
- Every `smart_layout_reason` must explain the page-specific content decision.
- Multi-page chunks must not assign `split-statement` to every slide.
- Default tests inject a fake `callStep` and must not require a real API key.

## Running

Layout Designer is optional in the blueprint suite:

```bash
node scripts/run-blueprint-suite.mjs smallrig --scheme brand_positioning_case --only-chunk p2-c1-market-scan --with-layout-designer --fail-fast
```

The command expects an existing chunk JSON at `outputs/<slug>/_chunks/<chunk_id>.json` unless the suite is run with `--force` and the upstream generation path writes a chunk output first.
