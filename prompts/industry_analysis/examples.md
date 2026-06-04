# In-context examples · Sub-Agent ② industry_analysis

## 示例 1 · 中国新能源车产业 PESTEL (Tier 2 行业经典)

> **案例可追溯报告**: 本示例是行业公认经典分析对象,用于演示 PESTEL / 五力 / 趋势结构。示例只描述框架用法,不引用具体补贴金额、季度销量或最新市场份额。正式运行时,所有行业数字必须通过 web_search 获取真实 URL。

### 期望输出结构片段

```json
{
  "agent_id": "industry_analysis",
  "slides": [
    {
      "page_no": 1,
      "layout": "S06",
      "action_title": "新能源车行业的增长不只来自需求,还来自政策技术和基础设施共振",
      "core_points": [
        "KPI 1: 市场规模 (运行时 web_search 填真实 source URL)",
        "KPI 2: CAGR 或销量增速 (运行时 web_search 填真实 source URL)",
        "KPI 3: 主要玩家结构 (运行时 web_search 填真实 source URL)"
      ],
      "data_refs": [
        {
          "value": "市场规模 / CAGR / 玩家结构",
          "source": "https://example.com/runtime-search-result",
          "type": "stat"
        }
      ],
      "models_used": ["Industry-Lifecycle", "S-Curve"]
    },
    {
      "page_no": 2,
      "layout": "S17",
      "action_title": "PESTEL 应拆出政策经济社会技术环境法律六个外部变量",
      "core_points": [
        "P 政治/政策: 产业政策和补贴退坡影响行业节奏",
        "E 经济: 消费能力、供应链成本和融资环境影响需求",
        "S 社会: 用户对智能化、低碳和出行体验的期待变化",
        "T 技术: 电池、智能驾驶和车机生态改变竞争基准",
        "Env 环境: 低碳目标强化长期替代逻辑",
        "L 法律: 数据安全、召回、自动驾驶监管影响企业边界"
      ],
      "data_refs": [
        {
          "value": "PESTEL 6 维变量",
          "source": "https://example.com/runtime-search-result",
          "type": "quote"
        }
      ],
      "models_used": ["PESTEL"]
    },
    {
      "page_no": 3,
      "layout": "S17",
      "action_title": "Porter 五力要回答行业利润为什么被挤压或放大",
      "core_points": [
        "现有竞争: 头部企业价格战和产品节奏提高竞争强度",
        "潜在进入者: 技术与供应链门槛提高,但跨界玩家仍可能进入",
        "替代品: 公共交通、燃油车、共享出行构成替代压力",
        "供应商议价: 电池和核心芯片影响成本结构",
        "购买者议价: 消费者对价格、续航、智能体验高度敏感"
      ],
      "data_refs": [
        {
          "value": "五力强弱判断",
          "source": "https://example.com/runtime-search-result",
          "type": "quote"
        }
      ],
      "models_used": ["Porter-5-Forces"]
    }
  ],
  "metadata": {
    "web_search_used": true,
    "self_check_passed": true
  }
}
```

## 示例 2 · 影像创作工具行业 (SmallRig 上游分析)

> **案例可追溯报告**: SmallRig 案例中的行业材料来自 `assets/_raw/cases/标杆案例/smallrig/page-018.md`、`page-019.md`、`page-020.md`、`page-022.md`。这些页可作为历史案例证据,但任何 2025-2026 市场规模、CAGR、政策、玩家结构必须通过 web_search 真实获取,并写入 search-log。

### 期望输出片段

