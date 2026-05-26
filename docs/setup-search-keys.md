# 配置外部搜索密钥

PPTAgent 使用两个搜索 API 获取实时行业/竞品/趋势数据：

## 1. Tavily (默认主搜，80% 调用)

1. 注册: https://tavily.com
2. Dashboard 复制 API Key
3. 价格: $0.05-0.10 / 1000 queries

## 2. Serper (兜底深查，20% 调用)

1. 注册: https://serper.dev
2. Dashboard 复制 API Key
3. 价格: $0.30 / 1000 queries

## 3. 配置到本地

```bash
cd pptmaster
cp .env.example .env
```

编辑 `.env`:

```
TAVILY_API_KEY=tvly-你的真实密钥
SERPER_API_KEY=你的真实密钥
```

## 4. 测试

```bash
npm run search:test
```

Expected output:
```
✅ Tavily test passed
✅ Serper test passed
```

## 5. 成本控制

- 单方案搜索成本 ≤ ¥0.50 (默认约束)
- 月度搜索成本 ≤ ¥30 (建议上限)
- 详见 outputs/<客户名>/search-log.json 每方案审计
