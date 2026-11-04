import { Option } from "effect";

import type { Return as UpdateReturn } from "@role-model-router/foldkit/update";
import type { Url } from "@role-model-router/foldkit/url";

import {
  type ReadControlCommand,
  type ReadDiagnosticsCommand,
  type ReadObservabilityCommand,
  type ReadReadbackCommand,
  type RoutingChartsCommands,
  noopRoutingChartsCommands,
  type RequestsChartsCommands,
  noopRequestsChartsCommands,
} from "./commands";
import { buildRoutingChartQueries, routingBreakdownDimension, routingChartFilters } from "./features/observe/routing-charts";
import { buildRequestsChartQueries } from "./features/observe/requests-charts";
import { windowForRange } from "./features/overview/chart-data";
import { type ControlKey, controlKeyForRouteTag, emptyControls, loadingControl } from "./control";
import { idleDiagnostics, loadingDiagnostics } from "./diagnostics";
import { replaceLegacyUrlCommand } from "./legacy-redirects";
import type { Message } from "./message";
import type { Model } from "./model";
import { idleObservability, loadingObservability } from "./observability";
import {
  type ReadbackKey,
  emptyReadbacks,
  loadingReadback,
  readbackKeyForRouteTag,
} from "./readback";
import { initialRuntimeRefreshState } from "./refresh";
import { resolveAppUrl } from "./route";
import { studioIdle, studioTabFromUrl } from "./studio";
import { applyDocumentTheme, readInitialTheme } from "./theme";

/** Restores the observe-routing filter state carried in the URL (source/breakdown/difficulty/range). */
const observeFiltersFromSearch = (search: string): Model["observeRoutingFilters"] | undefined => {
  const params = new URLSearchParams(search);
  const rawSource = params.get("source");
  const rawBreakdown = params.get("breakdown");
  const rawDifficulty = params.get("difficulty");
  const rawRange = params.get("range");
  if (rawSource === null && rawBreakdown === null && rawDifficulty === null && rawRange === null) return undefined;
  const source = rawSource === "local" ? "Local only"
    : rawSource === "remote" ? "Remote only"
      : rawSource ?? "All sources";
  const breakdown = rawBreakdown === "modelId" ? "By upstream model"
    : rawBreakdown === "endpointId" ? "By endpoint variant"
      : rawBreakdown === "providerId" ? "By provider"
        : rawBreakdown ?? "Total";
  const difficulty = rawDifficulty === "easy" ? "Easy only"
    : rawDifficulty === "medium" ? "Medium only"
      : rawDifficulty === "hard" ? "Hard only"
        : rawDifficulty ?? "All buckets";
  const range = rawRange === "week" ? "Week"
    : rawRange === "month" ? "Month"
      : rawRange === "90days" ? "90 days"
        : "Day";
  return { breakdown, difficulty, expanded: false, range, source };
};