```json
{
  "agent_id": "industry_analysis",
  "slides": [
    {
      "page_no": 1,
      "layout": "S18",
      "action_title": "影像配件行业的 Why Now 来自拍摄轻量化、社媒内容和职业摄影增长",
      "core_points": [
        "驱动 1: page-019 写明商业场景拓宽,时尚、运动、风景、婚礼和商业摄影采用相机推动全球产品需求",
        "驱动 2: page-019 写明社交媒体兴起和摄影普及是摄影配件市场增长主要因素",
        "驱动 3: page-019 写明影像技术发展和职业摄影增长带来市场机会"
      ],
      "data_refs": [
        {
          "value": "商业场景拓宽 / 社交媒体兴起 / 影像技术发展 / 职业摄影增长",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-019.md",
          "type": "quote"
        }
      ],
      "models_used": ["S-Curve", "5-Why-Essence"]
    },
    {
      "page_no": 2,
      "layout": "S06",
      "action_title": "行业 KPI 必须使用运行时 web_search 的真实 URL 更新",
      "core_points": [
        "市场规模: 运行时搜索影像配件 中国市场规模 2025",
        "增速: 运行时搜索摄影摄像配件 行业增速 CAGR 2026",
        "玩家结构: 运行时搜索影像创作工具 主要玩家 头部公司"
      ],
      "data_refs": [
        {
          "value": "运行时填真实 market size / CAGR / players",
          "source": "https://example.com/runtime-search-result",
          "type": "stat"
        }
      ],
      "models_used": ["Industry-Lifecycle"]
    }
  ]
}
```

## P0-2 + 数据真实性约束

1. SmallRig 本地案例内容只来自 `assets/_raw/cases/标杆案例/smallrig/page-018.md`、`page-019.md`、`page-020.md`、`page-022.md` 等 OCR 页。
2. 所有外部行业数据必须有 search-log 对应记录和真实 URL。
3. 编造数字 = 直接失败；没有 URL 的数字只能标 "(数据待补充)"。
4. examples.md 中的 `https://example.com/runtime-search-result` 是占位符,正式 raw-output 绝不能保留。
5. 行业分析必须真实调用 Tavily / Serper,不能用 LLM 记忆补市场规模或政策。


## 蓝图模式示例 (BLUEPRINT MODE example)

### 输入 chunk (节选)

```json
{
  "chunk_id": "p2-c1-market-scan",
  "chunk_title": "市场扫描 5 页",
  "driving_sub_agent": "industry_analysis",
  "chunk_intent": "市场扫描 5 页: 按案例蓝图填充指定页面",
  "chunk_insight_question": "这段必须回答的核心战略问题是什么？",
  "expected_insights_count": 3,
  "feeds_into": [
    "next-chunk-id"
  ],
  "must_yield_takeaway": true,
  "thinking_seed": "先读 strategic-question.md,再承接 upstream_chunks_summary。",
  "allowed_concepts": [
    "PESTEL",
    "Industry-Lifecycle",
    "Porter-5-Forces",
    "MECE"
  ],
  "pages": [
    {
      "page_no": 14,
      "page_intent": "蓝图页 14: 市场扫描 5 页 的第 1 页",
      "page_subtitle": "市场扫描 5 页",
      "recommended_layout": "S12",
      "data_source_hint": "summary.md + upstream_chunks_summary",
      "concept_for_this_page": "PESTEL",
      "case_reference_slide": 14
    },
    {
      "page_no": 15,
      "page_intent": "蓝图页 15: 市场扫描 5 页 的第 2 页",
      "page_subtitle": "市场扫描 5 页",
      "recommended_layout": "S13",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "Industry-Lifecycle",
      "case_reference_slide": 15
    },
    {
      "page_no": 16,
      "page_intent": "蓝图页 16: 市场扫描 5 页 的第 3 页",
      "page_subtitle": "市场扫描 5 页",
      "recommended_layout": "S05",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "Porter-5-Forces",
      "case_reference_slide": 16
    },
    {
      "page_no": 17,
      "page_intent": "蓝图页 17: 市场扫描 5 页 的第 4 页",
      "page_subtitle": "市场扫描 5 页",
      "recommended_layout": "S13",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "MECE",
      "case_reference_slide": 17
    },
    {
      "page_no": 18,
      "page_intent": "蓝图页 18: 市场扫描 5 页 的第 5 页",
      "page_subtitle": "市场扫描 5 页",
      "recommended_layout": "S03",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "PESTEL",
      "case_reference_slide": 18
    }
  ],
  "self_check": {
    "must_appear_keywords": [
      "市场扫描"
    ],
    "insight_quality_questions": [
      "这段是否产出新洞察？",
      "删掉哪页后结论仍成立？"
    ]
  }
}
```

