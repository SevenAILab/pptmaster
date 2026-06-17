# PPTAgent（proposal / RFP / pitch deck / client-facing deck）的 Reddit 需求验证

- 研究日期: 2026-06-13
- 输出路径: `research/reddit-demand/pptagent-proposal-rfp-pitch-deck-demand-2026-06-13.md`
- 结论等级: strong
- 置信度: medium
- 数据观测时间: 2026-06

## 一句话结论

需求真实，但 wedge 要选准：最强未满足需求不是“通用 AI PPT 生成器”，而是面向 sales engineers / proposal teams / consultants / client-facing operators 的“高价值商业文档工作流”：RFP/RFI/security questionnaire、销售 proposal、咨询 deck、客户/高管汇报 deck。付费意愿在 RFP/安全问卷和咨询交付场景最强；纯 startup pitch deck 生成是 mixed，因为替代品太多、用户更愿意 DIY/模板/人工反馈。

## 预注册的杀死标准

搜索开始前写下的证伪声明，以及它们是否被触发：

1. 如果 Reddit 上主要只是 founder 问模板、Canva、Tome、Beautiful.ai，而没有真实工作流痛点，则需求降为 weak - 未触发。pitch deck 方向确实偏模板/DIY，但 RFP、proposal、consulting deck 有强工作流痛点。
2. 如果高信号线程认为 ChatGPT/Claude 已经足够解决 proposal/RFP/deck，则需求不能 strong - 未触发。相反，多个线程把通用 AI 的 hallucination、generic slides、缺少内部知识 grounding 当作问题本身。
3. 最强反向假设：PPTAgent 会被“现成 RFP tools + Canva/Google Slides + 人类顾问”夹死 - 部分成立。RFP 工具有付费市场但也有重/贵/维护成本；通用 pitch deck 生成容易被模板工具吞噬。最可行方向是“LLM-first story/workflow + evidence/knowledge grounding + PowerPoint-quality output”，而不是只做版式。

## 证伪轮结果

- 实际跑的证伪查询: `site:reddit.com/r/salesengineers ("works great" OR "works fine" OR "no complaints") ("Loopio" OR "RFPIO" OR "RFP response")`, `site:reddit.com/r/startups ("just use" OR "good enough" OR "Canva") ("pitch deck" OR "AI deck")`, `site:reddit.com/r/consulting ("just ask Claude" OR "AI does this") ("PowerPoint" OR "deck")`
- 满意信号 (`satisfied`): pitch deck 方向有明显满意/替代信号：用户建议 Canva、Google Slides、模板、自己写故事后再找设计师；也有人说 founder 不该外包 deck。
- 抱怨持续 (`still-complaining`): RFP/RFI/security questionnaire、sales-engineering deck、consulting slides 方向仍然高频抱怨。已有工具能帮忙，但痛点转移到内容库维护、答案可信度、SME 协作、AI 胡编、门户/Excel/Slack 之间切换。
- AI 吞噬信号 (`ai-absorbed`): 有用户用 ChatGPT/Claude 做初稿，但也有强反证：通用 AI 生成“same consulting slides”、RFP 回答 hallucinate、AE 用 AI 生成技术答案被 SE 强烈反感。
- 证伪门是否触发: 对“纯 pitch deck 生成器”触发，最多 mixed；对“RFP/proposal/consulting delivery workflow”未触发，可判 strong。

## 这个需求主要出现在谁身上

1. **Sales Engineers / Pre-sales / Solution Engineers**：反复处理 RFP、RFI、安全问卷、DDQ、技术问答、sales decks，痛点是时间、准确性、内部知识检索和 SME review。
2. **Proposal / Bid / RFP teams**：负责跨部门协调、答案库、合规矩阵、proposal assembly，愿意买 Loopio/RFPIO/Responsive/Arphie/1up/Conveyor/SecurityPal 等工具或外包。
3. **Consultants / agencies / professional services**：客户交付依赖 PowerPoint 或 PDF proposal；痛点是故事线、结构、格式、复用、客户定制、反复改稿。
4. **Founders 做 pitch deck**：有需求，但更碎片化、一次性、低预算，容易被模板/Canva/AI first draft/人工 mentor feedback 替代。

### 分人群判定（仅当证据明显分裂时填写）

