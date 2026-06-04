# PPTAgent · Cline 适配器

## 安装

1. Clone `https://github.com/SevenAILab/pptmaster`
2. `cd pptmaster`
3. Copy `adapters/cline/.clinerules` to project root as `.clinerules`
4. `cp .env.example .env`, fill local API keys
5. `npm install`

## 使用

1. 准备客户输入: `inputs/{client_slug}/form.json` + `inputs/{client_slug}/summary.md`
2. 在 Cline 中输入: `按 adapters/cline/example-brand-positioning.md 运行 smallrig 品牌定位`
3. Cline 生成 `outputs/{client_slug}-positioning/raw-output.json`
4. Cline 运行 validators 和 render-deck
5. 打开 `outputs/{client_slug}-positioning/index.html`

## 输出约束

- 只接受严格 JSON。
- 每页必须有 `action_title`、`core_points`、`data_refs`、`models_used`。
- SmallRig 真实案例必须可追溯到 `_raw/cases/标杆案例/smallrig/page-NNN.md`。
