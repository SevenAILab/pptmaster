# In-context examples · Sub-Agent ① consumer_insight

## 示例 1 · SmallRig 影像内容创作者画像

> **案例可追溯报告**: 本示例所有 SmallRig 用户事实来自 `assets/_raw/cases/标杆案例/smallrig/page-036.md`、`page-037.md`、`page-038.md`、`page-039.md`、`page-041.md`、`page-043.md`、`page-044.md`、`page-045.md`、`page-051.md`、`page-053.md`、`page-060.md` 至 `page-063.md` 的 OCR 原文。不得用 `inputs/smallrig/summary.md` 或 LLM general knowledge 编造用户数据。

### 输入要点

```json
{
  "client_profile": {
    "name": "SmallRig 斯莫格",
    "industry": "影像场景产品生态",
    "target_audience": ["影像内容创作者"],
    "tonality": "理性专业",
    "render_style": "swiss",
    "expected_pages": 6
  }
}
```

### 期望输出片段

```json
{
  "agent_id": "consumer_insight",
  "slides": [
    {
      "page_no": 1,
      "layout": "S04",
      "action_title": "SmallRig 的影像内容创作者是学历高收入高忠诚的三高人群",
      "core_points": [
        "Who: page-037 写明用户 90% 以上都是大学毕业,文化程度较高",
        "Income: page-037 写明 SmallRig 用户平均收入比美国用户高",
        "Loyalty: page-037 写明 90 天内各平台用户复购率平均超过 30%"
      ],
      "data_refs": [
        {
          "value": "三高: 学历高 / 收入高 / 忠诚高",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-037.md",
          "type": "quote"
        }
      ],
      "models_used": ["Persona-5W2H"],
      "render_hints": {
        "kpi_hero": "90%+ / 30%+",
        "image_slot": null,
        "accent_color": "accent"
      }
    },
    {
      "page_no": 2,
      "layout": "S04",
      "action_title": "SmallRig 的存量人群以千禧男性为主,增量来自女性与 Z 世代",
      "core_points": [
        "page-038: SmallRig 用户 90% 以上为男性",
        "page-038: 25-34 岁与 35-44 岁用户共占比 60%",
        "page-041: 女性及 Z 世代市场潜力巨大,专业用户逐渐向多元大众人群渗透"
      ],
      "data_refs": [
        {
          "value": "90% 以上男性 / 25-44 岁占比 60%",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-038.md",
          "type": "quote"
        },
        {
          "value": "女性及 Z 世代市场潜力巨大",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-041.md",
          "type": "quote"
        }
      ],
      "models_used": ["Persona-5W2H", "Maslow"],
      "render_hints": {
        "kpi_hero": null,
        "image_slot": null,
        "accent_color": "ink"
      }
    },
    {
      "page_no": 3,
      "layout": "S11",
      "action_title": "影像内容创作者旅程从拍摄需求触发走向复购和圈层扩散",
      "core_points": [
        "触达: page-036 显示拍摄轻量化与内容创作者大众化",
        "评估: page-051 显示用户重视 quality / solid / professional / useful / design / value",
        "购买: 用户用高质量、耐用性、专业功能和兼容性判断是否值得买",
        "使用: page-053 显示显性目标是实现更多创作可能和更高创作能力",
        "复购: page-037 显示 90 天内各平台用户复购率平均超过 30%"
      ],
      "data_refs": [
        {
          "value": "拍摄轻量化,内容创作者大众化",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-036.md",
          "type": "quote"
        },
        {
          "value": "quality / solid / professional / useful / design / value",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-051.md",
          "type": "quote"
        }
      ],
      "models_used": ["User-Journey", "4A-Funnel"],
      "render_hints": {
        "kpi_hero": null,
        "image_slot": null,
        "accent_color": "ink"
      }
    },
    {
      "page_no": 4,
      "layout": "S15",
      "action_title": "核心 JTBD 应同时覆盖稳定拍摄创作自由和圈层认同",
      "core_points": [
        "功能任务: 需要高质量、耐用、专业、兼容的影像配件来完成更稳定的拍摄",
        "情感任务: page-053 写明精神需求是对释放灵感和创作自由的追求",
        "社交任务: page-053 写明外在表现是对其专业性的一种认同和肯定"
      ],
      "data_refs": [
        {
          "value": "实现更多创作可能和更高创作能力",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-053.md",
          "type": "quote"
        },
        {
          "value": "对其专业性的一种认同和肯定",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-053.md",
          "type": "quote"
        }
      ],
      "models_used": ["JTBD", "Pain-Gain-Map"],
      "render_hints": {
        "kpi_hero": null,
        "image_slot": null,
        "accent_color": "accent"
      }
    },
    {
      "page_no": 5,
      "layout": "S15",
      "action_title": "痛点-收益矩阵显示 SmallRig 要把复杂适配变成简单选择",
      "core_points": [
        "痛点一: page-060 写明小众相机买不到匹配型号配件,对应收益是全生态",
        "痛点二: page-061 写明有拍摄目标但不了解配件功能,对应收益是全场景",
        "痛点三: page-062 写明不同品牌、不同相机生态不兼容,对应收益是全兼容",
        "痛点四: page-063 写明专业摄影师有独特配件需求但找不到快速生产,对应收益是快制造"
      ],
      "data_refs": [
        {
          "value": "小众相机买不到匹配型号配件",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-060.md",
          "type": "quote"
        },
        {
          "value": "全生态 / 全场景 / 全兼容 / 快制造",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-060.md",
          "type": "quote"
        }
      ],
      "models_used": ["Pain-Gain-Map", "JTBD"],
      "render_hints": {
        "kpi_hero": "4 pains",
        "image_slot": null,
        "accent_color": "accent"
      }
    },
    {
      "page_no": 6,
      "layout": "S03",
      "action_title": "最终洞察是创作者买的不是配件而是更自由的影像创作能力",
      "core_points": [
        "page-052 提醒显性需求背后还有未被表达的隐性需求",
        "page-053 将显性目标写成实现更多创作可能和更高创作能力",
        "page-053 将隐形目标写成提升创作中的自信感,精神需求是释放灵感和创作自由"
      ],
      "data_refs": [
        {
          "value": "未被表达的隐性需求",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-052.md",
          "type": "quote"
        },
        {
          "value": "提升创作中的自信感 / 对释放灵感和创作自由的追求",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-053.md",
          "type": "quote"
        }
      ],
      "models_used": ["JTBD", "5-Why-Essence", "Action-Title"],
      "render_hints": {
        "kpi_hero": null,
        "image_slot": null,
        "accent_color": "ink"
      }
    }
  ],
  "metadata": {
    "methodology_sources": ["Persona-5W2H", "User-Journey", "JTBD", "Pain-Gain-Map", "4A-Funnel", "5-Why-Essence"],
    "assumptions": [
      "用户旅程节点为基于 page-036/page-051/page-053/page-037 的方法论编排,不是 OCR 原文中的现成旅程图。"
    ],
    "web_search_used": false,
    "self_check_passed": true
  }
}
```

