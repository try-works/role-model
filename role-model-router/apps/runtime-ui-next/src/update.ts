import { Command, Navigation, Url } from "@role-model-router/foldkit";
import { UrlRequest } from "@role-model-router/foldkit/navigation";
import type { Return as UpdateReturn } from "@role-model-router/foldkit/update";
import { Effect, Schema } from "effect";

import {
  type ReadDiagnosticsCommand,
  type ReadObservabilityCommand,
  type ReadReadbackCommand,
  type RefreshSnapshotCommand,
  defineReadObservability,
  defineReadReadback,
  defineRefreshSnapshot,
} from "./commands";
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
const noopReadback = defineReadReadback({
  dashboard: async () => ({ body: emptyBody, status: 200 }),
  localLogs: async () => ({ body: emptyBody, status: 200 }),
  localSwap: async () => ({ body: emptyBody, status: 200 }),
  observeActivity: async () => ({ body: emptyBody, status: 200 }),
  observeLogs: async () => ({ body: emptyBody, status: 200 }),
  observeRouting: async () => ({ body: emptyBody, status: 200 }),
  router: async () => ({ body: emptyBody, status: 200 }),
  localPeers: async () => ({ body: emptyBody, status: 200 }),
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
        const readbackKey = readbackKeyForRouteTag(route._tag);
        if (readbackKey !== null) {
          const token = model.readbacks[readbackKey].token + 1;
          const readbacks = { ...model.readbacks, [readbackKey]: loadingReadback(token) };
          return {
            commands: [readReadback({ key: readbackKey, token }), scrollShellToTopCommand()],
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
              commands: [readReadback({ key: readbackKey, token })],
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
            commands: [readReadback({ key: readbackKey, token })],
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
