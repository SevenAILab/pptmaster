# User Prompt Template · Sub-Agent ① consumer_insight

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
- 调性偏好: {{tonality}}

## 客户上传资料摘要

{{uploaded_materials_summary}}

## 上游输出

本 Sub-Agent 通常作为上游,不依赖其他 Agent 输出。

## 输出要求

- 风格: {{render_style}}
- 页数: {{expected_pages}} 页 (推荐 5-8)
- Web Search: 如 tonality 属于科技未来 / 大胆鲜活,且 target 含 Z 世代 / 银发 / 母婴等新兴群体,可主动调用不超过 3 次

请按 system prompt 的契约生成符合 JSON Schema 的输出。只输出 JSON,不要输出 Markdown 解释。
