# Engine V2 · Phase 2d 补充 — 单 chunk 真跑 Demo（competition-status）

> **For agentic workers (Codex):** 这是一份「单 chunk 真跑」执行手册。目标是用最小 token 跑通一个 chunk，让 Seven 第一次**亲眼看到**「不抛错 + 诚实假设页 + 验证清单」的成型产物。真跑会烧 token——设了**硬上限**，触顶必须**抛错停下、写日志**，绝不静默兜底、绝不伪造数据、绝不连续硬磨。

**Goal:** 在 Phase 2c（假设感知评审）+ Phase 2e（定位页诚实降级）落地后，对 pptagent 蓝图里的 **`p2-c2-competition-status`** 这一个 chunk 做真实 LLM 端到端跑，验证它**不再硬抛错死循环**，且产出**诚实标注假设 + 带验证方法**的页面。

**Why this chunk:** `p2-c2-competition-status`（竞争态势）正是当初真跑里**反复硬抛错、卡死 3 小时**的那个 chunk（写手护栏：`named competitor lacks page-level evidence` / `competitor-owned demand snippets`）。Phase 2c+2e 的全部修复，就是为了让这种「证据天然薄」的竞争页能**诚实降级成假设**而不是死循环。拿它单跑，最有说服力。

**关键约束:** 这是 **Codex 执行**（不是 Claude 跑），Seven 已确认。Claude 只写本规格 + 跑完做独立 CP 复核。

---

## §0 前置条件（不满足就不要跑）

- [ ] **渠道已接入 `.env`（已知可用：mdlbus）：** `ANTHROPIC_BASE_URL=https://mdlbus.com`，`ANTHROPIC_WIRE_API=chat_completions`，`ANTHROPIC_MODEL=gpt-5.5`，`ANTHROPIC_API_KEY=<真 key，不写入文档>`。
- [ ] **绕过 env 遮蔽（已知坑，必做）：** 跑任何命令前先在同一行 `unset`：
  ```bash
  unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL
  ```
  否则 Claude Code / shell 会用空 KEY + 官方 BASE_URL 压住 `.env` 第三方代理 → 401。详见 memory `project-pptmaster-env-shadowing`。
- [ ] **单次连通自检（先花 1 次极便宜调用确认渠道活着，再开正式跑）：**
  ```bash
  unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL && node -e "import('./scripts/llm-clients/claude-client.mjs').then(async m=>{const r=await m.callClaude('reply with the single digit 2 only','2?',{maxTokens:16});console.log('OK:',r.text)}).catch(e=>{console.error('SELFCHECK_FAIL:',e.message);process.exit(1)})"
  ```
  期望：打印一个数字（如 `OK: 2`）。401/超时 → 回 §0 排查渠道，**不要**继续正式跑。

---

## §1 真跑命令（只跑一个 chunk，含咨询评审）

> chunk 已确认存在于编译蓝图 `assets/_compiled/blueprints/brand-positioning-deck-v1.json`（13 个 chunk 之一）。

- [ ] **Step 1 — 单 chunk 真跑 + 咨询评审：**
  ```bash
  unset ANTHROPIC_API_KEY ANTHROPIC_BASE_URL && node scripts/run-blueprint-suite.mjs pptagent --scheme brand_positioning_case --only-chunk p2-c2-competition-status --real-llm --with-consulting-review 2>&1 | tee outputs/_logs/pptagent-2d-single-competition.log
  ```
  - 为什么带 `--with-consulting-review`：要让**假设感知评审**真的跑起来，产出 `outputs/pptagent/_audit/consulting-reviews.jsonl`（含 `assumption_ratio`），这是验收 C/F 的依据。
  - 不要 `--force`（除非要覆盖旧产物）；若已有旧 chunk 产物想重跑，加 `--force`。

