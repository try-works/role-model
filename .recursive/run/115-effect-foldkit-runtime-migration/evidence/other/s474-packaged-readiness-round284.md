# S474 — packaged operator readiness progress (round 284)

Public b9841f94 + private b8733789 (S469 healthz wiring 0670a14a + S472 flush timeout b8733789, both independently reviewed bounded PASS).

Proven: packaged exe (release-final, sidecar 92960f89a1e5e97ebf3444c12c68cb453f267dc23c4ca6d8d4995a2d63126cf1) serves healthy /healthz (ready, decision_only) and UI, but ALL operator routes still answer 503 {"error":"runtime_initializing","status":"pending"} for >2.5min. Fixed private sidecar standalone prints {"type":"ready"} and its healthz derives from real worker readiness (S469) - verified directly. S472 bounded contribution flush (5s cap) also landed and reviewed. Therefore remaining stall is inside the PUBLIC host packaged bootstrap before markReady (cli.ts:12141 QA runtime.invoke no per-call timeout, or another awaited step in awaitCliExtensionRuntime/beforeReady); S471 trace identified candidates; flush timeout was necessary but not sufficient.

Next: add the S471-proposed bounded diagnostics (host beforeReady boundaries + QA invoke timing) as a temporary build, reproduce, and identify the exact unresolved await; fix with strict RED + independent review; rebuild and re-probe until operator routes return 200. Do NOT claim packaged R/D/C parity until the packaged operator surface is live end-to-end. Real-client R15/R16-live/R39 remain approval-gated and unrun.
