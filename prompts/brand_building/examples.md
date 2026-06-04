# In-context examples · Sub-Agent ⑤ brand_building

## 示例 1 · SmallRig 品牌屋 + 产品屋 (100% 来自 page-124)

> **案例可追溯报告**: 本示例 SmallRig 品牌屋完全来自 `assets/_raw/cases/标杆案例/smallrig/page-124.md` OCR 原文,使命愿景对照补充来自 `assets/_raw/cases/标杆案例/smallrig/page-109.md`。不得用 LLM general knowledge、不得用 `inputs/smallrig/summary.md` 中的 Seven 客户档案推演替代 page-124 真实品牌屋字段。本示例把 page-124 的 9 层信息屋映射到通用 5 层品牌屋结构。

### 输入要点

```json
{
  "client_profile": {
    "name": "SmallRig 斯莫格",
    "industry": "影像场景产品生态",
    "stage": "100+ 转型升级",
    "core_products": ["相机支撑与稳定", "储能解决方案", "手机支撑与稳定", "灯光与控制系统"],
    "target_audience": ["影像内容创作者"],
    "tonality": "理性专业",
    "render_style": "swiss",
    "expected_pages": 12
  },
  "upstream_outputs": {
    "brand_positioning": "品牌定位已定稿为全球影像场景产品生态开创者; Target 为影像内容创作者; 差异 RTB 为全生态 / 全场景 / 全兼容 / 快制造。"
  }
}
```

### 期望输出片段

```json
{
  "agent_id": "brand_building",
  "slides": [
    {
      "page_no": 1,
      "layout": "S05",
      "action_title": "SmallRig 品牌屋以全球影像场景产品生态开创者作为战略层",
      "core_points": [
        "战略层: 品牌定位为「全球影像场景产品生态开创者」",
        "心智层: 品牌人群为影像内容创作者,品牌主张为 FREE YOUR DREAM 自由创想,产品口号为 Rig UP",
        "论点层: 功能利益是实现更多创作可能和更高创作能力,情感利益是对释放灵感和创作自由的追求",
        "论据层: 差异 RTB 为全生态 / 全场景 / 全兼容 / 快制造",
        "落地层: 产品系列为相机支撑与稳定 / 储能解决方案 / 手机支撑与稳定 / 灯光与控制系统"
      ],
      "data_refs": [
        {
          "value": "SmallRig 品牌屋完整字段",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-124.md",
          "type": "quote"
        }
      ],
      "models_used": ["Brand-House"],
      "render_hints": {
        "kpi_hero": "全球影像场景产品生态开创者",
        "image_slot": null,
        "accent_color": "accent"
      }
    },
    {
      "page_no": 2,
      "layout": "S17",
      "action_title": "产品屋必须让四大产品系列各自承接影像场景生态价值",
      "core_points": [
        "相机支撑与稳定: 承接专业拍摄中的稳定与扩展需求",
        "储能解决方案: 承接长时间创作和户外场景中的续航需求",
        "手机支撑与稳定: 承接移动创作、Vlog 和轻量化拍摄需求",
        "灯光与控制系统: 承接场景化布光和创作控制需求"
      ],
      "data_refs": [
        {
          "value": "相机支撑与稳定 / 储能解决方案 / 手机支撑与稳定 / 灯光与控制系统",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-124.md",
          "type": "quote"
        }
      ],
      "models_used": ["Product-House"],
      "render_hints": {
        "kpi_hero": "4 product families",
        "image_slot": "s17-system-diagram-21x9",
        "accent_color": "ink"
      }
    },
    {
      "page_no": 3,
      "layout": "S19",
      "action_title": "FREE YOUR DREAM 与 Rig UP 应分别承担品牌主张和产品口号",
      "core_points": [
        "品牌主张: FREE YOUR DREAM 自由创想,指向创作梦想和创作自由",
        "产品口号: Rig UP,承接装备升级和产品动作",
        "命名释义: RIG = Redefinition 重新定义 + Imagination 想象力 + Gear 装备",
        "Slogan 评估: 口号需短、清晰、可记忆、可延展,并能绑定影像创作者的创作自由"
      ],
      "data_refs": [
        {
          "value": "FREE YOUR DREAM / Rig UP / RIG 命名释义",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-124.md",
          "type": "quote"
        }
      ],
      "models_used": ["Slogan-7-Principles", "Brand-Asset-5-Star"],
      "render_hints": {
        "kpi_hero": "FREE YOUR DREAM",
        "image_slot": null,
        "accent_color": "accent"
      }
    },
    {
      "page_no": 4,
      "layout": "S21",
      "action_title": "视觉锤和语言钉都应固定在让拍摄更自由这一创作承诺上",
      "core_points": [
        "语言钉: 使命写明突破影像边界,让拍摄更自由",
        "视觉锤: 以影像场景产品生态、创作装备和四大产品系列形成可识别资产",
        "调性: 理性专业不等于冰冷,应服务 FREE YOUR DREAM 的创作梦想叙事",
        "人格: 能力来自全生态 / 全场景 / 全兼容 / 快制造,兴奋来自自由创想"
      ],
      "data_refs": [
        {
          "value": "突破影像边界,让拍摄更自由。让每个人都能实现创作梦想",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-109.md",
          "type": "quote"
        },
        {
          "value": "全生态 / 全场景 / 全兼容 / 快制造",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-124.md",
          "type": "quote"
        }
      ],
      "models_used": ["Visual-Hammer-Verbal-Nail", "Aaker-Brand-Personality"],
      "render_hints": {
        "kpi_hero": null,
        "image_slot": null,
        "accent_color": "ink"
      }
    },
    {
      "page_no": 5,
      "layout": "S14",
      "action_title": "品牌资产闭环要把定位口号产品系列和创作梦想连成长期资产",
      "core_points": [
        "资产入口: 全球影像场景产品生态开创者",
        "传播资产: FREE YOUR DREAM 自由创想 + Rig UP",
        "产品资产: 四大产品系列支撑全生态场景",
        "情感资产: 释放灵感和创作自由,让每个人实现创作梦想"
      ],
      "data_refs": [
        {
          "value": "品牌定位 / 主张口号 / 产品口号 / 产品系列 / 情感利益",
          "source": "assets/_raw/cases/标杆案例/smallrig/page-124.md",
          "type": "quote"
        }
      ],
      "models_used": ["Brand-Asset-5-Star", "Brand-House"]
    }
  ],
  "metadata": {
    "methodology_sources": ["Brand-House", "Product-House", "Slogan-7-Principles", "Visual-Hammer-Verbal-Nail", "Aaker-Brand-Personality"],
    "assumptions": [
      "产品系列对应的具体场景承接为基于 page-124 四大产品系列的产品屋方法论编排,不是 OCR 原文中的完整产品屋图。"
    ],
    "web_search_used": false,
    "self_check_passed": true
  }
}
```

