#!/usr/bin/env python3
"""Validate a completed benchmark run against workflow accuracy gates (addendum 09 / BENCHMARK-WORKFLOW.md)."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

BASE = os.environ.get("ROLE_MODEL_BASE_URL", "http://127.0.0.1:8091")
AUTH = "role-model-local"

GATES = {
    "judge_parse_gte75_pct": 0.75,
    "empty_raw_lt20_pct": 0.20,
    "heuristic_fallback_lte25_pct": 0.25,
    "grading_brief_100_pct": 1.0,
    "non_trivial_rationale_gte80_pct": 0.80,
    "compare_12_of_12_quick": 12,
    "progress_60_of_60_quick": 60,
}


def http_json(method: str, path: str) -> tuple[int, Any]:
    req = urllib.request.Request(
        f"{BASE}{path}",
        headers={"Authorization": f"Bearer {AUTH}"},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw) if raw else {"error": exc.reason}
        except json.JSONDecodeError:
            payload = {"error": raw or exc.reason}
        return exc.code, payload


def load_result(input_path: Path) -> dict[str, Any]:
    if input_path.is_file():
        return json.loads(input_path.read_text(encoding="utf-8"))
    run_id = input_path.name if input_path.exists() else str(input_path)
    status, progress = http_json("GET", f"/api/role-model/benchmark/runs/{run_id}")
    if status != 200 or not isinstance(progress, dict):
        raise RuntimeError(f"Failed to load run {run_id}: {status} {progress}")
    if progress.get("status") != "completed":
        raise RuntimeError(
            f"Run {run_id} not completed (status={progress.get('status')}, "
            f"phase={progress.get('runPhase')}, "
            f"steps={progress.get('completedSteps')}/{progress.get('totalSteps')})"
        )
    result = progress.get("result")
    if not isinstance(result, dict):
        raise RuntimeError(f"Run {run_id} missing result payload")
    result["_progress"] = {
        "completedSteps": progress.get("completedSteps"),
        "totalSteps": progress.get("totalSteps"),
        "runPhase": progress.get("runPhase"),
    }
    return result


def iter_case_grades(result: dict[str, Any]) -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = []
    for grade in result.get("endpointGrades") or []:
        if not isinstance(grade, dict):
            continue
        for case in grade.get("caseResults") or []:
            if isinstance(case, dict):
                cases.append(
                    {
                        **case,
                        "endpointId": grade.get("endpointId"),
                        "modelId": grade.get("modelId"),
                        "sourceType": grade.get("sourceType"),
                    }
                )
    return cases


def scan_artifact_attempts(artifact_root: Path) -> dict[str, Any]:
    judge_dir = artifact_root / "judge"
    if not judge_dir.is_dir():
        return {"attempts": 0, "empty_raw": 0, "grading_brief": 0, "compare": 0}

    attempts = 0
    empty_raw = 0
    grading_brief = 0
    compare_count = 0

    for path in judge_dir.rglob("*.json"):
        if "attempt-" in path.name:
            data = json.loads(path.read_text(encoding="utf-8"))
            attempts += 1
            if not str(data.get("rawResponse") or "").strip():
                empty_raw += 1
            if data.get("gradingBrief"):
                grading_brief += 1
        elif path.parent.name == "compare" and path.parent.parent.name == "judge":
            compare_count += 1

    return {
        "attempts": attempts,
        "empty_raw": empty_raw,
        "grading_brief": grading_brief,
        "compare": compare_count,
    }


def compute_metrics(result: dict[str, Any], artifact_root: Path | None) -> dict[str, Any]:
    cases = iter_case_grades(result)
    total = len(cases)
    parse_ok = sum(1 for c in cases if c.get("parseSuccess"))
    heuristic = sum(1 for c in cases if c.get("judgeUnavailable"))
    judge_graded = [c for c in cases if c.get("gradingMethod") == "judge" and c.get("parseSuccess")]
    non_trivial = sum(
        1
        for c in judge_graded
        if c.get("rationale")
        and c["rationale"] not in ("...", "Judge provided score.")
        and len(str(c["rationale"])) > 20
    )

    artifact_stats = (
        scan_artifact_attempts(artifact_root)
        if artifact_root and artifact_root.is_dir()
        else None
    )

    scores_by_model: dict[str, float] = {}
    for grade in result.get("endpointGrades") or []:
        if isinstance(grade, dict) and isinstance(grade.get("overallScore"), (int, float)):
            scores_by_model[str(grade.get("modelId"))] = float(grade["overallScore"])

    progress = result.get("_progress") or {}
    return {
        "case_grades": total,
        "judge_parse_success": f"{parse_ok}/{total}",
        "judge_parse_rate": (parse_ok / total) if total else 0.0,
        "heuristic_fallback": f"{heuristic}/{total}",
        "heuristic_fallback_rate": (heuristic / total) if total else 0.0,
        "non_trivial_rationale": f"{non_trivial}/{len(judge_graded)}",
        "non_trivial_rationale_rate": (non_trivial / len(judge_graded)) if judge_graded else 0.0,
        "artifact_stats": artifact_stats,
        "scores_by_model": scores_by_model,
        "progress": progress,
        "compareArtifactCount": artifact_stats["compare"] if artifact_stats else None,
    }


def evaluate_gates(metrics: dict[str, Any], mode: str = "quick") -> dict[str, str]:
    gates: dict[str, str] = {}

    gates["judge_parse_gte75_pct"] = (
        "PASS" if metrics["judge_parse_rate"] >= GATES["judge_parse_gte75_pct"] else "FAIL"
    )

    empty_rate = 0.0
    stats = metrics.get("artifact_stats")
    if stats and stats["attempts"]:
        empty_rate = stats["empty_raw"] / stats["attempts"]
        gates["empty_raw_lt20_pct"] = (
            "PASS" if empty_rate < GATES["empty_raw_lt20_pct"] else "FAIL"
        )
        gates["grading_brief_100_pct"] = (
            "PASS"
            if stats["grading_brief"] / stats["attempts"] >= GATES["grading_brief_100_pct"]
            else "FAIL"
        )
    else:
        gates["empty_raw_lt20_pct"] = "SKIP"
        gates["grading_brief_100_pct"] = "SKIP"

    gates["heuristic_fallback_lte25_pct"] = (
        "PASS" if metrics["heuristic_fallback_rate"] <= GATES["heuristic_fallback_lte25_pct"] else "FAIL"
    )

    if metrics["judge_parse_rate"] > 0:
        gates["non_trivial_rationale_gte80_pct"] = (
            "PASS"
            if metrics["non_trivial_rationale_rate"] >= GATES["non_trivial_rationale_gte80_pct"]
            else "FAIL"
        )
    else:
        gates["non_trivial_rationale_gte80_pct"] = "SKIP"

    if mode == "quick":
        compare = metrics.get("compareArtifactCount")
        if compare is not None:
            gates["compare_12_of_12"] = (
                "PASS" if compare >= GATES["compare_12_of_12_quick"] else "FAIL"
            )
        else:
            gates["compare_12_of_12"] = "SKIP"
        done = metrics.get("progress", {}).get("completedSteps")
        total = metrics.get("progress", {}).get("totalSteps")
        if done is not None and total is not None:
            gates["progress_60_of_60"] = (
                "PASS"
                if done >= GATES["progress_60_of_60_quick"]
                and total >= GATES["progress_60_of_60_quick"]
                else "FAIL"
            )
        else:
            gates["progress_60_of_60"] = "SKIP"

    return gates


def control_check(scores: dict[str, float]) -> str:
    kimi = None
    lfm = None
    for model_id, score in scores.items():
        if "kimi" in model_id.lower():
            kimi = score
        if "lfm" in model_id.lower():
            lfm = score
    if kimi is None or lfm is None:
        return "UNKNOWN"
    return "HEALTHY" if kimi > lfm else "UNHEALTHY"


def main() -> int:
    if len(sys.argv) < 2:
        print(
            "Usage: validate-benchmark-run.py <run-id|result.json|artifact-root>",
            file=sys.stderr,
        )
        return 1

    arg = Path(sys.argv[1])
    artifact_root: Path | None = None

    if arg.is_dir() and (arg / "result.json").is_file():
        artifact_root = arg
        result = json.loads((arg / "result.json").read_text(encoding="utf-8"))
    elif arg.suffix.lower() == ".json" and arg.is_file():
        result = load_result(arg)
        root = result.get("artifactRoot")
        if isinstance(root, str):
            artifact_root = Path(root)
            run_id = result.get("runId")
            if isinstance(run_id, str) and artifact_root.name != run_id:
                artifact_root = artifact_root / run_id
    else:
        result = load_result(arg)
        root = result.get("artifactRoot")
        if isinstance(root, str):
            artifact_root = Path(root)
            run_id = result.get("runId")
            if isinstance(run_id, str) and artifact_root.name != run_id:
                artifact_root = artifact_root / run_id

    mode = str(result.get("mode") or "quick")
    metrics = compute_metrics(result, artifact_root)
    gates = evaluate_gates(metrics, mode)
    control = control_check(metrics["scores_by_model"])

    failed = [name for name, status in gates.items() if status == "FAIL"]
    verdict = "VALID" if not failed else "INVALID"

    report = {
        "runId": result.get("runId"),
        "mode": mode,
        "workflowVerdict": verdict,
        "controlCheck": control,
        "scores": metrics["scores_by_model"],
        "metrics": metrics,
        "accuracyGates": gates,
        "failedGates": failed,
    }

    print(json.dumps(report, indent=2, ensure_ascii=False))

    out = os.environ.get("VALIDATION_OUT")
    if out:
        Path(out).write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    return 0 if verdict == "VALID" else 1


if __name__ == "__main__":
    raise SystemExit(main())
