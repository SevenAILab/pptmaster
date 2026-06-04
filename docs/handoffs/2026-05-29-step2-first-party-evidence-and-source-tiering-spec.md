# Step 2 · 一手证据可引用 + 来源可信度分级 执行规格（Codex 执行 → Claude 再 review）

> 本规格**取代** `2026-05-29-step2-phase-e-prep-execution-spec.md` 中关于「证据质量 / data_credibility」的方向（T1/T2 搜索路由那轮已做，但**不是瓶颈**）。Claude 复查后定位到真正根因，见下。

## 0. 背景：真正的根因（Claude 已用真实产物查实）

上一轮修了搜索路由（exa/变体/retry-on-empty），但 3 个 RETRY chunk 重跑后 **data_credibility 没涨、还回退**。Claude 拆了真实 chunk 产物，定位到根因 —— **不是缺数据，也不是没喂数据，而是「喂进去的一手数据，LLM 根本看不到、更引用不到」**：

铁证（`outputs/smallrig/_chunks/*.json` 实测）：

| chunk | 加载的本地一手证据(`metadata.local_evidence_files`) | slide `data_refs` 引用的本地证据 | 引用的 http 链接 |
|---|---|---|---|
| p2-c3 消费者画像 | 7（含 **page-037**） | **0** | 12（媒体/UGC） |
| p3-c1 定位 | 5 | **0** | 11 |
| p3-c4 营销策略 | 11 | **0** | 12 |

- `page-037.md` 干净可读（非 OCR 乱码），正是 reviewer 点名要的：「90% 大学毕业 / 平均收入高于美国用户 / **90 天复购率 >30%**」。
- 它被 `extraLocalPageNos` 加载（`consumer-insight-deepresearch.mjs:106`），但：
  - `readUser`(:31) 只把 `searchSummary` 给 LLM；`synthesizeUser`(:43) 只给 `facts`；`writeUser`(:55) 只给 `compactWritePayload(...)`。
  - `compactWritePayload`(`deepresearch-common.mjs:645-673`) **不包含 `context.localEvidence`**。
  - 结论：**本地一手证据被读进内存、写进 audit 文件名，但从未进入任何一个 LLM prompt**（plan/read/synthesize/write 四步都看不到 page-037 的正文）。它是死重。
- 即使 LLM 想引用本地证据也会被层层 http-only 过滤掉（见 §3 chokepoints），最后被逼着给每条结论挂一个 web URL → 全是 huxiu/reddit/ebrun/官网首页/竞品站 → reviewer 正确扣分「结论主要由媒体报道和 UGC 外推」。

**reviewer 其实已经准备好奖励一手数据**：`consulting-review.mjs:120` Q4 的 8+ 档明写「高质量一手资料」。只是生成端从没给它任何一手引用。

## 1. 设计原则（第一性原理）

**「可追溯来源」= 可验证的证据，不等于「任意 http URL」。** 当前代码把两者画了等号，这是钝化的反捏造护栏，误伤了最可信的一手数据。

两类可验证证据：
- **本地一手 / 客户一手（T1）**：磁盘上真实文件（案例页 / 客户提供的一手数据），且**被引用的数值/关键短语确实出现在该文件正文里**（可逐字校验）。这是**比 http 更强**的反捏造。
- **权威二手（T2）/ 媒体（T3）/ UGC（T4）**：http URL，按域名权威度分级。

红线不变：**失败必须抛错，禁止 silent fallback / mock / 调低 review 阈值。** 本规格**加强**反捏造（T1 引用必须数值命中文件），不削弱。

## 2. 数据模型变更

`data_ref` 由 `{value, source, type}` 扩展为：
```jsonc
{
  "value": "90天各平台用户复购率平均>30%",
  "source": "assets/_raw/cases/标杆案例/smallrig/page-037.md",  // http URL 或 本地文件路径
  "source_tier": "T1",                 // T1 一手 / T2 权威二手 / T3 媒体 / T4 UGC
  "source_label": "SmallRig 一手案例数据 (MI升级案例 p37)", // 人类可读，避免被当成 summary.md
  "type": "first_party"                // first_party | official_data | industry_report | media | ugc_signal | user_quote
}
```
`source_tier` 必须随 `data_refs` 一路透传到 reviewer（`compactChunkOutput:69` 已原样透传 data_refs，确认 tier 字段不被裁掉即可）。

