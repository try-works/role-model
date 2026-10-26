# S174 Addendum recorded, gate re-verified, per-run state everywhere

## 1. Addendum 01 - the behaviour change is now a document, not a test name

`.recursive/run/115-effect-foldkit-runtime-migration/addenda/01-transaction-ownership-semantics.md` records:

- **two transaction kinds** (`BEGIN IMMEDIATE` for read-then-write, deferred `BEGIN` for read snapshots) and the rule that a deferred site must never be folded into the write variant;
- **the rollback-failure change**: a rollback error no longer replaces the primary outcome, with the consequence (a refusal path that previously could propagate `cannot rollback` now returns its refusal value), why it is the right default, and what is given up;
- **how R23 must be judged**: the inventory counts raw `BEGIN` sites, not units of work; several entries are a module's own owner; "N remaining" is a regression guard, not a progress metric.

## 2. I corrected two unverified claims inside it

My first draft said "no such caller was found in the tree" and gave per-module counts from memory. Both were wrong or unproven:

- counts are now **read from the inventory**: artifact-store 4, background-evidence-scheduler 6, crowdsourced-learning 3, evaluation-core **14**, event-log 1, knowledge-store **5**, knowledge-worker 1, trajectory-signals 1, durable-queue 5, operations-server 3, backfill 1 (44 total, 4 schema sites);
- the caller claim is replaced with what I actually checked: every post-`ROLLBACK` line sampled is `throw error`, a depth decrement now inside a caller `finally`, or an explicit `ROLLBACK; return false` refusal - **evidence for the converted sites, not a proof about every possible caller**.

## 3. Gate re-verified after the script changes

```
PASS health / models / telemetry / controller / learning / replay jobs / evaluation jobs / ui shell    exit=0
sha256=e3181d50...  version=0.0.20-163-g6ed7ece9
```

## 4. The fixed-state-directory defect, now fixed here too

`verify-packaged-candidate.mjs` used `r39-candidate-state` under the temp directory and deleted it first. That cannot collide with a **stale** run but can collide with a **concurrent** one - the same shape the review flagged in `compare-release`. It now uses `mkdtempSync` plus a cleanup on exit; after a run, **0 residual directories**.

## 5. My errors this round

`mkdtempSync` was inserted into code without being added to the import, and my "already imported?" check searched the string I had just inserted into. Fifth time this session. The rule I keep failing to apply: **add the import unconditionally, then assert the identifier resolves** - or better, let the runtime prove it, which is what caught it again (gate exited 1 with `mkdtempSync is not defined`).