- RFP / security questionnaire / sales engineering teams: strong - 高频、重复、付费替代明确，且现有工具仍有执行差距。
- Consulting / agency client-facing deck builders: strong - slide/deck work反复出现为高时间成本和交付质量问题，已有外包/模板/插件市场。
- Startup founders doing fundraising pitch decks: mixed - 真实焦虑存在，但强替代品多、付费意愿较低且多为一次性。
- 建议切入点: 先切 RFP/proposal/SE + consulting deck workflow，而不是泛 pitch deck builder。

## 最强 3-5 个未满足痛点

1. RFP/RFI/security questionnaire 吃掉 SE 和 sales team 的大量时间
   - 类型: 对现有方案的抱怨
   - 方案密度: 执行差距
   - 为什么这是痛点: 线程里反复出现“RFPs eat the week / 80 hours collectively / days to fill out / spare time”的描述。工作不是单纯写作，而是从历史答案、API docs、SOC2、Slack、SME、Excel/portal 中拼出可信答案。
   - 聚类规模: 5+ 条独立线程，其中高共鸣未知（Reddit API 403，无法采集互动元数据）。
   - 证据: [RFPs take bandwidth](https://www.reddit.com/r/salesengineers/comments/1p5j6of/rfps_take_a_lot_of_bandwith_from_me_thinking/), [How long do you take to fill RFPs?](https://www.reddit.com/r/salesengineers/comments/1ch44tp/how_long_do_you_take_to_fill_rfps/), [How do your team handle RFP responses?](https://www.reddit.com/r/salesengineers/comments/1mwnadd/how_do_you_team_handle_rfp_responses/)
2. 现有 AI/RFP 工具能出初稿，但可信度、上下文、答案库维护和协作仍未被满足
   - 类型: 对现有方案的抱怨
   - 方案密度: 执行差距
   - 为什么这是痛点: 用户提到 Loopio/RFPIO/Responsive/Arphie/1up/Conveyor/SecurityPal 等，说明市场付费存在；但抱怨包括 content library 是全职工作、AI add-on 匹配差、ChatGPT lying、答案需要大量编辑、pricing high、portal extension buggy。
   - 聚类规模: 5+ 条独立线程。
   - 证据: [Use of AI in RFP or RFI](https://www.reddit.com/r/salesengineers/comments/1aphxpu/use_of_ai_in_rfp_or_rfi/), [How do your team handle RFP responses?](https://www.reddit.com/r/salesengineers/comments/1mwnadd/how_do_you_team_handle_rfp_responses/), [AI for automating RFPs and security questionnaires](https://www.reddit.com/r/salesengineers/comments/1iav09w/ai_for_automating_rfps_and_security_questionnaires/)
3. proposal / quote / pitch deck 常被认为耗时、重复、未必被读，但又是赢单或显得专业的必要动作
   - 类型: 无解决方案的空白
   - 方案密度: 执行差距
   - 为什么这是痛点: freelancer/small business/marketing 线程里有人说 proposal takes 45 minutes to customize、pitch deck/proposal “never read anyways”、PDF proposal boring、back-and-forth annoying、报价/范围/合同与 deck 混在一起。
   - 聚类规模: 4+ 条独立线程。
   - 证据: [Client asks proposal to get hired](https://www.reddit.com/r/freelance/comments/gyj9sw/client_is_asking_me_to_put_together_a_proposal_in/), [Alternative to proposals and pitch decks](https://www.reddit.com/r/marketing/comments/a87cvo/is_there_an_alternative_to_sending_out_proposals/), [Proposal software with math and quotation abilities](https://www.reddit.com/r/smallbusiness/comments/1iurh6c/proposal_software_with_math_and_quotation/)
4. 咨询/客户汇报 deck 的真实痛点不是“漂亮”，而是结构、复用、故事线、格式浪费和客户/经理反复返工
   - 类型: 对现有方案的抱怨
   - 方案密度: 执行差距
   - 为什么这是痛点: consulting 线程里有 12-14 小时 PowerPoint、deck building counter-productive、标准 slide library 避免 wasting time、formatting vs thinking 的反复讨论。
   - 聚类规模: 5+ 条独立线程。
   - 证据: [12-14hrs on PowerPoint](https://www.reddit.com/r/consulting/comments/qokqm6/so_what_does_it_take_to_work_1214hrs_on_power/), [Can't cope with the stress any more](https://www.reddit.com/r/consulting/comments/m6e6wf/cant_cope_with_the_stress_any_more/), [standard PowerPoint slide library](https://www.reddit.com/r/consulting/comments/p7la3f/do_you_have_a_standard_library_of_frequently_used/)

弱信号清单（单次出现但质量高，不计入聚类）：

- Product managers 把 Confluence/Productboard/Jira 信息又搬进 exec PowerPoint deck，是跨工具重复劳动 - [PM tech stack](https://www.reddit.com/r/ProductManagement/comments/s3laiy/whats_in_your_product_management_tech_stack/)
- 状态更新被塞进 board deck 也有痛点，但更像内部 comms workflow，不一定是首个商业 wedge - [status updates](https://www.reddit.com/r/ProductManagement/comments/1qj5m3a/does_anyone_actually_enjoy_writing_status_updates/)

## 用户当前怎么 workaround

- RFP teams 使用 Loopio/RFPIO/Responsive/Arphie/1up/Conveyor/SecurityPal/Proposal Pilot 等工具。
  - 代价: 贵、重、需要维护 content library、答案可信度和 source transparency 仍要人工审。
  - 证据: [RFP team handling](https://www.reddit.com/r/salesengineers/comments/1mwnadd/how_do_you_team_handle_rfp_responses/), [AI RFP/RFI](https://www.reddit.com/r/salesengineers/comments/1aphxpu/use_of_ai_in_rfp_or_rfi/)
- 用 ChatGPT/Claude/AI deck builder 出 first draft，再人工清理。
  - 代价: 生成内容 generic、容易 hallucinate、SE/专家仍要重审。
  - 证据: [AI pitch deck tools](https://www.reddit.com/r/startups/comments/1qshci0/are_there_any_valuable_ai_tools_for_building_a/), [AE overusing AI](https://www.reddit.com/r/salesengineers/comments/1sw51zm/aes_overusing_ai/)
- 用 Canva/Google Slides/template 解决 pitch deck 或 presentation 外观。
  - 代价: 解决形，不解决 story/message/strategic content；但在 founder pitch deck 场景足够强，会压低纯设计工具机会。
  - 证据: [Startup pitch deck creation](https://www.reddit.com/r/startups/comments/1cvd7aj/startup_pitchdeck_creation/), [Presentation and pitch decks tools](https://www.reddit.com/r/startups/comments/1q3ox05/presentation_and_pitch_decks_what_tools_do_you/)
- 咨询公司/团队用标准 slide library、内部设计支持、offshore design team 或买模板/插件。
  - 代价: 复用碎片化、经理口味/客户 CI/故事线仍需人工经验。
  - 证据: [PowerPoint God](https://www.reddit.com/r/consulting/comments/1sc11av/i_think_ive_met_a_powerpoint_god/), [standard slide library](https://www.reddit.com/r/consulting/comments/p7la3f/do_you_have_a_standard_library_of_frequently_used/)

## 现有解决方案盘点

- 免费/低门槛方案: ChatGPT/Claude、Canva、Google Slides、PowerPoint templates、community feedback。
  - 用户主要不满: first draft 可以，但很 generic；技术/RFP 内容会 hallucinate；不懂内部知识、source、review workflow。
  - 引用线程: [AI pitch deck tools](https://www.reddit.com/r/startups/comments/1qshci0/are_there_any_valuable_ai_tools_for_building_a/), [AE overusing AI](https://www.reddit.com/r/salesengineers/comments/1sw51zm/aes_overusing_ai/)
- 付费工具或产品: Loopio, RFPIO/Responsive, Arphie, 1up, Conveyor, SecurityPal, Inventive AI, Proposal Pilot, Beautiful.ai, Tome, Slideworks/deck.support。
  - 用户主要不满: RFP 工具重/贵/维护成本高；AI add-ons 需要大量编辑；deck tools 偏 layout，难以改已有 deck 的 story/content。
  - 引用线程: [How do your team handle RFP responses?](https://www.reddit.com/r/salesengineers/comments/1mwnadd/how_do_you_team_handle_rfp_responses/), [AI for RFP/security questionnaires](https://www.reddit.com/r/salesengineers/comments/1iav09w/ai_for_automating_rfps_and_security_questionnaires/), [Are there valuable AI tools for pitch deck?](https://www.reddit.com/r/startups/comments/1qshci0/are_there_any_valuable_ai_tools_for_building_a/)
- 服务/外包/人工方案: pitch deck consultants, freelancers, agencies, consulting design teams, proposal/RFP subcontractors。
  - 用户主要不满: 质量不稳定、成本高、founder/专家仍要自己掌握故事和内容，RFP 外包还涉及内部知识/安全。
  - 引用线程: [Presentation and pitch decks](https://www.reddit.com/r/startups/comments/1q3ox05/presentation_and_pitch_decks_what_tools_do_you/), [consulting PowerPoint God](https://www.reddit.com/r/consulting/comments/1sc11av/i_think_ive_met_a_powerpoint_god/)
- 未被现有方案满足的空白:
  1. 从 raw company knowledge / docs / notes / prior decks 生成可信、有 source 的 deck/proposal narrative。
  2. 同时处理 story architecture、evidence grounding、PowerPoint layout，而不是只做模板填充。
  3. 支持多人 review / SME input / compliance source / confidence flags 的商业文档工作流。

## 证据线程表

| 线程 | subreddit | 日期 | 赞 | 评论数 | 附议数 | 证据等级 | 所属聚类 |
|---|---|---|---|---|---|---|---|
| [RFPs take a lot of bandwidth](https://www.reddit.com/r/salesengineers/comments/1p5j6of/rfps_take_a_lot_of_bandwith_from_me_thinking/) | r/salesengineers | 2025-12 | n/a | n/a | n/a | primary | RFP 时间成本 |
| [How long do you take to fill RFPs?](https://www.reddit.com/r/salesengineers/comments/1ch44tp/how_long_do_you_take_to_fill_rfps/) | r/salesengineers | 2024-04 | n/a | n/a | n/a | primary | RFP 时间成本 |
| [Use of AI in RFP or RFI](https://www.reddit.com/r/salesengineers/comments/1aphxpu/use_of_ai_in_rfp_or_rfi/) | r/salesengineers | 2024-02 | n/a | n/a | n/a | primary | RFP 工具执行差距 |
| [How do your team handle RFP responses?](https://www.reddit.com/r/salesengineers/comments/1mwnadd/how_do_you_team_handle_rfp_responses/) | r/salesengineers | 2025-09 | n/a | n/a | n/a | primary | RFP 工具执行差距 |
| [Are RFPs worth it?](https://www.reddit.com/r/salesengineers/comments/1n45gec/are_rfps_worth_it/) | r/salesengineers | 2025-09 | n/a | n/a | n/a | primary | RFP ROI/筛选 |
| [AI pitch deck tools](https://www.reddit.com/r/startups/comments/1qshci0/are_there_any_valuable_ai_tools_for_building_a/) | r/startups | 2026-02 | n/a | n/a | n/a | primary | Pitch deck AI 反向信号 |
| [Presentation and pitch decks tools](https://www.reddit.com/r/startups/comments/1q3ox05/presentation_and_pitch_decks_what_tools_do_you/) | r/startups | 2026-01 | n/a | n/a | n/a | primary | Pitch deck 工具/服务 |
| [Proposal software with math and quotation](https://www.reddit.com/r/smallbusiness/comments/1iurh6c/proposal_software_with_math_and_quotation/) | r/smallbusiness | 2024-03 | n/a | n/a | n/a | primary | Proposal/quote workflow |
| [Alternative to proposals and pitch decks](https://www.reddit.com/r/marketing/comments/a87cvo/is_there_an_alternative_to_sending_out_proposals/) | r/marketing | 2018-12 | n/a | n/a | n/a | primary | Proposal 低 ROI |
| [12-14hrs on PowerPoint](https://www.reddit.com/r/consulting/comments/qokqm6/so_what_does_it_take_to_work_1214hrs_on_power/) | r/consulting | 2021-11 | n/a | n/a | n/a | primary | Consulting deck 时间成本 |
| [Can't cope with deck stress](https://www.reddit.com/r/consulting/comments/m6e6wf/cant_cope_with_the_stress_any_more/) | r/consulting | 2021-03 | n/a | n/a | n/a | primary | Deck 返工/压力 |
| [Standard PowerPoint slide library](https://www.reddit.com/r/consulting/comments/p7la3f/do_you_have_a_standard_library_of_frequently_used/) | r/consulting | 2021-08 | n/a | n/a | n/a | primary | 复用/模板库 |

附议数 = 评论区 "same here / this exactly / +1" 类回复的去重计数。Reddit JSON API 在本机返回 403 HTML/block 页面，未能稳定采集 score、num_comments、upvote_ratio、agreement replies，因此本次不使用高共鸣 ×2 加权。

## 代表性原话（按 JTBD 角色分组）

共 7 条，优先来自不同 subreddit 和不同聚类。

### 触发场景（"每当…的时候"）

> "If RFPs are eating your week..."
>
> Source: [RFPs take bandwidth](https://www.reddit.com/r/salesengineers/comments/1p5j6of/rfps_take_a_lot_of_bandwith_from_me_thinking/) ｜ 中文释义: RFP 已经吃掉整周时间。

> "endless excel sheets with various requirements"
>
> Source: [Use of AI in RFP or RFI](https://www.reddit.com/r/salesengineers/comments/1aphxpu/use_of_ai_in_rfp_or_rfi/) ｜ 中文释义: RFP/RFI 往往是无尽 Excel 要求。

### 失败的尝试（"我试过…但…"）

> "content library was a full time job"
>
> Source: [How do your team handle RFP responses?](https://www.reddit.com/r/salesengineers/comments/1mwnadd/how_do_you_team_handle_rfp_responses/)

> "we could not get it to stop lying"
>
> Source: [How do your team handle RFP responses?](https://www.reddit.com/r/salesengineers/comments/1mwnadd/how_do_you_team_handle_rfp_responses/)

### 情绪强度（原话的愤怒/疲惫感）

> "RFPs are bullshit except in very specific circumstances."
>
> Source: [How long do you take to fill RFPs?](https://www.reddit.com/r/salesengineers/comments/1ch44tp/how_long_do_you_take_to_fill_rfps/)

> "the deck building itself is counter-productive"
>
> Source: [Can't cope with the stress any more](https://www.reddit.com/r/consulting/comments/m6e6wf/cant_cope_with_the_stress_any_more/)

### 期望结果（"我只想要…"）

> "Lift and shift to focus on substance instead of formatting"
>
> Source: [Standard PowerPoint slide library](https://www.reddit.com/r/consulting/comments/p7la3f/do_you_have_a_standard_library_of_frequently_used/)

## 营销文案弹药库

1. "Stop letting RFPs eat your week" - RFP/SE landing page headline - [source](https://www.reddit.com/r/salesengineers/comments/1p5j6of/rfps_take_a_lot_of_bandwith_from_me_thinking/)
2. "From internal docs to cited proposal drafts" - RFP/proposal product promise - [source](https://www.reddit.com/r/salesengineers/comments/1aphxpu/use_of_ai_in_rfp_or_rfi/)
3. "Focus on substance instead of formatting" - consulting deck wedge - [source](https://www.reddit.com/r/consulting/comments/p7la3f/do_you_have_a_standard_library_of_frequently_used/)
4. "No more AI slop in sales decks" - anti-generic-AI positioning - [source](https://www.reddit.com/r/salesengineers/comments/1sw51zm/aes_overusing_ai/)
5. "Make proposal work reusable, reviewable, and source-backed" - workflow positioning - synthesized from RFP/proposal clusters.

## 维度判断

- 痛感强度 (Pain Intensity): 高
  - 依据: RFP/SE 场景有“吃掉一周”“80 hours collectively”“days filling them out”“spare time RFPs”的强时间/压力信号；consulting deck 场景有 12-14 小时 PowerPoint 和 stress 信号。
  - 证据: [RFP bandwidth](https://www.reddit.com/r/salesengineers/comments/1p5j6of/rfps_take_a_lot_of_bandwith_from_me_thinking/), [How long RFPs](https://www.reddit.com/r/salesengineers/comments/1ch44tp/how_long_do_you_take_to_fill_rfps/), [consulting PowerPoint hours](https://www.reddit.com/r/consulting/comments/qokqm6/so_what_does_it_take_to_work_1214hrs_on_power/)
- 人群频次 (Population Frequency): 高
  - 依据: 同类痛点跨 r/salesengineers、r/consulting、r/smallbusiness、r/marketing、r/startups、r/ProductManagement 出现；其中 RFP 和 consulting deck 是最独立、最重复的聚类。
  - 证据: 证据线程表。
- 个体复发频次 (Individual Recurrence Frequency): 中到高
  - 依据: RFP/security questionnaire 对有销售流程的 B2B SaaS 团队是月度/季度/高频；consulting deck 是项目制高频；fundraising pitch deck 对 founder 偏低频。
  - 业务含义: RFP/SE 和 consulting/professional services 支持订阅或 team plan；founder pitch deck 更适合一次性报告/服务。
  - 证据: [RFP team workflow](https://www.reddit.com/r/salesengineers/comments/1mwnadd/how_do_you_team_handle_rfp_responses/), [consulting deck work](https://www.reddit.com/r/consulting/comments/p7la3f/do_you_have_a_standard_library_of_frequently_used/)
- Workaround 成本 (Workaround Cost): 高
  - 依据: 现有 workaround 包括 answer library、SME chasing、Excel/portal copy-paste、人工 review、外包、标准 slide library、模板改稿；这些都消耗高薪专业人员时间。
  - 证据: [Use AI RFP/RFI](https://www.reddit.com/r/salesengineers/comments/1aphxpu/use_of_ai_in_rfp_or_rfi/), [proposal software](https://www.reddit.com/r/smallbusiness/comments/1iurh6c/proposal_software_with_math_and_quotation/)
- 现有替代成熟度 (Incumbent Maturity): 中
  - 依据: RFP 工具有成熟付费市场，pitch deck/design 工具也多；但执行差距明显：source grounding、答案可信度、内容库维护、story architecture、PowerPoint 质量和协作仍未完全满足。
  - 证据: [RFP tools comparison](https://www.reddit.com/r/salesengineers/comments/1mwnadd/how_do_you_team_handle_rfp_responses/), [AI pitch deck tools](https://www.reddit.com/r/startups/comments/1qshci0/are_there_any_valuable_ai_tools_for_building_a/)
- 付费/切换意图 (Willingness To Pay Or Switch): 高（RFP/consulting），中（founder pitch deck）
  - 依据: revealed WTP 明确：公司已购买 Loopio/RFPIO/Responsive/Arphie/1up/Proposal Pilot；有人使用外包公司处理 RFP；consulting 有设计团队、模板/插件、外包；pitch deck 也有人愿意为专业设计付几百美元，但更多是低频/价格敏感。
  - 证据: [RFP handling tools and 2-year contract](https://www.reddit.com/r/salesengineers/comments/1mwnadd/how_do_you_team_handle_rfp_responses/), [Arphie/Responsive pricing discussion](https://www.reddit.com/r/salesengineers/comments/1aphxpu/use_of_ai_in_rfp_or_rfi/), [presentation design demand](https://www.reddit.com/r/startups/comments/1imy4my/seeking_advice_is_there_a_strong_demand_for/)
- 证据质量 (Evidence Quality): 中
  - 依据: 线程数量和方向强，但本机 Reddit JSON API 403，不能采集精确互动元数据；部分 evidence 来自搜索结果摘要和页面片段。
  - 证据: 抓取完整性说明。
- 趋势方向 (Trend Direction): rising
  - ai-absorbed 标记: 否
  - 依据: 近 12 个月有大量 AI RFP、AI pitch deck、AI sales deck 讨论；但“通用 AI 已解决”并未成立，反而出现“AI slop / hallucination / source transparency”的新痛点。
  - 证据: [AE overusing AI, last month](https://www.reddit.com/r/salesengineers/comments/1sw51zm/aes_overusing_ai/), [RFP bandwidth, 6 months](https://www.reddit.com/r/salesengineers/comments/1p5j6of/rfps_take_a_lot_of_bandwith_from_me_thinking/), [AI pitch deck tools, 4 months](https://www.reddit.com/r/startups/comments/1qshci0/are_there_any_valuable_ai_tools_for_building_a/)

## 商业模式提示

- **最强商业化方向**：B2B team workflow，卖给 sales engineering / proposal / revenue enablement / professional services，而不是卖给单个 founder。
- **可付费事件**：RFP/security questionnaire deadline、late-stage deal DDQ、enterprise proposal、consulting client workshop、board/exec deck。
- **定价假设**：RFP/proposal workflow 可以承接现有 RFP tool 的预算心智；founder pitch deck 更像一次性 $100-$500 或服务型。
- **护城河方向**：不是“生成 PPT”，而是“把内部知识、历史 deck、evidence、source、review workflow、PowerPoint 输出质量串起来”。

## 反向信号与不做的理由

- 纯 pitch deck builder 可能不值得做：用户很多时候建议 Canva/Google Slides/template/自己写 script 后找设计师；也有人认为 founder 不该 outsource deck，因为 founder 必须自己讲故事。
  - 证据: [Pitch deck outsource反向信号](https://www.reddit.com/r/startups/comments/1riazbq/pitch_deck_i_will_not_promote_4/), [Startup pitch deck creation](https://www.reddit.com/r/startups/comments/1cvd7aj/startup_pitchdeck_creation/)
- RFP 工具市场已有玩家，正面进入会面对 Loopio/RFPIO/Responsive/Arphie/1up/Conveyor/SecurityPal。
  - 证据: [RFP tools list](https://www.reddit.com/r/salesengineers/comments/1iav09w/ai_for_automating_rfps_and_security_questionnaires/)
- 通用 AI 的进入会压低“初稿生成”价值；差异化必须转向 grounded quality、reviewability、workflow ownership。
  - 证据: [AI pitch deck first draft](https://www.reddit.com/r/startups/comments/1qshci0/are_there_any_valuable_ai_tools_for_building_a/), [AE overusing AI](https://www.reddit.com/r/salesengineers/comments/1sw51zm/aes_overusing_ai/)

## 最危险假设与最便宜的下一步实验

- 最危险假设: "目标用户愿意把真实商业文档和内部知识交给 PPTAgent，并为 source-backed, reviewable, PowerPoint-quality 输出付费，而不是继续用现有 RFP tool / ChatGPT / templates。"
  - 类别: 付费意愿
  - 为什么最危险: 痛点强，但已有工具和内部流程；关键不是能否生成，而是能否进入真实工作流。
- 最便宜实验（≤2 周，≤$100，测行为不测口头）:
  - 做什么: 做 2 个 narrow demo landing pages：一个是“RFP/security questionnaire to cited answer deck/proposal”，一个是“consulting notes to client-ready deck”。各自带真实样例、source/confidence 标注和一键预约。
  - 通过线: 100 个定向访问中 ≥8% 留邮箱或预约；至少 5 个 sales engineer / consultant 愿意提供一份脱敏 RFP、prior deck 或 notes 做试跑。
  - 杀死标准: 200 个定向访问转化 <4%，或 10 次访谈中没有人愿意提供真实文档，即暂停产品化，只保留内部/服务化能力。
- 失败后的备选路径: 先做 productized service：人工辅助 + PPTAgent 半自动交付，验证具体 wedge 后再 SaaS 化。

## Pre-mortem：如果 12 个月后失败了

1. 选错人群：做成 founder pitch deck generator，被 Canva、Beautiful.ai、templates 和人工 mentor feedback 吃掉。
2. 输出可信度不够：RFP/proposal 用户需要 source、confidence、SME review；如果只是“看起来像答案”，会被 SE/Legal/Security 拒绝。
3. 没进工作流：用户的真实痛点在 Slack/Sheets/portal/CRM/docs/PowerPoint 多工具切换，如果 PPTAgent 只生成文件，不接 review/knowledge/source 流程，留存会弱。

## 如果要做用户访谈，先问这 5 个问题

1. "你上次做 RFP / proposal / 客户 deck 是什么时候？从拿到需求到发出去，中间发生了什么？"
2. "你当时最耗时间的是找答案、组织故事线、做版式、找 SME 审，还是反复改？"
3. "你现在用哪些工具或模板？哪些部分你信得过，哪些部分每次还要人工重做？"
4. "过去一年你们为 RFP/proposal/deck 工具、外包或模板花了多少钱？谁批准？"
5. "如果有工具能接入你们历史 deck/docs 并输出带 source/confidence 的 PPT/proposal，你愿意先拿哪一个真实项目试？为什么？"

## 建议下一步验证什么

- 优先验证 RFP/security questionnaire + proposal deck，而不是泛 pitch deck。
- 用真实脱敏材料做 5 个 concierge pilots：2 个 sales/SE，2 个 consultant/agency，1 个 founder pitch deck 作对照。
- 不要只测“你会不会用 AI 做 PPT”；要测“你是否愿意上传真实资料、让它进入 review flow、并为节省一周/几天工作付费”。

## 样本与方法说明

- 研究范围: 只基于 Reddit。
- 搜索方式: search-engine `site:reddit.com` queries + Reddit JSON API 尝试。
- 搜索主题: proposal writing, pitch deck, RFP response, RFI, security questionnaire, PowerPoint, consulting deck, quote/proposal software。
- 深读线程数: 12 个可识别线程/搜索结果页面。
- 候选 subreddit: r/salesengineers, r/startups, r/consulting, r/smallbusiness, r/marketing, r/freelance, r/ProductManagement。
- 纳入主证据的 subreddit: r/salesengineers, r/startups, r/consulting, r/smallbusiness, r/marketing, r/freelance, r/ProductManagement。
- 时间窗口: 近 12 个月为主，咨询/proposal 经典线程扩展到 24+ 个月。
- 去重说明: 翻译版 duplicate 不重复计数；同一 RFP 工具讨论线程只算一次 evidence cluster。
- 弱证据说明: 因 Reddit API 403，互动元数据缺失；但主结论由跨社区重复和具体页面片段支撑。
- 低信号求助帖处理: founder 求模板/求反馈帖不单独支撑 strong，只作为 pitch deck 场景 mixed 证据。
- 证伪轮说明: 跑了 satisfaction/good-enough/AI absorption 查询；对纯 pitch deck 生成器触发 cap，对 RFP/proposal/consulting workflow 未触发。
- 共鸣加权说明: 未使用高共鸣 ×2 加权。
- 置信度依据: medium；方向和人群足够清晰，但缺少 API 元数据和完整评论深读。

## 查询收敛过程

### 第一轮: 广泛探索

- 实际跑的查询:
  1. `site:reddit.com/r/ proposal writing RFP response pain annoying manual process`
  2. `site:reddit.com/r/ "RFP response" "proposal" "pain"`
  3. `site:reddit.com/r/ "pitch deck" "frustrated" "template" startup`
  4. `site:reddit.com/r/ "proposal writing" "takes forever"`
- 命中率或命中质量: RFP/presales useful；pitch deck mixed；proposal writing useful but scattered。
- 提取出的具体阻碍: answer library, hallucination, SME review, compliance, quote math, client not reading proposals, formatting vs substance。
- 提取出的候选 subreddit: r/salesengineers, r/startups, r/consulting, r/smallbusiness, r/marketing, r/freelance。

### 第二轮: 约束驱动

- 基于第一轮阻碍生成的查询:
  1. `site:reddit.com/r/salesengineers "RFP" "Loopio" "Excel sheet"`
  2. `site:reddit.com/r/salesengineers "RFPio" "too expensive" "1up"`
  3. `site:reddit.com/r/consulting "PowerPoint" "wasting" "slides"`
  4. `site:reddit.com/r/smallbusiness "proposal software" "quote" "pdf proposal"`
- 命中率或命中质量: useful。
- 第二轮新增或强化的发现: RFP 市场有付费预算；pitch deck DIY 反向信号强；consulting deck 痛点集中在结构/复用/返工，不只是设计。

## 实际查询日志

1. `site:reddit.com/r/ proposal writing RFP response pain annoying manual process`
2. `site:reddit.com/r/ "RFP response" "proposal" "pain"`
3. `site:reddit.com/r/ "pitch deck" "frustrated" "template" startup`
4. `site:reddit.com/r/salesengineers "How long" "fill RFPs"`
5. `site:reddit.com/r/salesengineers "Use of AI" "RFP" "RFI"`
6. `site:reddit.com/r/salesengineers "Loopio" "RFPio" "1up"`
7. `site:reddit.com/r/startups "pitch deck" "AI" "template"`
8. `site:reddit.com/r/startups "pitch deck" "pay" "consultant"`
9. `site:reddit.com/r/freelance "proposal writing" "client" "takes"`
10. `site:reddit.com/r/smallbusiness "proposal software" "clients" "quote"`
11. `site:reddit.com/r/consulting "PowerPoint" "wasting" "slides"`
12. `site:reddit.com/r/ProductManagement "PowerPoint" "stakeholders" "deck" "takes"`

## 抓取完整性说明

- Reddit JSON API 在本机返回 403 HTML/block 页面，无法稳定读取结构化 `.json`。
- 读到 `.json` 全文与评论的线程: 0。
- 回退到 `old.reddit` 的线程: 0。
- 只能使用搜索摘要/网页片段的线程: 12+。
- 评论层证据受限的地方: 无法采集精确 score、num_comments、upvote_ratio、agreement replies。
- 使用了哪些兜底抓取方式: web search result snippets + Reddit web page snippets。

## 局限性

- 本结论仅基于 Reddit，不代表全部市场。
- Reddit 样本可能偏技术、英语、西方和特定性别结构；中文市场需要补充小红书/知乎/飞书/咨询从业者访谈。
- RFP 工具讨论可能混入供应商自荐评论，已尽量用真实 problem-owner 线索过滤。
