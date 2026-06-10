#!/usr/bin/env python3
"""Compare benchmark run manifests and results."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path.home() / "AppData/Local/Role Model Runtime/state/runtime-host-bridge/memory/benchmark-runs"

RUNS = {
    "broken (pre-07)": "2f5ab51b-23cc-4284-a9c5-0e067be7a125",
    "good baseline": "2be17a26-f4c4-47a8-9bcd-36eb87fb80ac",
    "new (post-07)": "aa8cd041-e8d7-4ae5-b7f4-83352455b8ab",
}


def analyze(run_id: str) -> dict:
    run = ROOT / run_id
    manifest = json.loads((run / "manifest.json").read_text(encoding="utf-8"))
    result = json.loads((run / "result.json").read_text(encoding="utf-8"))
    judge_dir = run / "judge"
    files = list(judge_dir.rglob("*.json")) if judge_dir.exists() else []
    empty = 0
    parse_ok = 0
    for path in files:
        record = json.loads(path.read_text(encoding="utf-8"))
        if not str(record.get("rawResponse") or "").strip():
            empty += 1
        if record.get("parseSuccess"):
            parse_ok += 1
    grades: dict[str, dict] = {}
    for grade in result["endpointGrades"]:
        model = grade["modelId"]
        case_results = grade["caseResults"]
        judge = sum(1 for case in case_results if case.get("gradingMethod") == "judge")
        heuristic = sum(1 for case in case_results if case.get("gradingMethod") == "heuristic")
        grades[model] = {
            "overall": round(grade["overallScore"] * 100, 1),
            "scores": [case["score"] for case in case_results],
            "judge": judge,
            "heuristic": heuristic,
        }
    return {
        "manifest": manifest,
        "judge_files": len(files),
        "empty_raw": empty,
        "parse_ok": parse_ok,
        "grades": grades,
    }


def main() -> None:
    for label, run_id in RUNS.items():
        data = analyze(run_id)
        manifest = data["manifest"]
        print(f"{label} ({run_id[:8]})")
        print(
            f"  compare={manifest.get('compareArtifactCount')} "
            f"judge_artifacts={data['judge_files']} "
            f"empty_raw={data['empty_raw']} "
            f"parse_ok={data['parse_ok']}"
        )
        for model, grade in data["grades"].items():
            short = "LFM" if "lfm" in model else "Kimi"
            extra = ""
            if grade.get("judge") or grade.get("heuristic"):
                extra = f" judge={grade['judge']} heuristic={grade['heuristic']}"
            print(f"  {short}: {grade['overall']}%{extra}")
            print(f"    scores={grade['scores']}")
        print()


if __name__ == "__main__":
    main()
