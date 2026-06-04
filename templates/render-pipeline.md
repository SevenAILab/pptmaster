# 渲染管线 · Sub-Agent JSON -> HTML 单文件

## 输入

Sub-Agent 输出的标准 JSON (见 spec §4.2):

```json
{
  "agent_id": "brand_positioning",
  "slides": [
    {
      "page_no": 1,
      "layout": "S03",
      "action_title": "...",
      "core_points": []
    }
  ]
}
```

## 调用方法

```bash
node scripts/render-deck.mjs <input.json> <output.html> [--style swiss|magazine]
```

## 流程

1. 读 Sub-Agent JSON。
2. 读 `templates/template-swiss.html` 或 `templates/template-magazine.html`。
3. 将模板中的 `<!-- SLIDES_HERE -->` 占位符替换为每页 `<section class="slide" data-layout="S03">...</section>`。
4. 每页按 layout `S01-S22` 取 `templates/guizang-refs/layouts-swiss.md` 的骨架。
5. 填入 `action_title`、`core_points`、`data_refs`、`visual_brief` 等内容。
6. 输出 `outputs/{客户名}-{日期}/index.html`。
7. 跑 `validators/validate-swiss-deck.mjs <output.html>` 校验。

## 约束

- Sub-Agent 只负责结构化内容,不直接写完整 HTML。
- 渲染器负责 layout 映射、转义、空值兜底和模板替换。
- 生成后必须通过 `validate-swiss-deck.mjs` 再进入交付目录。