**来源分级器**（新增 `scripts/source-tiers.mjs`，导出 `classifySource(source, opts)`）：
- 本地一手文件（`assets/_raw/cases/**` 或 `inputs/<slug>/first-party/**`）→ **T1**。
- 官方财报 / 客户官网主数据页 → T1/T2（官网首页≠主数据页，首页归 T3）。
- 行业协会 / 政府 / 标准与研究机构（CIPA、IDC、Gartner、Statista、艾瑞、灼识、官方行业白皮书、`*.gov`、`*.org` 行业协会）→ **T2**。
- 行业媒体 / 新闻（huxiu、ebrun、donews、36kr…）→ **T3**。
- 社区 / UGC（reddit、论坛、个人博客、社媒）→ **T4**。
- 未知域名 → T3（保守），并在 audit 里标 `tier_inferred:true`。
- 用一个可维护的域名→tier 表 + 关键词启发式，**不要** Math.random / 不要写死单个客户。

## 3. Task A（根因修复）— 让一手证据「可见 + 可引用」

**目标：** 本地一手证据进入 LLM prompt，并能作为 data_ref 被引用，且通过反捏造校验。

精确改动点（`scripts/sub-agents/deepresearch-common.mjs` 除非另注）：

1. **写入 payload**：`compactWritePayload`(:645-673) 增加 `local_evidence` 字段：把 `context.localEvidence` 压成结构化可引用项 `[{source(file path), source_tier:'T1', source_label, key_facts:[从正文抽取的关键数值/短语]}]`，与 `facts`/`source_pool` 并列给 writer。
2. **read 步可消费本地证据**：各 agent `readUser` 增加「也可从 `local_evidence` 抽取 fact，其 `source` 写文件路径、`type:'first_party'|'official_data'`、`source_tier:'T1'`」。把 §1 的本地证据正文放进 read 输入（现在 readUser 只给 searchSummary）。
3. **normalizeFacts**(:307-318)：`:317` 不再 `.filter(... /^https?:\/\//.test(source_url))` 一刀切；改为「http URL **或** 通过校验的本地源」都保留，并带上 `source_tier`。
4. **sourcePoolFromContext**(:620-626)：把本地一手证据（T1）并入 source pool，不要只收 http URL。
5. **normalizeDataRefs**(:344-361)：`:352` 过滤改为「http 或 verified-local」；保留 fallback，但 **fallback 优先选最高 tier** 的可用源（不要默认塞第一个 http）。
6. **normalizeSlides**(:407-429)：`fallbackSources`(:408-412) 同样纳入本地源。
7. **noFallbackSelfCheck**(:431-463)：`:456-462` 由「≥1 个 http data_ref」改为「**≥1 个可验证 data_ref（http 或 verified-local）**」。**不得放空**——0 证据仍必须抛错。
8. **industry-analysis 第二处校验**：`industry-analysis-deepresearch.mjs:288-294` 同 #7 改法。
9. **write prompt 措辞**（6 个 agent 的 `writeUser`，以 `consumer-insight-deepresearch.mjs:65` 为代表）：
   - 把「每页 data_refs 至少优先使用真实 https URL；不得使用 inputs/<slug>/summary.md」改为：
     「每页 data_refs 必须用**可追溯来源**：优先 T1 一手 / T2 权威二手，其次真实 https URL；**关键战略判断（人群分层 / 复购 / 心智占位 / 市场规模 / 预算比例）必须挂 T1 或 T2**，T3/T4 只能作辅证。仍禁止 `inputs/<slug>/summary.md`（定性概述，非数据）。」
   - **建议**：把这段共享指令抽到 `deepresearch-common.mjs` 的一个导出常量，6 个 agent 引用，避免 6 份措辞漂移。
10. **通用化本地证据入口**（面向真实客户）：`readLocalEvidenceForChunk`(:105-125) 除了案例页，再读 `inputs/<slug>/first-party/**`（若存在）并标 T1。这样机制不绑死 SmallRig；真实客户若给一手数据就走 T1，不给就靠 T2 权威二手。

> 6 个 agent 的 `extraLocalPageNos`：consumer `:106 [36,37,38,39,41,44,45,51]`、positioning `:80 [40,41,42,43,124]`、building `:82`、competitor `:110`、annual `:111`、industry 用 `readLocalSmallRigEvidence` 写死 018-022。本轮**不改页码映射**（已合理），只改「能不能看见/引用」。

## 4. Task B（通用来源可信度分级）

1. 实现 §2 的 `classifySource` + 域名表。
2. source pool 与 facts 都带 `source_tier`；`compactWritePayload` 给 writer 的 `source_pool`(:671 现 slice 12) 按 **tier 优先**排序后再截断（保证高 tier 不被截掉）。
3. writer 被告知每个候选源的 tier，并被要求关键判断绑高 tier（见 Task A #9）。
4. 这是真实客户场景的核心：即使没有一手数据，pipeline 也会优先引用官网/财报/行业协会（T1/T2）而非 reddit/媒体，从而抬 data_credibility。

## 5. Task C（反捏造校验 — 强化红线，必须做）

