import { Command, Navigation } from "@role-model-router/foldkit";
import { UrlRequest } from "@role-model-router/foldkit/navigation";
import type { Return as UpdateReturn } from "@role-model-router/foldkit/update";
import { type Url, toString as urlToString } from "@role-model-router/foldkit/url";
import { Effect, Schema } from "effect";

import { DEFAULT_OVERVIEW_FILTERS, overviewQuery, type OverviewFilters } from "./overview-filters";
import { parseRuntimeConfigRecord, parseRuntimeConfigText, runtimeConfigDiff, runtimeConfigText } from "./runtime-config";

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
  type SaveRuntimeConfigCommand,
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
import { canonicalHrefForUrl, replaceLegacyUrlCommand } from "./legacy-redirects";
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
import { type AppRoute, type ResolvedAppUrl, resolveAppUrl, sameRoute } from "./route";
import { studioIdle, studioLoading, studioTabFromUrl } from "./studio";
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
  learningConfiguration: async () => ({ body: { items: [] }, status: 200 }),
  learningPacks: async () => ({ body: { items: [] }, status: 200 }),
  learningDecisions: async () => ({ body: { items: [] }, status: 200 }),
  learningEvidence: async () => ({ body: { items: [] }, status: 200 }),
  learningHistory: async () => ({ body: { items: [] }, status: 200 }),
  configuredModels: async () => ({ body: [], status: 200 }),
  modelEndpoints: async () => ({ body: [], status: 200 }),
  runtimeConfig: async () => ({ body: { config: {} }, status: 200 }),
  routerConfig: async () => ({ body: { persisted: { executionMode: "decision_only", strategy: null } }, status: 200 }),
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

const runtimeConfigSnapshot = (model: Model): { config: Readonly<Record<string, unknown>>; text: string } => {
  const meta = model.readbacks.runtimeConfig.rows[0]?.meta;
  if (meta !== undefined) { try { const parsed = JSON.parse(meta) as { config?: unknown }; const config = parsed.config; if (config !== null && typeof config === "object" && !Array.isArray(config)) return { config: config as Readonly<Record<string, unknown>>, text: JSON.stringify(config, null, 2) }; } catch {} }
  return { config: {}, text: "{}" };
};

/**
 * S272: the pending marker is the exact canonical href of the replace Command we just emitted.
 * Only the first URL change that matches it exactly is that Command's `foldkit:urlchange` echo.
 * There is no other source identity in `ChangedUrl`, so one identical URL change is consumed as
 * the echo; the real echo then becomes a genuine navigation, never a silent drop.
 */
const isPendingRedirectEcho = (
  model: Model,
  resolved: ResolvedAppUrl,
  incomingHref: string,
): boolean =>
  resolved.redirectHref === undefined &&
  model.pendingRedirectHref !== undefined &&
  model.pendingRedirectHref === incomingHref &&
  sameRoute(resolved.route, model.route);

