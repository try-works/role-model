# Tooling gates — local unverified-gap closure (task-120)

Artifact: 0.0.20-636-gc8fdb768 (sha256 60d0c999...), source c8fdb768.
Evidence generated 2026-11-05.

| Gate | Verdict | Evidence |
|---|---|---|
| Linux oxlint native wrapper | ENVIRONMENT-BLOCKED | linux-oxlint-environment-blocked.log |
| Network install oracle | VERIFIED (positive + negative + restore) | network-install-oracle-*.log |
| Live browser parity | VERIFIED (CHROME_PATH + real captures, PASSED) | browser-parity.log, captures/ |

## 1. Linux oxlint native wrapper — ENVIRONMENT-BLOCKED
Only WSL distro is Docker Desktop 3.20 (Alpine/musl), Docker daemon stopped, no glibc distro. Bootstrapped musl Node v24.11.0 and ran the real wrapper; it refuses musl:
`effect-tsgo oxlint: Linux musl is not supported by the packaged Oxlint integration.` (exit 1).
The gnu wrapper must run on ubuntu/glibc CI.

## 2. Network install oracle — VERIFIED
Network reachable (registry.npmjs.org 200, github.com 200).
- Positive: `corepack pnpm install --frozen-lockfile` -> "Lockfile is up to date / Already up to date", EXIT 0.
- Negative: removed `esbuild` from `onlyBuiltDependencies` in pnpm-workspace.yaml, ran `corepack pnpm install --frozen-lockfile --force`; pnpm warned "Ignored build scripts: esbuild", EXIT 0. This proves the policy is the switch.
- Restore: policy restored, `pnpm install --frozen-lockfile --force` EXIT 0, esbuild 0.25.12 resolvable. `git status` shows no pnpm-workspace change.

## 3. Live browser parity — VERIFIED
Chrome present at C:/Program Files/Google/Chrome/Application/chrome.exe. Ran:
`CHROME_PATH=... node --import tsx --input-type=module -e "import { main } from './scripts/runtime/parity-selfcheck.mjs'; await main({evidenceDir: '<this dir>/captures'})"`
Result status PASSED, exit 0; React-vs-React deterministic and equal; React-vs-Foldkit classified different (not forced equal); ignored only favicon 404s; four PNG captures under captures/. Prior committed s294 PNGs were restored untouched.
