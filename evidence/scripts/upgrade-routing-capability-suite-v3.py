#!/usr/bin/env python3
"""Upgrade routing-capability-suite.json to v3 with harder code, tool, and multi-step cases."""

from __future__ import annotations

import json
from pathlib import Path

SUITE_PATH = Path(__file__).resolve().parents[2] / (
    "role-model-router/packages/bench-routing/data/routing-capability-suite.json"
)

READ_FILE_TOOL = {
    "type": "function",
    "function": {
        "name": "read_file",
        "description": "Read a file from the repository",
        "parameters": {
            "type": "object",
            "properties": {"path": {"type": "string"}},
            "required": ["path"],
        },
    },
}

GREP_TOOL = {
    "type": "function",
    "function": {
        "name": "grep_search",
        "description": "Search the codebase for a regex pattern",
        "parameters": {
            "type": "object",
            "properties": {"pattern": {"type": "string"}},
            "required": ["pattern"],
        },
    },
}

APPLY_PATCH_TOOL = {
    "type": "function",
    "function": {
        "name": "apply_patch",
        "description": "Apply a unified diff patch",
        "parameters": {
            "type": "object",
            "properties": {"diff": {"type": "string"}},
            "required": ["diff"],
        },
    },
}

LIST_ENDPOINTS_TOOL = {
    "type": "function",
    "function": {
        "name": "list_endpoints",
        "description": "List configured router endpoints",
        "parameters": {"type": "object", "properties": {}},
    },
}

GET_METRICS_TOOL = {
    "type": "function",
    "function": {
        "name": "get_metrics",
        "description": "Fetch latency metrics for an endpoint",
        "parameters": {
            "type": "object",
            "properties": {"endpoint_id": {"type": "string"}},
            "required": ["endpoint_id"],
        },
    },
}

RUN_TESTS_TOOL = {
    "type": "function",
    "function": {
        "name": "run_tests",
        "description": "Run a test command",
        "parameters": {
            "type": "object",
            "properties": {"command": {"type": "string"}},
            "required": ["command"],
        },
    },
}

