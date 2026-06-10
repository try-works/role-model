#!/usr/bin/env python3
"""Probe role-model downstream OpenAI ingress for bridge-level failures."""

from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any

BASE_URL = "http://127.0.0.1:3456"
TOKEN = "role-model-local"
ALIAS = "mixed.local-remote"
DIRECT_MODEL = "moonshot/kimi-k2.6"
TIMEOUT_SEC = 90

TOOL_DEF = {
    "type": "function",
    "function": {
        "name": "web_search",
        "description": "Search the web",
        "parameters": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
        },
    },
}


@dataclass
class Case:
    id: str
    path: str
    body: dict[str, Any]
    timeout: int = 30


def tool_turn_history(*, tool_content: Any = "NET: 185.42", omit_assistant_content: bool = False) -> list[dict[str, Any]]:
    assistant: dict[str, Any] = {
        "role": "assistant",
        "tool_calls": [
            {
                "id": "call_1",
                "type": "function",
                "function": {"name": "web_search", "arguments": "{}"},
            }
        ],
    }
    if not omit_assistant_content:
        assistant["content"] = None
    tool: dict[str, Any] = {"role": "tool", "tool_call_id": "call_1"}
    if tool_content is not None:
        tool["content"] = tool_content
    return [
        {"role": "user", "content": "Check Cloudflare stock"},
        assistant,
        tool,
    ]


CASES: list[Case] = [
    Case("A1", "/v1/chat/completions", {"model": ALIAS, "messages": [{"role": "user", "content": "Say hello in one word."}]}),
    Case("A2", "/v1/chat/completions", {"model": ALIAS, "messages": [{"role": "user", "content": "Search for Cloudflare stock price."}], "tools": [TOOL_DEF]}, timeout=60),
    Case("A3", "/v1/chat/completions", {"model": ALIAS, "stream": True, "messages": [{"role": "user", "content": "Say hi."}]}, timeout=60),
    Case("A4", "/v1/chat/completions", {"model": ALIAS, "stream": True, "messages": [{"role": "user", "content": "Use web search for NET stock."}], "tools": [TOOL_DEF]}, timeout=90),
    Case("A5", "/v1/chat/completions", {"model": DIRECT_MODEL, "messages": [{"role": "user", "content": "Say hello in one word."}]}),
    Case("B1", "/v1/chat/completions", {"model": ALIAS, "messages": tool_turn_history(), "tools": [TOOL_DEF]}),
    Case("B2", "/v1/chat/completions", {"model": ALIAS, "messages": tool_turn_history(omit_assistant_content=True), "tools": [TOOL_DEF]}),
    Case("B3", "/v1/chat/completions", {
        "model": ALIAS,
        "messages": [
            {"role": "user", "content": "Check stock"},
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [{"id": "call_1", "type": "function", "function": {"name": "web_search", "arguments": "{}"}}],
            },
            {"role": "tool", "tool_call_id": "call_1", "content": "NET: 185"},
        ],
        "tools": [TOOL_DEF],
    }, timeout=90),
    Case("B4", "/v1/chat/completions", {"model": ALIAS, "messages": tool_turn_history(tool_content=None), "tools": [TOOL_DEF]}),
    Case("B5", "/v1/chat/completions", {"model": ALIAS, "messages": tool_turn_history(tool_content=None)[:-1] + [{"role": "tool", "tool_call_id": "call_1"}], "tools": [TOOL_DEF]}),
    Case("B6", "/v1/chat/completions", {
        "model": ALIAS,
        "messages": [
            {"role": "user", "content": "Compare two stocks"},
            {"role": "assistant", "content": None, "tool_calls": [{"id": "c1", "type": "function", "function": {"name": "web_search", "arguments": '{"query":"NET"}'}}]},
            {"role": "tool", "tool_call_id": "c1", "content": "NET 185"},
            {"role": "assistant", "content": None, "tool_calls": [{"id": "c2", "type": "function", "function": {"name": "web_search", "arguments": '{"query":"CF"}'}}]},
            {"role": "tool", "tool_call_id": "c2", "content": "CF 320"},
        ],
        "tools": [TOOL_DEF],
    }),
    Case("B7", "/v1/chat/completions", {
        "model": ALIAS,
        "messages": [
            {"role": "user", "content": "Compare"},
            {
                "role": "assistant",
                "content": None,
                "tool_calls": [
                    {"id": "c1", "type": "function", "function": {"name": "web_search", "arguments": '{"query":"A"}'}},
                    {"id": "c2", "type": "function", "function": {"name": "web_search", "arguments": '{"query":"B"}'}},
                ],
            },
            {"role": "tool", "tool_call_id": "c1", "content": "A"},
            {"role": "tool", "tool_call_id": "c2", "content": "B"},
        ],
        "tools": [TOOL_DEF],
    }),
    Case("B8", "/v1/chat/completions", {"model": ALIAS, "messages": [{"role": "user", "content": "Search NET stock"}], "tools": [TOOL_DEF]}, timeout=90),
    Case("C1", "/v1/chat/completions", {"model": ALIAS, "messages": [{"role": "user", "content": [{"type": "text", "text": "Hello from array content"}]}]}, timeout=60),
    Case("C2", "/v1/chat/completions", {
        "model": ALIAS,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": "Describe"},
                {"type": "image_url", "image_url": {"url": "https://example.com/x.png"}},
            ],
        }],
    }, timeout=60),
    Case("C3", "/v1/chat/completions", {
        "model": ALIAS,
        "messages": [
            {"role": "user", "content": "Search"},
            {
                "role": "assistant",
                "content": [{"type": "text", "text": ""}],
                "tool_calls": [{"id": "c1", "type": "function", "function": {"name": "web_search", "arguments": "{}"}}],
            },
            {"role": "tool", "tool_call_id": "c1", "content": "ok"},
        ],
        "tools": [TOOL_DEF],
    }, timeout=90),
    Case("C4", "/v1/chat/completions", {"model": ALIAS, "messages": [{"role": "user", "content": []}]}, timeout=60),
    Case("D1", "/v1/chat/completions", {"model": ALIAS, "messages": [{"role": "system", "content": None}, {"role": "user", "content": "Hi"}]}),
    Case("D2", "/v1/chat/completions", {"model": ALIAS, "messages": [{"role": "developer", "content": "Be brief"}, {"role": "user", "content": "Hi"}]}, timeout=60),
    Case("D3", "/v1/chat/completions", {"model": ALIAS, "messages": [{"role": "assistant", "content": "Prior context"}, {"role": "user", "content": "Continue"}]}, timeout=60),
    Case("D4", "/v1/chat/completions", {
        "model": ALIAS,
        "messages": [
            {"role": "user", "content": "Search"},
            {"role": "assistant", "content": None, "tool_calls": [{"id": "c1", "type": "function", "function": {"name": "web_search", "arguments": "{}"}}]},
            {"role": "tool", "tool_call_id": "c1", "name": "web_search", "content": "result"},
        ],
        "tools": [TOOL_DEF],
    }),
    Case("E1", "/v1/responses", {"model": ALIAS, "input": "Say hello"}, timeout=60),
    Case("E2", "/v1/responses", {"model": ALIAS, "input": [{"role": "user", "content": "Say hello"}]}, timeout=60),
    Case("E3", "/v1/responses", {"model": ALIAS, "input": tool_turn_history()}),
    Case("E4", "/v1/responses", {"model": ALIAS, "input": [{"role": "user", "content": [{"type": "text", "text": "hello"}]}]}),
    Case("E5", "/v1/responses", {
        "model": ALIAS,
        "input": tool_turn_history(),
        "tools": [{"type": "function", "name": "web_search", "description": "search", "parameters": {"type": "object", "properties": {}}}],
    }),
    Case("F1", "/v1/chat/completions", {"messages": [{"role": "user", "content": "Hi"}]}),
    Case("F2", "/v1/chat/completions", {"model": ALIAS}),
    Case("F3", "/v1/chat/completions", {"model": ALIAS, "messages": []}, timeout=60),
    Case("F4", "/v1/chat/completions", {"model": ALIAS, "messages": [{"role": "user", "content": "Hi"}], "tools": [{"type": "function"}]}),
    Case("F5", "/v1/chat/completions", {"model": ALIAS, "messages": [{"role": "user", "content": "Hi"}], "max_tokens": 32, "temperature": 0}, timeout=60),
    Case("F6", "/v1/chat/completions", {"model": "does-not-exist", "messages": [{"role": "user", "content": "Hi"}]}),
    Case("G3", "/v1/chat/completions", {"model": ALIAS, "stream": True, "messages": tool_turn_history(), "tools": [TOOL_DEF]}, timeout=90),
]


