# DECISIONS.md

## Recursive Run Index

### Run `00-baseline`

- Run folder: `/.recursive/run/00-baseline/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `03.5-code-review.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - introduced the first real product baseline for the repo, including canonical protocol schemas, docs, shared packages, deterministic router core, router apps, provider scaffolds, rust placeholders, fixtures, and CI
  - post-closeout audit remediation clarified protocol role/task examples in docs and widened the stable config export to a normalized ACP/MCP/CLI endpoint inventory
- Why:
  - to move the repository from an empty recursive scaffold to a documented, testable, endpoint-centric stable baseline
- How:
  - implemented the pnpm + TypeScript + Rust workspace baseline, used canonical JSON Schema as the source of truth, drove the first executable RED/GREEN loop pragmatically, recorded delegated review, and validated the full schema/build/test/rust/smoke chain
  - after the external-requirements audit, recorded stage-local addenda and refreshed the affected receipts so the run history reflects the stricter `R19` and `R36` interpretation
- What was not done:
  - production-grade daemon hosts, production browser/native runtimes, memory backend, publishing flows, model-pack installers, and judge-service hosting remain out of scope
- Known issues / follow-ups:
  - browser, edge, and native runtime families remain scaffold-grade by design
  - the control-plane docs now treat the `R19`/`R36` remediation as part of the durable baseline, not as an unrecorded post-closeout exception

### Run `01-protocol-routing-obs`

- Run folder: `/.recursive/run/01-protocol-routing-obs/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `03.5-code-review.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - tightened the canonical protocol schemas, fixtures, and directly coupled docs to the stricter run-01 M1-M3 contract
  - added fixture-driven router conformance, canonical compute-preference and strategy aliases, normalized weighted scoring, provider/endpoint policy filters, and deterministic fallback ordering
  - upgraded observed-performance aggregation to deterministic multi-sample semantics with `sample_window`, `sources`, freshness/confidence, failure/error-class rates, and mixed-version rejection
- Why:
  - to move the repo from the initial stable baseline to a stricter audited protocol-routing-observability contract without widening into deferred provider/runtime work
- How:
  - implemented the changes with strict RED/GREEN evidence, delegated Phase 3.5 code review, and a final `schemas:validate` + build + test + smoke validation chain
- What was not done:
  - production-grade daemon/browser/native runtimes, hosted providers, and other deferred run-00 out-of-scope surfaces remain out of scope
- Known issues / follow-ups:
  - unsupported-engine warnings persist under `Node v24`
  - repo-wide Biome formatting drift remains a pre-existing Windows-baseline issue and was intentionally not widened into this run

### Run `02-audit-remediation`

- Run folder: `/.recursive/run/02-audit-remediation/`
- Artifacts:
  - `00-requirements.md`
  - `00-worktree.md`
  - `01-as-is.md`
  - `01.5-root-cause.md`
  - `02-to-be-plan.md`
  - `03-implementation-summary.md`
  - `03.5-code-review.md`
  - `04-test-summary.md`
  - `05-manual-qa.md`
  - `06-decisions-update.md`
  - `07-state-update.md`
  - `08-memory-impact.md`
- What changed:
  - added stable top-level `$id` values to all committed canonical schema files under `/protocol/schemas/`
  - removed schema-id masking from `/packages/schema-tools/src/validate-schemas.ts` and `/packages/conformance/src/schema-test-helpers.ts`
  - repaired the root script command path by switching nested pnpm calls in `/package.json` to `corepack pnpm ...`
- Why:
  - to bring the repository back into conformance with the documented canonical-schema contract and restore the supported root `corepack pnpm run ...` validation path
- How:
  - implemented a strict RED/GREEN loop with a new schema-source regression, reused the failing wrapper-path conformance slice as red evidence, and revalidated via root `schemas:validate`, `test`, and `smoke`
- What was not done:
  - no unrelated protocol, router, provider, runtime, or repo-wide formatting work was widened into this remediation run
- Known issues / follow-ups:
  - unsupported-engine warnings still persist under `Node v24`
  - `packages/protocol-types/src/generated.ts` can show local CRLF-only status churn after generator-backed tests even when there is no semantic content diff
