"""Cursor wrapper for PPTAgent Sub-Agent ④ brand_positioning.

Usage:
  python adapters/cursor/example-brand-positioning.py smallrig
  python adapters/cursor/example-brand-positioning.py smallrig --validate
"""

import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def run(cmd):
    subprocess.run(cmd, cwd=REPO_ROOT, check=True)


def main():
    if len(sys.argv) < 2:
        print("Usage: python adapters/cursor/example-brand-positioning.py <client_slug> [--validate]")
        raise SystemExit(2)

    client_slug = sys.argv[1]
    output_dir = REPO_ROOT / "outputs" / f"{client_slug}-positioning"

    if "--validate" in sys.argv:
        raw = output_dir / "raw-output.json"
        html = output_dir / "index.html"
        run(["node", "validators/brand_positioning/content-check.mjs", str(raw)])
        run(["node", "validators/brand_positioning/methodology-check.mjs", str(raw)])
        run(["node", "scripts/render-deck.mjs", str(raw), str(html), "--style=swiss"])
        print(f"✅ Validated and rendered: {html.relative_to(REPO_ROOT)}")
        return

    run([
        "node",
        "scripts/run-sub-agent.mjs",
        "brand_positioning",
        client_slug,
        "--output-suffix=positioning",
    ])

    print(f"\n✅ Bundle generated at outputs/{client_slug}-positioning/prompt-bundle.md")
    print("请在 Cursor 中:")
    print(f"  1. 打开 outputs/{client_slug}-positioning/prompt-bundle.md")
    print("  2. 按 .cursorrules 的指引让 Cursor 生成 raw-output.json")
    print(f"  3. 跑: python adapters/cursor/example-brand-positioning.py {client_slug} --validate")


if __name__ == "__main__":
    main()