/** Routing init: the runtime passes the Url derived from window.location at startup. */
const initRoute =
  (
    readDiagnostics: ReadDiagnosticsCommand,
    readObservability: ReadObservabilityCommand,
    readReadback: ReadReadbackCommand,
    readControl: ReadControlCommand,
    routingChartsCommands: RoutingChartsCommands = noopRoutingChartsCommands,
    requestsChartsCommands: RequestsChartsCommands = noopRequestsChartsCommands,
  ) =>
  (url: Url): UpdateReturn<Model, Message> => {
    const theme = readInitialTheme();
    applyDocumentTheme(theme);
    const resolved = resolveAppUrl(url);
    const route = resolved.route;
    // S269: a legacy Studio path carries its tab in the canonical `?tab=` alias.
    const studioTab =
      route._tag === "Studio" ? studioTabFromUrl(resolved.canonicalUrl) ?? "chat" : undefined;
    const initial = (): UpdateReturn<Model, Message> => {
      if (route._tag === "Diagnostics") {
        return {
          commands: [readDiagnostics({ id: route.id })],
          model: {
            clicks: 0,
            controls: emptyControls(),
            diagnostics: loadingDiagnostics(route.id),
            observability: idleObservability(),
            readbacks: emptyReadbacks(),
            refresh: initialRuntimeRefreshState(),
            route,
            theme,
          },
        };
      }
      if (route._tag === "Observability") {
        const token = 1;
        return {
          commands: [readObservability({ token })],
          model: {
            clicks: 0,
            controls: emptyControls(),
            diagnostics: idleDiagnostics(),
            observability: loadingObservability(token),
            readbacks: emptyReadbacks(),
            refresh: initialRuntimeRefreshState(),
            route,
            theme,
          },
        };
      }
      if (route._tag === "LocalPolicy") {
        const token = 1;
        return {
          commands: [readReadback({ key: "localPolicy", token })],
          model: { clicks: 0, controls: emptyControls(), diagnostics: idleDiagnostics(), observability: idleObservability(), readbacks: { ...emptyReadbacks(), localPolicy: loadingReadback(token) }, refresh: initialRuntimeRefreshState(), route, theme },
        };
      }
      if (route._tag === "LocalLlamaSwapModels" || route._tag === "SystemExtensions") {
        const token = 1;
        const key: "localLlamaSwapModels" | "extensions" = route._tag === "LocalLlamaSwapModels" ? "localLlamaSwapModels" : "extensions";
        return {
          commands: [readReadback({ key, token })],
          model: { clicks: 0, controls: emptyControls(), diagnostics: idleDiagnostics(), observability: idleObservability(), readbacks: { ...emptyReadbacks(), [key]: loadingReadback(token) }, refresh: initialRuntimeRefreshState(), route, theme },
        };
      }
      if (route._tag === "SystemOperator") {
        const token = 1;
        return {
          commands: [readReadback({ key: "operatorStatus", token }), readReadback({ key: "operatorTraceRoots", token })],
          model: { clicks: 0, controls: emptyControls(), diagnostics: idleDiagnostics(), observability: idleObservability(), readbacks: { ...emptyReadbacks(), operatorStatus: loadingReadback(token), operatorTraceRoots: loadingReadback(token) }, refresh: initialRuntimeRefreshState(), route, theme },
        };
      }
      if (route._tag === "LearningConfiguration" || route._tag === "LearningPacks" || route._tag === "LearningDecisions" || route._tag === "LearningEvidence" || route._tag === "LearningHistory") {
        const token = 1;
        const key: "learningConfiguration" | "learningPacks" | "learningDecisions" | "learningEvidence" | "learningHistory" = route._tag === "LearningConfiguration" ? "learningConfiguration" : route._tag === "LearningPacks" ? "learningPacks" : route._tag === "LearningDecisions" ? "learningDecisions" : route._tag === "LearningEvidence" ? "learningEvidence" : "learningHistory";
        return {
          commands: [readReadback({ key, token })],
          model: { clicks: 0, controls: emptyControls(), diagnostics: idleDiagnostics(), observability: idleObservability(), readbacks: { ...emptyReadbacks(), [key]: loadingReadback(token) }, refresh: initialRuntimeRefreshState(), route, theme },
        };
      }
      if (route._tag === "Router") {
        const token = 1;
        return {
          commands: [
            readReadback({ key: "router", token }),
            readReadback({ key: "routerConfig", token }),
            readReadback({ key: "routerCandidates", token }),
            readReadback({ key: "runtimeConfig", token }),
            readReadback({ key: "health", token }),
          ],
          model: { clicks: 0, controls: emptyControls(), diagnostics: idleDiagnostics(), observability: idleObservability(), readbacks: { ...emptyReadbacks(), router: loadingReadback(token), routerConfig: loadingReadback(token), routerCandidates: loadingReadback(token), runtimeConfig: loadingReadback(token), health: loadingReadback(token) }, refresh: initialRuntimeRefreshState(), route, theme },
        };
      }
      if (route._tag === "RouterStrategy" || route._tag === "RouterWorkloads" || route._tag === "RouterConfig" || route._tag === "RouterAgentStrategy") {
        const token = 1;
        return {
          commands: [readReadback({ key: "routerConfig", token }), readReadback({ key: "runtimeConfig", token })],
          model: { clicks: 0, controls: emptyControls(), diagnostics: idleDiagnostics(), observability: idleObservability(), readbacks: { ...emptyReadbacks(), routerConfig: loadingReadback(token), runtimeConfig: loadingReadback(token) }, refresh: initialRuntimeRefreshState(), route, theme },
        };
      }
      if (route._tag === "Endpoints" || route._tag === "Providers") {
        const token = 1;
        const controlKey = route._tag === "Providers" ? "providers" : "endpoints";
        return {
          commands: [
            readControl({ key: controlKey, token }),
            readReadback({ key: "configuredModels", token }),
            readReadback({ key: "modelEndpoints", token }),
            readReadback({ key: "integrationProviders", token }),
            readReadback({ key: "providerCatalog", token }),
            readReadback({ key: "providerAccounts", token }),
            readReadback({ key: "roles", token }),
          ],
          model: {
            clicks: 0,
            controls: { ...emptyControls(), [controlKey]: loadingControl(token) },
            diagnostics: idleDiagnostics(),
            observability: idleObservability(),
            readbacks: { ...emptyReadbacks(), configuredModels: loadingReadback(token), modelEndpoints: loadingReadback(token), integrationProviders: loadingReadback(token), providerCatalog: loadingReadback(token), providerAccounts: loadingReadback(token), roles: loadingReadback(token) },
            refresh: initialRuntimeRefreshState(),
            route,
            theme,
          },
        };
      }
      if (route._tag === "Models" || route._tag === "ModelsRoles") {
        const token = 1;
        return {
          commands: [readReadback({ key: "configuredModels", token }), readReadback({ key: "modelEndpoints", token }), readReadback({ key: "rolePolicy", token })],
          model: { clicks: 0, controls: emptyControls(), diagnostics: idleDiagnostics(), observability: idleObservability(), readbacks: { ...emptyReadbacks(), configuredModels: loadingReadback(token), modelEndpoints: loadingReadback(token), rolePolicy: loadingReadback(token) }, refresh: initialRuntimeRefreshState(), route, theme },
        };
      }
      if (route._tag === "Studio") {
        // S207: Studio needs the configured catalogue so its model field can default to a model this
        // host actually serves. The readback is route-scoped, so it has to be requested here - the
        // sidebar count comes from a different readback and does not fill this one.
        const token = 1;
        return {
          commands: [readReadback({ key: "configuredModels", token })],
          model: {
            clicks: 0,
            controls: emptyControls(),
            diagnostics: idleDiagnostics(),
            observability: idleObservability(),
            readbacks: { ...emptyReadbacks(), configuredModels: loadingReadback(token) },
            refresh: initialRuntimeRefreshState(),
            route,
            studio: studioIdle(studioTab),
            theme,
          },
        };
      }
      if (route._tag === "Learning") {
        const token = 1;
        return {
          commands: [
            readReadback({ key: "learning", token }),
            readReadback({ key: "learningPacks", token }),
            readReadback({ key: "replayJobs", token }),
            readReadback({ key: "evaluationJobs", token }),
          ],
          model: {
            clicks: 0,
            controls: emptyControls(),
            diagnostics: idleDiagnostics(),
            observability: idleObservability(),
            readbacks: { ...emptyReadbacks(), learning: loadingReadback(token), learningPacks: loadingReadback(token), replayJobs: loadingReadback(token), evaluationJobs: loadingReadback(token) },
            refresh: initialRuntimeRefreshState(),
            route,
            theme,
          },
        };
      }
      const controlKey = controlKeyForRouteTag(route._tag);
      if (controlKey !== null) {
        const token = 1;
        const controls = { ...emptyControls(), [controlKey]: loadingControl(token), ...(controlKey === "controlController" ? { endpoints: loadingControl(token) } : {}) };
      const controlCommands = controlKey === "controlController" ? [readControl({ key: controlKey, token }), readControl({ key: "endpoints", token })] : [readControl({ key: controlKey, token })];
        return {
          commands: controlCommands,
          model: {
            clicks: 0,
            controls,
            diagnostics: idleDiagnostics(),
            observability: idleObservability(),
            readbacks: emptyReadbacks(),
            refresh: initialRuntimeRefreshState(),
            route,
            theme,
          },
        };
      }
      const readbackKey = readbackKeyForRouteTag(route._tag);
      if (readbackKey !== null) {
        const token = 1;
        // The Requests and Observe-routing volume charts read the same metrics page as the overview.
        const observeVolume = route._tag === "Requests" || route._tag === "ObserveRouting";
        const routingCharts = route._tag === "ObserveRouting";
        const requestsCharts = route._tag === "Requests";
        const restoredObserveFilters = routingCharts
          ? observeFiltersFromSearch(Option.getOrUndefined(url.search) ?? "")
          : undefined;
        // The entry batch uses the same range->window mapping as the live reload path; a fresh load is Day.
        const entryWindowMs = windowForRange(restoredObserveFilters?.range);
        const restoreCharts = restoredObserveFilters === undefined
          ? buildRoutingChartQueries(entryWindowMs)
          : buildRoutingChartQueries(
              entryWindowMs,
              routingBreakdownDimension(restoredObserveFilters.breakdown),
              routingChartFilters(restoredObserveFilters),
            );
        const readbacks = route._tag === "Benchmark"
          ? { ...emptyReadbacks(), benchmarkRuns: loadingReadback(token), benchmarkSummary: loadingReadback(token), benchmarkSuite: loadingReadback(token), benchmarkPreferences: loadingReadback(token), benchmarkActiveRun: loadingReadback(token) }
          : observeVolume
            ? { ...emptyReadbacks(), [readbackKey]: loadingReadback(token), overviewMetrics: loadingReadback(token) }
            : { ...emptyReadbacks(), [readbackKey]: loadingReadback(token) };
        return {
          commands: [
            readReadback({ id: route._tag === "RequestDetail" || route._tag === "RouterDecisionDetail" ? route.requestId : route._tag === "Index" || route._tag === "Dashboard" ? "86400000" : undefined, key: readbackKey as ReadbackKey, token }),
            ...(route._tag === "Benchmark" ? [readReadback({ key: "benchmarkSummary" as const, token }), readReadback({ key: "benchmarkRuns" as const, token }), readReadback({ key: "benchmarkPreferences" as const, token }), readReadback({ key: "benchmarkActiveRun" as const, token })] : []),
            ...(observeVolume ? [readReadback({ key: "overviewMetrics", query: "?windowMs=86400000", token })] : []),
            ...(routingCharts ? [routingChartsCommands.load({ queriesJson: JSON.stringify(restoreCharts), token })] : []),
            ...(requestsCharts ? [requestsChartsCommands.load({
              queriesJson: JSON.stringify(buildRequestsChartQueries(86_400_000, {
                breakdown: null,
                filters: {},
                rankingDimension: "endpointId",
                rankingMetric: "averageLatencyMs",
              })),
              token,
            })] : []),
          ],
          model: {
            clicks: 0,
            controls: emptyControls(),
            diagnostics: idleDiagnostics(),
            observability: idleObservability(),
            readbacks,
            refresh: initialRuntimeRefreshState(),
            route,
            ...(routingCharts ? {
              routingCharts: { entries: [], status: "loading" as const, token },
              ...(restoredObserveFilters === undefined ? {} : { observeRoutingFilters: restoredObserveFilters }),
            } : {}),
            ...(requestsCharts ? { requestsCharts: { entries: [], status: "loading" as const, token } } : {}),
            theme,
          },
        };
      }
      return {
        model: {
          clicks: 0,
          controls: emptyControls(),
          diagnostics: idleDiagnostics(),
          observability: idleObservability(),
          readbacks: emptyReadbacks(),
          refresh: initialRuntimeRefreshState(),
          route,
          theme,
        },
      };
    };
    const result = initial();
    if (resolved.redirectHref === undefined) return result;
    return {
      ...result,
      commands: [...(result.commands ?? []), replaceLegacyUrlCommand({ href: resolved.redirectHref })],
      model: { ...result.model, pendingRedirectHref: resolved.redirectHref },
    };
  };
