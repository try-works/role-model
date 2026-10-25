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
import { routeFromUrl } from "./route";
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
    const route = routeFromUrl(url);
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
    const controlKey = controlKeyForRouteTag(route._tag);
    if (controlKey !== null) {
      const token = 1;
      const controls = { ...emptyControls(), [controlKey]: loadingControl(token) };
      return {
        commands: [readControl({ key: controlKey as ControlKey, token })],
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
    const railKeys = ["models", "runtimeSummary", "health", "dashboard", "router", "overviewMetrics"] as const;
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
