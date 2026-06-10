#!/usr/bin/env python3
"""Generate routing capability benchmark suite with expected/ideal responses."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
PROMPTS = Path(__file__).resolve().parent.parent / "prompts" / "routing-strategy-suite.json"
OUT = (
    ROOT
    / "role-model-router"
    / "packages"
    / "bench-routing"
    / "data"
    / "routing-capability-suite.json"
)

CATEGORY_DIFFICULTY = {
    "easy-trivial": "easy",
    "easy-short": "easy",
    "medium-qa": "medium",
    "long-context": "medium",
    "code-burden": "medium",
    "tools-light": "medium",
    "tools-heavy": "hard",
    "decomposition": "medium",
    "max-signal": "hard",
    "exact-model": "easy",
    "cache-probe": "easy",
}

CATEGORY_CAPS = {
    "easy-trivial": ["instruction_following"],
    "easy-short": ["instruction_following", "general_knowledge"],
    "medium-qa": ["explanation", "reasoning"],
    "long-context": ["long_context", "summarization"],
    "code-burden": ["code_generation", "debugging"],
    "tools-light": ["tool_calling"],
    "tools-heavy": ["tool_calling", "agentic_workflow"],
    "decomposition": ["planning", "reasoning"],
    "max-signal": ["tool_calling", "code_generation", "planning"],
    "exact-model": ["instruction_following"],
    "cache-probe": ["instruction_following"],
}

QUICK_IDS = {
    "e01-yes-no",
    "p02-easy-math",
    "p06-medium-explain",
    "p12-code-patch",
    "p15-tools-read-one",
    "p17-tools-multi-hard",
    "p19-decompose-plan",
    "x01-max-signal",
    "l02-many-constraints",
    "c02-ts-generics",
    "p24-exact-local",
    "p25-exact-remote",
}

EXPECTED_BY_ID: dict[str, dict[str, object]] = {
    "e01-yes-no": {
        "expected_response": "yes",
        "grading_criteria": "Must answer yes or no only.",
        "accept_patterns": ["^yes$", "^no$"],
    },
    "e02-single-word": {
        "expected_response": "ok",
        "grading_criteria": "Single word ok.",
        "accept_patterns": ["^ok$"],
    },
    "e03-count": {
        "expected_response": "1, 2, 3",
        "grading_criteria": "Lists integers 1 through 3.",
        "accept_patterns": ["1.*2.*3"],
    },
    "e04-capitalize": {
        "expected_response": "Hello World",
        "grading_criteria": "Capitalizes hello world.",
        "accept_patterns": ["Hello World"],
    },
    "e07-boolean": {
        "expected_response": "true",
        "grading_criteria": "Correct boolean for HTTP port 80.",
        "accept_patterns": ["^true$", "^false$"],
    },
    "e08-format-json": {
        "expected_response": '{"name":"","value":""}',
        "grading_criteria": "Valid JSON with name and value keys only.",
        "accept_patterns": ['"name"', '"value"'],
    },
    "p02-easy-math": {
        "expected_response": "4",
        "grading_criteria": "Numeric answer 4 only.",
        "accept_patterns": ["^4$"],
    },
    "p03-easy-define": {
        "expected_response": "Application Programming Interface",
        "grading_criteria": "Defines API succinctly.",
        "accept_patterns": ["Application Programming Interface", "programming interface"],
    },
    "p04-easy-translate": {
        "expected_response": "Bonjour",
        "grading_criteria": "French translation of good morning.",
        "accept_patterns": ["Bonjour"],
    },
    "p10-long-context": {
        "expected_response": "throughput SLA hard-deny; partial config PUT dropped routing.strategy",
        "grading_criteria": "Names both root causes and merge-preserving fix.",
        "accept_patterns": ["throughput", "routing\\.strategy", "merge"],
    },
    "l01-verbose-incident": {
        "expected_response": "difficulty-based routing selects models by request difficulty within an alias pool",
        "grading_criteria": "One-sentence definition despite long filler context.",
        "accept_patterns": ["difficulty", "routing"],
    },
    "l02-many-constraints": {
        "expected_response": "bullet list with recommendation line",
        "grading_criteria": "Bullet-only, <=6 bullets, mentions local/remote/cache/rubric, no 'however', recommendation line.",
        "accept_patterns": ["local", "remote", "recommend"],
    },
    "p12-code-patch": {
        "expected_response": "unified diff patch for router.ts with refactor explanation",
        "grading_criteria": "Mentions diff/patch and router.ts refactor rationale.",
        "accept_patterns": ["diff", "router", "patch"],
    },
    "p13-code-debug": {
        "expected_response": "inspect eligibility, throughput SLA, allowEndpoints, chosen_endpoint_id",
        "grading_criteria": "Lists eligibility checks for empty chosen_endpoint_id.",
        "accept_patterns": ["eligib", "endpoint", "registry|allow"],
    },
    "p17-tools-multi-hard": {
        "expected_response": "plan to read files, apply patch, validate schema, refactor tests",
        "grading_criteria": "Acknowledges multi-step tool workflow for code edit.",
        "accept_patterns": ["read", "patch", "schema|test"],
    },
    "p24-exact-local": {
        "expected_response": "routed-local",
        "grading_criteria": "Exact text routed-local.",
        "accept_patterns": ["routed-local"],
    },
    "p25-exact-remote": {
        "expected_response": "routed-remote",
        "grading_criteria": "Exact text routed-remote.",
        "accept_patterns": ["routed-remote"],
    },
    "x01-max-signal": {
        "expected_response": "milestone plan, patch summary, test refactor checklist",
        "grading_criteria": "Structured response with plan, patch, and test checklist.",
        "accept_patterns": ["milestone|plan", "patch", "test"],
    },
    "x02-max-context-tools": {
        "expected_response": "analysis of workflow with routing recommendation for hard prompts",
        "grading_criteria": "Addresses incident context and when to route hard prompts remote.",
        "accept_patterns": ["remote", "routing", "patch|schema"],
    },
}


def default_expectation(case: dict) -> dict[str, object]:
    category = case.get("category", "medium-qa")
    user = next((m["content"] for m in case["messages"] if m["role"] == "user"), "")
    if category in {"tools-light", "tools-heavy", "max-signal"}:
        return {
            "expected_response": "Coherent plan or summary addressing the tool-using task.",
            "grading_criteria": "Attempts the requested tool workflow without refusing outright.",
            "accept_patterns": ["read|search|list|patch|tool|plan"],
        }
    if category == "decomposition":
        return {
            "expected_response": "Step-by-step plan with milestones and verification criteria.",
            "grading_criteria": "Provides structured decomposition with phases or milestones.",
            "accept_patterns": ["step|phase|milestone|verif"],
        }
    if category == "code-burden":
        return {
            "expected_response": "Technical analysis referencing code, patch, schema, or tests.",
            "grading_criteria": "Engages with code-edit or debugging request substantively.",
            "accept_patterns": ["code|patch|schema|test|typescript|router"],
        }
    if category in {"medium-qa", "long-context"}:
        return {
            "expected_response": "Accurate explanatory answer to the user question.",
            "grading_criteria": "Answers the question with relevant technical detail.",
            "accept_patterns": [r".{20,}"],
        }
    return {
        "expected_response": "Concise correct answer following instructions.",
        "grading_criteria": f"Follows user instruction: {user[:120]}",
        "accept_patterns": [r".+"],
    }


def main() -> None:
    suite = json.loads(PROMPTS.read_text(encoding="utf-8"))
    cases_out = []
    caps = set()
    for case in suite["cases"]:
        category = case["category"]
        case_id = case["id"]
        meta = EXPECTED_BY_ID.get(case_id, default_expectation(case))
        caps.update(CATEGORY_CAPS.get(category, ["general"]))
        cases_out.append(
            {
                "case_id": case_id,
                "category": category,
                "difficulty_bucket": CATEGORY_DIFFICULTY.get(category, "medium"),
                "benchmark_eligible": category != "cache-probe",
                "capability_targets": CATEGORY_CAPS.get(category, ["general"]),
                "messages": case["messages"],
                "max_tokens": case.get("max_tokens", 64),
                **meta,
                "quick_benchmark": case_id in QUICK_IDS,
                **({"tools": case["tools"]} if case.get("tools") else {}),
            }
        )

    payload = {
        "suite_id": "routing-capability-v2",
        "suite_version": "2.0",
        "description": "Capability benchmark for local and remote models with expected responses and judge grading.",
        "task_type": "routing_capability",
        "capability_targets": sorted(caps),
        "cases": cases_out,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {len(cases_out)} cases to {OUT}")


if __name__ == "__main__":
    main()
