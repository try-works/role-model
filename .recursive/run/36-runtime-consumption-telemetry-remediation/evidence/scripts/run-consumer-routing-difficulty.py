#!/usr/bin/env python3
"""Consumer E2E routing test: difficulty strategy on mixed.local-remote (approved plan)."""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

BASE = os.environ.get("ROLE_MODEL_BASE_URL", "http://127.0.0.1:3456")
AUTH = "role-model-local"
SUITE_PATH = Path(__file__).resolve().parent.parent / "prompts" / "routing-strategy-suite.json"
OUT_DIR = Path(__file__).resolve().parent.parent / "logs"
OUT_JSON = OUT_DIR / "consumer-routing-difficulty-results.json"
OUT_JSONL = OUT_DIR / "consumer-routing-difficulty.jsonl"
OUT_MD = OUT_DIR / "consumer-routing-difficulty-report.md"

# Approved 14-scenario plan (difficulty only)
SCENARIO_IDS = [
    "e01-yes-no",
    "e03-count",
    "p02-easy-math",
    "p06-medium-explain",
    "l01-verbose-incident",
    "p12-code-patch",
    "c02-ts-generics",
    "p17-tools-multi-hard",
    "t02-tools-triple",
    "x01-max-signal",
    "p24-exact-local",
    "p25-exact-remote",
    "p26-cache-easy-a",
    "p27-cache-easy-b",
    "p30-cache-invalidate",
]

EXPECTATIONS: dict[str, dict[str, Any]] = {
    "e01-yes-no": {"difficulty": "easy", "endpoint": "local"},
    "e03-count": {"difficulty": "easy", "endpoint": "local"},
    "p02-easy-math": {"difficulty": "easy", "endpoint": "local"},
    "p06-medium-explain": {"difficulty": {"easy", "medium"}, "endpoint": {"local", "remote"}},
    "l01-verbose-incident": {"difficulty": {"easy", "medium"}, "endpoint": {"local", "remote"}},
    "p12-code-patch": {"difficulty": {"medium", "hard"}, "endpoint": {"local", "remote"}},
    "c02-ts-generics": {"difficulty": {"medium", "hard"}, "endpoint": {"local", "remote"}},
    "p17-tools-multi-hard": {"difficulty": "hard", "endpoint": "remote"},
    "t02-tools-triple": {"difficulty": "hard", "endpoint": "remote"},
    "x01-max-signal": {"difficulty": "hard", "endpoint": "remote"},
    "p24-exact-local": {"difficulty": None, "endpoint": "local"},
    "p25-exact-remote": {"difficulty": None, "endpoint": "remote"},
    "p26-cache-easy-a": {"difficulty": "easy", "endpoint": "local", "cache_hit": False},
    "p27-cache-easy-b": {"difficulty": "easy", "endpoint": "local", "cache_hit": True},
    "p30-cache-invalidate": {
        "difficulty": {"medium", "hard"},
        "endpoint": {"local", "remote"},
        "cache_invalidated": True,
    },
}


def http_json(
    method: str,
    path: str,
    body: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
) -> tuple[int, Any]:
    url = f"{BASE}{path}"
    req_headers = {"Authorization": f"Bearer {AUTH}"}
    if headers:
        req_headers.update(headers)
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        req_headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw) if raw else {"error": exc.reason}
        except json.JSONDecodeError:
            payload = {"error": raw or exc.reason}
        return exc.code, payload


def endpoint_short(endpoint_id: str | None) -> str:
    if not endpoint_id:
        return "unknown"
    low = endpoint_id.lower()
    if "kimi" in low or "moonshot" in low:
        return "remote"
    if "local" in low or "lfm" in low:
        return "local"
    return endpoint_id.split(".")[-1][:24]


def pick_routing_fields(obs: dict[str, Any] | None) -> dict[str, Any]:
    if not obs:
        return {}
    rd = obs.get("routingDiagnostics") or {}
    dr = rd.get("difficultyRouting") or {}
    return {
        "routingMode": rd.get("routingMode"),
        "aliasResolution": rd.get("aliasResolution"),
        "difficulty": dr.get("difficulty"),
        "difficultyStrategy": dr.get("strategy"),
        "cacheHit": dr.get("cacheHit"),
        "cacheInvalidated": dr.get("cacheInvalidated"),
        "cacheInvalidationReasons": dr.get("cacheInvalidationReasons"),
        "fallbackApplied": dr.get("fallbackApplied"),
        "excludedEndpointIds": dr.get("excludedEndpointIds"),
        "rubricSignals": dr.get("rubricSignals"),
    }


