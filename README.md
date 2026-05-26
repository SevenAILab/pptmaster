# PPTAgent · 品牌策略 AI Agent

> 上传客户资料 + 填几个字段 -> 输出咨询级品牌全案 HTML PPT

**官网**: https://pptagent.app (Phase 1.5 上线)
**Repo**: https://github.com/SevenAILab/pptmaster
**License**: MIT

---

## ⚠️ 密钥安全 (P0 必读)

本项目使用 Tavily 和 Serper 两个外部搜索 API。请：

1. **复制** `.env.example` 为 `.env`
2. **填入你自己的密钥**
3. **绝不要** 把 `.env` 提交到 git (已在 .gitignore)

详见 [docs/setup-search-keys.md](docs/setup-search-keys.md)。

如果不小心提交了密钥，立刻：
1. 在对应平台撤销该密钥并生成新密钥
2. 用 git filter-repo 或 BFG Repo-Cleaner 清理历史
3. 强制推送清理后的历史

---

## 这是什么

PPTAgent 是一套面向甲方品牌人 / 独立品牌策划顾问的 AI Agent 框架。

**特性**:
- 📚 **方法论资产**: 247 页《AI 实战，从 0 到 1 打造你的品牌》+ 132 个营销模型 + 8 张品牌全案知识全景图
- 🤖 **6 个 Sub-Agent**: 消费者洞察 / 行业分析 / 竞争分析 / 品牌定位 / 品牌建设 / 年度规划，可独立运行或组合调用
- 🔍 **实时数据**: Tavily + Serper 双引擎自动获取行业 / 竞品 / 趋势数据
- 🎨 **专业渲染**: 复用瑞士国际主义风 / 电子杂志风 22 套版式
- 🔁 **模型无关**: Claude / GPT / Qwen / DeepSeek 都能跑

## Quick Start (Claude Code Skill 形态)

```bash
# 1. Clone
git clone https://github.com/SevenAILab/pptmaster.git
cd pptmaster

# 2. 配置密钥
cp .env.example .env
# 编辑 .env, 填入你的 Tavily/Serper 密钥

# 3. 安装最小依赖
npm install

# 4. 把本仓库链接到 Claude Code Skills 目录
ln -s "$(pwd)" ~/.claude/skills/pptmaster

# 5. 在 Claude Code 中调起
# /pptmaster
```

## Phase 1 Roadmap

- [x] Spec v1.1.1 设计完成
- [ ] Week 1 资产 ingest + Repo 骨架
- [ ] Week 1.5 资产编译流水线
- [ ] Week 2 Sub-Agent ④ 品牌定位 (SmallRig 案例)
- [ ] Week 3-4 Sub-Agent ①②③⑤
- [ ] Week 5 Sub-Agent ⑥ + 全案串联
- [ ] Week 6 模型无关化
- [ ] Week 7 Beta 公开发布

## License

MIT © 2026 SevenAILab
