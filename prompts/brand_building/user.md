# User Prompt Template · Sub-Agent ⑤ brand_building

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

## 客户上传资料摘要

{{uploaded_materials_summary}}

## 上游 Sub-Agent 输出

### Sub-Agent ④ 品牌定位 (必须传入)

{{upstream.brand_positioning | "未提供。只能生成待确认版本,不得伪造已定稿定位。"}}

### Sub-Agent ① 消费者洞察

{{upstream.consumer_insight | "未提供,可用客户资料补,并记录 assumptions"}}

### Sub-Agent ② 行业分析

{{upstream.industry_analysis | "未提供,可用客户资料补,并记录 assumptions"}}

### Sub-Agent ③ 竞争分析

{{upstream.competitor_analysis | "未提供,可用客户资料补,并记录 assumptions"}}

## 输出要求

- 风格: {{render_style}}
- 页数: {{expected_pages}} 页 (推荐 10-20)
- Web Search: 禁止调用,本 Agent 只使用资产层、客户资料和上游输出

请先读取 system prompt 要求的概念、Seven 章节和真实 OCR 页,再按契约生成 JSON。只输出 JSON,不要输出 Markdown 解释。
