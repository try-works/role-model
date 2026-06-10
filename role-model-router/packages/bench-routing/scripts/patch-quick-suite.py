#!/usr/bin/env python3
"""Patch quick benchmark cases with explicit answer formats and clearer prompts."""

from __future__ import annotations

import json
from pathlib import Path

SUITE_PATH = Path(__file__).resolve().parents[1] / "data" / "routing-capability-suite.json"


def code_fence(language: str = "typescript") -> dict:
    return {
        "kind": "code_fence",
        "language": language,
        "instruction": (
            f"Reasoning allowed. Final message must contain exactly one ```{language} "
            "fenced code block with complete working code. No placeholders."
        ),
    }


TOOL_CALLS = {
    "kind": "tool_calls",
    "instruction": (
        "Emit all required tool calls through the API in as few turns as needed. "
        "Do not write fake TOOL_CALL text. No final prose unless asked in a follow-up."
    ),
}

TOOL_CALLS_WITH_ANSWER = {
    "kind": "tool_calls_with_answer",
    "instruction": (
        "Step 1: emit required API tool calls. Step 2: after tools succeed, output ONLY "
        'a ```json fence: {"answer":"..."}. No reasoning inside the JSON.'
    ),
    "schema": {
        "type": "object",
        "required": ["answer"],
        "properties": {"answer": {"type": "string", "minLength": 1}},
    },
}

TOOL_CALLS_WITH_BULLETS = {
    "kind": "tool_calls_with_summary",
    "instruction": (
        "Step 1: emit required API tool calls. Step 2: output ONLY "
        '```json {"bullets":["...","..."]}. Exactly two bullets.'
    ),
    "schema": {
        "type": "object",
        "required": ["bullets"],
        "properties": {
            "bullets": {"type": "array", "items": {"type": "string"}, "minItems": 2},
        },
    },
}

TOOL_CALLS_WITH_PLAN = {
    "kind": "tool_calls_with_summary",
    "instruction": (
        "Step 1: emit read_file, grep_search, apply_patch via API. Step 2: output ONLY "
        '```json {"plan":["milestone 1"],"patch_summary":"what changed","test_snippet":"short test idea"}.'
    ),
    "schema": {
        "type": "object",
        "required": ["plan", "patch_summary"],
        "properties": {
            "plan": {"type": "array", "items": {"type": "string"}},
            "patch_summary": {"type": "string"},
            "test_snippet": {"type": "string"},
        },
    },
}

