# In-context examples · Sub-Agent ④ brand_positioning

## 示例 1 · SmallRig (斯莫格) MI 升级

> **案例可追溯报告**: 本示例所有 SmallRig 内容 100% 来自 `assets/_raw/cases/标杆案例/smallrig/page-124.md` 的 OCR 原文。不得用 LLM general knowledge、不得用 `inputs/smallrig/summary.md` 中的 Seven 客户档案推演替代 page-124 真实品牌屋字段。

### 输入

```json
{
  "client_profile": {
    "name": "SmallRig 斯莫格",
    "industry": "影像场景产品生态",
    "stage": "100+ 转型升级",
    "core_products": ["相机支撑与稳定", "储能解决方案", "手机支撑与稳定", "灯光与控制系统"],
    "target_audience": ["影像内容创作者"],
    "competitors": [],
    "budget_level": "500万+",
    "tonality": "理性专业",
    "render_style": "swiss",
    "expected_pages": 12
  },
  "uploaded_materials_summary": "SmallRig 品牌屋真实字段: 品牌定位「全球影像场景产品生态开创者」; 使命「突破影像边界,让拍摄更自由」; 愿景「每个人都能实现创作梦想」; 主张 FREE YOUR DREAM 自由创想; 产品口号 Rig UP; 命名释义 RIG = Redefinition 重新定义 + Imagination 想象力 + Gear 装备; 品牌人群为影像内容创作者; 功能利益为实现更多创作可能和更高创作能力; 情感利益为对释放灵感和创作自由的追求; 差异 RTB 为全生态 / 全场景 / 全兼容 / 快制造; 产品系列为相机支撑与稳定 / 储能解决方案 / 手机支撑与稳定 / 灯光与控制系统。"
}
```

### 期望输出片段

```json
{
  "agent_id": "brand_positioning",
  "slides": [
    {
      "page_no": 1,
      "layout": "S03",
      "action_title": "从摄影配件供应商升级为全球影像场景产品生态开创者",
      "core_points": [
        "品牌定位主张: 面向影像内容创作者,SmallRig 要成为「全球影像场景产品生态开创者」",
        "使命愿景把品牌升级落在创作自由上: 突破影像边界,让拍摄更自由,让每个人都能实现创作梦想",
        "FREE YOUR DREAM 自由创想与 Rig UP 分别承担品牌主张和产品口号,把影像场景生态翻译成可传播语言"
      ],
      "data_refs": [
        {"value": "全球影像场景产品生态开创者", "source": "assets/_raw/cases/标杆案例/smallrig/page-124.md", "type": "quote"},
        {"value": "FREE YOUR DREAM / Rig UP", "source": "assets/_raw/cases/标杆案例/smallrig/page-124.md", "type": "quote"}
      ],
      "models_used": ["STP", "Brand-Positioning-Triangle", "Brand-House"],
      "render_hints": {
        "kpi_hero": "FREE YOUR DREAM",
        "image_slot": null,
        "accent_color": "accent"
      }
    },
    {
      "page_no": 2,
      "layout": "S13",
      "action_title": "定位三角必须围绕影像内容创作者、场景生态和四个差异 RTB",
      "core_points": [
        "Target: 影像内容创作者",
        "Category Frame: 全球影像场景产品生态开创者",
        "Key Benefit + RTB: 实现更多创作可能和更高创作能力,由全生态 / 全场景 / 全兼容 / 快制造支撑"
      ],
      "data_refs": [
        {"value": "影像内容创作者", "source": "assets/_raw/cases/标杆案例/smallrig/page-124.md", "type": "quote"},
        {"value": "全生态 / 全场景 / 全兼容 / 快制造", "source": "assets/_raw/cases/标杆案例/smallrig/page-124.md", "type": "quote"}
      ],
      "models_used": ["Brand-Positioning-Triangle", "STP"],
      "render_hints": {
        "kpi_hero": null,
        "image_slot": "s13-three-forces-21x9",
        "accent_color": "ink"
      }
    },
    {
      "page_no": 3,
      "layout": "S17",
      "action_title": "商业模式画布应由四大产品系列承接影像场景生态定位",
      "core_points": [
        "Key Activities: 围绕相机支撑与稳定、储能解决方案、手机支撑与稳定、灯光与控制系统持续组织产品能力",
        "Value Proposition: 用产品生态实现更多创作可能和更高创作能力",
        "Channels / Relationship: 围绕 FREE YOUR DREAM 自由创想和 Rig UP 统一品牌沟通与产品沟通"
      ],
      "data_refs": [
        {"value": "相机支撑与稳定 / 储能解决方案 / 手机支撑与稳定 / 灯光与控制系统", "source": "assets/_raw/cases/标杆案例/smallrig/page-124.md", "type": "quote"}
      ],
      "models_used": ["Business-Model-Canvas"],
      "render_hints": {
        "kpi_hero": null,
        "image_slot": "s17-system-diagram-21x9",
        "accent_color": "accent"
      }
    },
    {
      "page_no": 4,
      "layout": "S05",
      "action_title": "Aaker 人格应围绕 FREE YOUR DREAM 的创作梦想叙事展开",
      "core_points": [
        "真诚: 使命表达是突破影像边界、让拍摄更自由,语气应站在影像内容创作者的创作梦想一侧",
        "能力: 全生态 / 全场景 / 全兼容 / 快制造是能力型人格的证据,不能只写情绪口号",
        "兴奋: FREE YOUR DREAM 自由创想把产品生态连接到释放灵感和创作自由的追求"
      ],
      "data_refs": [
        {"value": "FREE YOUR DREAM 自由创想", "source": "assets/_raw/cases/标杆案例/smallrig/page-124.md", "type": "quote"},
        {"value": "对释放灵感和创作自由的追求", "source": "assets/_raw/cases/标杆案例/smallrig/page-124.md", "type": "quote"}
      ],
      "models_used": ["Aaker-Brand-Personality", "RTB"],
      "render_hints": {
        "kpi_hero": null,
        "image_slot": null,
        "accent_color": "ink"
      }
    }
  ],
  "metadata": {
    "methodology_sources": ["STP", "Brand-Positioning-Triangle", "Business-Model-Canvas", "Aaker-Brand-Personality", "RTB"],
    "assumptions": [],
    "estimated_render_time_s": 3,
    "self_check_passed": true
  }
}
```

