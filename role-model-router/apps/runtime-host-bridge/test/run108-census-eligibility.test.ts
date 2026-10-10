import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  initializeSqliteMemory,
  persistRuntimeTelemetryFailure,
} from "@role-model-router/sqlite-memory";
import { afterEach, describe, expect, test, vi } from "vitest";
import { readRouteLadderCensus } from "../src/route-ladder-census.js";

/**
 * Run 108: a family on an eligibility cooldown must not be offered as the walk focus.
 *
 * MEASURED on stage-rc-0b5dd8fa7899 (:3457): the corpus read refuses a family whose live capture count exceeds its
 * 500-row faithful-projection budget (route-challenge-evidence.ts:556 / LIMIT 501), and the walk puts that family on a
 * cooldown via markRouteLadderEligible. The cooldown was WRITTEN AND READ BY NOTHING on the focus path -
 * selectFocusTask filters on rolledBack, role/task, requestCount and D1 fillability, and RouteFocusCandidate carries no
 * eligibility field - so the census kept offering the starved family, the walk kept choosing it (highest requestCount,
 * non-zero fill gap) and threw on every tick. Nine minutes of observation: focus=recruiter x4, focusOTHER=0.
 *
 * The predicate already existed (route-ladder-dispatch.ts:682-683, "R8: a complete task is idle until nextEligibleAtMs
 * passes"); it was never applied when the candidate pool was built.
 */
const roots: string[] = [];
const nowMs = Date.UTC(2026, 9, 4);
afterEach(async () => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function state() {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run108-elig-"));
  roots.push(runtimeStateRoot);
  return {
    runtimeStateRoot,
    scopeId: "elig",
    ...initializeSqliteMemory({ runtimeStateRoot, scopeId: "elig", channel: "development" }),
  };
}

function seed(databasePath: string, requestId: string, taskTypeId: string) {
  const clock = vi.spyOn(Date, "now").mockReturnValue(nowMs - 86400000);
  try {
    persistRuntimeTelemetryFailure({
      databasePath,
      requestId,
      statusCode: 400,
      errorClass: "invalid_request",
      taxonomyRoleId: "recruiter",
      taxonomyTaskType: taskTypeId,
      requestClass: "live",
    });
  } finally {
    clock.mockRestore();
  }
}

/** A ladder row for one family, optionally held on an eligibility cooldown. */
const row = (taskTypeId: string, nextEligibleAtMs?: number) => ({
  roleId: "recruiter",
  taskTypeId,
  version: 9,
  ...(nextEligibleAtMs === undefined ? {} : { nextEligibleAtMs }),
  rungs: [{ endpointId: "current-a", status: "available" }],
});

describe("run108: the census honours the eligibility cooldown", () => {
  test("a family on cooldown is NOT offered while a ready family exists", async () => {
    const seeded = await state();
    // Both families must have traffic, otherwise neither is a candidate at all.
    seed(seeded.databasePath, "req-cooled", "recruiter.candidate.screen");
    seed(seeded.databasePath, "req-ready", "recruiter.screen.ready");
    const result = readRouteLadderCensus({
      runtimeStateRoot: seeded.runtimeStateRoot,
      scopeId: "elig",
      nowMs,
      stalenessWindowDays: 30,
      configuredEndpointIds: ["current-a"],
      ladderRows: [
        row("recruiter.candidate.screen", nowMs + 600000), // cooled down for 10 more minutes
        row("recruiter.screen.ready"),
      ],
    });
    expect(result.status).toBe("available");
    const tasks = (result.candidates ?? []).map((c) => c.taskTypeId);
    expect(tasks).toContain("recruiter.screen.ready");
    expect(tasks).not.toContain("recruiter.candidate.screen");
  });

  test("an EXPIRED cooldown does not exclude the family", async () => {
    const seeded = await state();
    seed(seeded.databasePath, "req-expired", "recruiter.candidate.screen");
    const result = readRouteLadderCensus({
      runtimeStateRoot: seeded.runtimeStateRoot,
      scopeId: "elig",
      nowMs,
      stalenessWindowDays: 30,
      configuredEndpointIds: ["current-a"],
      ladderRows: [row("recruiter.candidate.screen", nowMs - 1)],
    });
    expect((result.candidates ?? []).map((c) => c.taskTypeId)).toContain(
      "recruiter.candidate.screen",
    );
  });

  test("FALLBACK: when every family is on cooldown the full set is still offered, so the walk cannot idle", async () => {
    const seeded = await state();
    seed(seeded.databasePath, "req-only", "recruiter.candidate.screen");
    const result = readRouteLadderCensus({
      runtimeStateRoot: seeded.runtimeStateRoot,
      scopeId: "elig",
      nowMs,
      stalenessWindowDays: 30,
      configuredEndpointIds: ["current-a"],
      ladderRows: [row("recruiter.candidate.screen", nowMs + 600000)],
    });
    expect(result.status).toBe("available");
    expect((result.candidates ?? []).map((c) => c.taskTypeId)).toContain(
      "recruiter.candidate.screen",
    );
  });
});