UPDATES: dict[str, dict] = {
    "h01-implement-two-sum": {
        "answer_format": code_fence(),
        "messages": [
            {
                "role": "user",
                "content": (
                    "Implement twoSum(nums: number[], target: number): [number, number] in TypeScript. "
                    "Use one Map pass, O(n). Return the two indices."
                ),
            }
        ],
    },
    "h02-fix-async-counter": {
        "answer_format": code_fence(),
        "max_tokens": 512,
        "messages": [
            {
                "role": "user",
                "content": (
                    "Fix this async race so count reliably prints 3. "
                    "Serialize increments with a mutex/lock/queue:\n"
                    "```ts\n"
                    "let count = 0;\n"
                    "async function increment() {\n"
                    "  const current = count;\n"
                    "  await Promise.resolve();\n"
                    "  count = current + 1;\n"
                    "}\n"
                    "await Promise.all([increment(), increment(), increment()]);\n"
                    "console.log(count);\n"
                    "```\n"
                    "Output one complete ```typescript fence with runnable fixed code only."
                ),
            }
        ],
    },
    "h04-tool-read-router": {
        "answer_format": TOOL_CALLS_WITH_ANSWER,
        "messages": [
            {"role": "user", "content": "Phase 1 only: API read_file path src/router.ts"},
            {"role": "assistant", "content": "read_file emitted."},
            {
                "role": "user",
                "content": 'Phase 2 only: ```json {"answer":"<first exported function name>"}',
            },
        ],
        "max_tokens": 320,
    },
    "h05-tool-grep-eligibility": {
        "answer_format": TOOL_CALLS_WITH_BULLETS,
        "messages": [
            {"role": "user", "content": "Phase 1 only: API grep_search pattern evaluateEligibility"},
            {"role": "assistant", "content": "grep_search emitted."},
            {
                "role": "user",
                "content": 'Phase 2 only: ```json {"bullets":["<check A>","<check B>"]} with 2 real bullets',
            },
        ],
        "max_tokens": 320,
    },
    "h06-tool-apply-patch": {
        "answer_format": TOOL_CALLS,
        "messages": [
            {
                "role": "user",
                "content": (
                    "API apply_patch only. Unified diff for src/config.ts changing "
                    "const MODE = 'baseline' to const MODE = 'difficulty'. "
                    "Must include --- and +++ file headers."
                ),
            }
        ],
    },
    "h07-multi-turn-sla-guard": {
        "answer_format": code_fence(),
        "max_tokens": 512,
        "messages": [
            {
                "role": "user",
                "content": (
                    "Remote-only alias requests return HTTP 400 with empty chosen_endpoint_id "
                    "when throughput SLA hard-denies the sole candidate."
                ),
            },
            {
                "role": "assistant",
                "content": (
                    "Throughput SLA hard-deny on the only allow-listed endpoint leaves zero eligible candidates."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Write a TypeScript guard function that allows sole-candidate fallback when every "
                    "allow-listed endpoint is hard-denied only by throughput SLA. "
                    "Output only one ```typescript code fence with the full function."
                ),
            },
        ],
    },
    "h08-multi-turn-tool-refine": {
        "answer_format": TOOL_CALLS_WITH_ANSWER,
        "messages": [
            {"role": "user", "content": "Where is routing.strategy persisted?"},
            {"role": "assistant", "content": "In state/runtime-config.yaml."},
            {"role": "user", "content": "Phase 1: API read_file path state/runtime-config.yaml"},
            {"role": "assistant", "content": "read_file emitted."},
            {
                "role": "user",
                "content": 'Phase 2: ```json {"answer":"<routing.strategy value>"}',
            },
        ],
        "max_tokens": 320,
    },
    "h09-agent-metrics-chain": {
        "answer_format": TOOL_CALLS_WITH_ANSWER,
        "messages": [
            {"role": "user", "content": "Phase 1a: API list_endpoints"},
            {"role": "assistant", "content": "list_endpoints emitted."},
            {"role": "user", "content": "Phase 1b: API get_metrics for a remote endpoint_id"},
            {"role": "assistant", "content": "get_metrics emitted."},
            {
                "role": "user",
                "content": 'Phase 2: ```json {"answer":"<one sentence remote vs local p95 latency>"}',
            },
        ],
        "max_tokens": 448,
    },
    "h10-agent-read-grep-patch": {
        "answer_format": TOOL_CALLS,
        "messages": [
            {
                "role": "user",
                "content": (
                    "Emit API tool calls in order: read_file src/router.ts, grep_search evaluateEligibility, "
                    "apply_patch with a one-line comment fix diff. All three tools required."
                ),
            }
        ],
        "max_tokens": 640,
    },
    "h15-max-signal-v3": {
        "answer_format": TOOL_CALLS_WITH_PLAN,
        "messages": [
            {
                "role": "user",
                "content": (
                    "Workflow: (1) API read_file src/router.ts (2) grep_search throughputSla "
                    "(3) apply_patch adding sole-candidate fallback comment "
                    "(4) JSON plan with milestones, patch_summary, test_snippet."
                ),
            }
        ],
        "max_tokens": 512,
    },
    "p17-tools-multi-hard": {
        "answer_format": {
            "kind": "tool_calls_with_answer",
            "instruction": (
                "Step 1: API read_file src/router.ts and apply_patch with minimal unified diff. "
                'Step 2: ```json {"answer":"brief schema/test validation note"}'
            ),
            "schema": {
                "type": "object",
                "required": ["answer"],
                "properties": {"answer": {"type": "string", "minLength": 8}},
            },
        },
        "messages": [
            {
                "role": "user",
                "content": (
                    "API workflow: read_file src/router.ts, apply_patch minimal diff (---/+++), "
                    'then JSON {"answer":"what schema fields and tests you validated"}.'
                ),
            }
        ],
        "max_tokens": 512,
    },
    "x01-max-signal": {
        "answer_format": TOOL_CALLS_WITH_PLAN,
        "messages": [
            {
                "role": "user",
                "content": (
                    "Workflow: (1) API read_file src/router.ts and grep_search throughputSla "
                    "(2) apply_patch sole-candidate fallback comment "
                    "(3) JSON with plan milestones, patch_summary, test_snippet."
                ),
            }
        ],
        "max_tokens": 512,
    },
}


def main() -> None:
    with SUITE_PATH.open(encoding="utf-8") as handle:
        suite = json.load(handle)

    updated = 0
    for case in suite["cases"]:
        case_id = case["case_id"]
        if case_id not in UPDATES:
            continue
        case.update(UPDATES[case_id])
        updated += 1

    suite["suite_version"] = "3.1"
    with SUITE_PATH.open("w", encoding="utf-8") as handle:
        json.dump(suite, handle, indent=2)
        handle.write("\n")
    print(f"updated {updated} quick cases in {SUITE_PATH}")


if __name__ == "__main__":
    main()
