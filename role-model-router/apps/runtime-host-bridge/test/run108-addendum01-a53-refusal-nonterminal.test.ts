import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterEach, expect, test } from "vitest";

import * as cliModule from "../src/cli.js";

/**
 * Run 108 addendum-01 A5.3 (run 108 03.5 review MJ-2): the refusal reason must reach the operator
 * surface WITHOUT retiring the capture.
 *
 * The addendum wrote the reason as a `refused` row on the FIRST finalise refusal. `refused` is one of
 * the store's two TERMINAL_OUTCOMES, and `pending()` skips terminal rows, so the capture was retired
 * before the sweep's attempts and the deferral budget had run, and `counters_json` was nulled - the
 * opposite of the commit's claim that the attempt accounting was untouched. This file drives the
 * GENUINE store and the GENUINE budget the operations service applies (never a mock literal) and pins
 * the repair: the first refusal is written on a non-terminal row that still carries the code and the
 * bounded reason, the capture stays pending for the producer and readable for the Learning live panel
 * (which renders outcome+detail), and the store's own deferral budget - not the first refusal - owns
 * the moment the capture is retired, preserving the code and the reason when it does.
 */
const privateRoot = (() => {
  const configured = process.env.ROLE_MODEL_INTERNAL_WORKTREE ?? process.env.RUN105_PRIVATE_ROOT;
  if (configured && configured.trim().length > 0) return configured.trim();
  const publicRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
  return path.resolve(
    publicRoot,
    "../../../role-model-internal/.worktrees",
    path.basename(publicRoot),
  );
})();

const dispositionModulePath = path.join(privateRoot, "shared/capture/replay-disposition.mjs");

/**
 * The paired private half owns the disposition store and the deferral budget. The public CI image
 * checks out only this repository, so the cases below SKIP when the private checkout is absent instead
 * of failing on a module that was never fetched (the same pattern as run105-review-advisory-safety).
 */
const privateTest = existsSync(dispositionModulePath) ? test : test.skip;

const CAPTURE_REF = "req-run108-a53-refusal";
const POLICY_SET_DIGEST = "run108-a53-policy-set-digest";
const REFUSAL_DETAIL =
  "durable replay evaluation did not finalize a valid comparison: state=completed outcome=absent group=absent keys=comparison,evaluation";
const DEFERRAL_BOUND = 3;

interface ReplayDispositionRow {
  readonly outcome: string;
  readonly refusalCode: string | null;
  readonly detail: string | null;
  readonly counters: { readonly deferrals?: number } | null;
}

interface ReplayDispositionStoreLike {
  record(input: Record<string, unknown>): ReplayDispositionRow;
  pending(input: { policySetDigest: string; captureRefs?: string[] }): string[];
  close(): void;
}

interface DispositionModule {
  readonly ReplayDispositionStore: new (options: {
    filePath: string;
    channel?: string;
  }) => ReplayDispositionStoreLike;
  readonly applyReplayDeferralBudget: (
    input: Record<string, unknown>,
    priorDeferrals?: number,
    bound?: number,
  ) => Record<string, unknown>;
}

const loadDispositionModule = async (): Promise<DispositionModule> =>
  (await import(/* @vite-ignore */ pathToFileURL(dispositionModulePath).href)) as DispositionModule;

const roots: string[] = [];
const openStores: ReplayDispositionStoreLike[] = [];
const tempStorePath = (): string => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run108-a53-"));
  roots.push(dir);
  return path.join(dir, "replay-disposition.sqlite");
};
/**
 * The store holds its SQLite handle open (it is process-lifetime by design), and Windows refuses to
 * remove a directory that still has an open file in it - so the handles are closed before the temp
 * roots go away.
 */
afterEach(() => {
  for (const store of openStores.splice(0)) store.close();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

privateTest(
  "the disposition store retires a capture the moment a terminal row is written (the MJ-2 mechanism)",
  async () => {
    const { ReplayDispositionStore } = await loadDispositionModule();
    const store = new ReplayDispositionStore({
      filePath: tempStorePath(),
      channel: "development",
    });
    openStores.push(store);
    const row = store.record({
      captureRef: CAPTURE_REF,
      policySetDigest: POLICY_SET_DIGEST,
      outcome: "refused",
      refusalCode: "evaluation_finalise_refused",
      detail: REFUSAL_DETAIL,
      branches: null,
      window: null,
    });
    expect(row.outcome).toBe("refused");
    // Terminal: the capture is gone from the producer's pending set...
    expect(
      store.pending({ policySetDigest: POLICY_SET_DIGEST, captureRefs: [CAPTURE_REF] }),
    ).toEqual([]);
    // ...and the row it left behind carries no counters.
    expect(row.counters).toBeNull();
  },
);

privateTest(
  "a FIRST finalise refusal stays pending, keeps its reason, and only the deferral budget retires it",
  async () => {
    const { ReplayDispositionStore, applyReplayDeferralBudget } = await loadDispositionModule();
    const write = (cliModule as unknown as Record<string, unknown>).finaliseRefusalDispositionWrite;
    expect(typeof write).toBe("function");
    if (typeof write !== "function") return;

    const payload = (write as (input: Record<string, unknown>) => Record<string, unknown>)({
      captureRef: CAPTURE_REF,
      policySetDigest: POLICY_SET_DIGEST,
      refusalDetail: REFUSAL_DETAIL,
      window: "2026-10-08T12:00:00.000Z/2026-10-08T12:05:00.000Z",
    });
    // Non-terminal by construction: the store's TERMINAL_OUTCOMES are {replayed, refused}, and the
    // refusal is still named for the operator.
    expect(payload.outcome).toBe("deferred");
    expect(payload.refusalCode).toBe("evaluation_finalise_refused");
    expect(payload.detail).toBe(REFUSAL_DETAIL);

    const store = new ReplayDispositionStore({
      filePath: tempStorePath(),
      channel: "development",
    });
    openStores.push(store);
    // The operations service applies the store's own budget to every deferred write
    // (scripts/track-b/runtime-operations-server.mjs), so the first refusal is one deferral.
    let disposition = applyReplayDeferralBudget(payload, 0, DEFERRAL_BOUND);
    let row = store.record(disposition);
    expect(row.outcome).toBe("deferred");
    expect(row.refusalCode).toBe("evaluation_finalise_refused");
    expect(row.detail).toContain("did not finalize a valid comparison");
    expect(row.counters?.deferrals).toBe(1);
    // The capture is still pending, so the budget - not the first refusal - governs it.
    expect(
      store.pending({ policySetDigest: POLICY_SET_DIGEST, captureRefs: [CAPTURE_REF] }),
    ).toEqual([CAPTURE_REF]);

    // Exhausting the budget retires it exactly as applyReplayDeferralBudget decides, keeping the code
    // and appending the exhaustion note to the same reason.
    let prior = row.counters?.deferrals ?? 0;
    for (let attempt = 0; attempt < 5 && row.outcome === "deferred"; attempt += 1) {
      disposition = applyReplayDeferralBudget(payload, prior, DEFERRAL_BOUND);
      row = store.record(disposition);
      prior = row.counters?.deferrals ?? prior;
    }
    expect(row.outcome).toBe("refused");
    expect(row.refusalCode).toBe("evaluation_finalise_refused");
    expect(row.detail).toContain("did not finalize a valid comparison");
    expect(row.detail).toContain("deferral budget exhausted");
    expect((row.detail as string).length).toBeLessThanOrEqual(512);
    expect(
      store.pending({ policySetDigest: POLICY_SET_DIGEST, captureRefs: [CAPTURE_REF] }),
    ).toEqual([]);
  },
);
