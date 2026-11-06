# Phase 00 Baseline Re-Audit — Run 115 (attempt02)

**Audit Execution Mode:** independent read-only worker; no child delegation.
**Subagent Availability:** unavailable by direct instruction (no children/goals).
**Subagent Capability Probe:** `read`/`glob`/`grep` and read-only `pwsh` (`Get-FileHash`, `git rev-parse`, `git status`, `git diff`) all executed successfully under the owner-authorized `danger-full-access`/`never` launch.
**Delegation Decision Basis:** user forbade children; audit performed directly.
**Audit Inputs Provided:** bundle `phase00-baseline-bundle-attempt02.md`; `00-requirements.md`; full `source-proposal.md`; `phase00-source-reconciliation.md`; paired `phase00-baseline-round01/02.json`; `phase00-dispatch-policy.md`; `phase00-sequencing-repair.md`; both preserved `phase00-worktree-prework.md`; `phase00-baseline-review-attempt01.md`; `phase00-requirements-review-attempt01.md`; `phase00-repair-disposition-attempt01.md`; `current-paired-identities.json`; `actual-request-routes.json`; `current-release-workflows.log`; private `current-source-seal.log`; all `round02-*.log` tails; both `vendor/*/VENDORED.json`; `RECURSIVE.md` §§250-330, 2280-2360; `delegated-verification-and-refresh.md`. No addenda exist.

## 1. Independent verification performed

| Check | Result |
|---|---|
| Public `HEAD` / tree / `origin/dev` | `f0d50fab083e3fe8daf2474cd9fb08b51066c8e1` / `b3d5cf91435faad39d11a0dc1d65f54d8668cc2e` / same |
| Private `HEAD` / tree / `origin/dev` | `16021cc5f87f60f2d01338a29adf0002da5e8327` / `18a0e994ed3330293c8bb61931dbf44834172f41` / same |
| Branch, both roots | `recursive/115-effect-foldkit-runtime-migration` |
| `00-requirements.md` SHA-256, both roots | `833440a5ef525ef9846a3852f66452be438c084ddc521eb130b19b6b2060bce3` — matches bundle |
| `source-proposal.md` SHA-256, both roots | `870fa27fbc2ebe277c633ba539073037a2b330ac411c61b661804e7779be534c` — matches bundle and requirements:6 |
| `git diff --name-only HEAD`, both roots | empty |
| `git status --porcelain`, both roots | only `?? .recursive/run/115-effect-foldkit-runtime-migration/` |
| Vendor manifests, both roots | effect `4.0.1`/`460272d30457f4697d8b8c52cad41caccbcace08`, digest `0d0028aa7de72ff9e6a8e39f4bc4232640bd1111b30aaa3440d0c53116a49749`; effect-mq `v0.7.0`/`5fea694188ee33c132bed27e1f97c40533276511`, digest `aa7cae59104a2472ea5127488641643eca5498b5a4955d362b4ff37c5b76f655` |
| Logged counts | UI 79/752, core 21/194, protocol 3/18, registry 5/16, host 5/46, lint 0 FAIL/11 WARN; release-workflows 57/57; private source-seal 1/1 — all match receipts |
| Cwd/cache handling | root-cwd SQLite 1/140 correctly characterised as invocation/registry-path failure; package-cwd 140/140; cached pnpm run explicitly not fresh-build evidence |
| Phase sequencing | only `00-requirements.md` active; no canonical `00-worktree.md`; prework preserved; lint WARN only — matches `RECURSIVE.md:2296-2312` |
| No overclaim | no whole-workspace/host/private/package/browser/live certification; no product implementation; E1/E2 not invented |

## 2. Attempt01 baseline findings disposition

1. **BLOCKER (verification not run)** — **RESOLVED.** Hashes, commits, trees, branch refs, status and tracked diff independently verified in both roots.
2. **MEDIUM (receipt-only claims)** — **PARTIALLY RESOLVED.** `current-release-workflows.log` (57/57) and private `current-source-seal.log` (1/1) now exist. The `round02` vendor `--verify` row still records only digests, with no command/stdout log, and remains public-only — capture it before lock.
3. **LOW (private log discoverability)** — **RESOLVED.** Private log exists at `<private-run>/evidence/logs/current-source-seal.log`; `round02` receipt still should say "private root" explicitly.
4. **LOW (stale control-plane state)** — **PARTIALLY RESOLVED.** Requirements TODO now checks the route; dispatch policy model subsection is updated to `deepseek-official/deepseek-flash`. Still stale: `phase00-dispatch-policy.md:5` and `CONTROLLER-HANDOFF.md:23` say `R1-R38` (now R1-R39); handoff lines 40/69/86 still say "resolve exact team route"/`deepseek`; both prework drafts still carry the old route TODO.
5. **LOW (route-evidence gap)** — **PARTIALLY RESOLVED.** `actual-request-routes.json` now records provider/model/config for the three sessions, and the session IDs match `worker-preflight.jsonl`, `requirements-review-attempt01.jsonl` and `baseline-review-attempt01.jsonl`. The raw Zstd header decode is still not stored as a verifiable artifact; only the derived JSON summary exists. R2's "when normal tool policy is disabled" (`00-requirements.md:42`) remains imprecise — the verified overlay disables nested delegation/config-editor, not all tools.
6. **LOW (formatting)** — **RESOLVED for the artifact** (`00-requirements.md:6` now uses `SHA-256: <hash>`). Bundle/dispatch still use compact `SHA256870fa...`; normalise for machine extraction.