export const createUpdate =
  (
    readDiagnostics: ReadDiagnosticsCommand,
    refreshSnapshot: RefreshSnapshotCommand = noopRefreshSnapshot,
    readObservability: ReadObservabilityCommand = noopObservability,
    readReadback: ReadReadbackCommand = noopReadback,
    readControl: ReadControlCommand = noopControl,
    dispatchControl: DispatchControlCommand = noopDispatchControl,
    dispatchStudio: DispatchStudioCommand = noopDispatchStudio,
    saveRuntimeConfig: SaveRuntimeConfigCommand | undefined = undefined,
  ) => {
    const navigateToRoute = (
      model: Model,
      route: AppRoute,
      canonicalUrl: Url,
    ): UpdateReturn<Model, Message> => {
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
      if (route._tag === "Studio") {
        const token = model.readbacks.configuredModels.token + 1;
        return {
          commands: [
            readReadback({ key: "configuredModels", token }),
            scrollShellToTopCommand(),
          ],
          model: {
            ...model,
            diagnostics: idleDiagnostics(),
            observability: idleObservability(),
            readbacks: { ...emptyReadbacks(), configuredModels: loadingReadback(token) },
            refresh: {
              ...model.refresh,
              message: undefined,
              resyncToken: model.refresh.resyncToken + 1,
              status: "idle",
            },
            route,
            studio: studioIdle(studioTabFromUrl(canonicalUrl) ?? "chat"),
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
    };

    // S278 (R12): a telemetry invalidation re-reads only the current route, through the same real
    // commands a contiguous revision uses. It writes nothing to `refresh`: the telemetry payload
    // carries no revision, so this transition must never advance the watermark, bump the
    // gap/resync token, or claim the topology moved. Routes without a readback or observability
    // reader (control, learning) have no telemetry invalidation yet; that is explicit remaining
    // coverage, not a fabricated refresh.
    const invalidateCurrentRoute = (model: Model): UpdateReturn<Model, Message> => {
      const readbackKey = readbackKeyForRouteTag(model.route._tag);
      if (readbackKey !== null) {
        const token = model.readbacks[readbackKey].token + 1;
        const detailId =
          model.route._tag === "RequestDetail" || model.route._tag === "RouterDecisionDetail"
            ? model.route.requestId
            : undefined;
        // S280A: mirror the current route's own read arguments. The Index overview
        // (readback.ts:914-920) and the Dashboard summary (:757-763) take their window as the query /
        // id (update.ts:493/503, init.ts:146); omitting them requests an empty windowMs and silently
        // drops the selected overview window and filters.
        const windowMs = model.overviewWindowMs ?? 86_400_000;
        const id = readbackKey === "dashboard" ? String(windowMs) : detailId;
        const query =
          readbackKey === "overviewMetrics"
            ? overviewQuery(model.overviewFilters ?? DEFAULT_OVERVIEW_FILTERS, windowMs)
            : undefined;
        return {
          // The command's id/query args are typed optional, so undefined forwards as "absent".
          commands: [readReadback({ id, key: readbackKey, query, token })],
          model: {
            ...model,
            readbacks: { ...model.readbacks, [readbackKey]: loadingReadback(token) },
          },
        };
      }
      if (model.route._tag === "Observability") {
        const token = model.observability.token + 1;
        return {
          commands: [readObservability({ token })],
          model: { ...model, observability: loadingObservability(token) },
        };
      }
      return { model };
    };

    return (model: Model, message: Message): UpdateReturn<Model, Message> =>
    Message.match<UpdateReturn<Model, Message>>(message, {
      ChangedUrl: ({ url }) => {
        const resolved = resolveAppUrl(url);
        const incomingHref = canonicalHrefForUrl(url);
        // S272: consume exactly the pending replace echo of our own Navigation.replaceUrl
        // Command. The marker is keyed to the exact canonical href, so a genuine same-route
        // navigation (the same URL after the echo, a changed query, another detail ID, or an
        // interleaved route) runs the baseline read/reset/resync/scroll instead of being dropped.
        if (isPendingRedirectEcho(model, resolved, incomingHref)) {
          return { model: { ...model, pendingRedirectHref: undefined } };
        }
        const result = navigateToRoute(model, resolved.route, resolved.canonicalUrl);
        if (resolved.redirectHref === undefined) {
          return { ...result, model: { ...result.model, pendingRedirectHref: undefined } };
        }
        return {
          ...result,
          commands: [
            ...(result.commands ?? []),
            replaceLegacyUrlCommand({ href: resolved.redirectHref }),
          ],
          model: { ...result.model, pendingRedirectHref: resolved.redirectHref },
        };
      },
      Clicked: () => ({ model: { ...model, clicks: model.clicks + 1 } }),
      ClickedLink: ({ request }) =>
        UrlRequest.match<UpdateReturn<Model, Message>>(request, {
          External: () => ({ model }),
          Internal: ({ url }) => ({
            commands: [pushInternal({ href: urlToString(url) })],
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
      ControlActionRequested: ({ key, targetId }) => {
        const current = model.controls[key];
        if (current.actionStatus === "pending") return { model };
        const token = current.token + 1;
        return {
          commands: [dispatchControl({ endpointId: targetId, key, token })],
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
        if (key === "runtimeConfig") {
          let text = "{}"; let originalText = "{}";
          try { const meta = snapshot.rows[0]?.meta; const parsed = meta === undefined ? undefined : JSON.parse(meta) as { config?: unknown }; if (parsed?.config !== undefined) { text = JSON.stringify(parsed.config, null, 2); originalText = text; } } catch {}
          return { model: { ...model, readbacks: { ...model.readbacks, runtimeConfig: { ...snapshot, token } }, runtimeConfigEditor: { diff: [], originalText, status: "editing", text, token } } };
        }
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
        const filters = model.overviewFilters ?? DEFAULT_OVERVIEW_FILTERS;
        return {
          commands: [readReadback({ key: "overviewMetrics", query: overviewQuery(filters, windowMs), token })],
          model: { ...model, overviewWindowMs: windowMs, readbacks: { ...model.readbacks, overviewMetrics: loadingReadback(token) } },
        };
      },
      OverviewFilterChanged: ({ filter, value }) => {
        const current = model.readbacks.overviewMetrics;
        const token = current.token + 1;
        const previous = model.overviewFilters ?? DEFAULT_OVERVIEW_FILTERS;
        const filters: OverviewFilters = { ...previous, [filter]: value } as OverviewFilters;
        return {
          commands: [readReadback({ key: "overviewMetrics", query: overviewQuery(filters, model.overviewWindowMs ?? 86400000), token })],
          model: { ...model, overviewFilters: filters, readbacks: { ...model.readbacks, overviewMetrics: loadingReadback(token) } },
        };
      },
  RuntimeConfigLoadRequested: () => {
    const token = model.readbacks.runtimeConfig.token + 1;
    const previous = model.runtimeConfigEditor;
    return { commands: [readReadback({ key: "runtimeConfig", token })], model: { ...model, ...(previous === undefined ? {} : { runtimeConfigEditor: { ...previous, status: "loading" } }), readbacks: { ...model.readbacks, runtimeConfig: loadingReadback(token) } } };
  },
  RuntimeConfigTextChanged: ({ text }) => {
    const snapshot = runtimeConfigSnapshot(model);
    const current = model.runtimeConfigEditor ?? { diff: [], originalText: snapshot.text, status: "editing" as const, text: snapshot.text, token: 0 };
    return { model: { ...model, runtimeConfigEditor: { ...current, diff: [], message: undefined, notice: undefined, status: "editing", text } } };
  },
  RuntimeConfigSaveRequested: () => {
    const snapshot = runtimeConfigSnapshot(model);
    const current = model.runtimeConfigEditor ?? { diff: [], originalText: snapshot.text, status: "editing" as const, text: snapshot.text, token: 0 };
    const parsed = parseRuntimeConfigText(current.text);
    if ("error" in parsed) return { model: { ...model, runtimeConfigEditor: { ...current, message: parsed.error, status: "invalid" } } };
    const diff = runtimeConfigDiff(snapshot.config, parsed.config);
    if (diff.length === 0) return { model: { ...model, runtimeConfigEditor: { ...current, diff, message: "No top-level changes.", status: "editing" } } };
    return { model: { ...model, runtimeConfigEditor: { ...current, diff, message: undefined, notice: undefined, status: "confirming" } } };
  },
  RuntimeConfigConfirmRequested: ({ token }) => {
    const current = model.runtimeConfigEditor;
    if (current === undefined || current.status !== "confirming" || saveRuntimeConfig === undefined) return { model };
    return { commands: [saveRuntimeConfig({ configText: current.text, originalText: current.originalText, token })], model: { ...model, runtimeConfigEditor: { ...current, message: undefined, status: "pending", token } } };
  },
  RuntimeConfigSaved: ({ recordJson, token }) => {
    const current = model.runtimeConfigEditor;
    if (current === undefined || token !== current.token) return { model };
    let parsedRecord: unknown; try { parsedRecord = JSON.parse(recordJson); } catch { parsedRecord = undefined; }
    const record = parseRuntimeConfigRecord(parsedRecord);
    if (record === undefined) return { model: { ...model, runtimeConfigEditor: { ...current, message: "Runtime config read failed: invalid response", status: "error" } } };
    const text = runtimeConfigText(record);
    return { model: { ...model, runtimeConfigEditor: { ...current, diff: [], notice: "Applied snapshot from server", originalText: text, status: "saved", text } } };
  },
  RuntimeConfigSaveFailed: ({ message, token }) => {
    const current = model.runtimeConfigEditor;
    if (current === undefined || token !== current.token) return { model };
    return { model: { ...model, runtimeConfigEditor: { ...current, message, status: "error" } } };
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
    // S207: send a model this host serves. The Studio default is a fixed id; when the catalogue does
    // not contain it the request fails with no_eligible_target.
    const catalogueState = model.readbacks.configuredModels;
    const catalogue = catalogueState.status === "ok" ? catalogueState.rows.map((entry) => entry.id).filter((id) => id.length > 0) : [];
    const modelForRequest = catalogue.length > 0 && !catalogue.includes(current.model) ? catalogue[0]! : current.model;
    const next = { ...studioLoading(token), ...current, model: modelForRequest, message: undefined, responseText: "Waiting for the runtime…", status: "loading" as const, statusCode: 0, token };
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
      RuntimeTelemetryReceived: () => invalidateCurrentRoute(model),
      // S290: a persisted pageshow restore is a real page-lifecycle fact, not telemetry or a revision:
      // re-read the current route with the same query-preserving invalidator and leave the watermark.
      RuntimePageRestored: () => invalidateCurrentRoute(model),
      ThemeApplied: () => ({ model }),
      ToggledTheme: () => {
        const theme = model.theme === "light" ? "dark" : "light";
        return {
          commands: [applyThemeCommand({ theme })],
          model: { ...model, theme },
        };
      },
    });
  };