export const createInit =
  (
    readDiagnostics: ReadDiagnosticsCommand,
    readObservability: ReadObservabilityCommand,
    readReadback: ReadReadbackCommand,
    readControl: ReadControlCommand,
    loadRail = true,
    routingChartsCommands: RoutingChartsCommands = noopRoutingChartsCommands,
    requestsChartsCommands: RequestsChartsCommands = noopRequestsChartsCommands,
  ) =>
  (url: Url): UpdateReturn<Model, Message> => {
    const result = initRoute(readDiagnostics, readObservability, readReadback, readControl, routingChartsCommands, requestsChartsCommands)(url);
    if (!loadRail) return result;
    const railKeys = ["models", "runtimeSummary", "health", "dashboard", "router", "overviewMetrics", "routerCandidates"] as const;
    const token = 1;
    const readbacks = { ...result.model.readbacks };
    const commands = [...(result.commands ?? [])];
    for (const key of railKeys) {
      if (readbacks[key].status !== "idle") continue;
      readbacks[key] = loadingReadback(token);
      // The rail's dashboard read is windowed; an undefined id produced the malformed "?windowMs=" query.
      const id = key === "dashboard" || key === "overviewMetrics" ? "86400000" : undefined;
      commands.push(readReadback({ ...(id === undefined ? {} : { id }), key, token }));
    }
    return { ...result, commands, model: { ...result.model, readbacks } };
  };