- [ ] **Step 2 — 不组装整卷。** 本次是单 chunk 验证，**不要**跑 `assemble-by-blueprint`（它要全部 13 个 chunk，单 chunk 组装是半成品，违背"不组装半成品"纪律）。验收直接看 chunk JSON（见 §3）。

---

## §2 反死循环护栏（吸取 3 小时空转教训）

- [ ] **时间硬上限：** 整跑墙钟超过 **15 分钟** → **抛错停下**，把当前进度写日志。单 chunk 正常应在几分钟内结束（约 plan/search/read/synthesize/write 5 步 + 评审 1~2 步 + 至多 1 次 RETRY）。超 15 分钟说明卡住了。
- [ ] **成本软上限：** 单 chunk 预计远低于 $1。若日志显示异常重复调用（同一 step 反复跑 >5 次），**停下**报告，不要闷头烧。
- [ ] **RETRY 上限：** 咨询评审 RETRY 在代码里**只触发一次**（`runRetryForReviewIfNeeded` 不循环）。若你观察到**同一 chunk 反复 BLOCK / 反复 RETRY 超过 1 次**，说明有回归，**整跑失败退出（exit≠0）**，日志写明 BLOCK 原因（assumption hardBlock? data_credibility? 写手护栏硬抛？）。
- [ ] **绝不为"跑通"放松红线：** 若 chunk 因写手护栏（repo-popularity 当需求证据、竞品自家页当需求证据等**真造假**）而硬抛错，这是**正确行为**，不要去拆护栏。停下，按 §4 上报，交给 Seven/Claude 判断。**绝不**自己连改 20 个 commit 硬磨（这正是上次的错）。

---

## §3 验收清单（真跑后逐项核对，任一不达标都不算通过）

跑完后逐项验。所有检查命令用 chunk 产物 `outputs/pptagent/_chunks/p2-c2-competition-status.json`。

- [ ] **A. 不再死循环：** 套件在 15 分钟 / RETRY≤1 内**自然结束**（成功或明确失败），没有无限 BLOCK 空转。日志末尾应是 `GENERATED`/`REVIEW ... -> APPROVE|RETRY` 之类的明确终态，**不是** `FAILED p2-c2-competition-status`。
- [ ] **B. chunk 产物存在且有页面：**
  ```bash
  node -e 'const o=require("./outputs/pptagent/_chunks/p2-c2-competition-status.json");const s=o.slides||o.output?.slides||[];console.log("slides:",s.length);console.log("sample title:",(s[0]||{}).action_title)'
  ```
  期望：`slides` ≥ 1，标题非空。
- [ ] **C. 假设被诚实标注（核心）：** 含定位/竞争跳跃的页，要么有独立证据，要么 `evidence_status:"hypothesis"` 且 `hypothesis_basis`/`validation_method` 非空。
  ```bash
  node -e 'const o=require("./outputs/pptagent/_chunks/p2-c2-competition-status.json");const s=o.slides||o.output?.slides||[];let hyp=0,ok=0,bad=0;for(const sl of s){if(sl.evidence_status==="hypothesis"){hyp++;if(sl.hypothesis_basis&&sl.validation_method)ok++;else bad++}}console.log("hypothesis pages:",hyp,"| with basis+method:",ok,"| missing basis/method:",bad)'
  ```
  期望：`missing basis/method: 0`（有假设页就必须带 basis+method）。竞争页证据天然薄，**出现假设页是预期且允许的**。
- [ ] **D. 零编造事实（红线）：** chunk 的 data_refs 里**不得**出现 `inputs/pptagent/summary.md`、`assets/_raw/cases/**`、或无 source 的项。
  ```bash
  node -e 'const o=require("./outputs/pptagent/_chunks/p2-c2-competition-status.json");const s=o.slides||o.output?.slides||[];const bad=[];for(const sl of s)for(const r of (sl.data_refs||[])){const src=String(r.source||r.source_url||r.url||"");if(src.includes("summary.md")||src.includes("assets/_raw/cases/")||!src)bad.push([sl.page_no,src||"(empty)"])}console.log("RED-LINE violations:",bad.length,bad.slice(0,10))'
  ```
  期望：`RED-LINE violations: 0`。
