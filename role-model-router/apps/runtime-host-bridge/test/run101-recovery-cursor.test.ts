import { expect, test } from "vitest";

import {
  MAX_HANDOFF_RECOVERY_CHECKS_PER_SWEEP,
  MAX_HANDOFF_RECOVERY_LIST_PAGE,
  coerceDurableReplayJobRecord,
  nextHandoffRecoveryCursor,
  replayJobScopeFromProbe,
  resolveDurableReplayJobScope,
  terminalRecoveryListingValue,
  unwrapCapabilityPayload,
} from "../src/supervised-replay-handoff-recovery.js";

/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S35 (measured live on `:3457`): a capability
 * answer is an envelope, and reading it directly made a *missing* evaluation look present (an envelope is
 * truthy) and a *present* job record look absent (an envelope has no `jobId`). Both directions are pinned
 * here against the shape the live root actually returns.
 */
test("run101 S35 a capability answer is read as its payload", () => {
  const job = { jobId: "job-a", state: "failed" };
  expect(
    unwrapCapabilityPayload({
      value: job,
      businessOutput: { value: job },
      durableLocator: { extensionId: "evaluation-core", requestId: "evaluation-get-job:x" },
    }),
  ).toEqual(job);
  expect(
    unwrapCapabilityPayload({
      value: null,
      businessOutput: { value: null },
      durableLocator: { extensionId: "evaluation-core" },
    }),
    "a lookup of a job that does not exist answers null, not an envelope",
  ).toBeNull();
  expect(unwrapCapabilityPayload({ value: [1, 2] })).toEqual([1, 2]);
  expect(unwrapCapabilityPayload(job)).toEqual(job);
});

/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S36: the same live root answered every candidate
 * correctly and the sweep still recovered nothing, because the record it needs sits inside envelope layers.
 * The coercion is bounded and only ever returns a record with a job identity, so an answer that is *not* a job
 * still reads as absent - which is the missing case the pass exists for.
 */
test("run101 S36 the job record is coerced out of whatever envelope answered", () => {
  const job = { jobId: "job-a", state: "failed", candidatePackages: [] };
  expect(coerceDurableReplayJobRecord({ value: job })).toEqual(job);
  expect(coerceDurableReplayJobRecord({ value: { businessOutput: { value: job } } })).toEqual(job);
  expect(coerceDurableReplayJobRecord({ value: null, businessOutput: { value: null } })).toBeNull();
  expect(coerceDurableReplayJobRecord(null)).toBeNull();
  expect(
    coerceDurableReplayJobRecord({ value: { value: { value: { value: { value: job } } } } }),
  ).toBeNull();
});

/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S28 (measured live, build `0.0.14-…-gd97a6862`):
 *
 *   `[run101] replay job scope: probe failed envelope identity or capability is incomplete or incompatible`
 *   `[run101] recovery page came back empty: scope=standalone-runtime-stage channel=stage cursor=start`
 *
 * The runtime host validates a capability envelope before the extension's binding check ever runs, so a
 * scope-less discovery listing cannot be sent at all. The scope is nonetheless deterministic: the private
 * boundary stamps captures (and the replay jobs built from them) with
 * `runtime:${sha256(JSON.stringify({channel, stateRoot: resolvedSidecarStateRoot})).slice(0,32)}`, and the host
 * knows both inputs. The value below is the scope the live root's 1 700 jobs actually carry, so this test fails
 * the moment the derivation drifts from the boundary that stamps the work.
 */
test("run101 S28 the durable job scope is derived the way the boundary stamps it", () => {
  const scope = resolveDurableReplayJobScope({
    channel: "stage",
    runtimeStateRoot: "E:\\role-model-temp\\rc-run\\state",
    scopeId: "standalone-runtime-stage",
  });
  expect(scope).toBe("runtime:714f4a87dd3c44d1bc93ed741841c722");
  expect(
    resolveDurableReplayJobScope({
      channel: "development",
      runtimeStateRoot: "E:\\role-model-temp\\rc-run\\state",
      scopeId: "standalone-runtime-stage",
    }),
    "the channel is part of the identity",
  ).not.toBe(scope);
});

/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S27 (measured live: the terminalization log
 * filled with `replay persisted job scope binding mismatch` while the recovery listing returned nothing).
 *
 * Durable replay jobs are scoped to the *capture* scope they were created under - on the real-traffic root
 * `runtime:714f4a87…`, not the operator scope the runtime is configured with - and the producer only learns
 * that scope from a capture it dispatches. A freshly restarted runtime therefore had no scope at all, bound
 * its listings to the operator scope, and `assertJobSummaryBinding` skipped every job: the page came back
 * empty, so 512 terminal jobs (262 of them missing their evaluation) were invisible. The scope is
 * recoverable from the store itself, and the probe must read it without binding to a scope it is trying to
 * discover.
 */
test("run101 S27 the job scope is discovered from the store when the producer has not seen a capture", () => {
  expect(
    replayJobScopeFromProbe({
      value: [{ jobId: "job-a", scope: "runtime:714f4a87dd3c44d1bc93ed741841c722" }],
    }),
  ).toBe("runtime:714f4a87dd3c44d1bc93ed741841c722");
  expect(replayJobScopeFromProbe([{ jobId: "job-a", scope: "tenant:alpha" }])).toBe("tenant:alpha");
  expect(replayJobScopeFromProbe({ value: [] })).toBeNull();
  expect(replayJobScopeFromProbe({ value: [{ jobId: "job-a" }] })).toBeNull();
  expect(replayJobScopeFromProbe(null)).toBeNull();
  expect(replayJobScopeFromProbe({ value: [{ scope: 42 }] })).toBeNull();
  expect(
    replayJobScopeFromProbe({ value: [{ scope: "x".repeat(600) }] }),
    "a scope that cannot be a durable identity is not adopted",
  ).toBeNull();
});

