# In-context examples · Sub-Agent ⑥ annual_planning

## 示例 1 · 植愈坊年度规划 (247 书教学案例推演)

> **案例可追溯报告**: 植愈坊是 Seven 247 书《AI 实战, 从 0 到 1 打造你的品牌》的教学性虚拟案例,适合演示年度规划方法,但不能包装成真实品牌案例。本示例依据 `assets/_raw/books/0to1-brand/ch13-imc.md`、`assets/_raw/books/0to1-brand/ch14-execution.md` 和 `assets/_raw/frameworks/品牌年度规划方案.md` 的方法论推演。

### 输入要点

```json
{
  "client_profile": {
    "name": "植愈坊",
    "industry": "天然芳疗手工皂",
    "stage": "0-1启动",
    "core_products": ["日常皂", "睡前香氛皂", "节气礼盒"],
    "target_audience": ["关注情绪疗愈和生活仪式感的都市年轻女性"],
    "budget_level": "50-200万",
    "tonality": "感性人文",
    "render_style": "swiss",
    "expected_pages": 12
  },
  "upstream_outputs": {
    "brand_positioning": "都市年轻女性的情绪疗愈天然芳疗手工皂。",
    "brand_building": "品牌主张围绕把今天洗成温柔的一天,产品屋包括日常皂、睡前香氛皂、节气礼盒。"
  }
}
```

### 期望输出片段

```json
{
  "agent_id": "annual_planning",
  "slides": [
    {
      "page_no": 1,
      "layout": "S03",
      "action_title": "植愈坊年度策略应一年讲透情绪疗愈这一件事",
      "core_points": [
        "Objective: 建立都市女性心中的情绪疗愈手工皂认知",
        "Key Result 1: 核心人群内容互动提升到可复盘水平",
        "Key Result 2: 三条产品线形成从试用到礼赠的转化路径"
      ],
      "data_refs": [
        {
          "value": "年度规划需要信息聚焦,一年讲透一件事",
          "source": "assets/_raw/frameworks/品牌年度规划方案.md",
          "type": "quote"
        }
      ],
      "models_used": ["OKR", "Pyramid-Principle"]
    },
    {
      "page_no": 2,
      "layout": "S11",
      "action_title": "Q1 种草 Q2 节气 Q3 礼盒 Q4 复购构成植愈坊的年度营销日历",
      "core_points": [
        "Q1: 春季焕新,用睡前香氛皂完成第一轮教育种草",
        "Q2: 端午与夏季清爽节点,推动节气礼盒试水",
        "Q3: 七夕与开学季,强化送礼和自我照顾两类场景",
        "Q4: 双 11 与年终礼赠,集中预算做复购和礼盒转化"
      ],
      "data_refs": [
        {
          "value": "Q1-Q4 为教学案例策略推演,需真实节点和预算确认",
          "source": "assumption: Marketing-Calendar demo",
          "type": "assumption"
        }
      ],
      "models_used": ["Marketing-Calendar", "4P-Rhythm"]
    },
    {
      "page_no": 3,
      "layout": "S20",
      "action_title": "预算应 80% 投向产品内容和核心渠道而不是平均撒点",
      "core_points": [
        "产品内容 30%: 核心故事、产品证据、礼盒素材",
        "渠道投放 35%: 小红书 / 抖音 / 私域按转化角色分工",
        "节点活动 20%: 春季焕新、七夕礼赠、双 11",
        "复盘优化 15%: 数据看板、素材复用、PDCA 月复盘"
      ],
      "data_refs": [
        {
          "value": "预算有限时要锁定最需要发力的点,预算分配可参照二八法则",
          "source": "assets/_raw/frameworks/品牌年度规划方案.md",
          "type": "quote"
        }
      ],
      "models_used": ["4P-Rhythm", "Budget-Allocation", "PDCA"]
    },
    {
      "page_no": 4,
      "layout": "S20",
      "action_title": "复盘 KPI 要用 AARRR 把声量好感和转化放进同一张表",
      "core_points": [
        "Acquisition 获取: 种草内容曝光、搜索量、首次触达成本",
        "Activation 激活: 试用装领取、产品页停留、首购转化",
        "Retention 留存: 复购率、私域留存、节气礼盒回购",
        "Referral 推荐: UGC 投稿、晒单率、口碑推荐线索"
      ],
      "data_refs": [
        {
          "value": "KPI 为教学案例复盘口径,需真实渠道数据校准",
          "source": "assumption: AARRR-Funnel demo",
          "type": "assumption"
        }
      ],
      "models_used": ["AARRR-Funnel", "OKR"]
    }
  ],
  "metadata": {
    "methodology_sources": ["OKR", "Marketing-Calendar", "4P-Rhythm", "AARRR-Funnel"],
    "web_search_used": false,
    "assumptions": [
      "植愈坊为教学性虚拟案例,年度节点和 KPI 均为方法论示范。"
    ],
    "self_check_passed": true
  }
}
```

