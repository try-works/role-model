#!/usr/bin/env python3
"""Run quick dual-model routing capability benchmark against live runtime."""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE_URL = os.environ.get("ROLE_MODEL_BASE_URL", "http://127.0.0.1:8091")
TOKEN = os.environ.get("ROLE_MODEL_TOKEN", "role-model-local")
POLL_SECONDS = 2
STALL_SECONDS = 60 * 60

LFM_ENDPOINT = (
    "local-openai-compatible.personal."
    "ca2ba73f-38f6-4feb-97b1-12b903bd81a4.local.lfm2.5-1.2b-instruct"
)
KIMI_ENDPOINT = "moonshot.personal.kimi-code.global.kimi-k2.6"


def request_json(method: str, path: str, body: dict | None = None) -> object:
    url = f"{BASE_URL}{path}"
    data = None
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/json",
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def wait_for_progress(run_id: str) -> dict:
    started = time.time()
    last_completed = -1
    while True:
        progress = request_json("GET", f"/api/role-model/benchmark/runs/{run_id}")
        status = progress.get("status")
        completed = int(progress.get("completedSteps", 0))
        total = int(progress.get("totalSteps", 0))
        run_phase = progress.get("runPhase")
        current_case = progress.get("currentCaseId")
        current_endpoint = progress.get("currentEndpointId")
        if completed != last_completed:
            print(
                f"[{run_id}] status={status} phase={run_phase} "
                f"steps={completed}/{total} case={current_case} endpoint={current_endpoint}",
                flush=True,
            )
            last_completed = completed
        if status in {"completed", "failed"}:
            return progress
        if time.time() - started > STALL_SECONDS:
            raise TimeoutError(f"benchmark run {run_id} stalled after {STALL_SECONDS}s")
        time.sleep(POLL_SECONDS)


def summarize_result(progress: dict) -> dict:
    result = progress.get("result") or {}
    endpoint_grades = result.get("endpointGrades") or []
    summary = {
        "runId": result.get("runId") or progress.get("runId"),
        "artifactRoot": result.get("artifactRoot"),
        "judgeEndpointId": result.get("judgeEndpointId"),
        "startedAtMs": result.get("startedAtMs"),
        "completedAtMs": result.get("completedAtMs"),
        "endpoints": [],
        "parseFailureCases": [],
    }
    for grade in endpoint_grades:
        endpoint_id = grade.get("endpointId")
        overall = float(grade.get("overallScore") or 0)
        case_results = grade.get("caseResults") or []
        passing = [item for item in case_results if float(item.get("score") or 0) > 0]
        parse_failures = [
            item.get("caseId")
            for item in case_results
            if "parse failed" in str(item.get("rationale", "")).lower()
            or "failed to return parseable json" in str(item.get("rationale", "")).lower()
        ]
        summary["endpoints"].append(
            {
                "endpointId": endpoint_id,
                "modelId": grade.get("modelId"),
                "overallScore": overall,
                "passingCases": len(passing),
                "totalCases": len(case_results),
                "parseFailureCount": len(parse_failures),
                "parseFailureCases": parse_failures,
                "caseResults": case_results,
            }
        )
        summary["parseFailureCases"].extend(
            [{"endpointId": endpoint_id, "caseId": case_id} for case_id in parse_failures]
        )
    return summary


def main() -> int:
    print(f"Using runtime {BASE_URL}", flush=True)
    health = request_json("GET", "/api/role-model/runtime/summary")
    print(f"Runtime endpoints active: {health.get('lifecycleSummary', {}).get('active')}", flush=True)

    start = request_json(
        "POST",
        "/api/role-model/benchmark/runs",
        {
            "mode": "quick",
            "endpointIds": [LFM_ENDPOINT, KIMI_ENDPOINT],
            "judgeEndpointId": KIMI_ENDPOINT,
            "useJudge": True,
        },
    )
    run_id = start["runId"]
    print(f"Started benchmark run {run_id}", flush=True)
    progress = wait_for_progress(run_id)
    if progress.get("status") != "completed":
        print(json.dumps(progress, indent=2), file=sys.stderr)
        raise SystemExit(f"benchmark failed: {progress.get('errorMessage')}")

    summary = summarize_result(progress)
    out_dir = Path(__file__).resolve().parents[1] / "logs"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "benchmark-judge-remediation-result.json"
    out_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out_path}", flush=True)
    print(json.dumps(summary, indent=2), flush=True)

    lfm = next((e for e in summary["endpoints"] if e["endpointId"] == LFM_ENDPOINT), None)
    kimi = next((e for e in summary["endpoints"] if e["endpointId"] == KIMI_ENDPOINT), None)
    if lfm and kimi:
        print(
            f"Overall: LFM={lfm['overallScore']:.2%} Kimi={kimi['overallScore']:.2%} "
            f"parseFailures LFM={lfm['parseFailureCount']} Kimi={kimi['parseFailureCount']}",
            flush=True,
        )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except urllib.error.URLError as error:
        print(f"HTTP error: {error}", file=sys.stderr)
        raise SystemExit(1)
