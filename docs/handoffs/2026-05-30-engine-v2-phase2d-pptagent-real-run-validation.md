# Engine V2 · Phase 2d — pptagent 真实端到端验证跑（Real-Run Validation）

> **For agentic workers (Codex):** 本文件是真跑执行手册。**前提:newcli 渠道已接好**（见 §0）。不要在渠道未就绪时硬跑。真跑会烧 token——设了成本/重试上限,触顶必须**抛错停下**,绝不静默兜底或硬烧。

**Goal:** 在「假设感知评审」（Phase 2c）落地后,对当初卡死 3 小时的 **pptagent（开源项目主体）** 做一次真实 LLM 端到端跑,验证它能产出**诚实标注 + 验证清单**的完整方案,而不是无限 BLOCK,且零编造事实。

**Why now / why pptagent:** pptagent 是个开源项目,网上天然查不到竞品份额、需求规模这类一手数据。旧评审不懂"假设",一律 BLOCK,Codex 空转 3 小时。Phase 2c 给"诚实假设"开了合法通道。**这次真跑是唯一能证明 Phase 2c 真正达成目标的方式**——单测只证明逻辑对,没证明真实主体能跑通。

---

## §0 前置条件（不满足就不要跑）

- [ ] **newcli 渠道已接入 `.env`：** `ANTHROPIC_BASE_URL=https://code.newcli.com/claude/ultra`（或 Seven 指定的最终地址）,`ANTHROPIC_API_KEY=<真 key，不写入文档>`,`ANTHROPIC_WIRE_API` 按渠道要求设置（mdlbus 当时是 `chat_completions`,newcli 需确认）。
- [ ] **绕过 env 遮蔽（已知坑,必做）：** 跑任何命令前先
  ```bash
  unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL
  ```
  否则 Claude Code shell 会用空 KEY + 官方 BASE_URL 压住 `.env`,把真 key 发去官方端点 → 401。详见 memory `project-pptmaster-env-shadowing`。
- [ ] **单次连通自检（先花 1 次调用确认渠道活着,再开整跑）：**
  ```bash
  unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL && node -e "import('./scripts/llm-clients/claude-client.mjs').then(async m=>{const r=await m.callClaude('reply with the single digit 2 only','2?',{maxTokens:16});console.log('OK:',r.text)})"
  ```
  期望:打印一个数字(如 `OK: 2`)。401/超时 → 回到 §0 排查渠道,**不要**继续整跑。

---

## §1 真跑命令序列（brand_positioning_case 方案）

> pptagent 的输入在 `inputs/pptagent/`。本次只跑定位方案(positioning),先把一条链路跑通再说,不要同时跑 building 双线烧双倍 token。

- [ ] **Step 1 — 跑套件(深度调研 + 成稿 + 评审):**
  ```bash
  unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL && node scripts/run-blueprint-suite.mjs pptagent --scheme brand_positioning_case --real-llm 2>&1 | tee outputs/_logs/pptagent-2d-suite.log
  ```
- [ ] **Step 2 — 组装整卷:**
  ```bash
  unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL && node scripts/assemble-by-blueprint.mjs pptagent --scheme brand_positioning_case --output-slug pptagent-blueprint 2>&1 | tee outputs/_logs/pptagent-2d-assemble.log
  ```
- [ ] **Step 3 — 渲染:**
  ```bash
  node scripts/render-deck.mjs pptagent-blueprint 2>&1 | tee outputs/_logs/pptagent-2d-render.log
  ```

---

## §2 反死循环护栏（吸取 3 小时空转的教训）

- [ ] **成本/时间上限:** 整跑设硬上限——若累计 LLM 成本超过 **$X**(Seven 定,建议先 $5)或墙钟超过 **30 分钟**,**抛错停下**,把当前进度写日志,**不要**继续烧或组装半成品。
- [ ] **单 chunk 重试上限:** 任一 chunk 的 RETRY 次数已有上限;若某 chunk 连续 BLOCK 达上限,**整跑失败退出**(exit≠0),日志写明是哪个 chunk、BLOCK 原因(assumption hardBlock? data_credibility?)。**绝不**为了"跑通"而放松红线或伪造数据。
- [ ] **若再次出现"同一 chunk 反复 BLOCK":** 停下,把该 chunk 的 `outputs/pptagent/_chunks/<id>.json` + `outputs/pptagent/_audit/consulting-reviews.jsonl` 贴出来交给 Seven/Claude 判断,**不要**自己连续改 20 个 commit 去硬磨(这正是上次的错)。

---

## §3 验收清单（CP-2d,真跑后逐项核对）

跑完后逐项验,**任一不达标都不算通过**:

- [ ] **A. 不再死循环:** 套件在成本/时间上限内**自然结束**(成功或明确失败),没有无限 BLOCK 空转。
- [ ] **B. 出完整整卷:** `outputs/pptagent-blueprint/raw-output.json` 存在,`metadata.total_pages` 接近 `target_pages`,渲染产物生成。
- [ ] **C. 假设被诚实标注:**
  - 每个含假设的 chunk,其 slide 带 `evidence_status:"hypothesis"` 且 `hypothesis_basis`/`validation_method` 非空。
  - 组装产物 `metadata.validation_checklist` 非空(对溢出 chunk),`metadata.pending_validation` 与实际假设页一致,假设页带 `pending_validation:true`。
  - 检查命令:
    ```bash
    node -e 'const o=require("./outputs/pptagent-blueprint/raw-output.json");console.log("pending_validation:",o.metadata.pending_validation,"checklist:",o.metadata.validation_checklist.length,"assumption_summary:",JSON.stringify(o.metadata.assumption_summary))'
    ```
