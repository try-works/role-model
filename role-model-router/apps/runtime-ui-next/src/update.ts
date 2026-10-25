import { Command, Navigation, Url } from "@role-model-router/foldkit";
import { UrlRequest } from "@role-model-router/foldkit/navigation";
import type { Return as UpdateReturn } from "@role-model-router/foldkit/update";
import { Effect, Schema } from "effect";

import {
  type DispatchControlCommand,
  type DispatchStudioCommand,
  type ReadControlCommand,
  type ReadDiagnosticsCommand,
  type ReadObservabilityCommand,
  type ReadReadbackCommand,
  type RefreshSnapshotCommand,
  defineDispatchControl,
  defineDispatchStudio,
  defineReadControl,
  defineReadObservability,
  defineReadReadback,
  defineRefreshSnapshot,
} from "./commands";
import {
  CONTROL_SPECS,
  type ControlKey,
  controlKeyForRouteTag,
  emptyControls,
  failedControl,
  loadingControl,
} from "./control";
import { failedDiagnostics, idleDiagnostics, loadingDiagnostics } from "./diagnostics";
import { Message } from "./message";
import type { Model } from "./model";
import { failedObservability, idleObservability, loadingObservability } from "./observability";
import {
  READBACK_SPECS,
  emptyReadbacks,
  failedReadback,
  loadingReadback,
  readbackKeyForRouteTag,
} from "./readback";
import { routeFromUrl } from "./route";
import { studioIdle, studioLoading } from "./studio";
import { applyThemeCommand, scrollShellToTopCommand } from "./shell-commands";

/** In-app navigation is a Command, not a history call inside update. */
const pushInternal = Command.define("PushInternal", {
  args: { href: Schema.String },
  messages: [Message.NavigationCompleted],
  execute: ({ href }) =>
    Navigation.pushUrl(href).pipe(Effect.map(() => Message.NavigationCompleted())),
});

const noopRefreshSnapshot = defineRefreshSnapshot(async () => undefined);
const noopObservability = defineReadObservability(async () => ({
  body: { metrics: {} },
  status: 200,
}));
const emptyBody = {
  candidates: [],
  logs: "",
  queues: [],
  store: { receipts: [] },
  worker: { receipts: [] },
};
const noopControl = defineReadControl({
  dispatch: async () => ({ body: {}, status: 200 }),
  read: async () => ({ body: {}, status: 200 }),
});
const noopDispatchStudio = defineDispatchStudio(async () => ({ contentType: "", status: 500, text: "" }));
const noopDispatchControl = defineDispatchControl({
  dispatch: async () => ({ body: {}, status: 200 }),
  read: async () => ({ body: {}, status: 200 }),
});
const noopReadback = defineReadReadback({
  dashboard: async () => ({ body: emptyBody, status: 200 }),
  localLogs: async () => ({ body: emptyBody, status: 200 }),
  localSwap: async () => ({ body: emptyBody, status: 200 }),
  observeActivity: async () => ({ body: emptyBody, status: 200 }),
  observeLogs: async () => ({ body: emptyBody, status: 200 }),
  observeRouting: async () => ({ body: emptyBody, status: 200 }),
  router: async () => ({ body: emptyBody, status: 200 }),
  requestDetail: async () => ({ body: emptyBody, status: 200 }),
  routerDecisionDetail: async () => ({ body: emptyBody, status: 200 }),
  localPeers: async () => ({ body: emptyBody, status: 200 }),
  systemPeers: async () => ({ body: emptyBody, status: 200 }),
  localPeerModels: async () => ({ body: emptyBody, status: 200 }),
  queueConfig: async () => ({ body: emptyBody, status: 200 }),
  downstreamOpenAI: async () => ({ body: emptyBody, status: 200 }),
  integrationProviders: async () => ({ body: emptyBody, status: 200 }),
  benchmarkSuite: async () => ({ body: emptyBody, status: 200 }),
  storageRetention: async () => ({ body: emptyBody, status: 200 }),
  models: async () => ({ body: emptyBody, status: 200 }),
  runtimeSummary: async () => ({ body: emptyBody, status: 200 }),
  health: async () => ({ body: emptyBody, status: 200 }),
  overviewMetrics: async () => ({ body: { items: [], window: { startAtMs: 0, endAtMs: 0, asOfMs: 0 } }, status: 200 }),
  learning: async () => ({ body: { knowledge: {} }, status: 200 }),
  configuredModels: async () => ({ body: [], status: 200 }),
  modelEndpoints: async () => ({ body: [], status: 200 }),
  replayJobs: async () => ({ body: [], status: 200 }),
  evaluationJobs: async () => ({ body: [], status: 200 }),
  queues: async () => ({ body: emptyBody, status: 200 }),
  requests: async () => ({ body: emptyBody, status: 200 }),
  routerCandidates: async () => ({ body: emptyBody, status: 200 }),
  routerDecisions: async () => ({ body: emptyBody, status: 200 }),
  runtime: async () => ({ body: emptyBody, status: 200 }),
  sessionReadiness: async () => ({ body: emptyBody, status: 200 }),
  storeReceipts: async () => ({ body: emptyBody, status: 200 }),
});

