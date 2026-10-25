import type { Return as UpdateReturn } from "@role-model-router/foldkit/update";
import type { Url } from "@role-model-router/foldkit/url";

import type {
  ReadDiagnosticsCommand,
  ReadObservabilityCommand,
  ReadReadbackCommand,
} from "./commands";
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
export const createInit =
  (
    readDiagnostics: ReadDiagnosticsCommand,
    readObservability: ReadObservabilityCommand,
    readReadback: ReadReadbackCommand,
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
          diagnostics: idleDiagnostics(),
          observability: loadingObservability(token),
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
        commands: [readReadback({ key: readbackKey as ReadbackKey, token })],
        model: {
          clicks: 0,
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
        diagnostics: idleDiagnostics(),
        observability: idleObservability(),
        readbacks: emptyReadbacks(),
        refresh: initialRuntimeRefreshState(),
        route,
        theme,
      },
    };
  };