新增 `verifyLocalDataRef(ref)`（建议放 `deepresearch-common.mjs` 或 `source-tiers.mjs`）：
- 仅对 `source_tier==='T1'` 且 source 为本地路径的 ref 生效。
- 校验：① source 路径在允许根目录下（`assets/_raw/cases/**` 或 `inputs/<slug>/first-party/**`）且文件存在；② `value` 中的关键数值/短语（归一化后，如去空格/全半角）**确实出现在文件正文**。
- 任一不满足 → `throw new Error('NO-FALLBACK violation: unverifiable local data_ref ...')`。
- 在 `noFallbackSelfCheck` / industry 校验里对每个 local ref 调用它。
- 加 1 个最小单测：构造一个 value 不在文件里的本地 ref，断言抛错（证明护栏真实）。

## 6. Task D（reviewer Q4 rubric 更新）

`scripts/consulting-review.mjs` `buildConsultingReviewPrompt`：
- Q4(:119-123) 增加对 `source_tier` 的识别：
  - 8+：关键判断由 **T1 一手 / T2 权威二手** 支撑；
  - 5-7：多数 T2/T3，少数 UGC；
  - 3-4：以 T3/T4 为主、关键判断缺 T1/T2；
  - 1-2：假来源、`inputs/<slug>/summary.md`、无 source。
- 明确区分：`assets/_raw/cases/**`（tier T1，客户/案例一手）= 高可信；`inputs/<slug>/summary.md`（定性概述）仍是 1-2 档。**不要改 verdict 阈值**（`verdictFromScores` 维持 ≥7/≥6）。

## 7. Task E（可选，可下一轮）— 定向权威源搜索偏置

让「找证据 / 找报告」类 query 优先命中权威域（官网/财报/行业协会/CIPA/IDC）：对 exa/tavily 加 domain 偏好或 `site:` 变体，并在 source pool 排序时给 T1/T2 加权。**本轮若时间紧可只做 source pool 的 tier 排序（属 Task B），搜索偏置留下一轮。**

## 8. 验收清单（Claude 复查会逐条真跑）

```bash
cd /Users/seven/Documents/文档/PPT方案大师/pptmaster
# A. 红线仍在（无 fallback/mock/random）
grep -nE "fallback.*mock|deterministic|Math\.random.*score|return.*mock" \
  scripts/sub-agents/deepresearch-common.mjs scripts/consulting-review.mjs scripts/source-tiers.mjs || echo CLEAN
# B. 重跑 3 个 RETRY chunk（真 LLM）
node scripts/run-blueprint-suite.mjs smallrig --scheme brand_positioning_case \
  --real-llm --with-layout-designer --with-consulting-review --force \
  --only-chunk p2-c3-consumer-portraits     # p3-c1 / p3-c4 同理
# C. 关键：现在每个 chunk 的 data_refs 有 T1/T2，且关键判断挂一手
for c in p2-c3-consumer-portraits p3-c1-positioning-statement p3-c4-marketing-strategy; do
  jq -r '[.slides[]?.data_refs[]?] | {n:length, t1:(map(select(.source_tier=="T1"))|length), t2:(map(select(.source_tier=="T2"))|length), http:(map(select(.source|test("^https?://")))|length)}' outputs/smallrig/_chunks/$c.json
done
# D. verdict / cred 改善
for c in p2-c3-consumer-portraits p3-c1-positioning-statement p3-c4-marketing-strategy; do
  jq -c "select(.chunk_id==\"$c\")" outputs/smallrig/_audit/consulting-reviews.jsonl | tail -1 \
    | jq -c '{c:.chunk_id,v:.verdict,cred:.data_credibility_score,ins:.insight_depth_score}'
done
# E. 反捏造单测
node --test scripts/**/*test* 2>/dev/null | tail -5   # 或 Codex 指定的测试入口
# F. audit 真实（token/cost/latency 非零、非伪造）
tail -3 outputs/smallrig/_audit/llm-calls.jsonl | jq -c '{p:.purpose,it:.input_tokens,cost:.estimated_cost_usd,ms:.latency_ms}'
```

**通过标准：**
1. 3 个 RETRY chunk 每个的 data_refs 至少有 ≥2 条 T1（一手）绑在关键判断上；`data_credibility_score` 明显上升；**至少 1-2 个抬到 PASS**，其余 4 维不回退。
2. 反捏造单测证明「value 不在文件 → 抛错」。
3. 红线 grep CLEAN；BLOCK 仍真抛错；audit token/cost/latency 真实。
4. （加分）3 个 BLOCK chunk（p2-c1/p2-c2/p3-c6）用同机制后 cred 也应上升（市场页 018-022 进 industry、page-037 等进 consumer/positioning）——报告变化即可，不强求清掉。

## 9. 不在本轮范围
- 调低 review 阈值（已否决）。
- 重做页码→chunk 映射（现合理）。
- Task E 的搜索域偏置可延后。
- 为真实客户补一手数据采集 UI（机制留好 `inputs/<slug>/first-party/**` 入口即可）。
