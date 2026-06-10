#!/usr/bin/env python3
"""Probe judge failures for h05-sized deliverable."""

from __future__ import annotations

import json
import os
import urllib.request
from pathlib import Path

BASE = os.environ.get("ROLE_MODEL_BASE_URL", "http://127.0.0.1:8091")
EP = "moonshot.personal.kimi-code.global.kimi-k2.6"
ARTIFACT = Path(
    r"C:\Users\erikb\AppData\Local\Role Model Runtime\state\runtime-host-bridge\memory\benchmark-runs\311ebcd7-8217-4bfe-9124-a82a02664b46\responses\moonshot.personal.kimi-code.global.kimi-k2.6\h05-tool-grep-eligibility.json"
)
deliverable = json.loads(ARTIFACT.read_text(encoding="utf-8"))["actualResponse"]

PROMPT = f"""You are grading a model response for a routing capability benchmark.
Return JSON only with keys: score (number 0 to 1), rationale (string). No markdown fences.
Required API tool calls: grep_search.
Actual structured tool calls from API: grep_search.
Case: h05-tool-grep-eligibility
Grading criteria: Must call grep_search with evaluateEligibility pattern; summary mentions eligibility checks.
Formatted deliverable (grade this only): {deliverable}"""

JUDGE_RESPONSE_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "benchmark_grade",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {"score": {"type": "number"}, "rationale": {"type": "string"}},
            "required": ["score", "rationale"],
        },
    },
}


def call(max_tokens: int) -> dict:
    body = {
        "model": "moonshot/kimi-k2.6",
        "messages": [
            {"role": "system", "content": "You grade benchmark responses. Reply with JSON only."},
            {"role": "user", "content": PROMPT},
        ],
        "max_tokens": max_tokens,
        "temperature": 0,
        "response_format": JUDGE_RESPONSE_FORMAT,
    }
    req = urllib.request.Request(
        f"{BASE}/v1/chat/completions",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": "Bearer role-model-local",
            "Content-Type": "application/json",
            "x-role-model-endpoint-id": EP,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        return json.loads(resp.read().decode())


for tokens in (128, 512, 1024):
    result = call(tokens)
    choice = result["choices"][0]
    msg = choice["message"]
    print(f"\nmax_tokens={tokens} finish={choice.get('finish_reason')}")
    print("content:", repr((msg.get("content") or "")[:400]))
    print("reasoning:", repr(str(msg.get("reasoning_content") or "")[:200]))
    usage = result.get("usage", {})
    print("usage:", usage)
