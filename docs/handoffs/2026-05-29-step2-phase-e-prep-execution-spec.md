# Step 2 · Phase E-prep 执行规格（Codex 执行 → Claude 再 review）

## 背景

CP-D **已 PASS**（真 LLM consulting review 接通，12 次真实调用、无 silent fallback、verdict 与 rubric 12/12 自洽，BLOCK 真抛错）。Review 详见 `2026-05-28-step2-phase-d-cp-d-note.md` + 本次 Claude 验证。

Seven 决策：**先修执行缺陷再重评**，再决定 Phase E。

**目标：** 把 3 个 RETRY chunk（`p2-c3-consumer-portraits` / `p3-c1-positioning-statement` / `p3-c4-marketing-strategy`，当前 avg 6.0–6.5）通过提升证据质量抬到 **PASS**，且不依赖一手数据。3 个 BLOCK chunk（`p2-c1` / `p2-c2` / `p3-c6`）的主因是缺 SmallRig 一手数据，**本轮不强求清掉**（需 Seven 另行决定是否补数据）。

**红线不变：** 失败必须抛错，禁止 silent fallback / mock / 调低阈值出绿灯。**禁止改 Consulting Review 阈值**（option 3 已被否决）。

---

## Task 1 (F3a · 搜索路由) — 修 `pickEngine` 优先级

**文件：** `scripts/web-search.mjs:70-76`

**问题：** `if (opts.maxResults && opts.maxResults > 3) return 'serper'`（:73）在「语义问句 → tavily」（:74）之前判断。DeepResearch 默认 maxResults=5（>3），导致**所有**长问句被强制路由到 serper（关键词引擎），整段中文问句必返 0。exa 只在 query 含 `详细/报告/分析` 字面词时触发，故 87 次只用了 1 次。

**要求：** 让 query **形态**（长度/语义）先于 maxResults 决定引擎：
- 长问句（如 length ≥ 40）或自然语言问句（`是什么/哪些/如何/为什么/对比/预测...`）→ `exa`（语义、返回正文）或 `tavily`；
- 仅当是**短关键词/实体** query 时，maxResults>3 才走 `serper`。
- 保留 `opts.engine` 显式覆盖。

**验收：** 不再有 length≥40 的 query 被路由到 serper；exa 在真实跑里被实际使用（>1 次）。

## Task 2 (F3b · query 分解) — DeepResearch 拆问 + 启用 exa

**文件：** `scripts/sub-agents/deepresearch-common.mjs`（query 生成 ~:742 `subQuestions`；搜索循环 ~:437-450，`maxResults: config.maxResultsPerQuery || 5`）

**问题：** essay 式 subQuestion 被原样当 query（:742 → :446）。

**要求（任一/组合，以命中率为准）：**
1. 把整段 subQuestion 拆成 2–4 个短关键词/实体 query 再检索（保留原问句仅作 LLM 思考用，不作为 search query）；
2. 或：当某 query 返回 0 结果时，自动用「缩短/拆解后」变体重试一次（retry-on-empty），并把重试写进 `web-searches.jsonl`；
3. 对「找报告/找证据」类长问句显式路由到 exa。

**验收：** `web-searches.jsonl` 中 result_count==0 的比例显著下降（当前 6/87）；≤2 结果比例下降（当前 33%）。

## Task 3 (F1 · RETRY 重生缺口) — 补 skipExisting 分支

**文件：** `scripts/run-blueprint-suite.mjs:195-218`

**问题：** RETRY→重生逻辑只在「新生成」分支（:252-268）。走 `skipExisting && outputExists` 的后处理分支（:195-218）时 RETRY 只记日志、**不重跑**。所以对已有 chunk 跑 `--with-consulting-review`（无 `--force`）时 note 承诺的「RETRY 回传 hint 重跑」不生效。

**要求：** 把 RETRY→`runRealLLMChunk(retryHint)` + 重跑 Layout Designer 的逻辑也接到 skipExisting 后处理分支（与 :252-268 一致，仍**不二次 review**，避免死循环）。或：若刻意保留该约束，在 CLI usage + note 明确「RETRY 重生需 --force」。

## Task 4 (B 类 · 生成质量) — 修证据错配与页面重复

针对 reviewer 在 `key_weakness` 里抓到、且**不需一手数据**就能修的点（聚焦 3 个 RETRY chunk）：
- **证据链：** RETRY chunk 的关键战略判断要挂上更可信 data_refs（靠 Task 1/2 拿到更好来源后重生）；
- **source↔论点错配：** `p2-c1` 第 15/17/18 页 source 与论点对不上（虽是 BLOCK，但顺手修）；
- **内容重复：** `p3-c4` 第 54-56 页、`p3-c6` 的 Q1-Q4 套话重复 → 提升 page_efficiency。

## Task 5 (F2 · 可选加固) — verdict 一致性

**文件：** `scripts/consulting-review.mjs:158-176`

当前直接信任 LLM 返回的 `verdict` 字符串（这次 12/12 凑巧自洽）。建议按 4 项均分 rubric（≥7 PASS / ≥6 RETRY / else BLOCK）在代码里**重算或断言**，防止 LLM 给出分数与 verdict 打架的输出。低优先级。

---

## 再 review 检查点（Claude 验收清单）

```bash
# 1. 搜索命中改善
jq -r '.provider' outputs/smallrig/_audit/web-searches.jsonl | sort | uniq -c   # exa 应 >1
jq -c 'select(.result_count==0)' outputs/smallrig/_audit/web-searches.jsonl | wc -l  # 应下降
# 2. 长问句不再进 serper（抽查）
jq -r 'select(.provider=="serper") | (.query|length)' outputs/smallrig/_audit/web-searches.jsonl | sort -rn | head
# 3. 重跑 3 个 RETRY chunk 后 verdict 改善
node scripts/run-blueprint-suite.mjs smallrig --scheme brand_positioning_case \
  --real-llm --with-layout-designer --with-consulting-review --force \
  --only-chunk p2-c3-consumer-portraits   # 对 p3-c1 / p3-c4 同理
tail -3 outputs/smallrig/_audit/consulting-reviews.jsonl | jq -c '{chunk:.chunk_id,v:.verdict,i:.insight_depth_score,d:.data_credibility_score}'
# 4. 红线仍在
grep -nE "fallback.*mock|deterministic|Math.random.*score" scripts/web-search.mjs scripts/sub-agents/deepresearch-common.mjs scripts/run-blueprint-suite.mjs || echo CLEAN
```

**通过标准：** 3 个 RETRY chunk 至少 1–2 个抬到 PASS（或 4 维均分明显上升且不回退）；搜索 0 结果率下降、exa 真实启用；BLOCK 仍真抛错；audit token/latency/cost 仍真实。

## 不在本轮范围
- 调低 review 阈值（已否决）。
- 补 SmallRig 一手数据（p2-c1/p2-c2/p3-c6 的 BLOCK 主因）——需 Seven 单独决定后另起一轮。
