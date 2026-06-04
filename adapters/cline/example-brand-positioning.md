# Cline Example · Run Sub-Agent ④ brand_positioning

目标: 用 Cline 在本地调起 PPTAgent Sub-Agent ④,为 `{client_slug}` 生成品牌定位案。

## Step 1 · 生成 Prompt Bundle

```bash
node scripts/run-sub-agent.mjs brand_positioning {client_slug} --output-suffix=positioning
```

读取:

- `outputs/{client_slug}-positioning/prompt-bundle.md`
- `prompts/brand_positioning/system.md`
- `prompts/brand_positioning/examples.md`
- `assets/_compiled/concept-application-matrix.json`
- `assets/_compiled/concepts-golden/{must_load}.md`

## Step 2 · 生成 Raw Output

请严格输出 JSON,写入:

```text
outputs/{client_slug}-positioning/raw-output.json
```

要求:

- `agent_id` 必须是 `brand_positioning`
- 每页都有 `action_title`, `core_points`, `data_refs`, `models_used`
- SmallRig 真实字段必须 source 到 `_raw/cases/标杆案例/smallrig/page-NNN.md`
- 推演内容必须写入 `metadata.assumptions`

## Step 3 · Validate + Render

```bash
node validators/brand_positioning/content-check.mjs outputs/{client_slug}-positioning/raw-output.json
node validators/brand_positioning/methodology-check.mjs outputs/{client_slug}-positioning/raw-output.json
node scripts/render-deck.mjs outputs/{client_slug}-positioning/raw-output.json outputs/{client_slug}-positioning/index.html --style=swiss
```

完成后打开:

```text
outputs/{client_slug}-positioning/index.html
```
