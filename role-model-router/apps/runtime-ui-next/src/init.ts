import type { Return as UpdateReturn } from "@role-model-router/foldkit/update";
import type { Url } from "@role-model-router/foldkit/url";

import type {
  ReadControlCommand,
  ReadDiagnosticsCommand,
  ReadObservabilityCommand,
  ReadReadbackCommand,
} from "./commands";
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

/** Routing init: the runtime passes the Url derived from window.location at startup. */
const initRoute =
  (
    readDiagnostics: ReadDiagnosticsCommand,
    readObservability: ReadObservabilityCommand,
    readReadback: ReadReadbackCommand,
    readControl: ReadControlCommand,
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
      if (route._tag === "RouterStrategy" || route._tag === "RouterWorkloads" || route._tag === "RouterConfig" || route._tag === "RouterAgentStrategy") {
        const token = 1;
        return {
          commands: [readReadback({ key: "routerConfig", token })],
          model: { clicks: 0, controls: emptyControls(), diagnostics: idleDiagnostics(), observability: idleObservability(), readbacks: { ...emptyReadbacks(), routerConfig: loadingReadback(token) }, refresh: initialRuntimeRefreshState(), route, theme },
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
          ],
          model: {
            clicks: 0,
            controls: { ...emptyControls(), [controlKey]: loadingControl(token) },
            diagnostics: idleDiagnostics(),
            observability: idleObservability(),
            readbacks: { ...emptyReadbacks(), configuredModels: loadingReadback(token), modelEndpoints: loadingReadback(token), integrationProviders: loadingReadback(token), providerCatalog: loadingReadback(token) },
            refresh: initialRuntimeRefreshState(),
            route,
            theme,
          },
        };
      }
      if (route._tag === "Models" || route._tag === "ModelsRoles") {
        const token = 1;
        return {
          commands: [readReadback({ key: "configuredModels", token }), readReadback({ key: "modelEndpoints", token })],
          model: { clicks: 0, controls: emptyControls(), diagnostics: idleDiagnostics(), observability: idleObservability(), readbacks: { ...emptyReadbacks(), configuredModels: loadingReadback(token), modelEndpoints: loadingReadback(token) }, refresh: initialRuntimeRefreshState(), route, theme },
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
        const readbacks = { ...emptyReadbacks(), [readbackKey]: loadingReadback(token) };
        return {
          commands: [readReadback({ id: route._tag === "RequestDetail" || route._tag === "RouterDecisionDetail" ? route.requestId : route._tag === "Index" || route._tag === "Dashboard" ? "86400000" : undefined, key: readbackKey as ReadbackKey, token })],
          model: {
            clicks: 0,
            controls: emptyControls(),
            diagnostics: idleDiagnostics(),
            observability: idleObservability(),
            readbacks,
            refresh: initialRuntimeRefreshState(),
            route,
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
  ) =>
  (url: Url): UpdateReturn<Model, Message> => {
    const result = initRoute(readDiagnostics, readObservability, readReadback, readControl)(url);
    if (!loadRail) return result;
    const railKeys = ["models", "runtimeSummary", "health", "dashboard", "router", "overviewMetrics", "routerCandidates"] as const;
    const token = 1;
    const readbacks = { ...result.model.readbacks };
    const commands = [...(result.commands ?? [])];
    for (const key of railKeys) {
      if (readbacks[key].status !== "idle") continue;
      readbacks[key] = loadingReadback(token);
      const id =
        (key === "dashboard" && result.model.route._tag === "Dashboard") || key === "overviewMetrics"
          ? "86400000"
          : undefined;
      commands.push(readReadback({ ...(id === undefined ? {} : { id }), key, token }));
    }
    return { ...result, commands, model: { ...result.model, readbacks } };
  };
