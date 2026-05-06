import { describe, expect, test } from "vitest";

import { getRuntimeRouteDefinition, runtimeNavigationSections, runtimeTheme } from "./design-system";

describe("runtime design system", () => {
  test("defines navigation groups and layout templates for every runtime route", () => {
    expect(
      runtimeNavigationSections.map((section) => ({
        title: section.title,
        routes: section.items.map((item) => item.to),
      })),
    ).toEqual([
      {
        title: "Operate",
        routes: ["/app", "/app/workbench"],
      },
      {
        title: "Configure",
        routes: ["/app/providers", "/app/accounts", "/app/endpoints"],
      },
      {
        title: "Inspect",
        routes: ["/app/requests", "/app/runtime"],
      },
    ]);

    expect(getRuntimeRouteDefinition("/app")).toEqual(
      expect.objectContaining({
        id: "dashboard",
        template: "overview-grid",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/accounts")).toEqual(
      expect.objectContaining({
        id: "accounts",
        template: "split-form-ledger",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/requests/req-runtime-bridge-route-001")).toEqual(
      expect.objectContaining({
        id: "request-detail",
        template: "detail-inspector",
      }),
    );
    expect(getRuntimeRouteDefinition("/app/runtime")).toEqual(
      expect.objectContaining({
        id: "runtime",
        template: "system-contract",
      }),
    );
  });

  test("keeps the shell on restrained radii and explicit content widths", () => {
    expect(runtimeTheme.maxContentWidth).toBe("1480px");
    expect(runtimeTheme.radii.shell).toBe("0px");
    expect(runtimeTheme.radii.panel).toBe("0px");
    expect(runtimeTheme.radii.field).toBe("0px");
    expect(runtimeTheme.radii.badge).toBe("0px");
  });
});
