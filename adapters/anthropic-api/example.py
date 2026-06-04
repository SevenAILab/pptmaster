"""Anthropic API example for PPTAgent Sub-Agent ④ brand_positioning."""

import json
import os
import sys
from pathlib import Path

import anthropic

REPO_ROOT = Path(__file__).resolve().parents[2]


def read_text(path):
    return path.read_text(encoding="utf-8")


def load_golden_contexts():
    matrix = json.loads(read_text(REPO_ROOT / "assets/_compiled/concept-application-matrix.json"))
    must_load = matrix["matrix"]["brand_positioning"]["must_load"]
    contexts = []
    for item in must_load:
        concept_path = REPO_ROOT / item.get("file", f"assets/_compiled/concepts-golden/{item['slug']}.md")
        contexts.append(f"## {item['concept']} (must_load)\n{read_text(concept_path)}")
    return "\n\n---\n\n".join(contexts)


def main(client_slug):
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    system = read_text(REPO_ROOT / "prompts/brand_positioning/system.md")
    examples = read_text(REPO_ROOT / "prompts/brand_positioning/examples.md")
    form = json.loads(read_text(REPO_ROOT / f"inputs/{client_slug}/form.json"))
    summary = read_text(REPO_ROOT / f"inputs/{client_slug}/summary.md")

    user = f"""# In-context examples

{examples}

# Must-load concepts

{load_golden_contexts()}

# Client input

## form.json
{json.dumps(form, ensure_ascii=False, indent=2)}

## summary.md
{summary}

请按 system 契约生成严格 JSON,不要 Markdown 围栏。"""

    response = client.messages.create(
        model="claude-sonnet-4-5-20251022",
        max_tokens=16000,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    text = next(block.text for block in response.content if block.type == "text")
    raw_output = json.loads(text)

    out_dir = REPO_ROOT / "outputs" / f"{client_slug}-positioning"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "raw-output.json").write_text(json.dumps(raw_output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✅ raw-output.json saved to {out_dir.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python adapters/anthropic-api/example.py <client_slug>")
        raise SystemExit(2)
    main(sys.argv[1])
