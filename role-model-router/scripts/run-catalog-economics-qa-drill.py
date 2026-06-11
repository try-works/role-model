#!/usr/bin/env python3
"""Tier-2 packaged-runtime drill for run 40 catalog economics."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path

DEFAULT_BASE_URL = "http://127.0.0.1:3456"
DEFAULT_TOKEN = "role-model-local"
DEFAULT_ALIAS = "mixed.local-remote"


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def role_model_router_root() -> Path:
    return Path(__file__).resolve().parents[1]


def run_id_root(run_id: str) -> Path:
    return repo_root() / ".recursive" / "run" / run_id


def wait_for_runtime(base_url: str, timeout_sec: int = 120) -> dict[str, object]:
    deadline = datetime.now(UTC).timestamp() + timeout_sec
    last_error = "unknown"
    while datetime.now(UTC).timestamp() < deadline:
        try:
            with urllib.request.urlopen(f"{base_url.rstrip('/')}/healthz", timeout=5) as resp:
                if resp.status == 200:
                    payload = json.loads(resp.read().decode("utf-8", errors="replace") or "{}")
                    return {"ok": True, "healthz": payload}
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = str(exc)
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
    return {"ok": False, "error": last_error}


def run_command(label: str, command: list[str], *, cwd: Path, log_lines: list[str]) -> int:
    log_lines.append(f"$ {' '.join(command)}")
    completed = subprocess.run(
        command,
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if completed.stdout:
        log_lines.append(completed.stdout.rstrip())
    if completed.stderr:
        log_lines.append(completed.stderr.rstrip())
    log_lines.append(f"[{label}] exit={completed.returncode}")
    return completed.returncode


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-id", default="40-catalog-economics-moonshot-consolidation")
    parser.add_argument("--base-url", default=os.environ.get("ROLE_MODEL_BASE_URL", DEFAULT_BASE_URL))
    parser.add_argument("--token", default=os.environ.get("ROLE_MODEL_TOKEN", DEFAULT_TOKEN))
    parser.add_argument("--alias", default=os.environ.get("ROLE_MODEL_ALIAS", DEFAULT_ALIAS))
    parser.add_argument(
        "--skip-package-sea",
        action="store_true",
        help="Skip runtime:package-sea when runtime is already built and running.",
    )
    parser.add_argument(
        "--skip-downstream-probe",
        action="store_true",
        help="Skip probe-downstream-ingress regression.",
    )
    return parser.parse_args()


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    args = parse_args()
    root = repo_root()
    router_root = role_model_router_root()
    evidence_dir = run_id_root(args.run_id) / "evidence" / "logs"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    log_path = evidence_dir / "phase5-catalog-economics-qa.log"
    log_lines: list[str] = [
        f"# run 40 catalog economics QA drill",
        f"started_at={datetime.now(UTC).isoformat()}",
        f"base_url={args.base_url}",
        f"alias={args.alias}",
    ]

    exit_code = 0

    if not args.skip_package_sea:
        code = run_command(
            "runtime:package-sea",
            ["corepack", "pnpm", "run", "runtime:package-sea"],
            cwd=root,
            log_lines=log_lines,
        )
        if code != 0:
            exit_code = code

    readiness = wait_for_runtime(args.base_url)
    log_lines.append(f"readiness={json.dumps(readiness)}")
    if not readiness.get("ok"):
        log_lines.append(
            "Runtime not reachable on :3456. Launch packaged runtime with operator baseline "
            "(peer lfm2.5-8b-a1b, Kimi moonshot/kimi-k2.6, alias mixed.local-remote) before rerunning.",
        )
        log_path.write_text("\n".join(log_lines) + "\n", encoding="utf-8")
        print("\n".join(log_lines))
        return 1 if exit_code == 0 else exit_code

    summary_resp = urllib.request.urlopen(
        f"{args.base_url.rstrip('/')}/api/role-model/runtime/summary",
        timeout=15,
    )
    log_lines.append(f"runtime_summary={summary_resp.read().decode('utf-8', errors='replace')}")

    catalog_probe = [
        sys.executable,
        str(router_root / "scripts" / "operator-probe-catalog-economics.py"),
        "--base-url",
        args.base_url,
        "--token",
        args.token,
        "--alias",
        args.alias,
    ]
    code = run_command("operator-probe-catalog-economics", catalog_probe, cwd=router_root, log_lines=log_lines)
    if code != 0:
        exit_code = code

    if not args.skip_downstream_probe:
        downstream_probe = [
            sys.executable,
            str(router_root / "scripts" / "probe-downstream-ingress.py"),
        ]
        code = run_command(
            "probe-downstream-ingress",
            downstream_probe,
            cwd=router_root,
            log_lines=log_lines,
        )
        if code != 0:
            exit_code = code

    log_lines.append(f"finished_at={datetime.now(UTC).isoformat()}")
    log_lines.append(f"exit_code={exit_code}")
    log_path.write_text("\n".join(log_lines) + "\n", encoding="utf-8")
    print("\n".join(log_lines))
    print(f"Evidence log: {log_path}")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
