#!/usr/bin/env python3
"""Add example_deliverable to quick_benchmark cases and bump suite_version to 3.2."""

from __future__ import annotations

import json
from pathlib import Path

SUITE_PATH = Path(__file__).resolve().parent.parent / "data" / "routing-capability-suite.json"

EXEMPLARS: dict[str, str] = {
    "p17-tools-multi-hard": json.dumps(
        {
            "tool_calls": [
                {"name": "read_file", "arguments": {"path": "src/router.ts"}},
                {
                    "name": "apply_patch",
                    "arguments": {
                        "patch": "--- a/src/router.ts\n+++ b/src/router.ts\n@@ -12,3 +12,3 @@\n export const MODE = \"difficulty\";\n"
                    },
                },
            ],
            "answer": "Validated MODE and throughput SLA schema fields; added guard regression test.",
        },
        indent=2,
    ),
    "x01-max-signal": json.dumps(
        {
            "tool_calls": [
                {"name": "read_file", "arguments": {"path": "src/router.ts"}},
                {"name": "grep_search", "arguments": {"pattern": "MODE"}},
                {
                    "name": "apply_patch",
                    "arguments": {
                        "patch": "--- a/src/router.ts\n+++ b/src/router.ts\n@@ -1,3 +1,3 @@\n-MODE=fast\n+MODE=difficulty\n"
                    },
                },
            ],
            "plan": ["Read router config", "Patch MODE to difficulty", "Add SLA guard test"],
            "patch_summary": "Switched MODE default to difficulty and documented throughput SLA guard.",
            "test_snippet": "expect(guardSoleCandidate(...)).toAllowFallbackWhenHardDenied();",
        },
        indent=2,
    ),
    "h01-implement-two-sum": json.dumps(
        {
            "code": (
                "function twoSum(nums: number[], target: number): [number, number] {\n"
                "  const map = new Map<number, number>();\n"
                "  for (let i = 0; i < nums.length; i++) {\n"
                "    const need = target - nums[i];\n"
                "    if (map.has(need)) return [map.get(need)!, i];\n"
                "    map.set(nums[i], i);\n"
                "  }\n"
                "  throw new Error('no pair');\n"
                "}"
            ),
        },
        indent=2,
    ),
    "h02-fix-async-counter": json.dumps(
        {
            "code": (
                "let count = 0;\n"
                "let chain = Promise.resolve();\n"
                "function withLock<T>(fn: () => Promise<T>): Promise<T> {\n"
                "  const run = chain.then(fn);\n"
                "  chain = run.catch(() => undefined);\n"
                "  return run;\n"
                "}\n"
                "async function increment() {\n"
                "  await withLock(async () => {\n"
                "    const current = count;\n"
                "    await Promise.resolve();\n"
                "    count = current + 1;\n"
                "  });\n"
                "}\n"
                "await Promise.all([increment(), increment(), increment()]);\n"
                "console.log(count);"
            ),
        },
        indent=2,
    ),
    "h04-tool-read-router": json.dumps(
        {
            "tool_calls": [{"name": "read_file", "arguments": {"path": "src/router.ts"}}],
            "answer": "routeRuntimeRequest",
        },
        indent=2,
    ),
    "h05-tool-grep-eligibility": json.dumps(
        {
            "tool_calls": [{"name": "grep_search", "arguments": {"pattern": "eligibility"}}],
            "bullets": [
                "Candidate passes allow-list and freshness checks.",
                "Throughput SLA hard-deny would block sole remaining candidate.",
            ],
        },
        indent=2,
    ),
    "h06-tool-apply-patch": json.dumps(
        {
            "tool_calls": [
                {
                    "name": "apply_patch",
                    "arguments": {
                        "patch": "--- a/src/router.ts\n+++ b/src/router.ts\n@@ -1,3 +1,3 @@\n-MODE=fast\n+MODE=difficulty\n"
                    },
                }
            ],
        },
        indent=2,
    ),
    "h07-multi-turn-sla-guard": json.dumps(
        {
            "code": (
                "export function guardSoleCandidateThroughputDeny(input: {\n"
                "  readonly candidates: readonly { id: string; hardDeniedBySla: boolean }[];\n"
                "  readonly throughputSlaHardDeny: boolean;\n"
                "}): boolean {\n"
                "  const allowListed = input.candidates.filter((c) => !c.hardDeniedBySla);\n"
                "  if (allowListed.length !== 1) return false;\n"
                "  if (!input.throughputSlaHardDeny) return false;\n"
                "  return true;\n"
                "}"
            ),
        },
        indent=2,
    ),
    "h08-multi-turn-tool-refine": json.dumps(
        {
            "tool_calls": [{"name": "read_file", "arguments": {"path": "src/router.ts"}}],
            "answer": "createRouter",
        },
        indent=2,
    ),
    "h09-agent-metrics-chain": json.dumps(
        {
            "tool_calls": [
                {"name": "list_endpoints", "arguments": {}},
                {"name": "get_metrics", "arguments": {"endpoint_id": "local.primary"}},
            ],
            "answer": "local.primary has lower p95 latency for this workload.",
        },
        indent=2,
    ),
    "h10-agent-read-grep-patch": json.dumps(
        {
            "tool_calls": [
                {"name": "read_file", "arguments": {"path": "src/router.ts"}},
                {"name": "grep_search", "arguments": {"pattern": "MODE"}},
                {
                    "name": "apply_patch",
                    "arguments": {
                        "patch": "--- a/src/router.ts\n+++ b/src/router.ts\n@@ -4,3 +4,3 @@\n-MODE=fast\n+MODE=difficulty\n"
                    },
                },
            ],
        },
        indent=2,
    ),
    "h15-max-signal-v3": json.dumps(
        {
            "tool_calls": [
                {"name": "read_file", "arguments": {"path": "src/router.ts"}},
                {"name": "grep_search", "arguments": {"pattern": "SLA"}},
                {
                    "name": "apply_patch",
                    "arguments": {
                        "patch": "--- a/src/router.ts\n+++ b/src/router.ts\n@@ -20,3 +20,4 @@\n+// throughput SLA guard\n"
                    },
                },
            ],
            "plan": ["Inspect router", "Patch SLA guard", "Validate with test snippet"],
            "patch_summary": "Added throughput SLA guard comment and regression hook.",
            "test_snippet": "expect(guardSoleCandidateThroughputDeny(...)).toBe(true);",
        },
        indent=2,
    ),
}


def main() -> None:
    suite = json.loads(SUITE_PATH.read_text(encoding="utf-8"))
    suite["suite_version"] = "3.2"
    patched = 0
    for case in suite["cases"]:
        case_id = case.get("case_id")
        if case_id in EXEMPLARS:
            case["example_deliverable"] = EXEMPLARS[case_id]
            patched += 1
    SUITE_PATH.write_text(f"{json.dumps(suite, indent=2)}\n", encoding="utf-8")
    print(f"Patched {patched} quick cases; suite_version={suite['suite_version']}")


if __name__ == "__main__":
    main()
