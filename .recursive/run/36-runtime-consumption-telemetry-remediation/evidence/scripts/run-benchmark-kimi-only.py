#!/usr/bin/env python3
"""Run quick benchmark for Kimi endpoint only."""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BASE = os.environ.get("ROLE_MODEL_BASE_URL", "http://127.0.0.1:8091")
AUTH = "role-model-local"
RUN_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = RUN_ROOT / "logs"
OUT_DIR.mkdir(parents=True, exist_ok=True)
PROGRESS_LOG = OUT_DIR / "benchmark-kimi-only-progress.jsonl"
RESULT_PATH = OUT_DIR / "benchmark-kimi-only-result.json"
REMOTE_ID = "moonshot.personal.kimi-code.global.kimi-k2.6"


def http_json(method: str, path: str, body: dict | None = None) -> tuple[int, object]:
    url = f"{BASE}{path}"
    headers = {"Authorization": f"Bearer {AUTH}"}
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
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


def main() -> int:
    status, start = http_json(
        "POST",
        "/api/role-model/benchmark/runs",
        {
            "mode": "quick",
            "judgeEndpointId": REMOTE_ID,
            "endpointIds": [REMOTE_ID],
            "useJudge": True,
        },
    )
    if status not in (200, 202) or not isinstance(start, dict):
        print(f"Failed to start benchmark: {status} {start}", file=sys.stderr)
        return 1
    run_id = start.get("runId")
    if not isinstance(run_id, str):
        print(f"Missing runId: {start}", file=sys.stderr)
        return 1
    print(f"Started Kimi-only benchmark {run_id}")

    for attempt in range(1, 901):
        time.sleep(10)
        status, progress = http_json("GET", f"/api/role-model/benchmark/runs/{run_id}")
        if status != 200 or not isinstance(progress, dict):
            print(f"[{attempt}] poll failed {status}")
            continue
        entry = {"ts": datetime.now(timezone.utc).isoformat(), "attempt": attempt, "progress": progress}
        with PROGRESS_LOG.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry, ensure_ascii=False) + "\n")
        total = progress.get("totalSteps") or 0
        done = progress.get("completedSteps") or 0
        pct = round(100 * done / total) if total else 0
        print(
            f"[{attempt}] {progress.get('status')} {progress.get('runPhase')} "
            f"{pct}% {done}/{total} {progress.get('currentCaseId') or '-'}"
        )
        if progress.get("status") == "completed":
            result = progress.get("result")
            RESULT_PATH.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            print(f"Completed. Wrote {RESULT_PATH}")
            if isinstance(result, dict):
                for grade in result.get("endpointGrades") or []:
                    overall = grade.get("overallScore")
                    model = grade.get("modelId")
                    print(f"  {model}: {round((overall or 0) * 100)}%")
            return 0
        if progress.get("status") == "failed":
            print(f"Failed: {progress.get('errorMessage')}", file=sys.stderr)
            return 1
    print("Timed out", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
