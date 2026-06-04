# HTML to PPTX Conversion Report

Source HTML: `/Users/seven/Documents/文档/PPT方案大师/pptmaster/output/demo/table-deck.html`

Detected selector: `.S`
Matched slides: 1

## Output Files

- 预检报告: `/Users/seven/Documents/文档/PPT方案大师/pptmaster/output/demo/table-pptx/table-deck_预检报告.md`
- 原始保真版: `/Users/seven/Documents/文档/PPT方案大师/pptmaster/output/demo/table-pptx/table-deck_原始保真版.pptx`
- 推荐可编辑版: `/Users/seven/Documents/文档/PPT方案大师/pptmaster/output/demo/table-pptx/table-deck_推荐可编辑版.pptx`
- 最大可编辑版: `/Users/seven/Documents/文档/PPT方案大师/pptmaster/output/demo/table-pptx/table-deck_最大可编辑版.pptx`
- 给售前看的结论: `/Users/seven/Documents/文档/PPT方案大师/pptmaster/output/demo/table-pptx/table-deck_给售前看的结论.txt`

## Preflight Snapshot

- Preflight overall risk: 低风险
- Estimated .S blocks in source: 1
- External asset references: 0
- Risk pattern count: 0
- Native HTML tables: 1
- Visual matrix candidates: 0
- Legacy div table candidates: 0

## Overlay Summary

- Slides scanned: 1
- Native PowerPoint tables: 1
- Raster overlay pictures detected: 1
- Slides with large overlays >=5% of slide area: 1
- Slides with 8+ overlays: 0
- Recommended version removes overlays >=1% of slide area.

## High-Risk Slides

| PPT slide | Native tables | Overlay count | Large | Max area | Total area | Title |
|---:|---:|---:|---:|---:|---:|---|
| 1 | 1 | 1 | 1 | 8.2% | 8.2% | PPTAgent |

## All Slides

| PPT slide | Native tables | Overlay count | Large | Medium | Small | Max area | Title |
|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 1 | 1 | 1 | 0 | 0 | 8.2% | PPTAgent |

## How To Interpret This

- 原始保真版：保留 dom-to-pptx 的原始输出，通常视觉最接近 HTML，但编辑时可能点到图片遮罩。
- 推荐可编辑版：移除大面积图片遮罩，同时保留小装饰，是销售/售前默认优先使用的版本。
- 最大可编辑版：移除全部 preencoded 图片遮罩。当 PowerPoint 仍然选中图片而不是文字/形状时使用。
- 原生表格：报告中的 Native PowerPoint tables 来自 PPTX 内部 `<a:tbl>` 对象。需要像表格一样插行列时，HTML 源头必须使用 `<table>`。
- 视觉矩阵：div/CSS grid 会转成多个可编辑形状，适合热力图、2x2、KPI图表，但不是一个 PowerPoint 表格对象。
- 移除遮罩可能降低部分渐变、阴影、圆角容器和组合视觉效果的还原度。
