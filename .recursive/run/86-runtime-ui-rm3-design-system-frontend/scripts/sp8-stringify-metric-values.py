"""Wrap MetricStrip numeric value expressions with String(...)."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(
    r"D:\DEV\role-model\.worktrees\86-runtime-ui-rm3-design-system-frontend"
    r"\role-model-router\apps\runtime-ui\app\routes"
)
FILES = [
    "control-benchmark.tsx",
    "control-models.tsx",
    "control-roles.tsx",
    "extensions.tsx",
    "integrations-upstream.tsx",
    "storage-retention.tsx",
    "system-peers.tsx",
]

VALUE_RE = re.compile(r"(value:\s*)(?!String\()([^,\n}]+)")


def wrap_values(block: str) -> str:
    def repl(match: re.Match[str]) -> str:
        prefix, expr = match.group(1), match.group(2).rstrip()
        if expr[:1] in {'"', "'", "`"}:
            return match.group(0)
        return f"{prefix}String({expr})"

    return VALUE_RE.sub(repl, block)


def main() -> None:
    for name in FILES:
        path = ROOT / name
        text = path.read_text(encoding="utf-8")
        new = re.sub(r"<MetricStrip[\s\S]*?/>", lambda m: wrap_values(m.group(0)), text)
        if new != text:
            path.write_text(new, encoding="utf-8", newline="\n")
            print(f"fixed {name}")
        else:
            print(f"no change {name}")


if __name__ == "__main__":
    main()