export const createUpdate =
  (
    readDiagnostics: ReadDiagnosticsCommand,
    refreshSnapshot: RefreshSnapshotCommand = noopRefreshSnapshot,
    readObservability: ReadObservabilityCommand = noopObservability,
    readReadback: ReadReadbackCommand = noopReadback,
    readControl: ReadControlCommand = noopControl,
    dispatchControl: DispatchControlCommand = noopDispatchControl,
    dispatchStudio: DispatchStudioCommand = noopDispatchStudio,
  ) =>
  (model: Model, message: Message): UpdateReturn<Model, Message> =>
    Message.match<UpdateReturn<Model, Message>>(message, {
      ChangedUrl: ({ url }) => {
        const route = routeFromUrl(url);
        if (route._tag === "Diagnostics") {
          return {
            commands: [readDiagnostics({ id: route.id }), scrollShellToTopCommand()],
            model: {
              ...model,
              diagnostics: loadingDiagnostics(route.id),
              observability: idleObservability(),
              readbacks: emptyReadbacks(),
              refresh: {
                ...model.refresh,
                message: undefined,
                resyncToken: model.refresh.resyncToken + 1,
                status: "idle",
              },
              route,
            },
          };
        }
        if (route._tag === "Observability") {
          const token = model.observability.token + 1;
          return {
            commands: [readObservability({ token }), scrollShellToTopCommand()],
            model: {
              ...model,
              diagnostics: idleDiagnostics(),
              observability: loadingObservability(token),
              readbacks: emptyReadbacks(),
              refresh: {
                ...model.refresh,
                message: undefined,
                resyncToken: model.refresh.resyncToken + 1,
                status: "idle",
              },
              route,
            },
          };
        }
        const controlKey = controlKeyForRouteTag(route._tag);
        if (controlKey !== null) {
          const token = model.controls[controlKey].token + 1;
          return {
            commands: [readControl({ key: controlKey, token }), scrollShellToTopCommand()],
            model: {
              ...model,
              controls: { ...model.controls, [controlKey]: loadingControl(token) },
              diagnostics: idleDiagnostics(),
              observability: idleObservability(),
              readbacks: emptyReadbacks(),
              refresh: {
                ...model.refresh,
                message: undefined,
                resyncToken: model.refresh.resyncToken + 1,
                status: "idle",
              },
              route,
            },
          };
        }
        const readbackKey = readbackKeyForRouteTag(route._tag);
        if (readbackKey !== null) {
          const token = model.readbacks[readbackKey].token + 1;
          const readbacks = { ...model.readbacks, [readbackKey]: loadingReadback(token) };
          return {
            commands: [readReadback({ id: route._tag === "RequestDetail" || route._tag === "RouterDecisionDetail" ? route.requestId : undefined, key: readbackKey, token }), scrollShellToTopCommand()],
            model: {
              ...model,
              diagnostics: idleDiagnostics(),
              observability: idleObservability(),
              readbacks,
              refresh: {
                ...model.refresh,
                message: undefined,
                resyncToken: model.refresh.resyncToken + 1,
                status: "idle",
              },
              route,
            },
          };
        }
        return {
          commands: [scrollShellToTopCommand()],
          model: {
            ...model,
            controls: emptyControls(),
            diagnostics: idleDiagnostics(),
            observability: idleObservability(),
            readbacks: emptyReadbacks(),
            refresh: {
              ...model.refresh,
              message: undefined,
              resyncToken: model.refresh.resyncToken + 1,
              status: "idle",
            },
            route,
          },
        };
      },
      Clicked: () => ({ model: { ...model, clicks: model.clicks + 1 } }),
      ClickedLink: ({ request }) =>
        UrlRequest.match<UpdateReturn<Model, Message>>(request, {
          External: () => ({ model }),
          Internal: ({ url }) => ({
            commands: [pushInternal({ href: Url.toString(url) })],
            model,
          }),
        }),
      ControllerEndpointSelected: ({ endpointId }) => {
        const current = model.controls.controlController;
        return { model: { ...model, controls: { ...model.controls, controlController: { ...current, selectedEndpointId: endpointId } } } };
      },
      ControllerSaveRequested: ({ endpointId }) => {
        const current = model.controls.controlController;
        if (current.actionStatus === "pending") return { model };
        const token = current.token + 1;
        return {
          commands: [dispatchControl({ endpointId, key: "controlController", token })],
          model: {
            ...model,
            controls: {
              ...model.controls,
              controlController: { ...current, actionMessage: undefined, actionStatus: "pending", notice: undefined, selectedEndpointId: endpointId, token },
            },
          },
        };
      },
      ControlActionCompleted: ({ key, message, serverEndpointId, token }) => {
        const current = model.controls[key];
        if (token !== current.token) return { model };
        return {
          commands: key === "controlController" ? [readControl({ key, token })] : [],
          model: {
            ...model,
            controls: {
              ...model.controls,
              [key]: {
                ...current,
                actionMessage: message,
                actionStatus: "ok",
                notice: key === "controlController" && serverEndpointId !== undefined ? "Server assigned " + serverEndpointId : current.notice,
                selectedEndpointId: key === "controlController" && serverEndpointId !== undefined ? serverEndpointId : current.selectedEndpointId,
              },
            },
          },
        };
      },
      ControlActionFailed: ({ key, message, token }) => {
        const current = model.controls[key];
        if (token !== current.token) return { model };
        return {
          model: {
            ...model,
            controls: {
              ...model.controls,
              [key]: { ...current, actionMessage: message, actionStatus: "error" },
            },
          },
        };
      },
      ControlActionRequested: ({ key }) => {
        const current = model.controls[key];
        if (current.actionStatus === "pending") return { model };
        const token = current.token + 1;
        return {
          commands: [dispatchControl({ key, token })],
          model: {
            ...model,
            controls: {
              ...model.controls,
              [key]: { ...current, actionMessage: undefined, actionStatus: "pending", token },
            },
          },
        };
      },
      ControlFailed: ({ key, message, token }) => {
        if (token !== model.controls[key].token) return { model };
        return {
          model: {
            ...model,
            controls: { ...model.controls, [key]: failedControl(message, token) },
          },
        };
      },
      ControlLoaded: ({ key, snapshot, token }) => {
        if (token !== model.controls[key].token) return { model };
        const previous = model.controls[key];
        return {
          model: { ...model, controls: { ...model.controls, [key]: { ...snapshot, notice: previous.notice, selectedEndpointId: previous.selectedEndpointId ?? snapshot.selectedEndpointId, token } } },
        };
      },
      DiagnosticsFailed: ({ id, message }) =>
        model.route._tag === "Diagnostics" && model.route.id === id
          ? { model: { ...model, diagnostics: failedDiagnostics(id, message) } }
          : { model },
      DiagnosticsLoaded: ({ id, snapshot }) =>
        model.route._tag === "Diagnostics" && model.route.id === id
          ? { model: { ...model, diagnostics: snapshot } }
          : { model },
      DiagnosticsRefreshRequested: () =>
        model.route._tag === "Diagnostics"
          ? {
              commands: [readDiagnostics({ id: model.route.id })],
              model: {
                ...model,
                diagnostics: loadingDiagnostics(model.route.id),
              },
            }
          : { model },
      NavigationCompleted: () => ({ model }),
      ObservabilityFailed: ({ message, token }) =>
        model.route._tag === "Observability" && token === model.observability.token
          ? { model: { ...model, observability: failedObservability(message, token) } }
          : { model },
      ObservabilityLoaded: ({ snapshot, token }) =>
        model.route._tag === "Observability" && token === model.observability.token
          ? {
              model: {
                ...model,
                observability: { ...snapshot, token },
                refresh:
                  snapshot.status === "error"
                    ? model.refresh
                    : { ...model.refresh, message: undefined, status: "live" },
              },
            }
          : { model },
      ReadbackFailed: ({ key, message, token }) => {
        const routeKey = readbackKeyForRouteTag(model.route._tag);
        if (routeKey !== key || token !== model.readbacks[key].token) return { model };
        return {
          model: {
            ...model,
            readbacks: { ...model.readbacks, [key]: failedReadback(message, token) },
          },
        };
      },
      ReadbackLoaded: ({ key, snapshot, token }) => {
        if (token !== model.readbacks[key].token) return { model };
        return {
          model: {
            ...model,
            readbacks: { ...model.readbacks, [key]: { ...snapshot, token } },
            refresh:
              snapshot.status === "error"
                ? model.refresh
                : { ...model.refresh, message: undefined, status: "live" },
          },
        };
      },
      SelectedOverviewWindow: ({ windowMs }) => {
    const current = model.readbacks.overviewMetrics;
    const token = current.token + 1;
    return {
      commands: [readReadback({ id: String(windowMs), key: "overviewMetrics", token })],
      model: {
        ...model,
        overviewWindowMs: windowMs,
        readbacks: { ...model.readbacks, overviewMetrics: loadingReadback(token) },
      },
    };
  },
  StudioTabSelected: ({ tab }) => {
    const current = model.studio ?? studioIdle();
    return { model: { ...model, studio: studioIdle(tab) } };
  },
  StudioTabKey: ({ key }) => {
    const current = model.studio ?? studioIdle();
    const tabs = ["chat", "images", "audio", "rerank", "advanced"] as const;
    const index = tabs.indexOf(current.tab);
    const next = key === "Home" ? 0 : key === "End" ? tabs.length - 1 : key === "ArrowRight" ? (index + 1) % tabs.length : key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length : index;
    return { model: { ...model, studio: studioIdle(tabs[next] ?? current.tab) } };
  },
  StudioFieldChanged: ({ field, value }) => {
    const current = model.studio ?? studioIdle();
    return { model: { ...model, studio: { ...current, [field]: value } } };
  },
  StudioRunRequested: ({ token }) => {
    const current = model.studio ?? studioIdle();
    if (current.status === "loading") return { model };
    const next = { ...studioLoading(token), ...current, message: undefined, responseText: "Waiting for the runtime…", status: "loading" as const, statusCode: 0, token };
    return { commands: [dispatchStudio({ state: next, token })], model: { ...model, studio: next } };
  },
  StudioLoaded: ({ responseText, statusCode, tab, token }) => {
    const current = model.studio;
    if (current === undefined || token !== current.token) return { model };
    return {
      model: {
        ...model,
        studio: statusCode >= 400
          ? { ...current, message: "HTTP " + String(statusCode), responseText, status: "error", statusCode, tab }
          : { ...current, message: undefined, responseText, status: "success", statusCode, tab },
      },
    };
  },
  StudioFailed: ({ message, responseText, statusCode, token }) => {
    const current = model.studio;
    if (current === undefined || token !== current.token) return { model };
    return { model: { ...model, studio: { ...current, message, responseText, status: "error", statusCode } } };
  },
  RefreshResynced: ({ routeId, snapshot, token }) => {
        if (token !== model.refresh.resyncToken) {
          // An older resync resolving last must not win.
          return { model };
        }
        if (model.route._tag !== "Diagnostics" || model.route.id !== routeId) {
          // Navigation invalidated this resync. Do not let an older route's payload touch the new
          // route's fresh data or stale state.
          return { model };
        }
        return {
          model: {
            ...model,
            diagnostics: snapshot,
            refresh: {
              ...model.refresh,
              message: undefined,
              status: "live",
            },
          },
        };
      },
      RefreshResyncFailed: ({ message, routeId, token }) =>
        token === model.refresh.resyncToken &&
        model.route._tag === "Diagnostics" &&
        model.route.id === routeId
          ? {
              model: {
                ...model,
                refresh: {
                  ...model.refresh,
                  message,
                  status: "stale",
                },
              },
            }
          : { model },
      RuntimeRevisionReceived: ({ revision }) => {
        const current = model.refresh;
        if (revision <= current.lastAppliedRevision) {
          // An older revision arriving after a newer one must not be applied.
          return { model };
        }
        const gap = current.lastAppliedRevision > 0 && revision > current.lastAppliedRevision + 1;
        if (!gap) {
          const readbackKey = readbackKeyForRouteTag(model.route._tag);
          if (readbackKey !== null) {
            const token = model.readbacks[readbackKey].token + 1;
            return {
              commands: [readReadback({ id: model.route._tag === "RequestDetail" || model.route._tag === "RouterDecisionDetail" ? model.route.requestId : undefined, key: readbackKey, token })],
              model: {
                ...model,
                readbacks: { ...model.readbacks, [readbackKey]: loadingReadback(token) },
                refresh: {
                  ...current,
                  lastAppliedRevision: revision,
                  message: current.status === "stale" ? current.message : undefined,
                  status: current.status === "stale" ? "stale" : "live",
                },
              },
            };
          }
          if (model.route._tag === "Observability") {
            const token = model.observability.token + 1;
            return {
              commands: [readObservability({ token })],
              model: {
                ...model,
                observability: loadingObservability(token),
                refresh: {
                  ...current,
                  lastAppliedRevision: revision,
                  message: current.status === "stale" ? current.message : undefined,
                  status: current.status === "stale" ? "stale" : "live",
                },
              },
            };
          }
          return {
            model: {
              ...model,
              refresh: {
                ...current,
                lastAppliedRevision: revision,
                // A failed resync is sticky: contiguous progress must not clear it.
                message: current.status === "stale" ? current.message : undefined,
                status: current.status === "stale" ? "stale" : "live",
              },
            },
          };
        }
        const readbackKey = readbackKeyForRouteTag(model.route._tag);
        if (readbackKey !== null) {
          const token = model.readbacks[readbackKey].token + 1;
          return {
            commands: [readReadback({ id: model.route._tag === "RequestDetail" || model.route._tag === "RouterDecisionDetail" ? model.route.requestId : undefined, key: readbackKey, token })],
            model: {
              ...model,
              readbacks: { ...model.readbacks, [readbackKey]: loadingReadback(token) },
              refresh: {
                ...current,
                lastAppliedRevision: revision,
                message: "resyncing after a revision gap",
                resyncToken: current.resyncToken + 1,
                status: "stale",
              },
            },
          };
        }
        if (model.route._tag === "Observability") {
          const token = model.observability.token + 1;
          return {
            commands: [readObservability({ token })],
            model: {
              ...model,
              observability: loadingObservability(token),
              refresh: {
                ...current,
                lastAppliedRevision: revision,
                message: "resyncing after a revision gap",
                resyncToken: current.resyncToken + 1,
                status: "stale",
              },
            },
          };
        }
        const token = current.resyncToken + 1;
        return {
          commands: [
            refreshSnapshot({
              routeId: model.route._tag === "Diagnostics" ? model.route.id : "",
              token,
            }),
          ],
          model: {
            ...model,
            refresh: {
              ...current,
              lastAppliedRevision: revision,
              message: "resyncing after a revision gap",
              resyncToken: token,
              status: "stale",
            },
          },
        };
      },
      ThemeApplied: () => ({ model }),
      ToggledTheme: () => {
        const theme = model.theme === "light" ? "dark" : "light";
        return {
          commands: [applyThemeCommand({ theme })],
          model: { ...model, theme },
        };
      },
    });