NEW_CASES = [
    {
        "case_id": "h01-implement-two-sum",
        "category": "code-implementation",
        "difficulty_bucket": "hard",
        "benchmark_eligible": True,
        "capability_targets": ["code_generation"],
        "messages": [
            {
                "role": "user",
                "content": (
                    "Write a TypeScript function `twoSum(nums: number[], target: number): "
                    "[number, number]` that returns indices of the two numbers summing to target "
                    "in O(n) time using a Map. Output only a typescript fenced code block with the "
                    "function; no prose."
                ),
            }
        ],
        "max_tokens": 320,
        "expected_response": "TypeScript twoSum using Map, single pass, returns index tuple",
        "grading_criteria": (
            "Must define twoSum, use Map or hash map, iterate nums once, return two numeric indices. "
            "No nested O(n^2) double loop."
        ),
        "accept_patterns": ["function\\s+twoSum", "Map|new Map", "nums", "target", "return"],
        "quick_benchmark": True,
    },
    {
        "case_id": "h02-fix-async-counter",
        "category": "code-implementation",
        "difficulty_bucket": "hard",
        "benchmark_eligible": True,
        "capability_targets": ["code_generation", "debugging"],
        "messages": [
            {
                "role": "user",
                "content": (
                    "Fix this bug so `count` prints 3:\n```ts\nlet count = 0;\n"
                    "async function increment() { count += 1; }\n"
                    "await Promise.all([increment(), increment(), increment()]);\n"
                    "console.log(count);\n```\n"
                    "Return only the corrected TypeScript in one fenced code block."
                ),
            }
        ],
        "max_tokens": 256,
        "expected_response": "Uses mutex/lock/queue/atomic pattern so concurrent increments serialize",
        "grading_criteria": (
            "Must fix race on shared count (mutex, semaphore, queue, or atomic increment pattern). "
            "Final code should reliably reach count 3."
        ),
        "accept_patterns": ["Mutex|mutex|lock|queue|semaphore|atomic|Promise\\.resolve"],
        "quick_benchmark": True,
    },
    {
        "case_id": "h03-implement-lru-cache",
        "category": "code-implementation",
        "difficulty_bucket": "hard",
        "benchmark_eligible": True,
        "capability_targets": ["code_generation", "reasoning"],
        "messages": [
            {
                "role": "user",
                "content": (
                    "Implement a TypeScript class LRUCache with constructor(capacity: number), "
                    "get(key: number): number, and put(key: number, value: number): void. "
                    "Use Map insertion order or explicit doubly-linked list. Output code only."
                ),
            }
        ],
        "max_tokens": 480,
        "expected_response": "LRUCache class with get/put and eviction at capacity",
        "grading_criteria": (
            "Defines LRUCache class with get and put, evicts least-recently-used when capacity exceeded."
        ),
        "accept_patterns": ["class\\s+LRUCache", "get\\(", "put\\(", "capacity"],
        "quick_benchmark": False,
    },
    {
        "case_id": "h04-tool-read-router",
        "category": "tools-heavy",
        "difficulty_bucket": "hard",
        "benchmark_eligible": True,
        "capability_targets": ["tool_calling"],
        "messages": [
            {
                "role": "user",
                "content": (
                    "Call read_file on path `src/router.ts` before answering. "
                    "Then name the first exported function in that file. You must emit a read_file tool call."
                ),
            }
        ],
        "max_tokens": 128,
        "expected_response": "TOOL_CALL read_file path src/router.ts then function name",
        "grading_criteria": "Must call read_file with router.ts path; answer references a function name.",
        "accept_patterns": ["router\\.ts|read_file"],
        "required_tool_call": True,
        "expected_tool_names": ["read_file"],
        "tools": [READ_FILE_TOOL],
        "quick_benchmark": True,
    },
    {
        "case_id": "h05-tool-grep-eligibility",
        "category": "tools-heavy",
        "difficulty_bucket": "hard",
        "benchmark_eligible": True,
        "capability_targets": ["tool_calling"],
        "messages": [
            {
                "role": "user",
                "content": (
                    "Use grep_search to find `evaluateEligibility` in the codebase. "
                    "Summarize in 2 bullets what the function checks. Emit grep_search tool call first."
                ),
            }
        ],
        "max_tokens": 192,
        "expected_response": "grep_search for evaluateEligibility then eligibility summary bullets",
        "grading_criteria": (
            "Must call grep_search with evaluateEligibility pattern; summary mentions eligibility checks."
        ),
        "accept_patterns": ["evaluateEligibility|eligib"],
        "required_tool_call": True,
        "expected_tool_names": ["grep_search"],
        "tools": [GREP_TOOL],
        "quick_benchmark": True,
    },
    {
        "case_id": "h06-tool-apply-patch",
        "category": "tools-heavy",
        "difficulty_bucket": "hard",
        "benchmark_eligible": True,
        "capability_targets": ["tool_calling", "code_generation"],
        "messages": [
            {
                "role": "user",
                "content": (
                    "Apply a unified diff that changes `const MODE = 'baseline'` to "
                    "`const MODE = 'difficulty'` in src/config.ts. "
                    "Call apply_patch with a valid unified diff in the tool call."
                ),
            }
        ],
        "max_tokens": 256,
        "expected_response": "apply_patch tool call with unified diff changing MODE to difficulty",
        "grading_criteria": (
            "Must call apply_patch; diff includes ---/+++ headers and changes MODE to difficulty."
        ),
        "accept_patterns": ["apply_patch|MODE|difficulty|\\+\\+\\+|---"],
        "required_tool_call": True,
        "expected_tool_names": ["apply_patch"],
        "tools": [APPLY_PATCH_TOOL],
        "quick_benchmark": True,
    },
    {
        "case_id": "h07-multi-turn-sla-guard",
        "category": "multi-step",
        "difficulty_bucket": "hard",
        "benchmark_eligible": True,
        "capability_targets": ["code_generation", "debugging", "reasoning"],
        "messages": [
            {
                "role": "user",
                "content": (
                    "Remote-only alias requests return HTTP 400 with empty chosen_endpoint_id when "
                    "throughput SLA hard-denies the sole candidate."
                ),
            },
            {
                "role": "assistant",
                "content": (
                    "That usually means throughputSla denied the only allow-listed endpoint, so routing "
                    "has zero eligible candidates."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Write the TypeScript guard that allows sole-candidate fallback when every "
                    "allow-listed endpoint is hard-denied only by throughput SLA. "
                    "Output one fenced typescript code block only."
                ),
            },
        ],
        "max_tokens": 320,
        "expected_response": "Guard clause checking sole candidate + throughput SLA hard deny fallback",
        "grading_criteria": (
            "Multi-turn context used; code references throughput SLA, sole candidate, and fallback allow."
        ),
        "accept_patterns": ["throughput|sla|sole|candidate|fallback|allow"],
        "quick_benchmark": True,
    },
    {
        "case_id": "h08-multi-turn-tool-refine",
        "category": "multi-step",
        "difficulty_bucket": "hard",
        "benchmark_eligible": True,
        "capability_targets": ["tool_calling", "agentic_workflow"],
        "messages": [
            {
                "role": "user",
                "content": "Find where routing.strategy is persisted in runtime config.",
            },
            {
                "role": "assistant",
                "content": "I should inspect the runtime config file under state/runtime-config.yaml.",
            },
            {
                "role": "user",
                "content": (
                    "Call read_file on runtime-config.yaml now and report the routing.strategy value. "
                    "Tool call required."
                ),
            },
        ],
        "max_tokens": 160,
        "expected_response": "read_file runtime-config.yaml and routing.strategy value",
        "grading_criteria": "Must call read_file on runtime-config.yaml after multi-turn context.",
        "accept_patterns": ["runtime-config|routing\\.strategy|strategy"],
        "required_tool_call": True,
        "expected_tool_names": ["read_file"],
        "tools": [READ_FILE_TOOL],
        "quick_benchmark": True,
    },
    {
        "case_id": "h09-agent-metrics-chain",
        "category": "tools-heavy",
        "difficulty_bucket": "hard",
        "benchmark_eligible": True,
        "capability_targets": ["tool_calling", "agentic_workflow"],
        "messages": [
            {
                "role": "user",
                "content": (
                    "Execute an agent chain: (1) list_endpoints, (2) get_metrics for the remote endpoint, "
                    "(3) compare p95 latency vs local in one sentence. Steps 1-2 must be tool calls."
                ),
            }
        ],
        "max_tokens": 224,
        "expected_response": "list_endpoints then get_metrics tool calls and latency comparison",
        "grading_criteria": "Must call list_endpoints and get_metrics before summarizing latency.",
        "accept_patterns": ["latency|p95|remote|local|endpoint"],
        "required_tool_call": True,
        "expected_tool_names": ["list_endpoints", "get_metrics"],
        "tools": [LIST_ENDPOINTS_TOOL, GET_METRICS_TOOL],
        "quick_benchmark": True,
    },
    {
        "case_id": "h10-agent-read-grep-patch",
        "category": "tools-heavy",
        "difficulty_bucket": "hard",
        "benchmark_eligible": True,
        "capability_targets": ["tool_calling", "agentic_workflow", "code_generation"],
        "messages": [
            {
                "role": "user",
                "content": (
                    "Agent workflow: read_file src/router.ts, grep_search evaluateEligibility, then "
                    "apply_patch a one-line comment fix. Emit all three tool calls in order."
                ),
            }
        ],
        "max_tokens": 384,
        "expected_response": "read_file, grep_search, apply_patch tool calls in sequence",
        "grading_criteria": "Must emit read_file, grep_search, and apply_patch tool calls.",
        "accept_patterns": ["router|evaluateEligibility|patch|diff"],
        "required_tool_call": True,
        "expected_tool_names": ["read_file", "grep_search", "apply_patch"],
        "tools": [READ_FILE_TOOL, GREP_TOOL, APPLY_PATCH_TOOL],
        "quick_benchmark": True,
    },
    {
        "case_id": "h11-decompose-code-verify",
        "category": "multi-step",
        "difficulty_bucket": "hard",
        "benchmark_eligible": True,
        "capability_targets": ["planning", "code_generation", "tool_calling"],
        "messages": [
            {
                "role": "user",
                "content": (
                    "Phase 1: bullet milestones to add benchmark progress API. "
                    "Phase 2: write TypeScript interface BenchmarkRunProgress with runId, status, "
                    "completedSteps, totalSteps. Phase 3: call run_tests with "
                    "`pnpm test benchmark-progress`. Use run_tests tool for phase 3."
                ),
            }
        ],
        "max_tokens": 400,
        "expected_response": "Milestone bullets, BenchmarkRunProgress interface, run_tests tool call",
        "grading_criteria": (
            "Structured phases; includes BenchmarkRunProgress interface fields; run_tests tool emitted."
        ),
        "accept_patterns": ["BenchmarkRunProgress|milestone|phase|run_tests"],
        "required_tool_call": True,
        "expected_tool_names": ["run_tests"],
        "tools": [RUN_TESTS_TOOL],
        "quick_benchmark": False,
    },
    {
        "case_id": "h12-four-turn-architecture",
        "category": "multi-step",
        "difficulty_bucket": "hard",
        "benchmark_eligible": True,
        "capability_targets": ["planning", "reasoning"],
        "messages": [
            {"role": "user", "content": "Design difficulty routing for mixed local-remote pools."},
            {
                "role": "assistant",
                "content": "Use alias pool, classifier buckets, observed profiles, and controller arbitration.",
            },
            {
                "role": "user",
                "content": "Add cache invalidation triggers and extension points for custom rubrics.",
            },
            {
                "role": "assistant",
                "content": "Invalidate on tool-count delta, model change, strategy change; rubric hooks after classifier.",
            },
            {
                "role": "user",
                "content": (
                    "Now produce a numbered 5-step implementation plan with verification criteria per step. "
                    "Max 180 words."
                ),
            },
        ],
        "max_tokens": 280,
        "expected_response": "5-step numbered plan with verification per step under 180 words",
        "grading_criteria": (
            "Uses prior turns; numbered plan with 5 steps; each step has verification; <=180 words."
        ),
        "accept_patterns": ["1[.)\\s]", "verif|verify|criteria", "cache|rubric|classifier"],
        "quick_benchmark": False,
    },
    {
        "case_id": "h13-parse-nested-json",
        "category": "code-implementation",
        "difficulty_bucket": "hard",
        "benchmark_eligible": True,
        "capability_targets": ["code_generation"],
        "messages": [
            {
                "role": "user",
                "content": (
                    "Write TypeScript function `parseRoutingDiagnostics(raw: string): { difficulty: string; "
                    "chosenEndpointId: string | null }` that safely parses JSON and returns defaults on "
                    "invalid input. Code block only."
                ),
            }
        ],
        "max_tokens": 320,
        "expected_response": "parseRoutingDiagnostics with try/catch JSON parse and typed return",
        "grading_criteria": "Defines parseRoutingDiagnostics, handles invalid JSON, returns difficulty and chosenEndpointId.",
        "accept_patterns": ["parseRoutingDiagnostics", "JSON\\.parse|try", "chosenEndpointId|difficulty"],
        "quick_benchmark": False,
    },
    {
        "case_id": "h14-refactor-extract-helper",
        "category": "code-implementation",
        "difficulty_bucket": "hard",
        "benchmark_eligible": True,
        "capability_targets": ["code_generation", "debugging"],
        "messages": [
            {
                "role": "user",
                "content": (
                    "Refactor this inline logic into `function pickFallbackJudge(gradedId: string, "
                    "judgeId: string, pool: string[]): string | null` and show before/after in two code blocks:\n"
                    "```ts\nconst fallbacks = pool.filter(id => id !== gradedId && id !== judgeId);\n"
                    "return fallbacks[0] ?? null;\n```"
                ),
            }
        ],
        "max_tokens": 360,
        "expected_response": "pickFallbackJudge helper with before/after code blocks",
        "grading_criteria": "Extracts pickFallbackJudge function; shows before and after blocks.",
        "accept_patterns": ["pickFallbackJudge", "before|after|fallback"],
        "quick_benchmark": False,
    },
    {
        "case_id": "h15-max-signal-v3",
        "category": "max-signal",
        "difficulty_bucket": "hard",
        "benchmark_eligible": True,
        "capability_targets": ["tool_calling", "code_generation", "planning", "agentic_workflow"],
        "messages": [
            {
                "role": "user",
                "content": (
                    "Full agent task: (A) bullet milestones with verification, (B) read_file src/router.ts "
                    "and grep_search throughputSla via tool calls, (C) apply_patch adding a sole-candidate "
                    "fallback comment, (D) typescript test snippet asserting fallback behavior. "
                    "Constraints: section headers A-D, tool calls in B and C."
                ),
            }
        ],
        "max_tokens": 512,
        "expected_response": "Sections A-D with milestones, tool calls, patch, and test snippet",
        "grading_criteria": (
            "Has A/B/C/D sections; read_file and grep_search and apply_patch tool calls; includes test snippet."
        ),
        "accept_patterns": ["^A[)|:]|milestone", "read_file|grep_search|apply_patch", "test|expect|assert"],
        "required_tool_call": True,
        "expected_tool_names": ["read_file", "grep_search", "apply_patch"],
        "tools": [READ_FILE_TOOL, GREP_TOOL, APPLY_PATCH_TOOL],
        "quick_benchmark": True,
    },
]

