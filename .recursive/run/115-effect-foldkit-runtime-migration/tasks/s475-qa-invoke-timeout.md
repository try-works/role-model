# S475 — bound packaged QA startup invoke

Status: pending
TDD Mode: strict
Public patch basis b9841f94; private b8733789; paired00-worktree authority unchanged.

Evidence (S471/S474 + 14min probe): packaged operator routes stay 503 runtime_initializing pending FOREVER (never failed). The sidecar ready line is received and assertProductionExtensionRuntimeReady passes; the hang is cli.ts:12141 `await runtime.invoke(...)` inside the qaExtensions loop in beforeReady - extension-host invoke has no per-call timeout (packages/extension-host/index.mjs:221-274, resolves only on a worker frame :170-181), so a non-responding QA worker blocks beforeReady and the host DAG readiness forever without failing.

Repair (PUBLIC src/cli.ts qaExtensions loop ONLY + test): bound each QA startup invoke with a finite per-call deadline; on timeout reject with a message naming the extension id/capability so bootstrap fails visibly (markFailed path) instead of pending forever. Prefer an existing host timeout knob/contract (sidecar operations bound or invoke timeout) - do not invent a parallel policy. Keep successful path byte-identical; no runtime/vendor/private changes; no provider calls/ports.

Strict RED first: a test (cli-startup-readiness style, injected never-settling invoke) shows beforeReady hangs/never rejects today; with the bound it rejects within the deadline with the extension id in the message. Then minimal wiring; existing cli-startup-readiness/watchdog tests stay green; UI tsc + host tsc + affected suites + nonempty anti_slop_lint abs scans; freeze hashes; independent review by a different member; no commit. No whole R27/R36 claim.
