import { expect, test } from "vitest";

import { ladderMaterializationRefusals } from "../src/learner-revalidation.js";

/**
 * Live finding (isolated production-learning verification, 2026-10-15): a DETERMINISTIC ladder-materialization
 * refusal was completely silent. Only entries with status "written" logged anything, so an entry refused with
 * `evidence_metadata_capacity_exceeded` was indistinguishable from "nothing changed yet".
 *
 * Measured on the isolated runtime by invoking the operator materialization directly: floor admitted 5 /
 * configured 6 / met=TRUE, yet `status: "refused"`, `reason: "evidence_metadata_capacity_exceeded"`, and the
 * durable ladder stayed frozen at its previous value (admitted 3, version 23) while the evidence document was
 * 55237 bytes against the writer's 16384 cap. That refusal is permanent - the metadata only grows - so it must be
 * visible by name. "unchanged" is the genuine steady state and stays quiet.
 */
test("a permanent capacity refusal is reported, not swallowed as no-progress", () => {
  const refusals = ladderMaterializationRefusals([
    {
      status: "refused",
      roleId: "researcher",
      taskTypeId: "researcher.compare_sources",
      reason: "evidence_metadata_capacity_exceeded",
      floor: { admitted: 5, configured: 6, met: true },
    },
  ]);

  expect(refusals).toEqual([
    {
      status: "refused",
      roleId: "researcher",
      taskTypeId: "researcher.compare_sources",
      reason: "evidence_metadata_capacity_exceeded",
      floor: { admitted: 5, configured: 6, met: true },
    },
  ]);
});

test("a written or unchanged ladder is not a refusal", () => {
  expect(
    ladderMaterializationRefusals([
      { status: "written", roleId: "r", taskTypeId: "t" },
      { status: "unchanged", roleId: "r", taskTypeId: "t" },
    ]),
  ).toEqual([]);
});

test("every other status is surfaced, including stale and insufficient_evidence", () => {
  const refusals = ladderMaterializationRefusals([
    { status: "stale", roleId: "r", taskTypeId: "t", reason: "snapshot_changed" },
    { status: "insufficient_evidence", roleId: "r", taskTypeId: "t" },
    { status: "capacity_limited", roleId: "r", taskTypeId: "t", reason: "retained_rung_capacity_exceeded" },
  ]);

  expect(refusals.map((entry) => entry.status)).toEqual([
    "stale",
    "insufficient_evidence",
    "capacity_limited",
  ]);
  // A missing reason is named rather than rendering as "undefined".
  expect(refusals[1].reason).toBe("unspecified");
  expect(refusals[1].floor).toBeNull();
});

test("malformed entries are skipped rather than crashing the tick", () => {
  expect(ladderMaterializationRefusals([null, undefined, 42, "nope", [], {}])).toEqual([]);
});
