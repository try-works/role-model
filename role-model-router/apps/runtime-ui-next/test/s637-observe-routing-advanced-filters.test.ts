import { describe, expect, it } from "vitest";

import {
  buildRoutingChartQueries,
  routingChartFilters,
} from "../src/features/observe/routing-charts";
import { mountShell } from "../src/mount";

/**
 * S637 (task-118): the reference observe-routing Advanced controls (taxonomy ids, requested role, selected
 * strategy, reasoning effort / effort source) must survive URL restore and reach all nine analytics POST bodies.
 */

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const advancedState = {
  breakdown: "By endpoint variant",
  difficulty: "Easy only",
  expanded: true,
  range: "Week",
  source: "Local only",
  requestedRoleId: "role-1",
  selectedStrategy: "baseline",
  reasoningEfforts: "high,max",
  effortSources: "variant",
  taxonomyGroupId: "engineering",
  taxonomyRoleId: "coder",
  taxonomyTaskType: "coder.review",
  taxonomyTaskVariant: "deep-audit",
  taxonomyCapabilityIds: "cap-1,cap-2",
  taxonomyModalityIds: "text",
  taxonomyToolClassIds: "read_file",
} as const;

const fullFilters = {
  sourceTypes: ["local"],
  difficultyBuckets: ["easy"],
  requestedRoleIds: ["role-1"],
  selectedStrategies: ["baseline"],
  reasoningEfforts: ["high", "max"],
  effortSources: ["variant"],
  taxonomyGroupIds: ["engineering"],
  taxonomyRoleIds: ["coder"],
  taxonomyTaskTypes: ["coder.review"],
  taxonomyTaskVariants: ["deep-audit"],
  taxonomyCapabilityIds: ["cap-1", "cap-2"],
  taxonomyModalityIds: ["text"],
  taxonomyToolClassIds: ["read_file"],
};

const waitFor = async (read: () => boolean, label: string) => {
  const end = Date.now() + 15000;
  while (Date.now() < end) {
    if (read()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const mountRouting = async (url: string) => {
  window.history.replaceState({}, "", url);
  const bodies: unknown[] = [];
  const container = document.createElement("div");
  container.id = `s637-routing-${Math.random().toString(36).slice(2)}`;
  document.body.append(container);
  const handle = mountShell(container, {
    readbackFetchImpl: async () =>
      json({ items: [], rows: [], requests: [], window: { startAtMs: 0, endAtMs: 0 } }),
    routingChartsFetchImpl: async (_input, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return json({ buckets: [], ranking: { rows: [] } });
    },
  });
  return { bodies, container, handle };
};

describe("S637 observe routing advanced filters", () => {
  it("maps every advanced filter into the nine query payloads", () => {
    const filters = routingChartFilters(
      advancedState as unknown as Parameters<typeof routingChartFilters>[0],
    );
    expect(filters).toEqual(fullFilters);
    const queries = buildRoutingChartQueries(604_800_000, "endpointId", filters);
    expect(queries).toHaveLength(9);
    for (const entry of queries) {
      expect(entry.query.filters).toEqual(fullFilters);
      expect(entry.query.windowMs).toBe(604_800_000);
      expect(entry.query.granularity).toBe("day");
    }
  });

  it("restores the advanced filters from the URL and sends them on the nine entry queries", async () => {
    const { bodies, container, handle } = await mountRouting(
      "/observe/routing?range=week&source=local&difficulty=easy&roleId=role-1&strategy=baseline&effort=high,max&effortSource=variant&taxGroup=engineering&taxRole=coder&taxTask=coder.review&taxVariant=deep-audit&taxCapability=cap-1,cap-2&taxModality=text&taxTool=read_file",
    );
    try {
      await waitFor(() => bodies.length >= 9, "nine entry queries");
      for (const body of bodies.slice(0, 9))
        expect((body as { readonly filters?: unknown }).filters).toEqual(fullFilters);
      const group = document.querySelector(
        "[data-observe-filter='taxonomyGroupId']",
      ) as HTMLInputElement;
      expect(group).not.toBeNull();
      expect(group.value).toBe("engineering");
      expect(
        (
          document.querySelector(
            "[data-observe-filter='taxonomyCapabilityIds']",
          ) as HTMLInputElement
        ).value,
      ).toBe("cap-1,cap-2");
    } finally {
      handle.dispose();
      container.remove();
    }
  });

  it("re-queries all nine charts when an advanced field changes", async () => {
    const { bodies, container, handle } = await mountRouting(
      "/observe/routing?taxGroup=engineering",
    );
    try {
      await waitFor(() => bodies.length >= 9, "initial entry queries");
      const role = document.querySelector(
        "[data-observe-filter='taxonomyRoleId']",
      ) as HTMLInputElement;
      expect(role).not.toBeNull();
      role.value = "coder";
      role.dispatchEvent(new Event("input", { bubbles: true }));
      await waitFor(() => bodies.length >= 18, "advanced-filter re-query");
      for (const body of bodies.slice(-9)) {
        expect(
          (
            body as {
              readonly filters?: {
                readonly taxonomyGroupIds?: unknown;
                readonly taxonomyRoleIds?: unknown;
              };
            }
          ).filters?.taxonomyGroupIds,
        ).toEqual(["engineering"]);
        expect(
          (body as { readonly filters?: { readonly taxonomyRoleIds?: unknown } }).filters
            ?.taxonomyRoleIds,
        ).toEqual(["coder"]);
      }
    } finally {
      handle.dispose();
      container.remove();
    }
  });
});
