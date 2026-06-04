# User Prompt Template · Sub-Agent ④ brand_positioning

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
- 预算量级: {{budget_level}}
- 调性偏好: {{tonality}}

## 客户上传资料摘要 (800-1500 字)

{{uploaded_materials_summary}}

## 上游 Sub-Agent 输出 (可能为空,独立运行时缺)

### Sub-Agent ① 消费者洞察

{{upstream.consumer_insight | "未提供,自行用通用方法补"}}

### Sub-Agent ② 行业分析

{{upstream.industry_analysis | "未提供,自行用通用方法补"}}

### Sub-Agent ③ 竞争分析

{{upstream.competitor_analysis | "未提供,自行用通用方法补"}}

## 输出要求

- 风格: {{render_style}} (swiss=瑞士国际主义 / magazine=电子杂志)
- 页数: {{expected_pages}} 页 (推荐 8-15)

请按 system prompt 的契约生成符合 JSON Schema 的输出。只输出 JSON,不要输出 Markdown 解释。
