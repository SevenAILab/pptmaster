#!/usr/bin/env python3
"""分析卡质量门：校验分析卡是否满足契约 A，重点揪"有分析无结论"。

用法:
  python check_analysis_cards.py <cards.json>   # 校验一份分析卡
  python check_analysis_cards.py --selftest     # 跑内置自检用例

被所有分析 skill（competitor / industry / self / user）共用：它们产出的分析卡
都走这同一个契约与质量门。
退出码 0=PASS，1=FAIL。
"""
import argparse
import json
import sys

VALID_TIER = {"T1", "T2", "T3", "T4"}
VALID_CONFIDENCE = {"high", "med", "low", "hypothesis"}
VALID_TYPE = {"industry", "competitor", "self", "user"}


def check_cards(data):
    """返回违规信息列表；空列表 = 通过。"""
    errors = []

    atype = data.get("analysis_type")
    if atype not in VALID_TYPE:
        errors.append(f"analysis_type 非法: {atype!r}（应为 {sorted(VALID_TYPE)}）")

    cards = data.get("cards")
    if not isinstance(cards, list) or len(cards) == 0:
        errors.append("cards 应为非空列表")
        return errors

    for idx, card in enumerate(cards, 1):
        cid = card.get("id") or f"#{idx}"
        if not str(card.get("claim", "")).strip():
            errors.append(f"{cid}: claim 为空（缺判断）")
        if not str(card.get("implication", "")).strip():
            errors.append(f"{cid}: implication 为空（有分析无结论——必须写清'所以我们该怎么办'）")
        if not str(card.get("source", "")).strip():
            errors.append(f"{cid}: source 为空（结论无出处）")
        tier = card.get("source_tier")
        if tier not in VALID_TIER:
            errors.append(f"{cid}: source_tier 非法: {tier!r}（应为 {sorted(VALID_TIER)}）")
        conf = card.get("confidence")
        if conf not in VALID_CONFIDENCE:
            errors.append(f"{cid}: confidence 非法: {conf!r}（应为 {sorted(VALID_CONFIDENCE)}）")

    return errors


def _selftest():
    good = {
        "analysis_type": "competitor",
        "cards": [{
            "id": "comp-01",
            "claim": "Manner 用高质平价+极致单店模型锁住大众咖啡心智",
            "evidence": "客单 15-20 元、单店面积小、SKU 精简",
            "source": "https://example.com/report",
            "source_tier": "T2",
            "implication": "LUMA 应避开平价红海，卡日常可及的专业精品空位",
            "confidence": "high",
        }],
    }
    bad = {
        "analysis_type": "rival",
        "cards": [{
            "id": "comp-01",
            "claim": "Manner 开了 1500 家店",
            "evidence": "",
            "source": "",
            "source_tier": "T9",
            "implication": "",
            "confidence": "maybe",
        }],
    }
    assert check_cards(good) == [], f"good 用例不应有错: {check_cards(good)}"
    bad_errs = check_cards(bad)
    joined = "\n".join(bad_errs)
    for must in ["analysis_type", "implication 为空", "source 为空", "source_tier", "confidence"]:
        assert must in joined, f"自检遗漏: {must}\n{joined}"
    print("✅ check_analysis_cards --selftest 通过（good=PASS, bad 捕获全部预期违规）")


def main():
    parser = argparse.ArgumentParser(description="分析卡质量门（契约 A）")
    parser.add_argument("cards", nargs="?", help="分析卡 JSON 路径")
    parser.add_argument("--selftest", action="store_true", help="跑内置自检用例")
    args = parser.parse_args()

    if args.selftest:
        _selftest()
        return
    if not args.cards:
        parser.error("需要提供分析卡 JSON 路径，或用 --selftest")

    with open(args.cards, encoding="utf-8") as fh:
        data = json.load(fh)
    errors = check_cards(data)
    if errors:
        print(f"❌ 分析卡未通过质量门（{len(errors)} 项）：")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
    print(f"✅ 分析卡通过质量门：{len(data['cards'])} 张卡，每张有判断 + 结论 + 出处")


if __name__ == "__main__":
    main()