def extract_content(response: dict[str, Any] | None) -> str:
    if not response or "error" in response:
        return str((response or {}).get("error", ""))
    choices = response.get("choices") or []
    if not choices:
        return ""
    msg = choices[0].get("message") or {}
    return (msg.get("content") or msg.get("reasoning_content") or "").strip()


def check_expectation(case_id: str, row: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    exp = EXPECTATIONS.get(case_id, {})
    if row["http_status"] != 200:
        issues.append(f"HTTP {row['http_status']}")
        return issues
    if not row.get("request_found"):
        issues.append("request detail missing")
    if not row.get("decision_found"):
        issues.append("router decision missing")

    routing = row.get("routing") or {}
    diff = routing.get("difficulty")
    ep = row.get("endpoint_short")
    exp_diff = exp.get("difficulty")
    if exp_diff is not None:
        if isinstance(exp_diff, set):
            if diff not in exp_diff:
                issues.append(f"difficulty={diff} not in {sorted(exp_diff)}")
        elif diff != exp_diff:
            issues.append(f"expected difficulty={exp_diff}, got {diff}")

    exp_ep = exp.get("endpoint")
    if exp_ep is not None:
        if isinstance(exp_ep, set):
            if ep not in exp_ep:
                issues.append(f"endpoint={ep} not in {sorted(exp_ep)}")
        elif ep != exp_ep:
            issues.append(f"expected endpoint={exp_ep}, got {ep}")

    if "cache_hit" in exp:
        hit = routing.get("cacheHit")
        if hit is not exp["cache_hit"]:
            issues.append(f"expected cacheHit={exp['cache_hit']}, got {hit}")

    if exp.get("cache_invalidated"):
        if routing.get("cacheInvalidated") is not True:
            issues.append(f"expected cacheInvalidated=true, got {routing.get('cacheInvalidated')}")

    return issues


def run_scenario(case: dict[str, Any], index: int, total: int) -> dict[str, Any]:
    case_id = case["id"]
    request_id = f"consumer-{case_id}"
    model = case.get("model") or "mixed.local-remote"
    body: dict[str, Any] = {
        "model": model,
        "messages": case["messages"],
    }
    if case.get("tools"):
        body["tools"] = case["tools"]

    headers = {
        "x-role-model-request-id": request_id,
        "x-role-model-routing-mode": "difficulty",
    }

    started = time.perf_counter()
    status, response = http_json("POST", "/v1/chat/completions", body, headers)
    elapsed_ms = int((time.perf_counter() - started) * 1000)
    time.sleep(0.15)

    _, obs = http_json("GET", f"/api/role-model/requests/{request_id}")
    routing = pick_routing_fields(obs if isinstance(obs, dict) else None)
    endpoint_id = obs.get("endpointId") if isinstance(obs, dict) else None

    _, decisions = http_json("GET", "/api/role-model/router/decisions")
    decision = None
    if isinstance(decisions, list):
        decision = next((d for d in decisions if d.get("requestId") == request_id), None)

    row = {
        "index": index,
        "case_id": case_id,
        "category": case.get("category"),
        "request_id": request_id,
        "model": model,
        "http_status": status,
        "latency_ms": elapsed_ms,
        "response_model": response.get("model") if isinstance(response, dict) else None,
        "content_preview": extract_content(response if isinstance(response, dict) else None)[:200],
        "content_length": len(extract_content(response if isinstance(response, dict) else None)),
        "endpoint_id": endpoint_id or (decision or {}).get("selectedEndpointId"),
        "endpoint_short": endpoint_short(endpoint_id or (decision or {}).get("selectedEndpointId")),
        "source_type": (decision or {}).get("sourceType") or obs.get("sourceType") if isinstance(obs, dict) else None,
        "strategy_label": (decision or {}).get("strategyLabel"),
        "routing": routing,
        "request_found": isinstance(obs, dict) and bool(obs.get("requestId") or obs.get("status")),
        "decision_found": decision is not None,
        "issues": [],
    }
    row["issues"] = check_expectation(case_id, row)
    row["pass"] = len(row["issues"]) == 0
    return row


def snapshot_preconditions() -> dict[str, Any]:
    pre: dict[str, Any] = {"base_url": BASE, "captured_at": datetime.now(timezone.utc).isoformat()}
    for key, path in [
        ("health", "/healthz"),
        ("version", "/api/version"),
        ("endpoints", "/api/role-model/endpoints"),
        ("runtime_summary", "/api/role-model/runtime/summary"),
        ("telemetry_summary", "/api/role-model/telemetry/summary"),
        ("router_config", "/api/role-model/router/config"),
    ]:
        status, payload = http_json("GET", path)
        pre[key] = {"status": status, "body": payload}
    return pre


def main() -> int:
    suite = json.loads(SUITE_PATH.read_text(encoding="utf-8"))
    case_by_id = {c["id"]: c for c in suite["cases"]}
    missing = [cid for cid in SCENARIO_IDS if cid not in case_by_id]
    if missing:
        print(f"Missing suite cases: {missing}", file=sys.stderr)
        return 1

    cases = [case_by_id[cid] for cid in SCENARIO_IDS]
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Phase 0: preconditions @ {BASE}")
    pre = snapshot_preconditions()
    ep_count = len(pre.get("endpoints", {}).get("body") or [])
    print(f"  endpoints={ep_count} health={pre['health']['status']}")

    results: list[dict[str, Any]] = []
    print(f"Phase 1-5: {len(cases)} consumer scenarios (difficulty)...")
    for index, case in enumerate(cases, start=1):
        row = run_scenario(case, index, len(cases))
        results.append(row)
        dr = row.get("routing") or {}
        status_flag = "PASS" if row["pass"] else "FAIL"
        print(
            f"[{index:02d}/{len(cases)}] {status_flag} {row['case_id']}: "
            f"HTTP {row['http_status']} ep={row.get('endpoint_short')} "
            f"diff={dr.get('difficulty')} cache={dr.get('cacheHit')} "
            f"{row.get('latency_ms')}ms"
            + (f" issues={row['issues']}" if row["issues"] else "")
        )

    _, telemetry = http_json("GET", "/api/role-model/telemetry/requests?limit=50")
    request_ids = {r["request_id"] for r in results}
    telemetry_hits = 0
    if isinstance(telemetry, list):
        telemetry_hits = sum(
            1 for t in telemetry if isinstance(t, dict) and t.get("requestId") in request_ids
        )

    passed = sum(1 for r in results if r["pass"])
    failed = [r for r in results if not r["pass"]]
    hard_rows = [r for r in results if r["case_id"] in {"p17-tools-multi-hard", "t02-tools-triple", "x01-max-signal"}]
    hard_remote = sum(1 for r in hard_rows if r.get("endpoint_short") == "remote" and r["http_status"] == 200)
    easy_rows = [r for r in results if r["case_id"] in {"e01-yes-no", "e03-count", "p02-easy-math"}]
    easy_local = sum(1 for r in easy_rows if r.get("endpoint_short") == "local" and r["http_status"] == 200)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "base_url": BASE,
        "routing_mode": "difficulty",
        "model": "mixed.local-remote",
        "preconditions": pre,
        "scenario_count": len(results),
        "passed": passed,
        "failed_count": len(failed),
        "telemetry_request_hits": telemetry_hits,
        "hard_remote_ratio": f"{hard_remote}/{len(hard_rows)}",
        "easy_local_ratio": f"{easy_local}/{len(easy_rows)}",
        "results": results,
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    with OUT_JSONL.open("w", encoding="utf-8") as handle:
        for row in results:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")

    lines = [
        "# Consumer Routing Test — Difficulty Strategy",
        "",
        f"- Generated: {payload['generated_at']}",
        f"- Runtime: `{BASE}`",
        f"- Model: `mixed.local-remote` (exact-model cases use pinned ids)",
        f"- Scenarios: {len(results)} | **Passed: {passed}** | Failed: {len(failed)}",
        f"- Telemetry rows matched: {telemetry_hits}/{len(results)}",
        f"- Hard→remote: {hard_remote}/{len(hard_rows)} | Easy→local: {easy_local}/{len(easy_rows)}",
        "",
        "## Results",
        "",
        "| # | Scenario | HTTP | Endpoint | Difficulty | Cache | Latency | Status |",
        "| ---: | --- | ---: | --- | --- | --- | ---: | --- |",
    ]
    for row in results:
        dr = row.get("routing") or {}
        lines.append(
            f"| {row['index']} | `{row['case_id']}` | {row['http_status']} | "
            f"{row.get('endpoint_short')} | {dr.get('difficulty')} | {dr.get('cacheHit')} | "
            f"{row.get('latency_ms')}ms | {'PASS' if row['pass'] else 'FAIL'} |"
        )

    if failed:
        lines.extend(["", "## Failures / mismatches", ""])
        for row in failed:
            lines.append(f"- **{row['case_id']}**: {', '.join(row['issues'])}")

    lines.extend(["", "## Preconditions", "", f"```json\n{json.dumps(pre, indent=2)[:4000]}\n```"])
    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"\nWrote {OUT_JSON}")
    print(f"Wrote {OUT_MD}")
    print(f"Summary: {passed}/{len(results)} passed, telemetry {telemetry_hits}/{len(results)}")
    return 0 if len(failed) == 0 and telemetry_hits >= len(results) * 0.8 else 1


if __name__ == "__main__":
    raise SystemExit(main())
