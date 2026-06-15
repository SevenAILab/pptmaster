#!/usr/bin/env python3
"""proposal-narrative 质量门：确定性校验 deck 骨架是否满足五条硬纪律。

用法:
  python check_deck_skeleton.py <deck_skeleton.json>   # 校验一份骨架
  python check_deck_skeleton.py --selftest             # 跑内置自检用例

校验项（对应 SKILL.md 的五条纪律 + 契约 B）：
  - 结构件齐全：cover/toc/brief_opening(SCQA三段)/sections/conclusion
  - 每章有 transition_question(章首过渡) + closing_judgment(收束)
  - 一页一观点：每页恰一个 governing_thought，且为判断句(非话题词)
  - 论据 ≤ 4（超过=疑似多观点，应拆页）
  - evidence_refs 非空（挂分析卡=消化，非罗列/凭空）
  - conclusion 有顶层结论 + 行动建议
退出码 0=PASS，1=FAIL。
"""
import argparse
import json
import sys


def _effective_len(text):
    """有效字符数（去空格），用于判断标题是否过短疑似话题词。"""
    return len(str(text).replace(" ", "").replace("　", ""))


def check_deck(deck):
    """返回违规信息列表；空列表 = 通过。"""
    errors = []

    for key in ["cover", "toc", "brief_opening", "sections", "conclusion"]:
        if not deck.get(key):
            errors.append(f"缺结构件: {key}")

    cover = deck.get("cover") or {}
    if isinstance(cover, dict) and not str(cover.get("title", "")).strip():
        errors.append("cover.title 为空")

    toc = deck.get("toc")
    if toc is not None and not (isinstance(toc, list) and len(toc) > 0):
        errors.append("toc 应为非空列表（方案要有目录）")

    brief = deck.get("brief_opening") or {}
    for seg, label in [("situation", "现状S"), ("complication", "冲突C"), ("question", "核心问题Q")]:
        if not str(brief.get(seg, "")).strip():
            errors.append(f"brief_opening.{seg} 为空（SCQA 开场缺 {label}）")

    sections = deck.get("sections") or []
    if not isinstance(sections, list) or len(sections) == 0:
        errors.append("sections 应为非空列表")
        sections = []

    for idx, sec in enumerate(sections, 1):
        sno = sec.get("section_no", idx)
        if not str(sec.get("transition_question", "")).strip():
            errors.append(f"第{sno}章 缺 transition_question（章首问题引导过渡页）")
        if not str(sec.get("closing_judgment", "")).strip():
            errors.append(f"第{sno}章 缺 closing_judgment（本章收束判断，用于承接下一章）")
        pages = sec.get("pages") or []
        if not isinstance(pages, list) or len(pages) == 0:
            errors.append(f"第{sno}章 无 pages")
            continue
        for page in pages:
            pno = page.get("page_no", "?")
            tag = f"第{sno}章 p{pno}"
            gt = str(page.get("governing_thought", "")).strip()
            if not gt:
                errors.append(f"{tag} 缺 governing_thought（违反一页一观点）")
            elif _effective_len(gt) < 8:
                errors.append(f"{tag} governing_thought 过短，疑似话题词而非判断句:「{gt}」")
            pts = page.get("points")
            if not isinstance(pts, list) or len(pts) == 0:
                errors.append(f"{tag} points 为空（缺支撑论据）")
            elif len(pts) > 4:
                errors.append(f"{tag} points={len(pts)} 超过 4（疑似多观点堆一页，应拆页）")
            refs = page.get("evidence_refs")
            if not isinstance(refs, list) or len(refs) == 0:
                errors.append(f"{tag} evidence_refs 为空（未挂分析卡，疑似罗列/凭空）")

    conc = deck.get("conclusion") or {}
    if not str(conc.get("governing_thought", "")).strip():
        errors.append("conclusion.governing_thought 为空（缺金字塔顶层结论）")
    if not (isinstance(conc.get("action_items"), list) and len(conc["action_items"]) > 0):
        errors.append("conclusion.action_items 为空（缺落地行动）")

    return errors


def _selftest():
    good = {
        "cover": {"title": "LUMA 品牌定位方案", "subtitle": "2026"},
        "toc": ["第1章 诊断", "第2章 定位"],
        "brief_opening": {"situation": "12家直营店", "complication": "认知模糊", "question": "应占据什么差异化定位"},
        "sections": [
            {"section_no": 1, "title": "诊断", "transition_question": "增长的真问题在哪？",
             "pages": [{"page_no": 1, "governing_thought": "增长正从开店红利切到复购红利",
                        "points": ["门店增速放缓", "复购见顶"], "evidence_refs": ["ind-03"]}],
             "closing_judgment": "必须重新定位以撬动复购"},
        ],
        "conclusion": {"governing_thought": "占据日常可及的专业精品定位", "action_items": ["统一门店", "重构会员"]},
    }
    bad = {
        "cover": {"title": ""},
        "toc": [],
        "brief_opening": {"situation": "x"},
        "sections": [
            {"section_no": 1,
             "pages": [{"page_no": 1, "governing_thought": "品牌定位",
                        "points": ["a", "b", "c", "d", "e"], "evidence_refs": []}]},
        ],
        "conclusion": {},
    }
    good_errs = check_deck(good)
    bad_errs = check_deck(bad)
    assert good_errs == [], f"good 用例不应有错，却报: {good_errs}"
    assert len(bad_errs) >= 6, f"bad 用例应捕获多项违规，实际 {len(bad_errs)}: {bad_errs}"
    # 确认关键违规被捕获
    joined = "\n".join(bad_errs)
    for must in ["cover.title", "目录", "冲突C", "话题词", "超过 4", "evidence_refs", "顶层结论"]:
        assert must in joined, f"自检遗漏: {must}\n{joined}"
    print("✅ check_deck_skeleton --selftest 通过（good=PASS, bad 捕获全部预期违规）")


def main():
    parser = argparse.ArgumentParser(description="proposal-narrative deck 骨架质量门")
    parser.add_argument("deck", nargs="?", help="deck 骨架 JSON 路径")
    parser.add_argument("--selftest", action="store_true", help="跑内置自检用例")
    args = parser.parse_args()

    if args.selftest:
        _selftest()
        return
    if not args.deck:
        parser.error("需要提供 deck 骨架 JSON 路径，或用 --selftest")

    with open(args.deck, encoding="utf-8") as fh:
        deck = json.load(fh)
    errors = check_deck(deck)
    if errors:
        print(f"❌ deck 骨架未通过质量门（{len(errors)} 项）：")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
    print("✅ deck 骨架通过质量门：一页一观点 / 结构件齐全 / 判断句标题 / 论据≤4 / 已挂出处 / 有收束与结论")


if __name__ == "__main__":
    main()