## 示例 2 · SmallRig MI 落地年度节奏 (基于真实品牌屋的策略推演)

> **案例可追溯报告**: SmallRig 年度规划不是 OCR 现成页。本示例 100% 使用 `assets/_raw/cases/标杆案例/smallrig/page-124.md` 的真实品牌屋字段,并参考 `page-002.md` 的项目回顾、`page-076.md` 的 Dream Rig / CO-Design / Live Life 层级和 `page-077.md` 的 Live Life 联名玩法。年度节奏、预算和 KPI 是基于上游 ④⑤ 输出的策略推演,必须在 `metadata.assumptions` 中注明,不得冒充真实年度规划页。

### 输入要点

```json
{
  "client_profile": {
    "name": "SmallRig 斯莫格",
    "industry": "影像场景产品生态",
    "stage": "100+ 转型升级",
    "core_products": ["相机支撑与稳定", "储能解决方案", "手机支撑与稳定", "灯光与控制系统"],
    "target_audience": ["影像内容创作者"],
    "budget_level": "500万+",
    "tonality": "理性专业",
    "render_style": "swiss",
    "expected_pages": 12
  },
  "upstream_outputs": {
    "brand_positioning": "品牌定位为全球影像场景产品生态开创者; Target 为影像内容创作者; 差异 RTB 为全生态 / 全场景 / 全兼容 / 快制造。",
    "brand_building": "品牌主张 FREE YOUR DREAM 自由创想,产品口号 Rig UP,四大产品系列承接全生态场景。"
  }
}
```

### 期望输出片段

