/**
 * Structured stale-refresh diagnostics for telemetry analytics routes.
 *
 * Emits bounded console warnings when background analytics refresh fails
 * and stale chart data is reused, providing route id, chart title,
 * query/filter snapshot, error summary, and reuse status.
 */

export interface StaleChartDiagnostic {
  /** Route identifier (e.g. "dashboard", "requests", "observe-routing") */
  routeId: string;
  /** Chart title that is using stale data */
  chartTitle: string;
  /** Snapshot of the query/filter that failed (bounded, no sensitive data) */
  querySnapshot: string;
  /** Summary of the error that caused the refresh failure */
  errorSummary: string;
  /** Whether stale data from a previous successful fetch was reused */
  staleDataReused: boolean;
}

export interface TelemetryChartRefreshRecord<TDefinition extends { title: string }, TResponse> {
  readonly definition: TDefinition;
  readonly response?: TResponse;
  readonly errorMessage?: string;
}

const MAX_DIAGNOSTIC_BATCH = 10;

let batchedDiagnostics: StaleChartDiagnostic[] = [];

/**
 * Emit a stale-refresh diagnostic. Diagnostics are batched and flushed
 * when the batch reaches MAX_DIAGNOSTIC_BATCH or when explicitly flushed.
 */
export function emitStaleRefreshDiagnostic(diagnostic: StaleChartDiagnostic): void {
  batchedDiagnostics.push(diagnostic);
  if (batchedDiagnostics.length >= MAX_DIAGNOSTIC_BATCH) {
    flushStaleRefreshDiagnostics();
  }
}

/**
 * Flush all batched diagnostics to the console and clear the batch.
 */
export function flushStaleRefreshDiagnostics(): void {
  if (batchedDiagnostics.length === 0) {
    return;
  }

  const batch = batchedDiagnostics;
  batchedDiagnostics = [];

  console.warn("[telemetry] Background analytics refresh reused stale data", {
    routeId: batch[0].routeId,
    staleChartCount: batch.length,
    charts: batch.map((d) => ({
      title: d.chartTitle,
      query: d.querySnapshot,
      error: d.errorSummary,
      staleReused: d.staleDataReused,
    })),
  });
}

/**
 * Build a bounded query snapshot string from a filter/query config.
 * Truncates to prevent leaking large payloads into diagnostics.
 */
export function buildQuerySnapshot(
  breakdown: string | null,
  timeRange: string,
  extraFilters?: Record<string, string>,
): string {
  const parts: string[] = [];
  parts.push(`range=${timeRange}`);
  if (breakdown) {
    parts.push(`breakdown=${breakdown}`);
  }
  if (extraFilters) {
    for (const [key, value] of Object.entries(extraFilters)) {
      if (value) {
        parts.push(`${key}=${value.slice(0, 80)}`);
      }
    }
  }
  const snapshot = parts.join(" ");
  return snapshot.length > 256 ? `${snapshot.slice(0, 253)}...` : snapshot;
}

/**
 * Create a diagnostic for a single chart that reused stale data.
 */
export function createStaleChartDiagnostic(params: {
  routeId: string;
  chartTitle: string;
  querySnapshot: string;
  error: unknown;
}): StaleChartDiagnostic {
  return {
    routeId: params.routeId,
    chartTitle: params.chartTitle,
    querySnapshot: params.querySnapshot,
    errorSummary: params.error instanceof Error ? params.error.message : "Unknown refresh error",
    staleDataReused: true,
  };
}

/**
 * Resolve a telemetry chart refresh against the previous chart state.
 *
 * Background refresh failures reuse the most recent successful chart data when
 * available and emit structured diagnostics. Successful refreshes replace any
 * previously stale chart state.
 */
export function resolveTelemetryChartRefresh<
  TDefinition extends { title: string },
  TResponse,
>(params: {
  background: boolean;
  chartResults: readonly PromiseSettledResult<TResponse>[];
  createDiagnostic: (definition: TDefinition, reason: unknown) => StaleChartDiagnostic;
  definitions: readonly TDefinition[];
  getErrorMessage: (title: string, reason: unknown) => string;
  previousCharts: readonly TelemetryChartRefreshRecord<TDefinition, TResponse>[];
}): {
  charts: TelemetryChartRefreshRecord<TDefinition, TResponse>[];
  staleChartTitles: string[];
} {
  const staleChartTitles: string[] = [];
  const charts = params.definitions.map((definition, index) => {
    const result = params.chartResults[index];
    if (result?.status === "fulfilled") {
      return {
        definition,
        response: result.value,
      };
    }

    const previousChart = params.previousCharts.find(
      (chart) => chart.definition.title === definition.title,
    );
    if (params.background && typeof previousChart?.response !== "undefined") {
      emitStaleRefreshDiagnostic(params.createDiagnostic(definition, result?.reason));
      staleChartTitles.push(definition.title);
      return {
        definition,
        response: previousChart.response,
      };
    }

    return {
      definition,
      errorMessage: params.getErrorMessage(definition.title, result?.reason),
    };
  });

  return {
    charts,
    staleChartTitles,
  };
}

/**
 * Reset the diagnostic batch (useful for testing).
 */
export function resetStaleRefreshDiagnostics(): void {
  batchedDiagnostics = [];
}

/**
 * Get the current diagnostic batch (useful for testing).
 */
export function getStaleRefreshDiagnostics(): readonly StaleChartDiagnostic[] {
  return batchedDiagnostics;
}