### 示例原则

- Action Title 必须直接给结论,不要写 "SmallRig 品牌定位"。
- 支撑论据必须来自用户、行业、竞争或客户资料,不要写空话。
- BMC/VPC 页必须呈现结构关系,不是列概念名。
- 人格页必须能转化为语气、视觉和内容判断。
- SmallRig 示例 1 是真实案例,所有核心字段必须能追溯到 `assets/_raw/cases/标杆案例/smallrig/page-124.md`。

## 示例 2 · 元气森林 (拟稿)

### 输入要点

- 行业: 饮料消费品
- 阶段: 100+ 转型升级
- 调性: 大胆鲜活
- 竞品: 可口可乐、农夫山泉、喜茶、东方树叶

### 关键 Action Title 示意

- "从气泡水黑马升级为年轻人的健康饮料家"
- "品牌定位三角: 0 糖心智 × 高颜值包装 × 便利店渠道效率"
- "商业模式画布: SKU 矩阵、渠道下沉和内容运营共同拉动复购"
- "Aaker-Brand-Personality: 元气森林应保持兴奋感,同时补上可信的能力背书"

### 注意

该示例只展示方向,不是可直接交付方案。正式输出时仍需读取客户资料、上游洞察和矩阵注入概念。

## P0-2 SmallRig 真实性约束

- SmallRig 是真实案例,生成前必须先读取 `assets/_raw/cases/标杆案例/smallrig/page-124.md`。
- SmallRig 输出中,品牌定位、人群、口号、命名释义、差异 RTB、产品系列必须逐字或近逐字来自 page-124 OCR。
- `outputs/smallrig/raw-output.json` 至少 4-6 页引用 page-124 字段,且 `data_refs` 至少 50% 的 `source` 指向 `assets/_raw/cases/标杆案例/smallrig/page-*.md`。
- 禁止把 `inputs/smallrig/summary.md` 中的客户档案推演写成 SmallRig 真实品牌屋事实。
- 禁止用 LLM general knowledge 新增 page-124 没有出现的市场数据、竞品判断或业务机制。
- 如果资料不足,写入待补资料或 assumptions,不要把推演内容伪装成真实案例事实。