```json
{
  "agent_id": "annual_planning",
  "slides": [
    {
      "page_no": 1,
      "layout": "S03",
      "action_title": "SmallRig 年度规划要把 FREE YOUR DREAM 从品牌屋推进到四季战役",
      "core_points": [
        "Objective: 让全球影像场景产品生态开创者成为影像内容创作者的年度心智",
        "Key Result 1: 四大产品系列各有一轮可复盘的场景战役",
        "Key Result 2: Dream Rig / CO-Design / Live Life 形成内容资产闭环"
      ],
      "data_refs": [
        {
          "value": "全球影像场景产品生态开创者 / FREE YOUR DREAM / 四大产品系列",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-124.md",
          "type": "quote"
        }
      ],
      "models_used": ["OKR", "Action-Title"]
    },
    {
      "page_no": 2,
      "layout": "S11",
      "action_title": "Q1 相机支撑 Q2 手机 Vlog Q3 Live Life Q4 全生态转化形成年度营销日历",
      "core_points": [
        "Q1: 春季摄影季,主推相机支撑与稳定,强化全兼容与快制造",
        "Q2: 暑假 Vlog 季,主推手机支撑与稳定,承接移动创作需求",
        "Q3: Live Life 共创季,用 CO-Design 和生活方式活动放大 FREE YOUR DREAM",
        "Q4: 双 11 与年终创作季,用全生态套装完成产品系列协同转化"
      ],
      "data_refs": [
        {
          "value": "产品系列为相机支撑与稳定 / 储能解决方案 / 手机支撑与稳定 / 灯光与控制系统",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-124.md",
          "type": "quote"
        },
        {
          "value": "Live Life 摄影生活方式社群与 CO-Design",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-076.md",
          "type": "quote"
        },
        {
          "value": "Q1-Q4 节奏为基于真实品牌屋的年度策略推演",
          "source": "assumption: annual_planning based on page-124 and upstream outputs",
          "type": "assumption"
        }
      ],
      "models_used": ["Marketing-Calendar", "4P-Rhythm"]
    },
    {
      "page_no": 3,
      "layout": "S20",
      "action_title": "年度预算应优先投向四大产品系列的场景内容和创作者共创",
      "core_points": [
        "Product 35%: 四大产品系列场景化内容与套装化表达",
        "Place 25%: 电商节点、内容平台和创作者社群分层承接",
        "Promotion 25%: FREE YOUR DREAM 主张战役、Live Life 联名和故事传播",
        "Review 15%: 月度复盘、AARRR 看板、素材沉淀和 PDCA 优化"
      ],
      "data_refs": [
        {
          "value": "年度规划本质是资源分配,预算有限时要聚焦",
          "source": "assets/_raw/frameworks/品牌年度规划方案.md",
          "type": "quote"
        },
        {
          "value": "预算比例为策略推演,待客户真实预算确认",
          "source": "assumption: budget allocation draft",
          "type": "assumption"
        }
      ],
      "models_used": ["4P-Rhythm", "Budget-Allocation"]
    },
    {
      "page_no": 4,
      "layout": "S20",
      "action_title": "AARRR 复盘表要同时看创作者获客内容激活和共创推荐",
      "core_points": [
        "Acquisition 获取: 品牌搜索、内容曝光、创作者触达数",
        "Activation 激活: 产品页互动、套装收藏、场景内容完播",
        "Retention 留存: 复购率、配件加购、社群持续互动",
        "Referral 推荐: CO-Design 投稿、UGC 案例、创作者推荐线索"
      ],
      "data_refs": [
        {
          "value": "CO-Design / Live Life / FREE YOUR DREAM 为真实品牌资产,指标为年度推演口径",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-076.md",
          "type": "quote"
        }
      ],
      "models_used": ["AARRR-Funnel", "OKR", "PDCA"]
    }
  ],
  "metadata": {
    "methodology_sources": ["OKR", "Marketing-Calendar", "4P-Rhythm", "AARRR-Funnel"],
    "web_search_used": false,
    "assumptions": [
      "SmallRig 没有完整年度规划 OCR 页。本年度节奏、预算和 KPI 是基于 page-124 品牌屋、page-076/077 落地线索与上游 ④⑤ 输出的策略推演。",
      "所有预算比例与 KPI 目标需要客户提供真实预算、渠道数据和销售目标后校准。"
    ],
    "self_check_passed": true
  }
}
```

## P0-2 + P0-3 真实性约束

1. SmallRig 真实字段必须优先来自 `assets/_raw/cases/标杆案例/smallrig/page-124.md`: 全球影像场景产品生态开创者 / FREE YOUR DREAM / Rig UP / RIG 命名释义 / 影像内容创作者 / 全生态、全场景、全兼容、快制造 / 四大产品系列。
2. SmallRig 年度规划不是 OCR 现成页。年度节奏、预算比例、KPI、战役名称都必须标注为 strategy assumption。
3. `page-076.md` 可用于 Dream Rig / CO-Design / Live Life 的年度落地推演；`page-077.md` 可用于 Live Life 联名和故事传播玩法推演。
4. `inputs/smallrig/summary.md` 只能作为客户输入背景,不得替代 `_raw/cases/标杆案例/smallrig/page-NNN.md` 成为真实案例来源。
5. 若调用 web_search 查行业节点,必须在 `metadata.search_queries` 和 `data_refs.source` 保留真实 URL。
6. 输出必须包含年度营销日历、Q1/Q2/Q3/Q4 四个战役、预算分配和 OKR/AARRR 复盘 KPI。


## 蓝图模式示例 (BLUEPRINT MODE example)

### 输入 chunk (节选)