### 示例原则

- Action Title 必须直接给结论,不要写 "用户画像分析"。
- SmallRig 的真实数据必须 source 到 `assets/_raw/cases/标杆案例/smallrig/page-NNN.md`。
- 用户旅程、JTBD、痛点-收益矩阵可以用方法论组织,但底层事实必须来自 `_raw` OCR 或明确标注 assumption。
- 不允许 source = `inputs/smallrig/summary.md`。

## 示例 2 · 植愈坊都市年轻女性 (247 书贯穿教学案例)

> **案例可追溯报告**: 植愈坊是 Seven 247 书《AI 实战, 从 0 到 1 打造你的品牌》的教学性虚拟案例,不是现实成功品牌。它适合演示 Persona-5W2H 与 JTBD 的推演方式,但不能包装成真实调研。

### 输入要点

- 客户名称: 植愈坊
- 行业: 情绪疗愈手工皂 / 香氛个护
- 目标人群: 都市年轻女性
- 调性: 感性人文

### 关键输出方向

- Persona: 25-35 岁都市女性,关注情绪疗愈、生活仪式感和天然成分
- Functional JTBD: 找到安全、好用、可持续复购的日常清洁产品
- Emotional JTBD: 在忙碌生活中获得片刻自我照顾和疗愈感
- Social JTBD: 用有审美的产品表达生活方式与自我品味
- Journey: 社媒种草 -> 成分/口碑评估 -> 首单试用 -> 仪式感使用 -> 礼盒/节气款复购

### 注意

该示例是教学性虚拟案例,只能展示方法论结构。正式输出时仍需读取客户资料、上游资料和矩阵注入概念。

