#!/usr/bin/env python3
"""Operator probe for catalog economics on a live role-model runtime."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

DEFAULT_BASE_URL = "http://127.0.0.1:3456"
DEFAULT_TOKEN = "role-model-local"
DEFAULT_ALIAS = "mixed.local-remote"
LOCAL_MODEL = "lfm2.5-8b-a1b"
KIMI_MODEL = "moonshot/kimi-k2.6"
DEFAULT_REQUEST_ID = "req-operator-catalog-economics-probe-001"


class ProbeFailure(RuntimeError):
    pass


def request_json(
    base_url: str,
    path: str,
    *,
    method: str = "GET",
    body: dict[str, Any] | None = None,
    token: str,
    timeout: int = 60,
    extra_headers: dict[str, str] | None = None,
) -> Any:
    payload = None if body is None else json.dumps(body).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)
    req = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        data=payload,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise ProbeFailure(f"{method} {path} failed with HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise ProbeFailure(f"{method} {path} failed: {exc}") from exc


def assert_providers(base_url: str, token: str) -> dict[str, Any]:
    providers = request_json(base_url, "/api/role-model/providers", token=token)
    if not isinstance(providers, list):
        raise ProbeFailure("Providers response was not a list.")

    moonshot = [entry for entry in providers if entry.get("providerId") == "moonshot"]
    moonshotai = [entry for entry in providers if entry.get("providerId") == "moonshotai"]
    if len(moonshot) < 1:
        raise ProbeFailure("Expected operator provider moonshot in provider list.")
    if len(moonshotai) != 0:
        raise ProbeFailure("Expected moonshotai to be hidden from provider list.")

    return {
        "moonshotCount": len(moonshot),
        "moonshotaiCount": len(moonshotai),
    }


def assert_cost_routing(
    base_url: str,
    token: str,
    *,
    alias: str,
    request_id: str,
) -> dict[str, Any]:
    completion = request_json(
        base_url,
        "/v1/chat/completions",
        method="POST",
        token=token,
        timeout=90,
        extra_headers={"x-request-id": request_id},
        body={
            "model": alias,
            "messages": [{"role": "user", "content": "hello"}],
            "max_tokens": 64,
        },
    )
    if not isinstance(completion, dict):
        raise ProbeFailure("Chat completion response was not JSON object.")

    observation = request_json(
        base_url,
        f"/api/role-model/requests/{urllib.parse.quote(request_id, safe='')}",
        token=token,
        timeout=30,
    )
    if not isinstance(observation, dict):
        raise ProbeFailure("Request observation response was not JSON object.")

    routing = observation.get("routingDiagnostics")
    if not isinstance(routing, dict):
        raise ProbeFailure("Request observation missing routingDiagnostics.")

    difficulty = routing.get("difficultyRouting")
    if not isinstance(difficulty, dict) or difficulty.get("strategy") != "cost":
        raise ProbeFailure(
            f"Expected difficultyRouting.strategy cost, received {difficulty!r}.",
        )

    economics = routing.get("catalogEconomics")
    if not isinstance(economics, dict):
        raise ProbeFailure("Request observation missing routingDiagnostics.catalogEconomics.")

    execution = observation.get("execution")
    target = execution.get("target") if isinstance(execution, dict) else None
    normalized = execution.get("normalized") if isinstance(execution, dict) else None
    vendor_metadata = (
        normalized.get("vendorMetadata") if isinstance(normalized, dict) else None
    )
    usage_event = execution.get("usageEvent") if isinstance(execution, dict) else None
    selected_model = None
    selected_endpoint = observation.get("endpointId")
    if isinstance(target, dict):
        selected_model = target.get("modelId")
        selected_endpoint = target.get("endpointId") or selected_endpoint
    if not selected_model and isinstance(usage_event, dict):
        selected_model = usage_event.get("model_id")
        selected_endpoint = usage_event.get("endpoint_id") or selected_endpoint
    if not selected_model and isinstance(vendor_metadata, dict):
        selected_model = vendor_metadata.get("resolvedModelId")
    if not selected_model and isinstance(selected_endpoint, str) and ".local." in selected_endpoint:
        selected_model = selected_endpoint.rsplit(".local.", 1)[-1]

    local_selected = (
        selected_model == LOCAL_MODEL
        or (isinstance(selected_endpoint, str) and LOCAL_MODEL in selected_endpoint)
        or economics.get("tokenEconomicsSource") == "local-free"
    )
    if not local_selected:
        raise ProbeFailure(
            f"Expected local peer {LOCAL_MODEL} to win cost routing; "
            f"selected model={selected_model!r} endpoint={selected_endpoint!r}.",
        )

    if economics.get("tokenEconomicsSource") != "local-free":
        raise ProbeFailure(
            "Expected catalogEconomics.tokenEconomicsSource local-free for chosen local peer.",
        )

    return {
        "requestId": request_id,
        "selectedModelId": selected_model,
        "selectedEndpointId": selected_endpoint,
        "difficultyStrategy": difficulty.get("strategy"),
        "catalogEconomics": economics,
        "completionModel": completion.get("model"),
    }


def assert_telemetry_cost_not_used_for_estimate(observation_economics: dict[str, Any]) -> None:
    source = observation_economics.get("tokenEconomicsSource")
    if source not in {"local-free", "catalog", "unknown"}:
        raise ProbeFailure(
            f"Unexpected catalogEconomics.tokenEconomicsSource {source!r}.",
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=os.environ.get("ROLE_MODEL_BASE_URL", DEFAULT_BASE_URL))
    parser.add_argument("--token", default=os.environ.get("ROLE_MODEL_TOKEN", DEFAULT_TOKEN))
    parser.add_argument("--alias", default=os.environ.get("ROLE_MODEL_ALIAS", DEFAULT_ALIAS))
    parser.add_argument("--request-id", default=DEFAULT_REQUEST_ID)
    return parser.parse_args()


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    args = parse_args()
    summary: dict[str, Any] = {
        "baseUrl": args.base_url,
        "alias": args.alias,
        "requestId": args.request_id,
    }

    try:
        health = request_json(args.base_url, "/healthz", token=args.token, timeout=15)
        summary["healthz"] = health
        summary["providers"] = assert_providers(args.base_url, args.token)
        routing = assert_cost_routing(
            args.base_url,
            args.token,
            alias=args.alias,
            request_id=args.request_id,
        )
        summary["routing"] = routing
        assert_telemetry_cost_not_used_for_estimate(routing["catalogEconomics"])
        summary["status"] = "PASS"
        print(json.dumps(summary, indent=2))
        return 0
    except ProbeFailure as exc:
        summary["status"] = "FAIL"
        summary["error"] = str(exc)
        print(json.dumps(summary, indent=2), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
