import { describe, expect, test } from "vitest";

import { buildObservabilitySnapshotRows } from "./runtime-api";

/**
 * Plan phase 3 + Observe wiring (2026-10-15): the host now returns per-series attribute breakdowns
 * (e.g. role-model.replay.dispatch.refusals tagged with the named gate that refused), but the client
 * projection collapsed every metric to a bare total and the Observability page rendered only that
 * total - the breakdown existed in the readback and was dropped on the floor. The projection must
 * carry the series breakdown so the page can show WHICH gate refused, matching the queue pages
 * that show per-job causes. Backward compatible: a metric without series keeps the bare row shape.
 */
const withSeries: {
  schemaVersion: "role-model.observability-snapshot.v1";
  metrics: Record<
    string,
    {
      count: number;
      incremental: boolean;
      series?: {
        id: string;
        attributes: Record<string, string>;
        state: { kind: string; count: number; incremental: boolean };
      }[];
    }
  >;
} = {
  schemaVersion: "role-model.observability-snapshot.v1",
  metrics: {
    "role-model.replay.dispatch.refusals": {
      count: 5,
      incremental: true,
      series: [
        {
          id: "role-model.replay.dispatch.refusals",
          attributes: { reason: "list_jobs_malformed" },
          state: { kind: "counter", count: 3, incremental: true },
        },
        {
          id: "role-model.replay.dispatch.refusals",
          attributes: { reason: "queue_job_payload_malformed" },
          state: { kind: "counter", count: 2, incremental: true },
        },
      ],
    },
  },
};

describe("observability snapshot projection carries the per-reason breakdown", () => {
  test("a metric with series exposes one breakdown entry per attribute set", () => {
    const rows = buildObservabilitySnapshotRows({ ...withSeries, available: true });
    expect(rows).toEqual([
      {
        id: "role-model.replay.dispatch.refusals",
        name: "role-model.replay.dispatch.refusals",
        count: 5,
        incremental: true,
        breakdown: [
          { attributes: { reason: "list_jobs_malformed" }, count: 3 },
          { attributes: { reason: "queue_job_payload_malformed" }, count: 2 },
        ],
      },
    ]);
  });

  test("a metric without series keeps the bare row shape (no breakdown key)", () => {
    const rows = buildObservabilitySnapshotRows({
      schemaVersion: "role-model.observability-snapshot.v1",
      metrics: {
        "role-model.replay.admissions": { count: 2, incremental: true },
      },
      available: true,
    });
    expect(rows).toEqual([
      {
        id: "role-model.replay.admissions",
        name: "role-model.replay.admissions",
        count: 2,
        incremental: true,
        breakdown: [],
      },
    ]);
  });
});
