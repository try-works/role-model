import { renderToString } from "@role-model-router/foldkit/experimental/server";
import type { HtmlBuilder } from "@role-model-router/foldkit/html";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { defineReadDiagnostics } from "../src/commands";
import {
  observabilitySnapshotRoute,
  observeRoutingRoute,
  storeDegradationReceiptsRoute,
  telemetryRequestsRoute,
} from "../src/features/observe/views";
import { Message } from "../src/message";
import type { Model } from "../src/model";
import { createUpdate } from "../src/update";
import { shellModel } from "./support/runtime-shell";

const readback = { rows: [], status: "ok" as const, token: 0 };
const update = createUpdate(
  defineReadDiagnostics(async () => ({ body: { records: [], state: "empty" }, status: 200 })),
);

const render = async (body: unknown): Promise<HTMLElement> => {
  const rendered = await Effect.runPromise(
    renderToString(
      {
        init: () => ({ model: shellModel({}), commands: [] }),
        // SAFETY: each fixture supplies a view with the shell Model/HtmlBuilder contract.
        view: body as Parameters<typeof renderToString>[0]["view"],
      },
      { isHydratable: false },
    ),
  );
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

const renderRequests = async (filters?: ReturnType<typeof filtersOf>): Promise<HTMLElement> =>
  render((_model: Model, h: HtmlBuilder<Message>) => ({
    body: telemetryRequestsRoute(
      readback,
      readback,
      86400000,
      undefined,
      undefined,
      h as Parameters<typeof telemetryRequestsRoute>[5],
      filters,
    ),
    title: "requests",
  }));
const renderObserve = async (filters?: ReturnType<typeof filtersOf>): Promise<HTMLElement> =>
  render((_model: Model, h: HtmlBuilder<Message>) => ({
    body: observeRoutingRoute(
      readback,
      readback,
      86400000,
      undefined,
      h as Parameters<typeof observeRoutingRoute>[4],
      filters,
    ),
    title: "observe",
  }));
const filtersOf = () => ({
  breakdown: "Total",
  difficulty: "All buckets",
  expanded: false,
  range: "Week",
  source: "Local only",
  statusFamily: "All statuses",
});

describe("S619 requests/observe wiring", () => {
  it("renders the requests time-range and filter state", async () => {
    const container = await renderRequests({ ...filtersOf(), statusFamily: "Failure only" });
    expect(
      container.querySelector("[data-requests-range='Week']")?.getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      container
        .querySelector("select[aria-label='Source'] option[selected]")
        ?.getAttribute("value"),
    ).toBe("Local only");
    const next = update(
      shellModel({ route: { _tag: "Requests" } }),
      Message.RequestsRangeChanged({ value: "Month" }),
    );
    expect(next.model.requestsFilters?.range).toBe("Month");
    const rangeCommand = (next.commands ?? [])[0] as unknown as {
      readonly args: { readonly query: string };
    };
    expect(rangeCommand.args.query).toContain("range=Month");
    expect(rangeCommand.args.query).toContain("breakdown=Total");
    const filtered = update(
      next.model,
      Message.RequestsFilterChanged({ field: "source", value: "Remote only" }),
    );
    expect(filtered.model.requestsFilters?.source).toBe("Remote only");
    const filterCommand = (filtered.commands ?? [])[0] as unknown as {
      readonly args: { readonly query: string };
    };
    expect(filterCommand.args.query).toContain("source=Remote+only");
    expect(
      update(filtered.model, Message.RequestsAdvancedToggled()).model.requestsFilters?.expanded,
    ).toBe(true);
  });

  it("renders the observe routing filters and sends those values through update", async () => {
    const container = await renderObserve(filtersOf());
    expect(
      container.querySelector("[data-requests-range='Week']")?.getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      container
        .querySelector("select[aria-label='Breakdown'] option[selected]")
        ?.getAttribute("value"),
    ).toBe("Total");
    const next = update(
      shellModel({ route: { _tag: "ObserveRouting" } }),
      Message.ObserveFilterChanged({ field: "difficulty", value: "Hard only" }),
    );
    expect(next.model.observeRoutingFilters?.difficulty).toBe("Hard only");
    const command = (next.commands ?? [])[0] as unknown as {
      readonly args: { readonly query: string };
    };
    expect(command.args.query).toContain("difficulty=Hard+only");
    expect(command.args.query).toContain("range=Day");
  });

  it("wires both Refresh buttons to their read commands", async () => {
    const snapshot = await render((_model: Model, h: HtmlBuilder<Message>) => ({
      body: observabilitySnapshotRoute(
        { rows: [], status: "ok", token: 0 },
        h as Parameters<typeof observabilitySnapshotRoute>[1],
      ),
      title: "snapshot",
    }));
    expect(snapshot.querySelector("[data-observability-refresh]")).not.toBeNull();
    const refreshed = update(
      shellModel({ route: { _tag: "Observability" } }),
      Message.ObservabilityRefreshRequested(),
    );
    expect(refreshed.commands ?? []).toHaveLength(1);
    expect(refreshed.model.observability.token).toBe(1);
    const receipts = await render((_model: Model, h: HtmlBuilder<Message>) => ({
      body: storeDegradationReceiptsRoute(
        readback,
        h as Parameters<typeof storeDegradationReceiptsRoute>[1],
      ),
      title: "receipts",
    }));
    expect(receipts.querySelector("[data-store-receipts-refresh]")).not.toBeNull();
    const reread = update(
      shellModel({ route: { _tag: "StoreReceipts" } }),
      Message.StoreReceiptsRefreshRequested(),
    );
    expect(reread.commands ?? []).toHaveLength(1);
  });
});
