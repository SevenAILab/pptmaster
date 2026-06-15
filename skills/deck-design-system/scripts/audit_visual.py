#!/usr/bin/env python3
"""deck-design-system 视觉质量门：审计 freeform HTML deck 的视觉硬伤。

静态审计（零依赖，必跑）：单一强调色 / SVG 内禁文字 / 禁渐变。
渲染审计（--render，需 playwright）：元素重叠、溢出。

用法:
  python audit_visual.py <deck.freeform.html>            # 静态审计
  python audit_visual.py <deck.freeform.html> --render   # 加渲染审计
  python audit_visual.py --selftest                      # 跑内置自检
退出码 0=PASS，1=FAIL。
"""
import argparse
import re
import sys

GRAY_TOLERANCE = 18  # max-min 通道差 < 此值视为中性灰/黑/白，不计入强调色


def _hex_to_rgb(value):
    h = value.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _is_neutral(value):
    try:
        r, g, b = _hex_to_rgb(value)
    except Exception:
        return True
    return (max(r, g, b) - min(r, g, b)) < GRAY_TOLERANCE


def _normalize_hex(value):
    norm = value.lower()
    if len(norm) == 4:  # #abc -> #aabbcc
        norm = "#" + "".join(c * 2 for c in norm[1:])
    return norm


def static_audit(html):
    """返回 (errors, warnings)。errors 非空 = FAIL。"""
    errors = []
    warnings = []

    # 1. 单一强调色：非中性 hex 去重，>1 即配色不统一
    accents = set()
    for raw in re.findall(r"#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b", html):
        norm = _normalize_hex(raw)
        if not _is_neutral(norm):
            accents.add(norm)
    if len(accents) > 1:
        errors.append(f"多个强调色（配色不统一）：{sorted(accents)} —— 一份 deck 只允许一个强调色")

    # 2. SVG 内禁文字（治坐标轴/图表文字翻转）
    for svg in re.findall(r"<svg\b[\s\S]*?</svg>", html, re.I):
        if re.search(r"<text\b", svg, re.I):
            errors.append("SVG 内含 <text>（图表/坐标轴文字会翻转）—— 文字标签必须用 HTML，SVG 只画几何")
            break

    # 3. 禁渐变（瑞士风硬约束 + 反 AI slop）
    if re.search(r"(linear|radial)-gradient", html, re.I):
        errors.append("出现 gradient 渐变 —— 瑞士风禁渐变，且显 AI slop")

    # WARN（提示，不致命）
    if re.search(r"box-shadow\s*:\s*(?!none)", html, re.I):
        warnings.append("出现 box-shadow —— 瑞士风应少阴影，确认是否必要")

    return errors, warnings


def render_audit(html_path):
    """需 playwright；返回溢出/越界问题列表。"""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise RuntimeError(
            "playwright 未安装。运行: npm i -D playwright && npx playwright install chromium（或 pip install playwright）")
    import os
    abs_path = os.path.abspath(html_path)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.goto(f"file://{abs_path}")
        issues = page.evaluate(
            """() => {
                const out = [];
                document.querySelectorAll('section.slide').forEach((sec, i) => {
                    const r = sec.getBoundingClientRect();
                    sec.querySelectorAll('*').forEach(el => {
                        const b = el.getBoundingClientRect();
                        if (b.width === 0 || b.height === 0) return;
                        if (b.right > r.right + 2 || b.bottom > r.bottom + 2 || b.left < r.left - 2) {
                            out.push(`p${i + 1} <${el.tagName.toLowerCase()}> 越界/溢出`);
                        }
                    });
                });
                return out;
            }""")
        browser.close()
    return issues


def _selftest():
    good = '<section class="slide light"><h1 style="color:#002FA7">标题</h1><p style="color:#0a0a0a">正文</p><div style="background:#f0f0ee"></div></section>'
    bad = ('<section class="slide"><h1 style="color:#002FA7">A</h1>'
           '<span style="color:#FF6B35">B</span>'
           '<svg><text x="0" y="0">轴标签</text></svg>'
           '<div style="background:linear-gradient(#fff,#000)"></div></section>')
    good_errs, _ = static_audit(good)
    assert good_errs == [], f"good 不应有错: {good_errs}"
    bad_errs, _ = static_audit(bad)
    joined = "\n".join(bad_errs)
    for must in ["多个强调色", "SVG 内含 <text>", "渐变"]:
        assert must in joined, f"自检遗漏: {must}\n{joined}"
    print("✅ audit_visual --selftest 通过（good=PASS, bad 捕获多强调色/SVG文字/渐变）")


def main():
    parser = argparse.ArgumentParser(description="deck 视觉质量门")
    parser.add_argument("html", nargs="?", help="deck.freeform.html 路径")
    parser.add_argument("--render", action="store_true", help="加渲染审计（需 playwright）")
    parser.add_argument("--selftest", action="store_true", help="跑内置自检")
    args = parser.parse_args()

    if args.selftest:
        _selftest()
        return
    if not args.html:
        parser.error("需要提供 deck.freeform.html 路径，或用 --selftest")

    with open(args.html, encoding="utf-8") as fh:
        html = fh.read()
    errors, warnings = static_audit(html)
    if args.render:
        errors = errors + [f"渲染：{issue}" for issue in render_audit(args.html)]

    for warn in warnings:
        print(f"⚠️  {warn}")
    if errors:
        print(f"❌ 视觉审计未通过（{len(errors)} 项）：")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
    print("✅ 视觉审计通过：单一强调色 / SVG 无文字 / 无渐变" + ("（含渲染审计：无溢出越界）" if args.render else ""))


if __name__ == "__main__":
    main()
