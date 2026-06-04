# PPTAgent · Cursor 适配器

## 安装

1. Clone `https://github.com/SevenAILab/pptmaster`
2. `cd pptmaster`
3. Copy `adapters/cursor/.cursorrules` to project root as `.cursorrules`
4. `cp .env.example .env`, fill local API keys
5. `npm install`

## 使用

1. 准备客户输入: `inputs/{client_slug}/form.json` + `inputs/{client_slug}/summary.md`
2. 运行: `python adapters/cursor/example-brand-positioning.py {client_slug}`
3. 在 Cursor 中打开 `outputs/{client_slug}-positioning/prompt-bundle.md`
4. 让 Cursor 按 `.cursorrules` 生成 `raw-output.json`
5. 验证 + 渲染: `python adapters/cursor/example-brand-positioning.py {client_slug} --validate`
6. 打开 `outputs/{client_slug}-positioning/index.html`

## 安全

- `.env` 必须保持 ignored。
- SmallRig 真实字段必须来自 `_raw/cases/标杆案例/smallrig/page-NNN.md`。
- 不要把 Cursor 生成的临时上下文、真实客户上传原件或密钥提交到 git。
