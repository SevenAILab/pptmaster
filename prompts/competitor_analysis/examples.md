# In-context examples · Sub-Agent ③ competitor_analysis

## 示例 1 · SmallRig 主要竞品对比 (运行时 web_search 真实数据)

> **案例可追溯报告**: SmallRig 本地竞品事实只来自 `assets/_raw/cases/标杆案例/smallrig/page-073.md`、`page-074.md`、`page-075.md` 的 OCR 原文。`page-074.md` 只有"行业竞品对比"标题,不可当作事实来源。`page-075.md` 给出 JOBY / Manfrotto / Litepanels / Videndum / SmallRig 等定位描述。Manfrotto / Ulanzi / Tilta / PolarPro 等竞品的当前定位、价格带、最近动态必须运行时通过 web_search 真实获取,不要复用本示例任何具体数字。

### 输入要点

```json
{
  "client_profile": {
    "name": "SmallRig 斯莫格",
    "industry": "影像场景产品生态",
    "stage": "100+ 转型升级",
    "core_products": ["相机支撑与稳定", "储能解决方案", "手机支撑与稳定", "灯光与控制系统"],
    "target_audience": ["影像内容创作者"],
    "competitors": ["Manfrotto", "Ulanzi", "Tilta", "PolarPro"],
    "tonality": "理性专业",
    "render_style": "swiss",
    "expected_pages": 7
  }
}
```

### 期望输出结构片段 (示意, 非真实搜索结果)

```json
{
  "agent_id": "competitor_analysis",
  "slides": [
    {
      "page_no": 1,
      "layout": "S15",
      "action_title": "SmallRig 的竞争场从单一摄影配件转向影像场景生态",
      "core_points": [
        "page-075 将 SmallRig 写为全球影像场景产品生态领导者",
        "page-075 将 Manfrotto 写为服务专业摄影、电影、戏剧、现场娱乐和视频市场的相机与照明支持设备品牌",
        "Ulanzi / Tilta / PolarPro 的当前定位必须运行时 web_search 获取,不可用模型记忆填充"
      ],
      "data_refs": [
        {
          "value": "SmallRig: 全球影像场景产品生态领导者",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-075.md",
          "type": "quote"
        },
        {
          "value": "Manfrotto: 为专业摄影、电影、戏剧、现场娱乐和视频市场设计、制造和销售各种相机和照明支持设备",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-075.md",
          "type": "quote"
        }
      ],
      "models_used": ["Competitor-Matrix"]
    },
    {
      "page_no": 2,
      "layout": "S15",
      "action_title": "四维竞品矩阵必须把定位价格带人群和差异化点并排比较",
      "core_points": [
        "定位: 每个竞品用官网或权威媒体 source URL 填写",
        "价格带: 用运行时搜索到的代表产品价格或官网价格页填充,无 URL 则标数据待补充",
        "目标人群: 从竞品官网、产品页或媒体报道提炼,不可凭经验补写",
        "差异化点: 用 Competitor-Matrix 归纳证据,不要把口号当事实"
      ],
      "data_refs": [
        {
          "value": "Manfrotto 品牌定位 / 公司介绍",
          "source": "https://example.com/runtime-search-result-manfrotto-positioning",
          "type": "quote"
        },
        {
          "value": "Ulanzi 最近动态 / 产品发布",
          "source": "https://example.com/runtime-search-result-ulanzi-news",
          "type": "quote"
        }
      ],
      "models_used": ["Competitor-Matrix", "4P-Comparison"]
    },
    {
      "page_no": 3,
      "layout": "S15",
      "action_title": "知觉地图要找未被占据的位置而不是重述竞品名单",
      "core_points": [
        "横轴示例: 专业深度从入门便携到影视级专业",
        "纵轴示例: 生态开放度从单品配件到多场景系统",
        "机会点示例: 如果搜索证据支持,SmallRig 可占据专业可信且开放生态的位置"
      ],
      "data_refs": [
        {
          "value": "各竞品定位与代表产品证据",
          "source": "https://example.com/runtime-search-result-competitor-map",
          "type": "quote"
        }
      ],
      "models_used": ["Perceptual-Map", "5-Why-Essence"]
    },
    {
      "page_no": 4,
      "layout": "S08",
      "action_title": "SWOT 应把 SmallRig 的全生态主张转化为可防守差异",
      "core_points": [
        "S: page-073 提到行业标准制定者、产品销量全球第一、品类最全、好评率 99% 等 RTB 方向,但均需数据支撑",
        "W: 若缺销量、标准或好评率外部证据,不能把 RTB 写成已证实领先",
        "O: 内容创作工具向全场景生态升级时,可用竞品空白象限定义增长机会",
        "T: 价格战、相似配件供给和专业品牌信任壁垒需要用 web_search 证据判断"
      ],
      "data_refs": [
        {
          "value": "RTB 定位支撑方向均标注需数据支撑",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-073.md",
          "type": "quote"
        }
      ],
      "models_used": ["SWOT", "TOWS"]
    }
  ],
  "metadata": {
    "methodology_sources": ["Competitor-Matrix", "Perceptual-Map", "SWOT"],
    "search_queries": [
      "Manfrotto 品牌定位",
      "Manfrotto 最近动态",
      "Ulanzi 品牌定位",
      "Ulanzi 最近动态"
    ],
    "assumptions": [
      "本示例中的 example.com 仅为占位。正式 raw-output 必须替换为真实 URL。"
    ],
    "web_search_used": true,
    "self_check_passed": true
  }
}
```

