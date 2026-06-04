# Engine V2 Phase 1 CP Note

日期：2026-05-30

## 结论

Phase 1 自动化验收通过：`.S` 导出链、外部 html2ppt 转换封装、失败必抛错、原生表格数护栏均已跑通。

人工 UI 复核项（在 PowerPoint / Keynote 中双击文字、点选表格行列）仍需 Seven 或 Claude 打开本地 PPTX 确认；本记录不把未实际手动点击过的项目伪装为已完成。

## 产物路径

- 80 页真实方案 `.S` HTML：`output/demo/deck.html`
- 80 页推荐可编辑 PPTX：`output/demo/pptx/deck_推荐可编辑版.pptx`
- 80 页转换报告：`output/demo/pptx/deck_转换报告.md`
- 单页表格护栏 `.S` HTML：`output/demo/table-deck.html`
- 单页表格推荐可编辑 PPTX：`output/demo/table-pptx/table-deck_推荐可编辑版.pptx`
- 单页表格转换报告：`output/demo/table-pptx/table-deck_转换报告.md`

## 已执行验证

- `.S` 渲染真实方案：`node scripts/render-deck-s.mjs outputs/pptagent-blueprint/raw-output.json output/demo/deck.html`
  - 结果：`[render-s] 80 个 .S 页面 -> output/demo/deck.html`
- 转换真实方案：`node scripts/deck-to-pptx.mjs output/demo/deck.html output/demo/pptx`
  - 结果：退出码 0；`设计真表格=0 原生PPT表格=0`
  - `unzip -t output/demo/pptx/deck_推荐可编辑版.pptx`：无压缩错误
- 转换单页表格 demo：`node scripts/deck-to-pptx.mjs output/demo/table-deck.html output/demo/table-pptx`
  - 结果：退出码 0；`设计真表格=1 原生PPT表格=1`
  - 报告：`Native PowerPoint tables: 1`
  - PPTX XML 抽查：推荐版 slide XML 中存在 `<a:tbl>`
- 工具缺失红线：`HTML2PPT_DIR=/no/such/dir node scripts/deck-to-pptx.mjs output/demo/deck.html output/demo/pptx-x`
  - 结果：退出码 1；报错 `未找到 html2ppt 转换器`
- 无 `.S` 页面红线：`node scripts/deck-to-pptx.mjs /tmp/no-s-slides.html output/demo/pptx-bad`
  - 结果：退出码 1；报错 `Selector matched no elements: .S`

## 测试

- `node scripts/test-template-deck-s.mjs`
- `node scripts/renderers-s/test-render-utils-s.mjs`
- `node scripts/renderers-s/test-render-s-fallback.mjs`
- `node scripts/test-render-deck-s.mjs`
- `node scripts/test-deck-to-pptx.mjs`
- `node scripts/test-deck-to-pptx-runner.mjs`
- `node scripts/renderers-s/test-render-s-statement.mjs`
- `node scripts/renderers-s/test-render-s-table.mjs`
- `node scripts/test-render-deck.mjs`
- `node scripts/renderers/test-renderers.mjs`
- `node scripts/test-blueprint-assemble.mjs`
- `node -e "require('./package.json')"`

全部通过。

## 人工复核清单

- [ ] `_推荐可编辑版.pptx` 能在 PowerPoint / Keynote 打开且不报错
- [ ] 随机抽 3 页，双击标题/正文能直接改字
- [ ] 含表格页能点选行列，确认不是图片
- [x] `_转换报告.md` 里 `Native PowerPoint tables` 数字不小于 HTML 里的 `<table` 数
- [ ] 每页 16:9 且关键内容无裁切
- [x] 找不到工具 / 转换失败会非零退出并打印中文错误
