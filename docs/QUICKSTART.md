# PPTAgent · 5 分钟上手

## 前置

- macOS / Linux
- Node.js >= 18
- Claude Code (推荐) 或 Cursor / Cline / OpenAI API
- Tavily + Serper API key (用于行业 / 竞品实时搜索)

## 第 1 分钟: 安装

```bash
git clone https://github.com/SevenAILab/pptmaster.git
cd pptmaster
npm install
cp .env.example .env
```

## 第 2 分钟: 配密钥

编辑 `.env`:

```bash
TAVILY_API_KEY=tvly-your-key
SERPER_API_KEY=your-serper-key
```

测试:

```bash
npm run search:test
```

成功时会看到 Tavily 和 Serper 双引擎测试通过。`.env` 已在 `.gitignore`, 不要提交。

## 第 3 分钟: 装载到 Claude Code

```bash
ln -s "$(pwd)" ~/.claude/skills/pptmaster
```

在 Claude Code 中输入:

```text
/pptmaster
```

## 第 4 分钟: 准备客户输入

```bash
mkdir -p inputs/test-client/raw
```

把客户资料放进 `inputs/test-client/raw/`, 然后写 `inputs/test-client/form.json`:

```json
{
  "name": "测试客户",
  "industry": "消费品",
  "stage": "1-10 成长",
  "core_products": ["产品 A"],
  "target_audience": ["新中产"],
  "competitors": ["竞品 1", "竞品 2"],
  "budget_level": "50-200 万",
  "tonality": "理性专业",
  "render_style": "swiss",
  "expected_pages": 60
}
```

再写 `inputs/test-client/summary.md`: 800-1500 字客户档案, 包括业务背景、产品、用户、竞品、渠道、增长目标和已知限制。

## 第 5 分钟: 跑 blueprint 全案

PPTAgent 当前默认使用 **Chief Strategist Orchestrator + blueprint-driven flow**:

1. 主 Agent 先生成 `strategic-question.md`,明确整案根问题。
2. 主 Agent 根据方案类型选择 blueprint。
3. 主 Agent 把 blueprint 拆成 chunk task packets,派发给 6 个 Sub-Agent。
4. 子 Agent 输出 `_chunks/*.json`。
5. `assemble-by-blueprint.mjs` 汇总为最终 deck。

### A. 本地 demo 快速验证

如果你只是想先看一份可打开的本地效果,可以跑 deterministic demo generator:

```bash
node scripts/generate-blueprint-demo.mjs test-client --scheme brand_positioning_case --output-slug test-client-blueprint --force
open outputs/test-client-blueprint/index.html
```

品牌建设案:

```bash
node scripts/generate-blueprint-demo.mjs test-client --scheme brand_building_case --output-slug test-client-blueprint --force
open outputs/test-client-blueprint/index.html
```

### B. 真实 Sub-Agent 分步流程

命令行直接跑:

```bash
npm run blueprint:suite -- test-client --scheme brand_positioning_case --force --fail-fast
npm run blueprint:assemble -- test-client --scheme brand_positioning_case --output-slug test-client-blueprint
node scripts/render-deck.mjs outputs/test-client-blueprint/raw-output.json outputs/test-client-blueprint/index.html --style=swiss
open outputs/test-client-blueprint/index.html
```

`blueprint:suite` 会为每个 chunk 生成 prompt bundle,并自动注入:

- Strategic Question
- Blueprint Chunk
- Upstream Chunk Summary
- Chief Strategist task packet
- must-load concepts
- case patterns

当前 Skill MVP 的高质量方案生成仍建议在 Claude Code 中按 chunk 读取 prompt bundle,生成 `_chunks/<chunk_id>.json`,再执行 assemble + render。

旧脚本 `run-full-suite.mjs` / `merge-full-deck.mjs` 仍保留为兼容入口,但不再是默认上手路径。

## 其他 Adapter

- Cursor: `adapters/cursor/`
- Cline: `adapters/cline/`
- OpenAI API: `adapters/openai-api/`
- Anthropic API: `adapters/anthropic-api/`
- Qwen API: `adapters/qwen-api/`