- [ ] **E. 每个 data_ref 带 source_tier：**
  ```bash
  node -e 'const o=require("./outputs/pptagent/_chunks/p2-c2-competition-status.json");const s=o.slides||o.output?.slides||[];let miss=0;for(const sl of s)for(const r of (sl.data_refs||[]))if(!r.source_tier)miss++;console.log("data_refs missing source_tier:",miss)'
  ```
  期望：`0`。
- [ ] **F. 评审给出假设占比：** 看评审记录末尾的 `assumption_ratio` / `verdict`。
  ```bash
  tail -n 3 outputs/pptagent/_audit/consulting-reviews.jsonl
  ```
  期望：能看到本 chunk 的一条评审记录，含 `assumption_ratio`、`verdict`（APPROVE 或 RETRY 都可接受，只要不是无限 BLOCK）。若 `overflow:true`（假设占比超 0.4 上限），说明这一页证据确实太薄——记录下来交 Seven 判断是否补一手资料，**不是**失败，但要如实报告。

---

## §4 失败时的上报格式（给 Seven/Claude，**不要自行硬磨**）

若 §3 任一项不达标，按此上报：
1. 失败在哪一步（self-check / suite / 评审）、是不是 `FAILED p2-c2-competition-status`。
2. 失败类型：assumption hardBlock（unsupported/偷懒）？data_credibility 评分 BLOCK？写手护栏硬抛（哪条：repo-popularity / competitor-owned demand / named-competitor-no-evidence）？时间触顶？死循环？
3. 贴 `outputs/_logs/pptagent-2d-single-competition.log` 末尾 30 行 + `outputs/pptagent/_chunks/p2-c2-competition-status.json` + `outputs/pptagent/_audit/consulting-reviews.jsonl` 末尾。
4. **不改代码、不改数据**，交回判断。

---

## §5 跑完后交接给 Claude（独立 CP 复核）

Codex 跑完（无论成败），把以下三样贴回来，Claude 做独立 CP-2d-single 复核：
- `outputs/_logs/pptagent-2d-single-competition.log` 全文（或末尾 50 行）。
- §3 六条检查命令各自的输出数字。
- `outputs/pptagent/_chunks/p2-c2-competition-status.json` 路径确认存在。

Claude 会逐条核对 A–F，给出 PASS/FAIL，并向 Seven 解释「这就是那个曾经卡死 3 小时的 chunk，现在能不能诚实跑通」。

---

## 给小白的讲解

- **现在做的是什么：** 我（Claude）写了一份「单页真跑说明书」，交给 Codex 去执行。它只跑 pptagent 方案里的**一个**模块——「竞争态势」那一页。
- **目的·为什么：** 这一页正是当初让程序**卡死 3 小时、反复报错**的那块硬骨头（因为竞品的真实付费数据网上根本查不到）。我们后来做的所有修复（让程序"查不到就老实说这是假设、并写清怎么验证"），就是为了治这个病。拿这块最难的单独跑一遍，如果它能**不报错、老实标假设、还附上验证清单**，就证明修复真的成了——而且只烧一点点钱，你能第一次**亲眼看到**一个像样的产物。
- **你怎么自己核查：** ① 说明书在 `docs/handoffs/2026-05-30-engine-v2-phase2d-single-chunk-demo-run.md`。② Codex 跑完会给你一串检查命令的结果，每条都打印一个数字，比如「红线违规: 0」「缺 basis/method 的假设页: 0」——都为 0 就说明没编数据、假设也标老实了。③ 说明书里加了"15 分钟硬停"的闸，绝不会再像上次那样闷头跑 3 小时。④ 跑完我会再独立复核一遍报给你。