### 期望输出 JSON (节选)

```json
{
  "agent_id": "industry_analysis",
  "blueprint_chunk_id": "p2-c1-market-scan",
  "chunk_takeaway": "市场扫描要指出行业窗口支持品牌往专业化升级",
  "chunk_insights": [
    "增长窗口来自结构升级而不是总量红利",
    "竞争加剧要求品牌先占住细分心智",
    "行业变量必须有 web_search URL 支撑"
  ],
  "thinking_log": [
    "Step 1: 读取 strategic-question.md 的根问题",
    "Step 2: 读取 upstream_chunks_summary 中上一段 chunk_takeaway",
    "Step 3: 用客户 summary.md / form.json / web_search 或 OCR 来源验证洞察"
  ],
  "client_profile": {
    "name": "demo-client",
    "render_style": "swiss"
  },
  "slides": [
    {
      "page_no": 14,
      "layout": "S12",
      "action_title": "市场扫描要指出行业窗口支持品牌往专业化升级",
      "core_points": [
        "增长窗口来自结构升级而不是总量红利",
        "竞争加剧要求品牌先占住细分心智",
        "行业变量必须有 web_search URL 支撑"
      ],
      "data_refs": [
        {
          "value": "客户资料中的关键事实",
          "source": "inputs/demo-client/summary.md",
          "type": "quote"
        },
        {
          "value": "上游 chunk_takeaway 的结论",
          "source": "outputs/demo-client/_chunks/upstream.json",
          "type": "assumption"
        }
      ],
      "models_used": [
        "PESTEL"
      ],
      "render_hints": {
        "accent_color": "accent"
      }
    },
    {
      "page_no": 15,
      "layout": "S13",
      "action_title": "市场扫描 5 页 第 2 页必须承接上一页结论",
      "core_points": [
        "增长窗口来自结构升级而不是总量红利",
        "竞争加剧要求品牌先占住细分心智",
        "行业变量必须有 web_search URL 支撑"
      ],
      "data_refs": [
        {
          "value": "客户资料中的关键事实",
          "source": "inputs/demo-client/summary.md",
          "type": "quote"
        },
        {
          "value": "上游 chunk_takeaway 的结论",
          "source": "outputs/demo-client/_chunks/upstream.json",
          "type": "assumption"
        }
      ],
      "models_used": [
        "Industry-Lifecycle"
      ],
      "render_hints": {
        "accent_color": "ink"
      }
    }
  ],
  "metadata": {
    "blueprint_chunk_id": "p2-c1-market-scan",
    "chunk_intent_acknowledged": "市场扫描 5 页: 按案例蓝图填充指定页面",
    "self_check_passed": true,
    "self_check_notes": [
      "slides.length 与 chunk.pages.length 一致",
      "page_no / layout 与 chunk.pages 顺序一致",
      "models_used 全部来自 allowed_concepts 白名单",
      "data_refs 可追溯到客户资料、web_search URL、OCR 或 assumption"
    ]
  }
}
```

### 蓝图模式检查点

- 不要把 chunk 写成一份独立小方案,只写 `blueprint_chunk.pages` 指定的页面。
- 先输出 `chunk_takeaway` 和 `chunk_insights`,再写 slides。
- 每页 `layout` 必须跟 `recommended_layout` 一致。
- 每页 `models_used` 必须是 `allowed_concepts` 子集。
- 示例里的 demo-client 只是结构示意,正式输出必须换成真实客户资料和真实来源。