```json
{
  "chunk_id": "p3-c6-focus-touchpoints",
  "chunk_title": "焦点 Q1-Q4 + 触点执行",
  "driving_sub_agent": "annual_planning",
  "chunk_intent": "焦点 Q1-Q4 + 触点执行: 按案例蓝图填充指定页面",
  "chunk_insight_question": "这段必须回答的核心战略问题是什么？",
  "expected_insights_count": 3,
  "feeds_into": [
    "next-chunk-id"
  ],
  "must_yield_takeaway": true,
  "thinking_seed": "先读 strategic-question.md,再承接 upstream_chunks_summary。",
  "allowed_concepts": [
    "Marketing-Calendar",
    "4P-Rhythm",
    "AARRR-Funnel",
    "Marketing-Funnel"
  ],
  "pages": [
    {
      "page_no": 63,
      "page_intent": "蓝图页 63: 焦点 Q1-Q4 + 触点执行 的第 1 页",
      "page_subtitle": "焦点 Q1-Q4 + 触点执行",
      "recommended_layout": "S09",
      "data_source_hint": "summary.md + upstream_chunks_summary",
      "concept_for_this_page": "Marketing-Calendar",
      "case_reference_slide": 63
    },
    {
      "page_no": 64,
      "page_intent": "蓝图页 64: 焦点 Q1-Q4 + 触点执行 的第 2 页",
      "page_subtitle": "焦点 Q1-Q4 + 触点执行",
      "recommended_layout": "S05",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "4P-Rhythm",
      "case_reference_slide": 64
    },
    {
      "page_no": 66,
      "page_intent": "蓝图页 66: 焦点 Q1-Q4 + 触点执行 的第 3 页",
      "page_subtitle": "焦点 Q1-Q4 + 触点执行",
      "recommended_layout": "S05",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "AARRR-Funnel",
      "case_reference_slide": 66
    },
    {
      "page_no": 70,
      "page_intent": "蓝图页 70: 焦点 Q1-Q4 + 触点执行 的第 4 页",
      "page_subtitle": "焦点 Q1-Q4 + 触点执行",
      "recommended_layout": "S05",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "Marketing-Funnel",
      "case_reference_slide": 70
    },
    {
      "page_no": 72,
      "page_intent": "蓝图页 72: 焦点 Q1-Q4 + 触点执行 的第 5 页",
      "page_subtitle": "焦点 Q1-Q4 + 触点执行",
      "recommended_layout": "S13",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "Marketing-Calendar",
      "case_reference_slide": 72
    }
  ],
  "self_check": {
    "must_appear_keywords": [
      "焦点"
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
  "agent_id": "annual_planning",
  "blueprint_chunk_id": "p3-c6-focus-touchpoints",
  "chunk_takeaway": "年度节奏要让定位在四个季度持续被看见和验证",
  "chunk_insights": [
    "Q1 起势: 建立认知",
    "Q2 放大: 事件触发",
    "Q3 转化: 渠道承接",
    "Q4 复盘: 复购和会员沉淀"
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
      "page_no": 63,
      "layout": "S09",
      "action_title": "年度节奏要让定位在四个季度持续被看见和验证",
      "core_points": [
        "Q1 起势: 建立认知",
        "Q2 放大: 事件触发",
        "Q3 转化: 渠道承接",
        "Q4 复盘: 复购和会员沉淀"
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
        "Marketing-Calendar"
      ],
      "render_hints": {
        "accent_color": "accent"
      }
    },
    {
      "page_no": 64,
      "layout": "S05",
      "action_title": "焦点 Q1-Q4 + 触点执行 第 2 页必须承接上一页结论",
      "core_points": [
        "Q1 起势: 建立认知",
        "Q2 放大: 事件触发",
        "Q3 转化: 渠道承接",
        "Q4 复盘: 复购和会员沉淀"
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
        "4P-Rhythm"
      ],
      "render_hints": {
        "accent_color": "ink"
      }
    }
  ],
  "metadata": {
    "blueprint_chunk_id": "p3-c6-focus-touchpoints",
    "chunk_intent_acknowledged": "焦点 Q1-Q4 + 触点执行: 按案例蓝图填充指定页面",
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