/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S24 (measured on the real-traffic root).
 *
 * The terminal recovery pass lists a *deterministic* page of durable jobs that carry an `evaluationJobId`
 * (`state: failed|timed_out`, `hasEvaluationJobId: true`) and checks each one against Evaluation Core, so it
 * only records the handoffs whose evaluation was never created. That page had no cursor: every sweep asked
 * for the same three jobs, every one of them already had its evaluation, and the pass counted three
 * `skipped` for ever. On the live root that set holds 512 jobs and 262 of them need recovery, so the pass was
 * inert by construction - which is also why addendum 05's S17 renewal shows **zero** uses across 441 resume
 * entries, 309 of them `abandoned`: the entries it renews are never re-seen.
 *
 * The cursor is the repair, and the two bounds below are the contract that keeps it inside the extension
 * protocol's 16 KiB inline frame while the scan actually advances.
 */

test("run101 S24 a full page advances the cursor to the last job the sweep examined", () => {
  const page = Array.from({ length: MAX_HANDOFF_RECOVERY_LIST_PAGE }, (_, index) => ({
    jobId: `job-${String(index).padStart(4, "0")}`,
    updatedAtMs: 1_000 - index,
  }));
  expect(
    nextHandoffRecoveryCursor({
      currentCursor: null,
      pageEntries: page,
      examinedCount: 5,
      pageSize: MAX_HANDOFF_RECOVERY_LIST_PAGE,
    }),
    "the next sweep resumes at the job after the last one examined",
  ).toEqual({ jobId: "job-0004", updatedAtMs: 996 });
});

test("run101 S24 reaching the end of the set wraps so the next pass re-checks new work", () => {
  expect(
    nextHandoffRecoveryCursor({
      currentCursor: { jobId: "job-0002", updatedAtMs: 998 },
      pageEntries: [
        { jobId: "job-a", updatedAtMs: 100 },
        { jobId: "job-b", updatedAtMs: 99 },
      ],
      examinedCount: 2,
      pageSize: MAX_HANDOFF_RECOVERY_LIST_PAGE,
    }),
    "a short page is the end of the set: the next pass starts from the beginning",
  ).toBeNull();
});

test("run101 S24 a sweep that examines nothing keeps its position", () => {
  const page = Array.from({ length: MAX_HANDOFF_RECOVERY_LIST_PAGE }, (_, index) => ({
    jobId: `job-${index}`,
    updatedAtMs: 500 - index,
  }));
  expect(
    nextHandoffRecoveryCursor({
      currentCursor: { jobId: "job-0009", updatedAtMs: 491 },
      pageEntries: page,
      examinedCount: 0,
      pageSize: MAX_HANDOFF_RECOVERY_LIST_PAGE,
    }),
  ).toEqual({ jobId: "job-0009", updatedAtMs: 491 });
});

test("run101 S24 the page stays inside the extension protocol's inline frame", () => {
  /**
   * Measured on the live store (addendum 06 census): the `jobSummaries()` projection (identity, state,
   * channel, scope, epoch, evaluation id, branch count, timestamps) is 319 bytes per job, while the store file
   * is 12.4 MB for 1 692 jobs - a *full* job record averages 7.3 KB (candidate packages, branch references,
   * dispatch results and per-endpoint metric maps). The protocol inlines up to 16 KiB and refuses anything
   * larger (`frame exceeds inline limit`), so a page of full jobs overruns the frame at two entries while a
   * page of projections fits twenty-four: the listing has to be asked for the projection, and asking for full
   * jobs is the defect this bound makes visible on the first live sweep.
   */
  const measuredSummaryBytes = 319;
  const measuredFullJobBytes = 7_300;
  const envelopeAllowance = 4 * 1024;
  expect(MAX_HANDOFF_RECOVERY_LIST_PAGE).toBeGreaterThan(3);
  expect(MAX_HANDOFF_RECOVERY_LIST_PAGE * measuredSummaryBytes + envelopeAllowance).toBeLessThan(
    16 * 1024,
  );
  expect(
    MAX_HANDOFF_RECOVERY_LIST_PAGE * measuredFullJobBytes + envelopeAllowance,
    "a page of full job records could never travel inline - the projection is what makes the page possible",
  ).toBeGreaterThan(16 * 1024);
  expect(MAX_HANDOFF_RECOVERY_CHECKS_PER_SWEEP).toBeLessThanOrEqual(MAX_HANDOFF_RECOVERY_LIST_PAGE);
});

test("run101 S24 the terminal page asks for the summary projection and carries the cursor", () => {
  const first = terminalRecoveryListingValue({ cursor: null });
  expect(first).toMatchObject({
    state: ["failed", "timed_out"],
    hasEvaluationJobId: true,
    summary: true,
    order: "recent",
    limit: MAX_HANDOFF_RECOVERY_LIST_PAGE,
  });
  expect(
    Object.hasOwn(first, "afterJobId"),
    "the first sweep of a pass starts at the beginning of the set",
  ).toBe(false);
  expect(
    terminalRecoveryListingValue({
      cursor: { jobId: "job-0004", updatedAtMs: 1_700_000_000_000 },
    }),
  ).toMatchObject({
    afterJobId: "job-0004",
    afterUpdatedAtMs: 1_700_000_000_000,
    order: "recent",
    summary: true,
  });
});