## P0-2 SmallRig 真实性约束

- 写 SmallRig 示例前必须先 grep + Read `_raw/cases/标杆案例/smallrig/*.md`。
- SmallRig 用户画像中的学历、收入、复购、年龄、性别、职业、痛点、需求、收益必须来自 page-036 到 page-063 等真实 OCR 页。
- 不得使用 `inputs/smallrig/summary.md` 或 LLM general knowledge 编造用户数据。
- 如果 OCR 只有趋势或事实片段,可以用 JTBD / Journey / Pain-Gain-Map 组织结构,但必须在 metadata.assumptions 中说明哪些是方法论编排。
- data_refs 至少 50% 指向 `_raw/cases/标杆案例/smallrig/page-NNN.md`。


## 蓝图模式示例 (BLUEPRINT MODE example)

### 输入 chunk (节选)

```json
{
  "chunk_id": "p2-c3-consumer-portraits",
  "chunk_title": "消费者画像 4 页",
  "driving_sub_agent": "consumer_insight",
  "chunk_intent": "消费者画像 4 页: 按案例蓝图填充指定页面",
  "chunk_insight_question": "这段必须回答的核心战略问题是什么？",
  "expected_insights_count": 3,
  "feeds_into": [
    "next-chunk-id"
  ],
  "must_yield_takeaway": true,
  "thinking_seed": "先读 strategic-question.md,再承接 upstream_chunks_summary。",
  "allowed_concepts": [
    "Persona-5W2H",
    "Consumer-Lifecycle",
    "JTBD",
    "Pain-Gain-Map"
  ],
  "pages": [
    {
      "page_no": 25,
      "page_intent": "蓝图页 25: 消费者画像 4 页 的第 1 页",
      "page_subtitle": "消费者画像 4 页",
      "recommended_layout": "S13",
      "data_source_hint": "summary.md + upstream_chunks_summary",
      "concept_for_this_page": "Persona-5W2H",
      "case_reference_slide": 25
    },
    {
      "page_no": 26,
      "page_intent": "蓝图页 26: 消费者画像 4 页 的第 2 页",
      "page_subtitle": "消费者画像 4 页",
      "recommended_layout": "S05",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "Consumer-Lifecycle",
      "case_reference_slide": 26
    },
    {
      "page_no": 27,
      "page_intent": "蓝图页 27: 消费者画像 4 页 的第 3 页",
      "page_subtitle": "消费者画像 4 页",
      "recommended_layout": "S05",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "JTBD",
      "case_reference_slide": 27
    },
    {
      "page_no": 28,
      "page_intent": "蓝图页 28: 消费者画像 4 页 的第 4 页",
      "page_subtitle": "消费者画像 4 页",
      "recommended_layout": "S03",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "Pain-Gain-Map",
      "case_reference_slide": 28
    }
  ],
  "self_check": {
    "must_appear_keywords": [
      "消费者画像"
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
  "agent_id": "consumer_insight",
  "blueprint_chunk_id": "p2-c3-consumer-portraits",
  "chunk_takeaway": "消费者画像应先收窄主力人群再讨论拓展人群",
  "chunk_insights": [
    "主力人群: 高频购买且有明确任务压力",
    "拓展人群: 有增长潜力但需要教育",
    "拒绝人群: 不应在首轮定位中服务"
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
      "page_no": 25,
      "layout": "S13",
      "action_title": "消费者画像应先收窄主力人群再讨论拓展人群",
      "core_points": [
        "主力人群: 高频购买且有明确任务压力",
        "拓展人群: 有增长潜力但需要教育",
        "拒绝人群: 不应在首轮定位中服务"
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
        "Persona-5W2H"
      ],
      "render_hints": {
        "accent_color": "accent"
      }
    },
    {
      "page_no": 26,
      "layout": "S05",
      "action_title": "消费者画像 4 页 第 2 页必须承接上一页结论",
      "core_points": [
        "主力人群: 高频购买且有明确任务压力",
        "拓展人群: 有增长潜力但需要教育",
        "拒绝人群: 不应在首轮定位中服务"
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
        "Consumer-Lifecycle"
      ],
      "render_hints": {
        "accent_color": "ink"
      }
    }
  ],
  "metadata": {
    "blueprint_chunk_id": "p2-c3-consumer-portraits",
    "chunk_intent_acknowledged": "消费者画像 4 页: 按案例蓝图填充指定页面",
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