- [ ] **D. 零编造事实(红线):** 全卷 data_refs 里**不得**出现 `inputs/pptagent/summary.md`、`assets/_raw/cases/**`、或无 source 的项。每个关键判断要么有 T1/T2,要么是诚实假设。
  - 检查命令:
    ```bash
    node -e 'const o=require("./outputs/pptagent-blueprint/raw-output.json");const bad=[];for(const s of o.slides)for(const r of (s.data_refs||[])){const src=String(r.source||r.source_url||r.url||"");if(src.includes("summary.md")||src.includes("assets/_raw/cases/")||!src)bad.push([s.page_no,src||"(empty)"])}console.log("RED-LINE violations:",bad.length,bad.slice(0,10))'
    ```
    期望:`RED-LINE violations: 0`。
- [ ] **E. 每个 data_ref 带 source_tier:** (Phase 2c 分类器依赖它)
  ```bash
  node -e 'const o=require("./outputs/pptagent-blueprint/raw-output.json");let miss=0;for(const s of o.slides)for(const r of (s.data_refs||[]))if(!r.source_tier)miss++;console.log("data_refs missing source_tier:",miss)'
  ```
  期望:`0`(已确认新写手 `normalizeDataRefs` 会附 source_tier;若非 0 说明有旁路,需查)。
- [ ] **F. 假设占比合理:** 看每 chunk `assumption_ratio`(在 `outputs/pptagent/_audit/consulting-reviews.jsonl`)。**全卷大面积溢出(多数 chunk overflow)** 说明这个主体证据太薄,要回报 Seven 决定是否换更易取证的主体或补一手资料,而不是出一本几乎全"待验证"的方案。

---

## §4 预跑已知情报（Claude 的免费冒烟自检结论,供 Codex 参考)

我(Claude)用 Phase 2c 新闸门对**旧的** `outputs/pptagent.pre-real-run.*.bak/_chunks/` 28 个产物跑了一遍(不烧 token):

- ✅ **新闸门不崩**,能处理真实形状的 chunk 数据。
- ✅ **正确判废:** 旧产物 11/28 chunk 被硬 BLOCK,因为它们的 data_refs 大量是 `inputs/pptagent/summary.md`(红线明令禁止当数据的伪来源),且无 source_tier、无假设标注 → 判为 unsupported。**这正是旧管线的病,新写手应避免。**
- ✅ **新写手已修这条:** `deepresearch-common.mjs` 的 `normalizeDataRefs` 会给每个 data_ref 附 `source_tier`,且 case-library/summary.md 受既有护栏拦截。
- ⚠️ **真跑的成败关键:** 新写手能否对每个关键判断,要么抓到**真实 http T2 来源**,要么**诚实标注为假设(带 basis+method)**。pptagent 证据天然薄,预计假设页不少——这是**预期且允许**的,只要诚实标注 + 进验证清单,且不碰红线。

---

## §5 失败时的上报格式(给 Seven/Claude)

若 §3 任一项不达标,**不要自行硬磨**。按此上报:
1. 失败在哪一步(suite/assemble/render)、哪个 chunk。
2. 失败类型:assumption hardBlock(unsupported/偷懒)? data_credibility 评分 BLOCK? 成本/时间触顶? 死循环?
3. 贴 `outputs/pptagent/_audit/consulting-reviews.jsonl` 末尾 + 出问题 chunk 的 `_chunks/<id>.json`。
4. 不改代码、不改数据,交回判断。

---

## 给小白的讲解

- **现在做的是什么:** 我写了一份"真跑验证说明书"。等你把新的 API 渠道(newcli)接好,Codex 就照着它对 pptagent 这个开源项目真刀真枪跑一遍,看新改的"假设感知评审"是不是真的能让它出一本诚实的方案。
- **目的·为什么:** 之前所有改动只过了"单元测试"(等于在实验室证明零件能动),但从没在真实项目上整机跑过。pptagent 正是当初卡死 3 小时的那个主体,拿它验证最有说服力:能出整卷、假设页老实标"待验证"并附验证清单、且一个数据都没编——才算 Phase 2c 真的成了。说明书里还加了"防空转"闸:烧钱或耗时超上限就停下报告,绝不再像上次那样闷头改 20 次硬磨。
- **你怎么自己核查:** ① 这份说明书在 `docs/handoffs/2026-05-30-engine-v2-phase2d-pptagent-real-run-validation.md`,你可以看开头 Goal 和结尾这段是不是你要的。② **关键前提是你先接好 newcli 渠道**——没接好别让 Codex 跑(说明书 §0 第一条)。③ 跑完后,说明书 §3 给了一串"检查命令",每条都会打印一个数字,比如"红线违规: 0"就说明没编数据;你照着对一遍就知道成没成。
