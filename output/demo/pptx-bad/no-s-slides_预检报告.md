# HTML Preflight Report

Source HTML: `/tmp/no-s-slides.html`

## Quick Result

- Overall risk: 低风险
- Estimated `.S` blocks: 0
- <section> count: 0
- External asset references: 0

## Table Semantics

- Native HTML tables: 0
- Tables explicitly marked `data-pptx-role="native-table"`: 0
- Visual matrix candidates: 0
- Shape matrices explicitly marked `data-pptx-role="shape-matrix"`: 0
- Legacy div table candidates: 0
- Legacy div table row blocks: 0
- Visual matrix classes: none

Recommendation: use real `<table>` markup for content that must remain a single editable PowerPoint table. Use div/CSS grids only for visual matrices, heatmaps, scorecards, and charts where shape-level editing is acceptable.

## Findings

- No major high-risk conversion patterns were detected in static preflight.

## External References

- None

## Presales Recommendation

- Keep key text/table content as real DOM text nodes.
- Use .S as stable slide containers for every page.
- Avoid putting critical labels into screenshots, SVG, or canvas layers.