QUICK_CASE_IDS = {
    "h01-implement-two-sum",
    "h02-fix-async-counter",
    "h04-tool-read-router",
    "h05-tool-grep-eligibility",
    "h06-tool-apply-patch",
    "h07-multi-turn-sla-guard",
    "h08-multi-turn-tool-refine",
    "h09-agent-metrics-chain",
    "h10-agent-read-grep-patch",
    "h15-max-signal-v3",
    "p17-tools-multi-hard",
    "x01-max-signal",
}

EASY_QUICK_REMOVE = {
    "e01-yes-no",
    "p02-easy-math",
    "p06-medium-explain",
    "l02-many-constraints",
    "p12-code-patch",
    "c02-ts-generics",
    "p15-tools-read-one",
    "p19-decompose-plan",
    "p24-exact-local",
    "p25-exact-remote",
}


def strengthen_existing(case: dict) -> None:
    case_id = case["case_id"]
    if case_id == "p17-tools-multi-hard":
        case["required_tool_call"] = True
        case["expected_tool_names"] = ["read_file", "apply_patch"]
        case["grading_criteria"] = (
            "Must call read_file and apply_patch; acknowledges schema/test validation steps."
        )
        case["expected_response"] = "read_file and apply_patch tool calls plus validation plan"
    if case_id == "x01-max-signal":
        case["required_tool_call"] = True
        case["expected_tool_names"] = ["read_file", "grep_search", "apply_patch"]
        case["grading_criteria"] = (
            "Structured plan with milestones; read_file, grep_search, apply_patch tool calls; test checklist."
        )
    if case_id == "p15-tools-read-one":
        case["required_tool_call"] = True
        case["expected_tool_names"] = ["read_file"]
    if case_id == "p12-code-patch":
        case["grading_criteria"] = (
            "Must include unified diff with ---/+++ hunks for router.ts and brief refactor rationale."
        )
        case["accept_patterns"] = ["---|\\+\\+\\+|@@", "router", "diff|patch"]


def main() -> None:
    suite = json.loads(SUITE_PATH.read_text(encoding="utf-8"))
    suite["suite_version"] = "3.0"
    suite["description"] = (
        "Capability benchmark v3: concrete code implementation, required tool calls, and multi-step prompts."
    )

    existing_ids = {case["case_id"] for case in suite["cases"]}
    for case in suite["cases"]:
        case["quick_benchmark"] = case["case_id"] in QUICK_CASE_IDS
        if case["case_id"] in EASY_QUICK_REMOVE:
            case["quick_benchmark"] = False
        strengthen_existing(case)

    for case in NEW_CASES:
        if case["case_id"] not in existing_ids:
            suite["cases"].append(case)
            existing_ids.add(case["case_id"])

    quick = [c["case_id"] for c in suite["cases"] if c.get("quick_benchmark")]
    if len(quick) != 12:
        raise SystemExit(f"Expected 12 quick cases, got {len(quick)}: {quick}")

    SUITE_PATH.write_text(json.dumps(suite, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {SUITE_PATH}")
    print(f"total cases: {len(suite['cases'])}")
    print(f"quick cases: {quick}")


if __name__ == "__main__":
    main()