def verdict(http: int, snippet: str) -> str:
    if http == 400 and "Cannot read properties of null (reading 'length')" in snippet:
        return "BRIDGE_CRASH"
    if http == 400 and "Cannot read properties of undefined (reading 'length')" in snippet:
        return "BRIDGE_CRASH"
    if http == 400 and "responses input messages must include string" in snippet:
        return "BRIDGE_VALIDATION"
    if http == 400 and "chat-completions request must include" in snippet:
        return "BRIDGE_VALIDATION"
    if http == 400 and "Only OpenAI function tools" in snippet:
        return "BRIDGE_VALIDATION"
    if http == 400 and "No registry endpoints" in snippet:
        return "ROUTING_ERROR"
    if 200 <= http < 300:
        return "PASS"
    if http >= 400:
        return f"ERROR_{http}"
    return "UNKNOWN"


def run_case(case: Case) -> tuple[int, str]:
    data = json.dumps(case.body).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}{case.path}",
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {TOKEN}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=case.timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return resp.status, body
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return exc.code, body
    except Exception as exc:  # noqa: BLE001
        return 0, str(exc)


def snippet(text: str, limit: int = 180) -> str:
    one_line = re.sub(r"\s+", " ", text).strip()
    return one_line if len(one_line) <= limit else one_line[: limit - 3] + "..."


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    # prerequisite
    try:
        with urllib.request.urlopen(f"{BASE_URL}/v1/models", timeout=10) as resp:
            if resp.status != 200:
                print("Router prerequisite failed", file=sys.stderr)
                return 1
    except Exception as exc:  # noqa: BLE001
        print(f"Router not reachable: {exc}", file=sys.stderr)
        return 1

    print("ID\tHTTP\tVERDICT\tSNIPPET")
    results: list[tuple[str, int, str, str]] = []
    for case in CASES:
        http, body = run_case(case)
        snip = snippet(body)
        v = verdict(http, snip)
        results.append((case.id, http, v, snip))
        print(f"{case.id}\t{http}\t{v}\t{snip}")

    # G1 sequence note: A2 then B1 — B1 already covers step 2; annotate
    print("\n# G1 sequence: A2 (first turn) + B1 (follow-up) — see A2 and B1 rows")

    crashes = [r for r in results if r[2] == "BRIDGE_CRASH"]
    print(f"\n# Summary: {len(results)} cases, {len(crashes)} BRIDGE_CRASH, {sum(1 for r in results if r[2]=='PASS')} PASS")
    if crashes:
        print("# BRIDGE_CRASH IDs:", ", ".join(r[0] for r in crashes))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
