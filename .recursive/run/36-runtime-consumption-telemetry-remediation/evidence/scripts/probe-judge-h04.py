#!/usr/bin/env python3
"""Probe Kimi judge response for h04 deliverable."""

from __future__ import annotations

import json
import os
import urllib.request

BASE = os.environ.get("ROLE_MODEL_BASE_URL", "http://127.0.0.1:8091")
EP = "moonshot.personal.kimi-code.global.kimi-k2.6"
DELIVERABLE = json.dumps(
    {
        "tool_calls": [{"name": "read_file", "arguments": {"path": "src/router.ts"}}],
        "answer": "createRouter",
    },
    indent=2,
)
PROMPT = f"""You are grading a model response for a routing capability benchmark.
Return JSON only with keys: score (number 0 to 1), rationale (string). No markdown fences.
Required API tool calls: read_file.
Actual structured tool calls from API: read_file.
Case: h04-tool-read-router
Grading criteria: Must call read_file with router.ts path; answer references a function name.
Formatted deliverable (grade this only): {DELIVERABLE}"""

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


def call(body: dict) -> dict:
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
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode())


def show(label: str, result: dict) -> None:
    msg = result["choices"][0]["message"]
    print(f"\n=== {label} ===")
    print("content:", repr((msg.get("content") or "")[:800]))
    print("reasoning_content:", repr(str(msg.get("reasoning_content") or "")[:800]))


body_base = {
    "model": "moonshot/kimi-k2.6",
    "messages": [
        {"role": "system", "content": "You grade benchmark responses. Reply with JSON only."},
        {"role": "user", "content": PROMPT},
    ],
    "max_tokens": 512,
    "temperature": 0,
}

show("no response_format", call({**body_base}))
show("with json_schema", call({**body_base, "response_format": JUDGE_RESPONSE_FORMAT}))
