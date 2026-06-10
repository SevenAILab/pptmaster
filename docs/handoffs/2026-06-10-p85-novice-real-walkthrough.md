# P8.5 / P9 真人演练与溢出体检 Handoff

日期：2026-06-10  
对象：P9 novice web shell + P8.5 freeform deck

## 已完成的自动部分

- 安装 Playwright：`npm install -D playwright && npx playwright install chromium`
- 对 P8.5 HTML 跑真实页面体检：
  - 命令：`node scripts/page-inspect.mjs outputs/p85-fixture-luma-coffee-fullcase/deck.freeform.html --json`
  - 结果：PASS，`ok=true`，溢出数 0。
- 中间发现 P3/P19/P25 溢出；已通过重设计 P3/P19/P25 消除。

## 需要 Seven 本人执行

P9 的“真人小白视角”尚未完成。需要 Seven 在浏览器中亲自走：

1. `node scripts/webapp/server.mjs`
2. 填一个新客户，不要使用 fixture 原文。
3. 等大纲生成。
4. 批准大纲。
5. 等完整方案生成。
6. 打开 deck。
7. 编辑。
8. 导出。

记录项：

- 每步耗时。
- 哪一步不知道发生了什么。
- 哪一步等待过久。
- 哪个按钮/状态文案不清楚。
- 生成后的 deck 是否看起来像可交付初稿。

## 当前状态

- 自动体检：PASS。
- 真人 walkthrough：SKIPPED，需要 Seven 执行。
- 双模型回归：SKIPPED，缺第二 provider key。
