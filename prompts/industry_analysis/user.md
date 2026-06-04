# User Prompt Template · Sub-Agent ② industry_analysis

## 当前蓝图上下文 (BLUEPRINT MODE)

{{blueprint_chunk}}

如果上方 `{{blueprint_chunk}}` 段为空或不存在，按自由模式处理（保留原有行为）。

## 上游 Chunks 摘要 (参考用，不要复制)

{{upstream_chunks_summary}}

---

## 客户基础信息

- 客户名称: {{client_name}}
- 行业: {{industry}}
- 品牌阶段: {{stage}}
- 核心产品: {{core_products}}
- 目标人群: {{target_audience}}
- 主要竞品: {{competitors}}
- 调性偏好: {{tonality}}

## 客户上传资料摘要

{{uploaded_materials_summary}}

## 上游输出

本 Sub-Agent 通常作为上游,不依赖其他 Agent 输出。若已有 consumer_insight / competitor_analysis 输出,可作为补充背景,但行业数字仍必须 web_search。

## 输出要求

- 风格: {{render_style}}
- 页数: {{expected_pages}} 页 (推荐 4-7)
- Web Search 预算: 最多 8 次,默认 Tavily,多源对比时 Serper

请先通过 `scripts/web-search.mjs` 完成 system prompt 要求的必查 4 项,再按契约生成 JSON。只输出 JSON,不要输出 Markdown 解释。