## 蓝图模式示例 (BLUEPRINT MODE example)

### 输入 chunk (节选)

```json
{
  "chunk_id": "p3-c1-positioning-statement",
  "chunk_title": "定位语句 + 心智第一联想",
  "driving_sub_agent": "brand_positioning",
  "chunk_intent": "定位语句 + 心智第一联想: 按案例蓝图填充指定页面",
  "chunk_insight_question": "这段必须回答的核心战略问题是什么？",
  "expected_insights_count": 3,
  "feeds_into": [
    "next-chunk-id"
  ],
  "must_yield_takeaway": true,
  "thinking_seed": "先读 strategic-question.md,再承接 upstream_chunks_summary。",
  "allowed_concepts": [
    "STP",
    "Brand-Positioning-Triangle",
    "Aaker-Brand-Personality",
    "Slogan-7-Principles"
  ],
  "pages": [
    {
      "page_no": 40,
      "page_intent": "蓝图页 40: 定位语句 + 心智第一联想 的第 1 页",
      "page_subtitle": "定位语句 + 心智第一联想",
      "recommended_layout": "S12",
      "data_source_hint": "summary.md + upstream_chunks_summary",
      "concept_for_this_page": "STP",
      "case_reference_slide": 40
    },
    {
      "page_no": 41,
      "page_intent": "蓝图页 41: 定位语句 + 心智第一联想 的第 2 页",
      "page_subtitle": "定位语句 + 心智第一联想",
      "recommended_layout": "S22",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "Brand-Positioning-Triangle",
      "case_reference_slide": 41
    },
    {
      "page_no": 42,
      "page_intent": "蓝图页 42: 定位语句 + 心智第一联想 的第 3 页",
      "page_subtitle": "定位语句 + 心智第一联想",
      "recommended_layout": "S03",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "Aaker-Brand-Personality",
      "case_reference_slide": 42
    },
    {
      "page_no": 43,
      "page_intent": "蓝图页 43: 定位语句 + 心智第一联想 的第 4 页",
      "page_subtitle": "定位语句 + 心智第一联想",
      "recommended_layout": "S05",
      "data_source_hint": "上游 chunk + 客户资料",
      "concept_for_this_page": "Slogan-7-Principles",
      "case_reference_slide": 43
    }
  ],
  "self_check": {
    "must_appear_keywords": [
      "定位语句"
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
  "agent_id": "brand_positioning",
  "blueprint_chunk_id": "p3-c1-positioning-statement",
  "chunk_takeaway": "一句话定位必须由分析结论推出而不是跳到口号",
  "chunk_insights": [
    "Target 来自消费者 chunk",
    "Category Frame 来自行业和竞争空位",
    "Key Benefit + RTB 来自自身优势"
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
      "page_no": 40,
      "layout": "S12",
      "action_title": "一句话定位必须由分析结论推出而不是跳到口号",
      "core_points": [
        "Target 来自消费者 chunk",
        "Category Frame 来自行业和竞争空位",
        "Key Benefit + RTB 来自自身优势"
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
        "STP"
      ],
      "render_hints": {
        "accent_color": "accent"
      }
    },
    {
      "page_no": 41,
      "layout": "S22",
      "action_title": "定位语句 + 心智第一联想 第 2 页必须承接上一页结论",
      "core_points": [
        "Target 来自消费者 chunk",
        "Category Frame 来自行业和竞争空位",
        "Key Benefit + RTB 来自自身优势"
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
        "Brand-Positioning-Triangle"
      ],
      "render_hints": {
        "accent_color": "ink"
      }
    }
  ],
  "metadata": {
    "blueprint_chunk_id": "p3-c1-positioning-statement",
    "chunk_intent_acknowledged": "定位语句 + 心智第一联想: 按案例蓝图填充指定页面",
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