### 示例原则

- Action Title 必须直接给结论,不要写 "竞品分析"。
- SmallRig 本地静态事实只能来自 `page-073.md` 与 `page-075.md`;`page-074.md` 只有标题。
- Ulanzi / Tilta / PolarPro 不在 `page-075.md` OCR 中,只能来自 `client_profile.competitors` 或运行时 web_search。
- 每个竞品至少 2 次搜索: 定位 / 公司介绍 + 最近动态 / 产品发布。
- search-log.json 必须能对应每个竞品的核心叙述。

## 示例 2 · 中国新能源车竞品矩阵 (Tier 2 经典, 框架级演示)

> **案例可追溯报告**: 本示例只演示 Competitor-Matrix / Perceptual-Map / SWOT 的结构使用,不引用具体销量、市场份额或最新价格。正式运行时,所有竞品定位、价格、车型动态和销量数据都必须通过 web_search 获取真实 URL。

### 关键输出方向

```json
{
  "agent_id": "competitor_analysis",
  "slides": [
    {
      "page_no": 1,
      "layout": "S15",
      "action_title": "蔚小理与比亚迪的竞争差异应拆成定位价格人群和技术叙事",
      "core_points": [
        "定位: 运行时搜索品牌官网和近期发布会资料",
        "价格带: 运行时搜索代表车型官方指导价或权威汽车媒体数据",
        "目标人群: 从品牌沟通、车型级别和渠道打法提炼",
        "差异化点: 用智能化、补能、空间、性价比等轴线比较"
      ],
      "data_refs": [
        {
          "value": "运行时填真实 source URL",
          "source": "https://example.com/runtime-search-result",
          "type": "quote"
        }
      ],
      "models_used": ["Competitor-Matrix"]
    },
    {
      "page_no": 2,
      "layout": "S15",
      "action_title": "知觉地图的价值是识别价格战之外的未占据心智",
      "core_points": [
        "轴线一: 价格效率从大众性价比到高端溢价",
        "轴线二: 技术叙事从硬件性能到智能体验",
        "机会点: 只有当搜索证据支持时才写为确定机会"
      ],
      "data_refs": [
        {
          "value": "运行时填真实 source URL",
          "source": "https://example.com/runtime-search-result",
          "type": "quote"
        }
      ],
      "models_used": ["Perceptual-Map"]
    }
  ],
  "metadata": {
    "web_search_used": true,
    "self_check_passed": true
  }
}
```

## 数据真实性约束 (重要)

1. SmallRig 本地案例内容只来自 `assets/_raw/cases/标杆案例/smallrig/page-073.md`、`page-074.md`、`page-075.md` 等 OCR 页。
2. 竞品当前定位 / 最近动态 / 价格带 / 具体数据必须运行时通过 web_search 真实获取。
3. search-log.json 必须含每个竞品至少 2 次成功搜索,并保留真实 URL。
4. 编造竞品数据 = 直接失败；没有 URL 的竞品数据只能标 "(数据待补充)"。
5. examples.md 中的 `https://example.com/runtime-search-result` 是占位符,正式 raw-output 绝不能保留。
6. 禁止用 LLM general knowledge 推演竞品定位,即使你"觉得"知道某个品牌。
7. page-073 中的行业标准制定者、销量全球第一、品类最全、好评率 99% 只是待证 RTB 方向；没有外部 source 时不能写成已证明事实。