### 示例原则

- Action Title 必须直接给结论,不要写 "品牌屋介绍"。
- SmallRig 品牌屋必须 100% 来自 `page-124.md`,使命愿景可交叉引用 `page-109.md`。
- 品牌屋必须保留 5 层: 战略 / 心智 / 论点 / 论据 / 落地,不得简化成 3 层。
- 产品屋必须保留 4 大产品系列完整名称,不得合并为"影像配件生态"一句。
- 候选品牌口号: SmallRig 已有 FREE YOUR DREAM + Rig UP,示例演示如何按 Slogan 7 原则评估,不要另编新口号冒充真实字段。

## 示例 2 · 植愈坊品牌屋 + 产品屋 (247 书贯穿教学案例)

> **案例可追溯报告**: 植愈坊是 Seven 247 书《AI 实战, 从 0 到 1 打造你的品牌》的教学性虚拟案例,不是现实成功品牌。它适合演示品牌屋、产品屋、口号评估和视觉语言系统的推演方式,但不能包装成真实调研或真实市场案例。

### 关键输出方向

```json
{
  "agent_id": "brand_building",
  "slides": [
    {
      "page_no": 1,
      "layout": "S05",
      "action_title": "植愈坊品牌屋应把情绪疗愈从产品功效升级为生活仪式",
      "core_points": [
        "战略层: 都市女性的情绪疗愈手工皂",
        "心智层: 温柔、天然、陪伴、可持续",
        "论点层: 日常清洁变成片刻自我照顾",
        "论据层: 天然成分、香氛体验、手作质感、礼盒场景",
        "落地层: 日常皂、睡前香氛皂、节气礼盒、旅行套装"
      ],
      "data_refs": [
        {
          "value": "教学性虚拟案例,待真实客户资料验证",
          "source": "assumption: 247 书植愈坊教学案例",
          "type": "assumption"
        }
      ],
      "models_used": ["Brand-House"]
    },
    {
      "page_no": 2,
      "layout": "S15",
      "action_title": "候选口号要用 Slogan 7 原则筛掉只美但不清楚的表达",
      "core_points": [
        "候选 1: 把今天洗成温柔的一天",
        "候选 2: 每一次清洁,都是一次照顾自己",
        "候选 3: 给忙碌生活一块会呼吸的皂",
        "评估: 短、清楚、可记忆、可延展、贴合疗愈场景"
      ],
      "data_refs": [
        {
          "value": "候选口号为方法论示意,需客户确认",
          "source": "assumption: Slogan-7-Principles demo",
          "type": "assumption"
        }
      ],
      "models_used": ["Slogan-7-Principles"]
    }
  ],
  "metadata": {
    "web_search_used": false,
    "self_check_passed": true
  }
}
```

