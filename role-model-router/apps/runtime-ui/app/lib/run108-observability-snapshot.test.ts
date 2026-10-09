/**
 * Run 108 addendum-01 A5.2 (R7 readback consumers; 03.5 review MJ-1) + MN-3: the operator UI half.
 *
 * The host readback exists so an operator can SEE the four run-108 metric families the runtime
 * records. This suite pins the whole UI path:
 *
 *  1. the runtime-api client (`fetchObservabilitySnapshot`) and its honest unavailable state;
 *  2. the operator-token contract (03.5 review MN-3): a non-loopback bind 401s unless the client
 *     sends the bearer token, exactly like the learning-api readbacks do;
 *  3. the readback -> view-model projection; and
 *  4. the REGISTRATION, which is what actually makes a page reachable: the React Router entry in
 *     app/routes.ts, the Observe navigation entry and the shell's page definition. The A2 page
 *     shipped without these and was unreachable, so they are pinned the same way here.
 */
import { readFileSync } from "node:fs";

import { describe, expect, test, vi } from "vitest";

import { getRuntimeRouteDefinition, runtimeNavigationSections } from "./design-system";
import {
  type ObservabilitySnapshotReadback,
  buildObservabilitySnapshotRows,
  fetchObservabilitySnapshot,
} from "./runtime-api";

const SNAPSHOT_PATH = "/app/observe/observability-snapshot";
const SNAPSHOT_API_PATH = "/api/role-model/operator/observability-snapshot";

const payload: ObservabilitySnapshotReadback = {
  schemaVersion: "role-model.observability-snapshot.v1",
  metrics: {
    "role-model.router.decisions": { count: 7, incremental: true },
    "role-model.replay.admissions": { count: 2, incremental: true },
  },
};

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("run108 addendum-01 A5.2 observability snapshot client", () => {
  test("fetchObservabilitySnapshot reads the operator snapshot readback", async () => {
    const fetcher = vi.fn(
      async (_input: string, _init?: RequestInit) =>
        jsonResponse(200, payload) as unknown as Response,
    );
    const state = await fetchObservabilitySnapshot(fetcher as unknown as typeof fetch);
    expect(fetcher.mock.calls[0]?.[0]).toBe(SNAPSHOT_API_PATH);
    expect(state).toEqual({ ...payload, available: true });
  });

  test("maps a 503 operator_capability_unavailable to an honest unavailable state", async () => {
    const fetcher = vi.fn(
      async () =>
        jsonResponse(503, {
          error: "operator_capability_unavailable",
          capability: "observability snapshot readback",
          reason: "observability snapshot readback operator control is unavailable.",
        }) as unknown as Response,
    ) as unknown as typeof fetch;
    const state = await fetchObservabilitySnapshot(fetcher);
    expect(state).toEqual({
      available: false,
      reason: "observability snapshot readback operator control is unavailable.",
    });
  });

  test("sends the operator bearer token when one is configured (MN-3)", async () => {
    const fetcher = vi.fn(
      async (_input: string, _init?: RequestInit) =>
        jsonResponse(200, payload) as unknown as Response,
    );
    await fetchObservabilitySnapshot(fetcher as unknown as typeof fetch, "operator-token");
    expect(fetcher.mock.calls[0]?.[0]).toBe(SNAPSHOT_API_PATH);
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      headers: { authorization: "Bearer operator-token" },
    });
  });

  /**
   * MN-3's harm is a PAGE that 401s on a non-loopback bind, not a function that cannot carry a
   * token. This pins the production caller: the view resolves the house operator token
   * (learning-api useOperatorToken, the shared local-storage convention) and passes it through.
   */
  test("the snapshot view supplies that credential from the house operator-token hook", () => {
    const view = readFileSync(
      new URL("../routes/observability-snapshot.tsx", import.meta.url),
      "utf8",
    )
      .replace(/\s+/g, " ")
      .trim();
    expect(view).toContain('from "../lib/learning-api"');
    expect(view).toContain("useOperatorToken()");
    expect(view).toContain("fetchObservabilitySnapshot(fetch, token || undefined)");
  });
});

describe("run108 addendum-01 A5.2 observability snapshot view models", () => {
  test("buildObservabilitySnapshotRows projects the metrics map alphabetically", () => {
    expect(buildObservabilitySnapshotRows({ ...payload, available: true })).toEqual([
      {
        id: "role-model.replay.admissions",
        name: "role-model.replay.admissions",
        count: 2,
        incremental: true,
      },
      {
        id: "role-model.router.decisions",
        name: "role-model.router.decisions",
        count: 7,
        incremental: true,
      },
    ]);
  });

  test("an unavailable surface yields no fabricated rows", () => {
    expect(
      buildObservabilitySnapshotRows({ available: false, reason: "readback unavailable" }),
    ).toEqual([]);
  });

  test("an empty registry is an empty table, not an error", () => {
    expect(
      buildObservabilitySnapshotRows({
        schemaVersion: "role-model.observability-snapshot.v1",
        metrics: {},
        available: true,
      }),
    ).toEqual([]);
  });
});

describe("run108 addendum-01 A5.2 observability snapshot UI registration", () => {
  test("registers the route file in the app route config", () => {
    const source = readFileSync(new URL("../routes.ts", import.meta.url), "utf8");
    expect(source).toContain(
      'route("observe/observability-snapshot", "routes/observability-snapshot.tsx")',
    );
  });

  test("lists the page in the Observe navigation section", () => {
    const observe = runtimeNavigationSections.find((section) => section.title === "Observe");
    expect(observe).toBeDefined();
    expect(observe?.items.map((item) => item.to)).toContain(SNAPSHOT_PATH);
  });

  test("resolves the page to its own route definition", () => {
    expect(getRuntimeRouteDefinition(SNAPSHOT_PATH)).toEqual(
      expect.objectContaining({
        id: "observe-observability-snapshot",
        label: "Observability",
        section: "Observe",
      }),
    );
  });

  test("the registered route file renders the snapshot readback", () => {
    const view = readFileSync(
      new URL("../routes/observability-snapshot.tsx", import.meta.url),
      "utf8",
    );
    expect(view).toContain("export default ObservabilitySnapshotRouteView");
    expect(view).toContain("fetchObservabilitySnapshot");
  });
});