## 蓝图模式示例 (BLUEPRINT MODE example)

### 输入 chunk (节选)

```json
{
  "chunk_id": "p2-c2-competition-status",
  "chunk_title": "竞争态势 6 页",
  "driving_sub_agent": "competitor_analysis",
  "chunk_intent": "竞争态势 6 页: 按案例蓝图填充指定页面",
  "chunk_insight_question": "这段必须回答的核心战略问题是什么？",
  "expected_insights_count": 3,
  "feeds_into": [
    "next-chunk-id"
  ],
  "must_yield_takeaway": true,
  "thinking_seed": "先读 strategic-question.md,再承接 upstream_chunks_summary。",
  "allowed_concepts": [
    "Competitor-Matrix",
    "Perceptual-Map",
    "Porter-5-Forces",
    "SWOT"
  ],
  "pages": [
    {
      "page_no": 19,
      "page_intent": "蓝图页 19: 竞争态势 6 页 的第 1 页",
      "page_subtitle": "竞争态势 6 页",
      "recommended_layout": "S13",
      "data_source_hint": "summary.md + upstream_chunks_summary",
      "concept_for_this_page": "Competitor-Matrix",
      "case_reference_slide": 19
    },
    {
      "page_no": 20,
      "page_intent": "蓝图页 20: 竞争态势 6 页 的第 2 页",
      "page_subtitle": "竞争态势 6 页",
      "recommended_layout": "S05",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "Perceptual-Map",
      "case_reference_slide": 20
    },
    {
      "page_no": 21,
      "page_intent": "蓝图页 21: 竞争态势 6 页 的第 3 页",
      "page_subtitle": "竞争态势 6 页",
      "recommended_layout": "S05",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "Porter-5-Forces",
      "case_reference_slide": 21
    },
    {
      "page_no": 22,
      "page_intent": "蓝图页 22: 竞争态势 6 页 的第 4 页",
      "page_subtitle": "竞争态势 6 页",
      "recommended_layout": "S17",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "SWOT",
      "case_reference_slide": 22
    },
    {
      "page_no": 23,
      "page_intent": "蓝图页 23: 竞争态势 6 页 的第 5 页",
      "page_subtitle": "竞争态势 6 页",
      "recommended_layout": "S17",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "Competitor-Matrix",
      "case_reference_slide": 23
    },
    {
      "page_no": 24,
      "page_intent": "蓝图页 24: 竞争态势 6 页 的第 6 页",
      "page_subtitle": "竞争态势 6 页",
      "recommended_layout": "S12",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "Perceptual-Map",
      "case_reference_slide": 24
    }
  ],
  "self_check": {
    "must_appear_keywords": [
      "竞争态势"
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
  "agent_id": "competitor_analysis",
  "blueprint_chunk_id": "p2-c2-competition-status",
  "chunk_takeaway": "竞争态势的结论应是可占心智空位而不是竞品清单",
  "chunk_insights": [
    "竞品按流派分层而不是按知名度排列",
    "矩阵只比较会影响定位的变量",
    "空白象限必须由真实竞品资料验证"
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
      "page_no": 19,
      "layout": "S13",
      "action_title": "竞争态势的结论应是可占心智空位而不是竞品清单",
      "core_points": [
        "竞品按流派分层而不是按知名度排列",
        "矩阵只比较会影响定位的变量",
        "空白象限必须由真实竞品资料验证"
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
        "Competitor-Matrix"
      ],
      "render_hints": {
        "accent_color": "accent"
      }
    },
    {
      "page_no": 20,
      "layout": "S05",
      "action_title": "竞争态势 6 页 第 2 页必须承接上一页结论",
      "core_points": [
        "竞品按流派分层而不是按知名度排列",
        "矩阵只比较会影响定位的变量",
        "空白象限必须由真实竞品资料验证"
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
        "Perceptual-Map"
      ],
      "render_hints": {
        "accent_color": "ink"
      }
    }
  ],
  "metadata": {
    "blueprint_chunk_id": "p2-c2-competition-status",
    "chunk_intent_acknowledged": "竞争态势 6 页: 按案例蓝图填充指定页面",
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