## P0-2 + 必检字段约束

1. SmallRig 品牌屋必须 100% 来自 `assets/_raw/cases/标杆案例/smallrig/page-124.md`,不要扩写成不存在的品牌资产。
2. 产品屋的 4 大产品系列必须完整保留 page-124 真实名称: 相机支撑与稳定 / 储能解决方案 / 手机支撑与稳定 / 灯光与控制系统。
3. 品牌主张与产品口号必须区分: FREE YOUR DREAM 自由创想是品牌主张, Rig UP 是产品口号。
4. RIG 命名释义必须完整保留: Redefinition 重新定义 / Imagination 想象力 / Gear 装备。
5. 候选品牌口号必须按 Slogan 7 原则评估；如果客户已有定稿口号,优先评估现有口号,不要另编替代。
6. 必须输出完整 5 层品牌屋、完整产品屋、3-5 个口号评估、1 段含视觉锤 + 语言钉的调性描述。
7. 禁止调用 web_search,禁止使用 `inputs/smallrig/summary.md`,禁止用 LLM general knowledge 补 SmallRig 字段。


## 蓝图模式示例 (BLUEPRINT MODE example)

### 输入 chunk (节选)

```json
{
  "chunk_id": "p3-c3-marketing-strategy",
  "chunk_title": "营销传播 15 页",
  "driving_sub_agent": "brand_building",
  "chunk_intent": "营销传播 15 页: 按案例蓝图填充指定页面",
  "chunk_insight_question": "这段必须回答的核心战略问题是什么？",
  "expected_insights_count": 3,
  "feeds_into": [
    "next-chunk-id"
  ],
  "must_yield_takeaway": true,
  "thinking_seed": "先读 strategic-question.md,再承接 upstream_chunks_summary。",
  "allowed_concepts": [
    "Marketing-Funnel",
    "AIDA",
    "Visual-Hammer-Verbal-Nail",
    "Slogan-7-Principles",
    "AARRR-Funnel"
  ],
  "pages": [
    {
      "page_no": 67,
      "page_intent": "蓝图页 67: 营销传播 15 页 的第 1 页",
      "page_subtitle": "营销传播 15 页",
      "recommended_layout": "S05",
      "data_source_hint": "summary.md + upstream_chunks_summary",
      "concept_for_this_page": "Marketing-Funnel",
      "case_reference_slide": 67
    },
    {
      "page_no": 68,
      "page_intent": "蓝图页 68: 营销传播 15 页 的第 2 页",
      "page_subtitle": "营销传播 15 页",
      "recommended_layout": "S03",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "AIDA",
      "case_reference_slide": 68
    },
    {
      "page_no": 69,
      "page_intent": "蓝图页 69: 营销传播 15 页 的第 3 页",
      "page_subtitle": "营销传播 15 页",
      "recommended_layout": "S05",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "Visual-Hammer-Verbal-Nail",
      "case_reference_slide": 69
    },
    {
      "page_no": 70,
      "page_intent": "蓝图页 70: 营销传播 15 页 的第 4 页",
      "page_subtitle": "营销传播 15 页",
      "recommended_layout": "S05",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "Slogan-7-Principles",
      "case_reference_slide": 70
    }
  ],
  "self_check": {
    "must_appear_keywords": [
      "营销传播"
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
  "agent_id": "brand_building",
  "blueprint_chunk_id": "p3-c3-marketing-strategy",
  "chunk_takeaway": "TVC 和事件资产必须服务同一个品牌定位而不是各写各的活动",
  "chunk_insights": [
    "TVC 先讲用户冲突再讲品牌解决",
    "事件资产要可复用和可沉淀",
    "常规资产承接日常内容和私域运营"
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
      "page_no": 67,
      "layout": "S05",
      "action_title": "TVC 和事件资产必须服务同一个品牌定位而不是各写各的活动",
      "core_points": [
        "TVC 先讲用户冲突再讲品牌解决",
        "事件资产要可复用和可沉淀",
        "常规资产承接日常内容和私域运营"
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
        "Marketing-Funnel"
      ],
      "render_hints": {
        "accent_color": "accent"
      }
    },
    {
      "page_no": 68,
      "layout": "S03",
      "action_title": "营销传播 15 页 第 2 页必须承接上一页结论",
      "core_points": [
        "TVC 先讲用户冲突再讲品牌解决",
        "事件资产要可复用和可沉淀",
        "常规资产承接日常内容和私域运营"
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
        "AIDA"
      ],
      "render_hints": {
        "accent_color": "ink"
      }
    }
  ],
  "metadata": {
    "blueprint_chunk_id": "p3-c3-marketing-strategy",
    "chunk_intent_acknowledged": "营销传播 15 页: 按案例蓝图填充指定页面",
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