## 3. Baseline findings

No false baseline count, fabricated Coverage/Approval PASS, invented E1/E2 decision, unsafe setup, phase drift, or product implementation claim was found. Both roots are clean at the declared commit/tree; only run-scoped untracked artifacts exist. The baseline evidence is credible and the attempt01 verification blockers are resolved. Remaining baseline items are LOW: the vendor `--verify` command/log, the raw route-decode artifact, and stale `R1-R38`/old-route references outside the active artifact.

## 4. Remaining source omissions (content)

Evaluated against current R1-R39; most attempt01 F1-F13 repairs are present, including R2 route evidence, R16 classification, R27 no-dedup, R33 ledger/negative checks, R34/R35 deferral detail, R37 runtime-ui-only retirement, and R39 maintained commands.

**Material (block Coverage: PASS):**

| ID | R | Source | Missing obligation |
|---|---|---|---|
| C1 | R16 (`:150-154`), R38 (`:317-321`) | `source-proposal.md:642-649` | R/D/C release-isolation launch protocol: isolated copy/staging preserving original bytes; unused loopback ports; independent config/state/log/lock roots; owned managed process; verify release launch overrides; stop lane if isolation cannot be demonstrated; no release-manifest edit; no 3456/3457/3458; no shared writable SQLite between R/D/C; no old binary against candidate-migrated state; independent seeding; consistent WAL backups, not naive live copies; no operator-secret replay. |
| C2 | R29 (`:247-250`) | `source-proposal.md:1151-1156` | Capture-drain fault matrix: stale leases, interrupted maintenance, failed ack/late completion, corruption/decryption, restore, partial publication; committed-append masking of original lookup/prune failure; preserve recovery receipts; explicit durable outbox/idempotent protocol for any new cross-store guarantee. |
| C3 | R20 (`:182-184`), R21 (`:188-192`) | `source-proposal.md:1073-1089` | Bounded record/byte/ingress/formatting/TTL/query limits; one reporting owner at request/job/lifecycle edge; compile target ErrorReporter/Cause APIs; hostile/cyclic serializer tests; OTLP tracer/logger/metrics as separate optional sinks with bounded flush/outage, no collector admission, low-cardinality labels and existing GenAI attributes; never trust forwarded owner headers or wildcard CORS; no telemetry contamination; injected-defect test; keep existing observability/store-degradation pages intact. |
| C4 | R26 (`:224-227`) | `source-proposal.md:1115-1123` | Exact operations retry `250/1000/2500/5000ms` plus distinct typed idempotent aggregate timeout; span the asynchronous operation, not only Promise creation; token streams cannot share the lossy refresh coalescing buffer; lossless downstream backpressure. |
| C5 | R32 (`:269-272`) | `source-proposal.md:1176-1179` | Bounded pagination; missing-versus-unavailable joins; live/probe/evaluation classification; codec/externalization limits; partial startup releases the child. |
| C6 | R31 (`:262-265`) | `source-proposal.md:1168-1174` | No-egress sandbox process-tree/time/output/workspace limits; versioned profile publication; late-ack checks; do not create a second learner. |
| C7 | no R (R24 `:211-213` generic only) | `source-proposal.md:1246-1251` | Schema-change protocol: versioned idempotent migration; copied-fixture preflight; N/N-1 reader/build matrix; source/channel/key backup manifest; rollback retirement window; compatible reader or approved forward repair/export; consistent snapshots; no global WAL switch; no shared R/D/C writable state; no old binary against new schema. |

**Minor residuals (not standalone lock blockers, but Phase 1 must not treat as complete):** R24 off-thread/driver SEA/caller/serialization proof (`:1094-1097`); R19 "no giant all-monolith split prerequisite" vs current "no monolith exemption" (`:1068`); R12 injectable `RuntimeEventSourceFactory`, single Refresh Subscription, token-vs-refresh buffer (`:374-388`); R37 Effect-pin rollback requiring a matching wrapper graph (`:843-846`); R2 "normal tool policy is disabled" phrasing; R6 payload enumeration/excludes-not-applied and ordered escape hatches (`:222-264`); R4 per-consumer export-diff ledger (`:164-165`).

## 5. Prerequisite gaps vs content defects

**Prerequisites (correctly open, not defects):** E1/E2 owner disposition (`R34`/`R35`, `00-requirements.md:286-296,342`); no canonical `00-worktree.md` (workflow sequence, prework is factual); independent lossless source inventory not complete (TODO `:15`); no Phase 1/2/3 or product verification; R/D/C isolation baseline not yet executed; the artifact still needs the lock-time Audit/Requirement Completion Status/Subagent Contribution Verification sections.

**Content defects:** C1-C7 above. They are independent of E1/E2 and can be repaired now.

## 6. Verdicts

- **Baseline verification:** PASS — attempt01 hash/git blockers resolved; counts substantiated; no false baseline facts or unsafe setup.
- **Requirements content:** FAIL — C1-C7 remain unrepresented; the heading map is not lossless clause coverage.
- **Lock-readiness:** NOT READY — content omissions plus E1/E2 owner disposition plus the open lossless-inventory/audit-section prerequisites. E1/E2 alone would prevent lock even if C1-C7 were repaired; conversely C1-C7 do not depend on the owner choice.

**Audit: FAIL** — scope: Phase 00 DRAFT, independent read-only re-audit of the paired baseline evidence and R1-R39 requirements coverage against the full `source-proposal.md` at verified hashes; baseline facts PASS, requirements content FAIL, lock not ready.
