#!/usr/bin/env python3
"""Probe a single benchmark case against Kimi with scaffold turns."""

from __future__ import annotations

import json
import os
import sys
import urllib.request

BASE = os.environ.get("ROLE_MODEL_BASE_URL", "http://127.0.0.1:8091")
ENDPOINT = "moonshot.personal.kimi-code.global.kimi-k2.6"
CASE_ID = sys.argv[1] if len(sys.argv) > 1 else "h04-tool-read-router"


def post(path: str, body: dict) -> dict:
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": "Bearer role-model-local",
            "Content-Type": "application/json",
            "x-role-model-endpoint-id": ENDPOINT,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> None:
    suite = json.load(
        urllib.request.urlopen(
            urllib.request.Request(
                f"{BASE}/api/role-model/benchmark/suite",
                headers={"Authorization": "Bearer role-model-local"},
            )
        )
    )
    case = next(c for c in suite["cases"] if c["case_id"] == CASE_ID)
    messages = [{"role": "system", "content": "BENCHMARK DELIVERABLE RULES:\n" + json.dumps(case.get("answer_format", {}))}]
    messages.extend(case["messages"])

    print("=== TURN 1 (with tools) ===")
    r1 = post(
        "/v1/chat/completions",
        {
            "model": "moonshot/kimi-k2.6",
            "messages": messages,
            "max_tokens": case.get("max_tokens", 256),
            "tools": case.get("tools"),
        },
    )
    msg = r1["choices"][0]["message"]
    print(json.dumps(msg, indent=2)[:2000])

    messages.append(msg)
    messages.append(
        {
            "role": "user",
            "content": 'Tools received. Reply with ONLY a ```json fence containing {"answer":"..."} — a real short answer, not instructions.',
        }
    )

    print("\n=== TURN 2 (no tools) ===")
    r2 = post(
        "/v1/chat/completions",
        {
            "model": "moonshot/kimi-k2.6",
            "messages": messages,
            "max_tokens": case.get("max_tokens", 256),
        },
    )
    msg2 = r2["choices"][0]["message"]
    print(json.dumps(msg2, indent=2)[:2000])


if __name__ == "__main__":
    main()
