import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildQuerySnapshot,
  createStaleChartDiagnostic,
  emitStaleRefreshDiagnostic,
  flushStaleRefreshDiagnostics,
  getStaleRefreshDiagnostics,
  resetStaleRefreshDiagnostics,
  resolveTelemetryChartRefresh,
} from "./stale-refresh-diagnostics.js";

describe("stale-refresh-diagnostics", () => {
  beforeEach(() => {
    resetStaleRefreshDiagnostics();
  });

  describe("buildQuerySnapshot", () => {
    it("builds a snapshot string with range and breakdown", () => {
      const result = buildQuerySnapshot("endpointId", "week");
      expect(result).toBe("range=week breakdown=endpointId");
    });

    it("includes extra filters", () => {
      const result = buildQuerySnapshot(null, "day", {
        source: "local",
        status: "failure",
      });
      expect(result).toContain("range=day");
      expect(result).toContain("source=local");
      expect(result).toContain("status=failure");
    });

    it("omits null breakdown", () => {
      const result = buildQuerySnapshot(null, "month", {});
      expect(result).toBe("range=month");
    });

    it("truncates long snapshots to 256 chars", () => {
      const longFilter = { key: "x".repeat(300) };
      const result = buildQuerySnapshot("breakdown", "week", longFilter);
      expect(result.length).toBeLessThanOrEqual(256);
    });
  });

  describe("createStaleChartDiagnostic", () => {
    it("creates a diagnostic with error message", () => {
      const diagnostic = createStaleChartDiagnostic({
        routeId: "dashboard",
        chartTitle: "Token Usage",
        querySnapshot: "range=week",
        error: new Error("Network failure"),
      });
      expect(diagnostic.routeId).toBe("dashboard");
      expect(diagnostic.chartTitle).toBe("Token Usage");
      expect(diagnostic.querySnapshot).toBe("range=week");
      expect(diagnostic.errorSummary).toBe("Network failure");
      expect(diagnostic.staleDataReused).toBe(true);
    });

    it("handles non-Error error values", () => {
      const diagnostic = createStaleChartDiagnostic({
        routeId: "requests",
        chartTitle: "Request Volume",
        querySnapshot: "range=day",
        error: "some string error",
      });
      expect(diagnostic.errorSummary).toBe("Unknown refresh error");
    });
  });

  describe("emit and flush diagnostics", () => {
    it("batches diagnostics until flushed", () => {
      const d1 = createStaleChartDiagnostic({
        routeId: "dashboard",
        chartTitle: "Chart A",
        querySnapshot: "range=week",
        error: new Error("fail"),
      });
      const d2 = createStaleChartDiagnostic({
        routeId: "dashboard",
        chartTitle: "Chart B",
        querySnapshot: "range=week",
        error: new Error("fail"),
      });

      emitStaleRefreshDiagnostic(d1);
      emitStaleRefreshDiagnostic(d2);

      expect(getStaleRefreshDiagnostics()).toHaveLength(2);
      flushStaleRefreshDiagnostics();
      expect(getStaleRefreshDiagnostics()).toHaveLength(0);
    });

    it("flushes nothing when batch is empty", () => {
      // flushStaleRefreshDiagnostics should not throw on empty batch
      expect(() => flushStaleRefreshDiagnostics()).not.toThrow();
    });

    it("auto-flushes at max batch size", () => {
      const createDiag = (i: number) =>
        createStaleChartDiagnostic({
          routeId: "dashboard",
          chartTitle: `Chart ${i}`,
          querySnapshot: "range=week",
          error: new Error("fail"),
        });

      // MAX is 10, so 10th emit should trigger auto-flush
      for (let i = 0; i < 10; i++) {
        emitStaleRefreshDiagnostic(createDiag(i));
      }
      // After auto-flush, batch should be empty
      expect(getStaleRefreshDiagnostics()).toHaveLength(0);

      // Emit one more - should stay in batch
      emitStaleRefreshDiagnostic(createDiag(99));
      expect(getStaleRefreshDiagnostics()).toHaveLength(1);
    });
  });

  describe("resolveTelemetryChartRefresh", () => {
    const definitions = [{ title: "Chart A" }, { title: "Chart B" }] as const;

    it("keeps initial success clean with no stale charts", () => {
      const result = resolveTelemetryChartRefresh({
        background: false,
        chartResults: [
          { status: "fulfilled", value: "a" },
          { status: "fulfilled", value: "b" },
        ] as PromiseSettledResult<string>[],
        createDiagnostic: (definition, reason) =>
          createStaleChartDiagnostic({
            routeId: "requests",
            chartTitle: definition.title,
            querySnapshot: "range=week",
            error: reason,
          }),
        definitions,
        getErrorMessage: (title, reason) => `${title}: ${String(reason)}`,
        previousCharts: [],
      });

      expect(result.staleChartTitles).toEqual([]);
      expect(result.charts).toEqual([
        { definition: definitions[0], response: "a" },
        { definition: definitions[1], response: "b" },
      ]);
      expect(getStaleRefreshDiagnostics()).toHaveLength(0);
    });

    it("surfaces an error state on initial partial failure without stale reuse", () => {
      const result = resolveTelemetryChartRefresh({
        background: false,
        chartResults: [
          { status: "fulfilled", value: "a" },
          { status: "rejected", reason: new Error("query failed") },
        ] as PromiseSettledResult<string>[],
        createDiagnostic: (definition, reason) =>
          createStaleChartDiagnostic({
            routeId: "dashboard",
            chartTitle: definition.title,
            querySnapshot: "range=week",
            error: reason,
          }),
        definitions,
        getErrorMessage: (title, reason) =>
          `${title}: ${reason instanceof Error ? reason.message : "unknown"}`,
        previousCharts: [],
      });

      expect(result.staleChartTitles).toEqual([]);
      expect(result.charts).toEqual([
        { definition: definitions[0], response: "a" },
        { definition: definitions[1], errorMessage: "Chart B: query failed" },
      ]);
      expect(getStaleRefreshDiagnostics()).toHaveLength(0);
    });

    it("reuses stale chart data on background failure and records a diagnostic", () => {
      const result = resolveTelemetryChartRefresh({
        background: true,
        chartResults: [
          { status: "fulfilled", value: "fresh-a" },
          { status: "rejected", reason: new Error("background query failed") },
        ] as PromiseSettledResult<string>[],
        createDiagnostic: (definition, reason) =>
          createStaleChartDiagnostic({
            routeId: "observe-routing",
            chartTitle: definition.title,
            querySnapshot: "range=week breakdown=modelId",
            error: reason,
          }),
        definitions,
        getErrorMessage: (title, reason) =>
          `${title}: ${reason instanceof Error ? reason.message : "unknown"}`,
        previousCharts: [
          { definition: definitions[0], response: "stale-a" },
          { definition: definitions[1], response: "stale-b" },
        ],
      });

      expect(result.staleChartTitles).toEqual(["Chart B"]);
      expect(result.charts).toEqual([
        { definition: definitions[0], response: "fresh-a" },
        { definition: definitions[1], response: "stale-b" },
      ]);
      expect(getStaleRefreshDiagnostics()).toHaveLength(1);
      expect(getStaleRefreshDiagnostics()[0]).toMatchObject({
        chartTitle: "Chart B",
        routeId: "observe-routing",
      });
    });

    it("clears stale-chart state after a later successful refresh", () => {
      const staleResult = resolveTelemetryChartRefresh({
        background: true,
        chartResults: [
          { status: "fulfilled", value: "fresh-a" },
          { status: "rejected", reason: new Error("background query failed") },
        ] as PromiseSettledResult<string>[],
        createDiagnostic: (definition, reason) =>
          createStaleChartDiagnostic({
            routeId: "requests",
            chartTitle: definition.title,
            querySnapshot: "range=week",
            error: reason,
          }),
        definitions,
        getErrorMessage: (title, reason) =>
          `${title}: ${reason instanceof Error ? reason.message : "unknown"}`,
        previousCharts: [
          { definition: definitions[0], response: "stale-a" },
          { definition: definitions[1], response: "stale-b" },
        ],
      });

      const recoveredResult = resolveTelemetryChartRefresh({
        background: true,
        chartResults: [
          { status: "fulfilled", value: "recovered-a" },
          { status: "fulfilled", value: "recovered-b" },
        ] as PromiseSettledResult<string>[],
        createDiagnostic: (definition, reason) =>
          createStaleChartDiagnostic({
            routeId: "requests",
            chartTitle: definition.title,
            querySnapshot: "range=week",
            error: reason,
          }),
        definitions,
        getErrorMessage: (title, reason) => `${title}: ${String(reason)}`,
        previousCharts: staleResult.charts,
      });

      expect(recoveredResult.staleChartTitles).toEqual([]);
      expect(recoveredResult.charts).toEqual([
        { definition: definitions[0], response: "recovered-a" },
        { definition: definitions[1], response: "recovered-b" },
      ]);
    });
  });

  describe("flushStaleRefreshDiagnostics", () => {
    it("logs the queued diagnostics when flushed", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        emitStaleRefreshDiagnostic(
          createStaleChartDiagnostic({
            routeId: "requests",
            chartTitle: "Request Volume",
            querySnapshot: "range=week modelId=baseline.remote-only",
            error: new Error("query failed"),
          }),
        );

        flushStaleRefreshDiagnostics();

        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledWith(
          "[telemetry] Background analytics refresh reused stale data",
          expect.objectContaining({
            routeId: "requests",
            staleChartCount: 1,
          }),
        );
      } finally {
        warn.mockRestore();
      }
    });
  });
});
