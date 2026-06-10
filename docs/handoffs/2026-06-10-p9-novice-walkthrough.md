# P9 小白 Web 外壳演练交接

日期：2026-06-10
阶段：P9 novice web shell
本地入口：`http://localhost:8780`

## 结论

P9 已完成本地单机 Web 外壳的最小可用闭环：

- Web intake 写入 `inputs/<web-slug>/form.json`、`summary.md`、`strategic-question.md`。
- 后端第一段调用 `gen-fullcase-cli --outline-only`，真正停在大纲。
- 前端轮询 `run-state` / `events.jsonl`，展示研究、大纲、章节、设计等阶段事件。
- 用户批准大纲后，第二段继续生成 fullcase，并默认渲染 `deck.freeform.html`。
- `/api/runs/:slug/deck` 返回注入轻编辑工具条的 HTML，支持 `contenteditable` 修改与导出 HTML。

## 实现文件

- `scripts/webapp/handlers.mjs`
- `scripts/webapp/server.mjs`
- `scripts/webapp/index.html`
- `scripts/editable-inject.mjs`
- `scripts/freeform-renderer.mjs`
- `scripts/page-inspect.mjs`

## 验证记录

```bash
node scripts/webapp/test-handlers.mjs
node scripts/test-editable-inject.mjs
node scripts/test-freeform-renderer.mjs
node scripts/test-design-page.mjs
node scripts/test-assemble-freeform-deck.mjs
node scripts/test-fullcase-pipeline.mjs
node scripts/test-event-ledger.mjs
```

全部通过。

本地服务 smoke：

```bash
PPTMASTER_PORT=8780 node scripts/webapp/server.mjs
curl http://localhost:8780/
curl http://localhost:8780/api/runs/p8-fixture-luma-coffee/status
```

结果：首页 200，status API 正常返回大纲/事件。

deck route smoke：

为了避免再消耗 24 页设计模型成本，用 `freeform-renderer` 对 P8 deck 生成 stub HTML 后验证：

```bash
curl http://localhost:8780/api/runs/p8-fixture-luma-coffee/deck
```

返回 HTML 中包含 `pptmaster-edit-toolbar`、`contenteditable`、`导出 HTML`。

## 产品状态

| Gate | 结果 |
| --- | --- |
| 全程零命令行 | Web UI 已支持；本轮自动化 smoke 使用 curl 验证 |
| 大纲 HITL | PASS，`--outline-only` 已真正停在大纲 |
| 断点续跑 | PASS，沿用 P7 outline/chapter/design checkpoint |
| 编辑导出 | PASS，工具条注入并可客户端导出 |
| 溢出体检 | 脚本已实现；当前环境未装 Playwright，已验证显式报错 |

## 已知限制

- 真实全流程浏览器人工演练尚未完整等待一次新 run 从 intake 到设计完成；已用已有 P8 run 和 API smoke 覆盖核心接口。
- `page-inspect` 需要安装 Playwright：`npm install -D playwright && npx playwright install chromium`。
- 设计渲染默认会逐页调用模型，24 页全案耗时与成本较高；`deck.designed.json` checkpoint 可断点复用。
- P8 研究虽扩展到 76 findings / 26 sources，但强来源比例仍为 0，后续需要 P8.5 source targeting。

## 使用方式

```bash
cd /Users/seven/Documents/文档/PPT方案大师/pptmaster
PPTMASTER_PORT=8780 node scripts/webapp/server.mjs
```

打开 `http://localhost:8780`。
