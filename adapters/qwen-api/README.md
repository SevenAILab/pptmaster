# PPTAgent · Qwen API 适配器

## 安装

```bash
cd pptmaster
python -m pip install -r adapters/qwen-api/requirements.txt
cp .env.example .env
```

在本地 `.env` 或 shell 环境中填写:

```bash
export DASHSCOPE_API_KEY=...
```

## 使用

```bash
set -a; source .env; set +a
python adapters/qwen-api/example.py smallrig
node validators/brand_positioning/content-check.mjs outputs/smallrig-positioning/raw-output.json
node validators/brand_positioning/methodology-check.mjs outputs/smallrig-positioning/raw-output.json
node scripts/render-deck.mjs outputs/smallrig-positioning/raw-output.json outputs/smallrig-positioning/index.html --style=swiss
```

本示例用 DashScope OpenAI-compatible mode 调用 `qwen-max`。
