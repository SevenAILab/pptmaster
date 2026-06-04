# Phase 1.5 Web App 启动 Checklist

## 决策点 (Seven 拍板)

- [ ] Phase 1 北极星指标全部达成或明确 deferred?
- [ ] 内容种草问询率验证甲方真有需求?
- [ ] 启动 Phase 1.5 Web App? 是 -> 进 Plan 6;否 -> Skill 长期运营

## 启动前准备 (Plan 6 之前)

- [ ] 域名 `pptagent.app` 注册 + 备案 (国内备案约 15-30 天)
- [ ] Supabase 项目创建 (免费版起步)
- [ ] Vercel 账号创建 + 绑定 GitHub
- [ ] Stripe / 微信支付沙箱账号
- [ ] PostHog 项目创建 (埋点)
- [ ] Clerk 或 Supabase Auth 账号决策
- [ ] Anthropic / OpenAI / Qwen API quota 升级到生产级
- [ ] Tavily / Serper 生产 key 与月预算上限确认
- [ ] GitHub secret scanning 与 release 流程复查

## 技术预研清单

- [ ] Next.js 14/15 App Router 脚手架方案
- [ ] Supabase schema: users / projects / inputs / runs / slides / diffs
- [ ] 文件上传: PDF / PPTX / DOCX / 图片 OCR 的存储与解析路径
- [ ] Agent run 队列: 同步 MVP 还是异步任务队列
- [ ] HTML deck 预览: 复用 `render-deck.mjs` 还是抽为 service
- [ ] 付费墙: 免费试用次数 / 单次购买 / 订阅方案
- [ ] Diff 采集: 每份方案至少 1 次人工编辑反馈
- [ ] 安全: env secret 管理、上传文件隔离、HTML 输出 XSS 过滤

## Phase 1.5 时间盒

- 5-8 周 (Plan 6 详细拆分)
- 第一周只做产品规格、数据模型、脚手架和 1 条最小生成链路

## Phase 1.5 KPI (Spec §1.4)

- 注册用户 >= 200 真甲方
- 生成方案数 >= 100 份
- 付费用户 >= 10
- NPS >= 60
- diff 采集覆盖每份方案 >= 1 diff
- 首日留存 >= 40% / 30 日留存 >= 20%

## Go / No-Go 判断

Go:

- 内容种草带来明确试用或咨询线索
- SmallRig + 至少 1 个公开品牌拟稿可稳定达到可挂名度 >= 7/10
- 真实 API 跨模型验证补跑后没有重大质量倒退

No-Go / 延后:

- 内容种草没有形成有效询盘
- render-deck 视觉仍不足以承接 Web App 首批用户预期
- 搜索成本或模型成本无法控制在可接受范围

## Plan 6 输入

- [ ] `docs/phase-1-retro.md` 最新复盘
- [ ] 内容种草发布数据
- [ ] 至少 1 个公开品牌完整 raw-output + review
- [ ] Web App 产品范围: 只做 Skill 包装,还是做完整用户项目工作台
