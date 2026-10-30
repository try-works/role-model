import { Command, Navigation } from "@role-model-router/foldkit";
import { UrlRequest } from "@role-model-router/foldkit/navigation";
import type { Return as UpdateReturn } from "@role-model-router/foldkit/update";
import { type Url, toString as urlToString } from "@role-model-router/foldkit/url";
import { Effect, Schema } from "effect";
import { type Message as DialogMessage } from "@role-model-router/foldkit-ui/dialog";
import { type RequestsMetricListboxModel, initRequestsMetricListbox, initRequestsTargetListbox, requestsMetricListbox } from "./ui/listbox";
import { updateDeviceAuthDialog } from "./ui/dialog";
import {
  deviceAuthCancelledState,
  deviceAuthFailedState,
  withDeviceAuthDialog,
} from "./features/device-auth/update";
import {
  endpointAdmissionCompletionState,
  endpointAdmissionFieldChangedState,
  endpointAdmissionModelAddedState,
  endpointAdmissionModelRemovedState,
  endpointAdmissionResetState,
} from "./features/endpoint-activation/update";

import { DEFAULT_OVERVIEW_FILTERS, overviewQuery, type OverviewFilters } from "./overview-filters";
import { parseRuntimeConfigRecord, parseRuntimeConfigText, runtimeConfigDiff, runtimeConfigText } from "./runtime-config";

import {
  type DispatchControlCommand,
  type DispatchStudioCommand,
  type ReadControlCommand,
  type ReadDiagnosticsCommand,
  type ReadObservabilityCommand,
  type DeviceAuthCommands,
  type EndpointAdmissionCommands,
  type RequestsRankingCommands,
  noopRequestsRankingCommands,
  type LearningRankingCommands,
  noopLearningRankingCommands,
  localPolicyCommands,
  noopEndpointAdmissionCommands,
  type ProviderAccountCommands,
  noopProviderAccountCommands,
  noopDeviceAuthCommands,
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
import { buildRequestsRankingQuery, initialRequestsRankingState, requestsRankingMetricOf, requestsRankingTargetOf } from "./requests-ranking";
import { initialLearningRankingState } from "./learning-ranking";
import {
  chartInteractionForRoute,
  hideChartTooltip,
  showChartPoint,
  toggleChartSeries,
} from "./chart-interaction";
import {
  endpointAdmissionBusy,
  endpointActivationPayloads,
  type EndpointAdmissionState,
  endpointBatchPayload,
  initialEndpointAdmissionState,
  validateEndpointAdmissionDraft,
} from "./endpoint-admission";
import {
  beginEndpointActivationRun,
  endpointActivationNeedsReset,
  settleEndpointActivation,
} from "./endpoint-activation-tracker";
import {
  createProviderAccountPayload,
  initialProviderAccountState,
  providerAccountBusy,
  updateProviderKeyPayload,
  type ProviderAccountState,
} from "./provider-account";
import {
  activationPlanForConnectedSession,
  deviceAuthPollDelayMs,
  deviceAuthStartPlan,
  initialDeviceAuthState,
  mergeDeviceAuthPoll,
  type DeviceAuthState,
} from "./device-auth";
import { canonicalHrefForUrl, replaceLegacyUrlCommand } from "./legacy-redirects";
import {
  mergeRequestsRankingFailed,
  mergeRequestsRankingLoaded,
  planRequestsRankingFieldChange,
} from "./features/requests-ranking/update";
import {
  mergeLearningLadderFailed,
  mergeLearningLadderUpdated,
  planLearningLadderToggle,
} from "./features/learning-ranking/update";
import { Message } from "./message";
import type { Model } from "./model";
import { failedObservability, idleObservability, loadingObservability } from "./observability";
import {
  READBACK_SPECS,
  emptyReadbacks,
  localPolicyDraftFromReadback,
  localPolicyFromReadback,
  localPolicyReadback,
  type LocalPolicyObject,
  withLocalPolicyDraft,
  failedReadback,
  loadingReadback,
  type ReadbackKey,
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
  localLlamaSwapModels: async () => ({ body: { items: [] }, status: 200 }),
  localPolicy: async () => ({ body: {}, status: 200 }),
  operatorStatus: async () => ({ body: { items: [] }, status: 200 }),
  operatorTraceRoots: async () => ({ body: { items: [] }, status: 200 }),
  extensions: async () => ({ body: { items: [] }, status: 200 }),
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
    deviceAuthCommands: DeviceAuthCommands = noopDeviceAuthCommands,
    providerAccountCommands: ProviderAccountCommands = noopProviderAccountCommands,
    endpointAdmissionCommands: EndpointAdmissionCommands = noopEndpointAdmissionCommands,
    learningRankingCommands: LearningRankingCommands = noopLearningRankingCommands,
    requestsRankingCommands: RequestsRankingCommands = noopRequestsRankingCommands,
  ) => {


const updateRequestsRankingField = (
  model: Model,
  field: "metric" | "rankingTarget",
  value: string,
): UpdateReturn<Model, Message> => {
  const state = model.requestsRanking ?? initialRequestsRankingState();
  const plan = planRequestsRankingFieldChange(state, field, value);
  if (plan.kind === "error") {
    return { model: { ...model, requestsRanking: plan.state } };
  }
  return {
    commands: [requestsRankingCommands.query({ payload: JSON.stringify(plan.payload), token: plan.state.token })],
    model: { ...model, requestsRanking: plan.state },
  };
};

const updateRequestsMetricListbox = (
  model: Model,
  message: Parameters<typeof requestsMetricListbox.update>[1],
): UpdateReturn<Model, Message> => {
  const child = requestsMetricListbox.update(
    model.requestsRankingMetricListbox ?? initRequestsMetricListbox(),
    message,
  );
  const nextModel: Model = {
    ...model,
    // SAFETY: the child model comes from this single-select Listbox's own update, whose Model schema is the bound child type.
    requestsRankingMetricListbox: child.model as RequestsMetricListboxModel,
  };
  if (child.outMessage !== undefined) {
    return updateRequestsRankingField(nextModel, "metric", child.outMessage.value);
  }
  return {
    commands: Command.mapMessages(child.commands ?? [], (childMessage) =>
      Message.GotRequestsRankingMetricListboxMessage({ message: childMessage }),
    ),
    model: nextModel,
  };
};

const updateRequestsTargetListbox = (
  model: Model,
  message: Parameters<typeof requestsMetricListbox.update>[1],
): UpdateReturn<Model, Message> => {
  const child = requestsMetricListbox.update(
    model.requestsRankingTargetListbox ?? initRequestsTargetListbox(),
    message,
  );
  const nextModel: Model = {
    ...model,
    // SAFETY: the child model comes from this single-select Listbox's own update, whose Model schema is the bound child type.
    requestsRankingTargetListbox: child.model as RequestsMetricListboxModel,
  };
  if (child.outMessage !== undefined) {
    return updateRequestsRankingField(nextModel, "rankingTarget", child.outMessage.value);
  }
  return {
    commands: Command.mapMessages(child.commands ?? [], (childMessage) =>
      Message.GotRequestsRankingTargetListboxMessage({ message: childMessage }),
    ),
    model: nextModel,
  };
};

const endpointAdmissionCompletion = (
  model: Model,
  state: EndpointAdmissionState,
  run: EndpointAdmissionState["run"],
): UpdateReturn<Model, Message> => {
  return {
    model: { ...model, endpointAdmission: endpointAdmissionCompletionState(state, run) },
  };
};

    const navigateToRoute = (
      model: Model,
      route: AppRoute,
      canonicalUrl: Url,
    ): UpdateReturn<Model, Message> => {
      // S409: a real navigation resets the route-scoped chart interaction (tooltip cleared, token bumped).
      const chartInteraction = chartInteractionForRoute(model.chartInteraction, route._tag);
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
            chartInteraction,
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
            chartInteraction,
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
            chartInteraction,
            studio: studioIdle(studioTabFromUrl(canonicalUrl) ?? "chat"),
          },
        };
      }
      if (route._tag === "Endpoints" || route._tag === "Providers") {
        const keys: ReadonlyArray<ReadbackKey> = route._tag === "Endpoints"
          ? ["modelEndpoints", "configuredModels", "integrationProviders"]
          : ["integrationProviders", "configuredModels", "modelEndpoints"];
        const readbacks = { ...emptyReadbacks() };
        const controlKey = route._tag === "Endpoints" ? "endpoints" : "providers";
        const controlToken = model.controls[controlKey].token + 1;
        const commands = keys.map((key) => {
          const token = model.readbacks[key].token + 1;
          readbacks[key] = loadingReadback(token);
          return readReadback({ key, token });
        });
        return {
          commands: [...commands, readControl({ key: controlKey, token: controlToken }), scrollShellToTopCommand()],
          model: {
            ...model,
            controls: { ...emptyControls(), [controlKey]: loadingControl(controlToken) },
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
            chartInteraction,
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
            chartInteraction,
          },
        };
      }
      const readbackKey = readbackKeyForRouteTag(route._tag);
      if (readbackKey !== null) {
        const learningPacks = route._tag === "Learning";
        const token = model.readbacks[readbackKey].token + 1;
        const readbacks = { ...model.readbacks, [readbackKey]: loadingReadback(token) };
        return {
          commands: [
            readReadback({ id: route._tag === "RequestDetail" || route._tag === "RouterDecisionDetail" ? route.requestId : undefined, key: readbackKey, token }),
            ...(learningPacks ? [readReadback({ key: "learningPacks", token })] : []),
            scrollShellToTopCommand(),
          ],
          model: {
            ...model,
            diagnostics: idleDiagnostics(),
            observability: idleObservability(),
            readbacks: learningPacks ? { ...readbacks, learningPacks: loadingReadback(token) } : readbacks,
            refresh: {
              ...model.refresh,
              message: undefined,
              resyncToken: model.refresh.resyncToken + 1,
              status: "idle",
            },
            route,
            chartInteraction,
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
          chartInteraction,
        },
      };
    };

    // S278 (R12): a telemetry invalidation re-reads only the current route, through the same real
    // commands a contiguous revision uses. It writes nothing to `refresh`: the telemetry payload
    // carries no revision, so this transition must never advance the watermark, bump the
    // gap/resync token, or claim the topology moved. Routes without a readback or observability
    // reader (control, learning) have no telemetry invalidation yet; that is explicit remaining
    // coverage, not a fabricated refresh.
    /**
     * S392a (R12): the typed read plan for the current route. EVERY real source of the route is
     * listed with its per-key token owner; multi-source pages (ModelsRoles, SystemOperator) return
     * two entries so one telemetry event invalidates all of them, never only the first.
     */
const updateLocalPolicyDraft = (
  model: Model,
  change: Partial<LocalPolicyObject>,
): UpdateReturn<Model, Message> => {
  const state = model.readbacks.localPolicy;
  const draft = localPolicyDraftFromReadback(state);
  if (draft === undefined || state.status !== "ok") return { model };
  return {
    model: {
      ...model,
      readbacks: { ...model.readbacks, localPolicy: withLocalPolicyDraft({ ...state, message: undefined }, { ...draft, ...change }) },
    },
  };
};

    const readPlanForRoute = (model: Model): ReadonlyArray<{ readonly key: ReadbackKey; readonly id?: string; readonly query?: string }> => {
      if (model.route._tag === "Learning") return [{ key: "learning" }, { key: "learningPacks" }];
      if (model.route._tag === "ModelsRoles") return [{ key: "configuredModels" }, { key: "modelEndpoints" }];
      if (model.route._tag === "Providers") return [{ key: "integrationProviders" }, { key: "configuredModels" }, { key: "modelEndpoints" }];
      if (model.route._tag === "Endpoints") return [{ key: "modelEndpoints" }, { key: "configuredModels" }, { key: "integrationProviders" }];
      if (model.route._tag === "IntegrationsDownstream") return [{ key: "downstreamOpenAI" }, { key: "configuredModels" }];
      if (model.route._tag === "IntegrationsUpstream") return [{ key: "integrationProviders" }, { key: "configuredModels" }];
      if (model.route._tag === "SystemOperator") return [{ key: "operatorStatus" }, { key: "operatorTraceRoots" }];
      if (model.route._tag === "RuntimeConfig") return [{ key: "runtimeConfig" }];
      const readbackKey = readbackKeyForRouteTag(model.route._tag);
      if (readbackKey === null) return [];
      const detailId =
        model.route._tag === "RequestDetail" || model.route._tag === "RouterDecisionDetail"
          ? model.route.requestId
          : undefined;
      const windowMs = model.overviewWindowMs ?? 86_400_000;
      const id = readbackKey === "dashboard" ? String(windowMs) : detailId;
      const query =
        readbackKey === "overviewMetrics"
          ? overviewQuery(model.overviewFilters ?? DEFAULT_OVERVIEW_FILTERS, windowMs)
          : undefined;
      return [{ id, key: readbackKey, query }];
    };

    const invalidateCurrentRoute = (model: Model): UpdateReturn<Model, Message> => {
      const plan = readPlanForRoute(model);
      if (plan.length > 0) {
        const readbacks = { ...model.readbacks };
        const commands = plan.map((entry) => {
          const token = readbacks[entry.key].token + 1;
          readbacks[entry.key] = entry.key === "localPolicy"
            ? { ...readbacks.localPolicy, message: undefined, status: "loading", token }
            : loadingReadback(token);
          // The command's id/query args are typed optional, so undefined forwards as "absent".
          return readReadback({ id: entry.id, key: entry.key, query: entry.query, token });
        });
        const learningRanking = model.route._tag === "Learning"
          ? { nextToken: model.learningRanking?.nextToken, phases: {} }
          : model.learningRanking;
        return { commands, model: { ...model, learningRanking, readbacks } };
      }
      if (model.route._tag === "Observability") {
        const token = model.observability.token + 1;
        return {
          commands: [readObservability({ token })],
          model: { ...model, observability: loadingObservability(token) },
        };
      }
      const controlKey = controlKeyForRouteTag(model.route._tag);
      if (controlKey !== null) {
        const token = model.controls[controlKey].token + 1;
        return {
          commands: [readControl({ key: controlKey, token })],
          model: { ...model, controls: { ...model.controls, [controlKey]: loadingControl(token) } },
        };
      }
      return { model };
    };

    return (model: Model, message: Message): UpdateReturn<Model, Message> => {
      const shellHandlers = {
        ChangedUrl: ({ url }: Extract<Message, { readonly _tag: "ChangedUrl" }>): UpdateReturn<Model, Message> => {
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
        Clicked: (): UpdateReturn<Model, Message> => ({ model: { ...model, clicks: model.clicks + 1 } }),
        ClickedLink: ({ request }: Extract<Message, { readonly _tag: "ClickedLink" }>): UpdateReturn<Model, Message> =>
          UrlRequest.match<UpdateReturn<Model, Message>>(request, {
            External: () => ({ model }),
            Internal: ({ url }) => ({
              commands: [pushInternal({ href: urlToString(url) })],
              model,
            }),
          }),
        NavigationCompleted: (): UpdateReturn<Model, Message> => ({ model }),
        SelectedOverviewWindow: ({ windowMs }: Extract<Message, { readonly _tag: "SelectedOverviewWindow" }>): UpdateReturn<Model, Message> => {
          const current = model.readbacks.overviewMetrics;
          const token = current.token + 1;
          const filters = model.overviewFilters ?? DEFAULT_OVERVIEW_FILTERS;
          return {
            commands: [readReadback({ key: "overviewMetrics", query: overviewQuery(filters, windowMs), token })],
            model: { ...model, overviewWindowMs: windowMs, readbacks: { ...model.readbacks, overviewMetrics: loadingReadback(token) } },
          };
        },
        OverviewFilterChanged: ({ filter, value }: Extract<Message, { readonly _tag: "OverviewFilterChanged" }>): UpdateReturn<Model, Message> => {
          const current = model.readbacks.overviewMetrics;
          const token = current.token + 1;
          const previous = model.overviewFilters ?? DEFAULT_OVERVIEW_FILTERS;
          const filters: OverviewFilters = { ...previous, [filter]: value } as OverviewFilters;
          return {
            commands: [readReadback({ key: "overviewMetrics", query: overviewQuery(filters, model.overviewWindowMs ?? 86400000), token })],
            model: { ...model, overviewFilters: filters, readbacks: { ...model.readbacks, overviewMetrics: loadingReadback(token) } },
          };
        },
        RefreshResyncFailed: ({ message, routeId, token }: Extract<Message, { readonly _tag: "RefreshResyncFailed" }>): UpdateReturn<Model, Message> =>
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
        RuntimeRevisionReceived: ({ revision }: Extract<Message, { readonly _tag: "RuntimeRevisionReceived" }>): UpdateReturn<Model, Message> => {
          const current = model.refresh;
          if (revision <= current.lastAppliedRevision) {
            // An older revision arriving after a newer one must not be applied.
            return { model };
          }
          const gap = current.lastAppliedRevision > 0 && revision > current.lastAppliedRevision + 1;
          if (!gap) {
            if (model.route._tag === "Learning") {
              const learningToken = model.readbacks.learning.token + 1;
              const packsToken = model.readbacks.learningPacks.token + 1;
              return {
                commands: [readReadback({ key: "learning", token: learningToken }), readReadback({ key: "learningPacks", token: packsToken })],
                model: {
                  ...model,
                  learningRanking: { nextToken: model.learningRanking?.nextToken, phases: {} },
                  readbacks: { ...model.readbacks, learning: loadingReadback(learningToken), learningPacks: loadingReadback(packsToken) },
                  refresh: {
                    ...current,
                    lastAppliedRevision: revision,
                    message: current.status === "stale" ? current.message : undefined,
                    status: current.status === "stale" ? "stale" : "live",
                  },
                },
              };
            }
            const readbackKey = readbackKeyForRouteTag(model.route._tag);
            if (readbackKey !== null) {
              const token = model.readbacks[readbackKey].token + 1;
              const nextReadback = readbackKey === "localPolicy"
                ? { ...model.readbacks.localPolicy, message: undefined, status: "loading" as const, token }
                : loadingReadback(token);
              return {
                commands: [readReadback({ id: model.route._tag === "RequestDetail" || model.route._tag === "RouterDecisionDetail" ? model.route.requestId : undefined, key: readbackKey, token })],
                model: {
                  ...model,
                  readbacks: { ...model.readbacks, [readbackKey]: nextReadback },
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
        RuntimeTelemetryReceived: (): UpdateReturn<Model, Message> => invalidateCurrentRoute(model),
        // S290: a persisted pageshow restore is a real page-lifecycle fact, not telemetry or a revision:
        // re-read the current route with the same query-preserving invalidator and leave the watermark.
        RuntimePageRestored: (): UpdateReturn<Model, Message> => invalidateCurrentRoute(model),
        ThemeApplied: (): UpdateReturn<Model, Message> => ({ model }),
        ToggledTheme: (): UpdateReturn<Model, Message> => {
          const theme = model.theme === "light" ? "dark" : "light";
          return {
            commands: [applyThemeCommand({ theme })],
            model: { ...model, theme },
          };
        },
      };
      const remainingHandlers = {
        ControllerEndpointSelected: ({ endpointId }: Extract<Message, { readonly _tag: "ControllerEndpointSelected" }>): UpdateReturn<Model, Message> => {
          const current = model.controls.controlController;
          return { model: { ...model, controls: { ...model.controls, controlController: { ...current, selectedEndpointId: endpointId } } } };
        },
        ControllerSaveRequested: ({ endpointId }: Extract<Message, { readonly _tag: "ControllerSaveRequested" }>): UpdateReturn<Model, Message> => {
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
        ControlActionCompleted: ({ key, message, serverEndpointId, token }: Extract<Message, { readonly _tag: "ControlActionCompleted" }>): UpdateReturn<Model, Message> => {
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
        ControlActionFailed: ({ key, message, token }: Extract<Message, { readonly _tag: "ControlActionFailed" }>): UpdateReturn<Model, Message> => {
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
        ControlActionRequested: ({ key, targetId }: Extract<Message, { readonly _tag: "ControlActionRequested" }>): UpdateReturn<Model, Message> => {
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
        ControlFailed: ({ key, message, token }: Extract<Message, { readonly _tag: "ControlFailed" }>): UpdateReturn<Model, Message> => {
          if (token !== model.controls[key].token) return { model };
          return {
            model: {
              ...model,
              controls: { ...model.controls, [key]: failedControl(message, token) },
            },
          };
        },
        ControlLoaded: ({ key, snapshot, token }: Extract<Message, { readonly _tag: "ControlLoaded" }>): UpdateReturn<Model, Message> => {
          if (token !== model.controls[key].token) return { model };
          const previous = model.controls[key];
          return {
            model: { ...model, controls: { ...model.controls, [key]: { ...snapshot, notice: previous.notice, selectedEndpointId: previous.selectedEndpointId ?? snapshot.selectedEndpointId, token } } },
          };
        },
        DiagnosticsFailed: ({ id, message }: Extract<Message, { readonly _tag: "DiagnosticsFailed" }>): UpdateReturn<Model, Message> =>
          model.route._tag === "Diagnostics" && model.route.id === id
            ? { model: { ...model, diagnostics: failedDiagnostics(id, message) } }
            : { model },
        DiagnosticsLoaded: ({ id, snapshot }: Extract<Message, { readonly _tag: "DiagnosticsLoaded" }>): UpdateReturn<Model, Message> =>
          model.route._tag === "Diagnostics" && model.route.id === id
            ? { model: { ...model, diagnostics: snapshot } }
            : { model },
        DiagnosticsRefreshRequested: (): UpdateReturn<Model, Message> =>
          model.route._tag === "Diagnostics"
            ? {
                commands: [readDiagnostics({ id: model.route.id })],
                model: {
                  ...model,
                  diagnostics: loadingDiagnostics(model.route.id),
                },
              }
            : { model },
        ObservabilityFailed: ({ message, token }: Extract<Message, { readonly _tag: "ObservabilityFailed" }>): UpdateReturn<Model, Message> =>
          model.route._tag === "Observability" && token === model.observability.token
            ? { model: { ...model, observability: failedObservability(message, token) } }
            : { model },
        ObservabilityLoaded: ({ snapshot, token }: Extract<Message, { readonly _tag: "ObservabilityLoaded" }>): UpdateReturn<Model, Message> =>
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
        ReadbackFailed: ({ key, message, token }: Extract<Message, { readonly _tag: "ReadbackFailed" }>): UpdateReturn<Model, Message> => {
          const routeKey = readbackKeyForRouteTag(model.route._tag);
          if ((key !== "learningPacks" && routeKey !== key) || token !== model.readbacks[key].token) return { model };
          const learningRanking = key === "learningPacks"
            ? {
                nextToken: model.learningRanking?.nextToken,
                phases: Object.fromEntries(
                  Object.entries(model.learningRanking?.phases ?? {}).filter(([, entry]) => entry.scopeId === undefined),
                ),
              }
            : model.learningRanking;
          const previous = model.readbacks.localPolicy;
          const nextReadback = key === "localPolicy" && previous.rows.length > 0
            ? { ...previous, message, status: "ok" as const, token }
            : failedReadback(message, token);
          return {
            model: {
              ...model,
              learningRanking,
              readbacks: { ...model.readbacks, [key]: nextReadback },
            },
          };
        },
        ReadbackLoaded: ({ key, snapshot, token }: Extract<Message, { readonly _tag: "ReadbackLoaded" }>): UpdateReturn<Model, Message> => {
          if (token !== model.readbacks[key].token) return { model };
          if (key === "learningPacks") {
            if (snapshot.token !== model.readbacks[key].token) return { model };
            const fresh = snapshot.status === "ok" || snapshot.status === "empty";
            const nextScope = fresh ? snapshot.scopeId : undefined;
            const currentScope = model.learningRanking?.scopeId;
            const scopeChanged = fresh && nextScope !== currentScope;
            const phases = !fresh
              ? Object.fromEntries(Object.entries(model.learningRanking?.phases ?? {}).filter(([, entry]) => entry.scopeId === undefined))
              : scopeChanged
                ? Object.fromEntries(
                    Object.entries(model.learningRanking?.phases ?? {}).filter(([, entry]) => entry.scopeId === nextScope),
                  )
                : (model.learningRanking?.phases ?? {});
            const nextRanking = nextScope === undefined
              ? { nextToken: model.learningRanking?.nextToken, phases }
              : { nextToken: model.learningRanking?.nextToken, phases, scopeId: nextScope };
            return {
              model: {
                ...model,
                learningRanking: nextRanking,
                readbacks: { ...model.readbacks, [key]: { ...snapshot, token } },
                refresh:
                  snapshot.status === "error"
                    ? model.refresh
                    : { ...model.refresh, message: undefined, status: "live" },
              },
            };
          }
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
        RuntimeConfigLoadRequested: (): UpdateReturn<Model, Message> => {
          const token = model.readbacks.runtimeConfig.token + 1;
          const previous = model.runtimeConfigEditor;
          return { commands: [readReadback({ key: "runtimeConfig", token })], model: { ...model, ...(previous === undefined ? {} : { runtimeConfigEditor: { ...previous, status: "loading" } }), readbacks: { ...model.readbacks, runtimeConfig: loadingReadback(token) } } };
        },
        RuntimeConfigTextChanged: ({ text }: Extract<Message, { readonly _tag: "RuntimeConfigTextChanged" }>): UpdateReturn<Model, Message> => {
          const snapshot = runtimeConfigSnapshot(model);
          const current = model.runtimeConfigEditor ?? { diff: [], originalText: snapshot.text, status: "editing" as const, text: snapshot.text, token: 0 };
          return { model: { ...model, runtimeConfigEditor: { ...current, diff: [], message: undefined, notice: undefined, status: "editing", text } } };
        },
        RuntimeConfigSaveRequested: (): UpdateReturn<Model, Message> => {
          const snapshot = runtimeConfigSnapshot(model);
          const current = model.runtimeConfigEditor ?? { diff: [], originalText: snapshot.text, status: "editing" as const, text: snapshot.text, token: 0 };
          const parsed = parseRuntimeConfigText(current.text);
          if ("error" in parsed) return { model: { ...model, runtimeConfigEditor: { ...current, message: parsed.error, status: "invalid" } } };
          const diff = runtimeConfigDiff(snapshot.config, parsed.config);
          if (diff.length === 0) return { model: { ...model, runtimeConfigEditor: { ...current, diff, message: "No top-level changes.", status: "editing" } } };
          return { model: { ...model, runtimeConfigEditor: { ...current, diff, message: undefined, notice: undefined, status: "confirming" } } };
        },
        RuntimeConfigConfirmRequested: ({ token }: Extract<Message, { readonly _tag: "RuntimeConfigConfirmRequested" }>): UpdateReturn<Model, Message> => {
          const current = model.runtimeConfigEditor;
          if (current === undefined || current.status !== "confirming" || saveRuntimeConfig === undefined) return { model };
          return { commands: [saveRuntimeConfig({ configText: current.text, originalText: current.originalText, token })], model: { ...model, runtimeConfigEditor: { ...current, message: undefined, status: "pending", token } } };
        },
        RuntimeConfigSaved: ({ recordJson, token }: Extract<Message, { readonly _tag: "RuntimeConfigSaved" }>): UpdateReturn<Model, Message> => {
          const current = model.runtimeConfigEditor;
          if (current === undefined || token !== current.token) return { model };
          let parsedRecord: unknown; try { parsedRecord = JSON.parse(recordJson); } catch { parsedRecord = undefined; }
          const record = parseRuntimeConfigRecord(parsedRecord);
          if (record === undefined) return { model: { ...model, runtimeConfigEditor: { ...current, message: "Runtime config read failed: invalid response", status: "error" } } };
          const text = runtimeConfigText(record);
          return { model: { ...model, runtimeConfigEditor: { ...current, diff: [], notice: "Applied snapshot from server", originalText: text, status: "saved", text } } };
        },
        RuntimeConfigSaveFailed: ({ message, token }: Extract<Message, { readonly _tag: "RuntimeConfigSaveFailed" }>): UpdateReturn<Model, Message> => {
          const current = model.runtimeConfigEditor;
          if (current === undefined || token !== current.token) return { model };
          return { model: { ...model, runtimeConfigEditor: { ...current, message, status: "error" } } };
        },
        StudioTabSelected: ({ tab }: Extract<Message, { readonly _tag: "StudioTabSelected" }>): UpdateReturn<Model, Message> => {
          const current = model.studio ?? studioIdle();
          return { model: { ...model, studio: studioIdle(tab) } };
        },
        StudioTabKey: ({ key }: Extract<Message, { readonly _tag: "StudioTabKey" }>): UpdateReturn<Model, Message> => {
          const current = model.studio ?? studioIdle();
          const tabs = ["chat", "images", "audio", "rerank", "advanced"] as const;
          const index = tabs.indexOf(current.tab);
          const next = key === "Home" ? 0 : key === "End" ? tabs.length - 1 : key === "ArrowRight" ? (index + 1) % tabs.length : key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length : index;
          return { model: { ...model, studio: studioIdle(tabs[next] ?? current.tab) } };
        },
        StudioFieldChanged: ({ field, value }: Extract<Message, { readonly _tag: "StudioFieldChanged" }>): UpdateReturn<Model, Message> => {
          const current = model.studio ?? studioIdle();
          return { model: { ...model, studio: { ...current, [field]: value } } };
        },
        StudioRunRequested: ({ token }: Extract<Message, { readonly _tag: "StudioRunRequested" }>): UpdateReturn<Model, Message> => {
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
        StudioLoaded: ({ responseText, statusCode, tab, token }: Extract<Message, { readonly _tag: "StudioLoaded" }>): UpdateReturn<Model, Message> => {
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
        StudioFailed: ({ message, responseText, statusCode, token }: Extract<Message, { readonly _tag: "StudioFailed" }>): UpdateReturn<Model, Message> => {
          const current = model.studio;
          if (current === undefined || token !== current.token) return { model };
          return { model: { ...model, studio: { ...current, message, responseText, status: "error", statusCode } } };
        },
        RefreshResynced: ({ routeId, snapshot, token }: Extract<Message, { readonly _tag: "RefreshResynced" }>): UpdateReturn<Model, Message> => {
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
        ProviderAccountFieldChanged: ({ field, value }: Extract<Message, { readonly _tag: "ProviderAccountFieldChanged" }>): UpdateReturn<Model, Message> => {
          const state = model.providerAccount ?? initialProviderAccountState();
          return { model: { ...model, providerAccount: { ...state, draft: { ...state.draft, [field]: value }, error: undefined } } };
        },
        ProviderAccountModelAdded: (): UpdateReturn<Model, Message> => {
          const state = model.providerAccount ?? initialProviderAccountState();
          const modelId = state.draft.modelInput.trim();
          if (modelId.length === 0) return { model };
          return { model: { ...model, providerAccount: { ...state, draft: { ...state.draft, modelInput: "", selectedModelIds: [...new Set([...state.draft.selectedModelIds, modelId])] } } } };
        },
        ProviderAccountModelRemoved: ({ modelId }: Extract<Message, { readonly _tag: "ProviderAccountModelRemoved" }>): UpdateReturn<Model, Message> => {
          const state = model.providerAccount ?? initialProviderAccountState();
          return { model: { ...model, providerAccount: { ...state, draft: { ...state.draft, selectedModelIds: state.draft.selectedModelIds.filter((id) => id !== modelId) } } } };
        },
        ProviderAccountCreateRequested: (): UpdateReturn<Model, Message> => {
          const state = model.providerAccount ?? initialProviderAccountState();
          if (providerAccountBusy(state)) return { model };
          const token = state.token + 1;
          return {
            commands: [providerAccountCommands.create({ payload: JSON.stringify(createProviderAccountPayload(state)), token })],
            model: { ...model, providerAccount: { ...state, error: undefined, pendingAction: "create", status: "saving", token } },
          };
        },
        ProviderAccountCreateSucceeded: ({ token }: Extract<Message, { readonly _tag: "ProviderAccountCreateSucceeded" }>): UpdateReturn<Model, Message> => {
          const state = model.providerAccount ?? initialProviderAccountState();
          if (token !== state.token) return { model };
          return { model: { ...model, providerAccount: { ...state, error: undefined, pendingAction: undefined, status: "saved" } } };
        },
        ProviderAccountUpdateKeyRequested: (): UpdateReturn<Model, Message> => {
          const state = model.providerAccount ?? initialProviderAccountState();
          if (providerAccountBusy(state)) return { model };
          const token = state.token + 1;
          return {
            commands: [providerAccountCommands.updateKey({ payload: JSON.stringify(updateProviderKeyPayload(state.draft)), token })],
            model: { ...model, providerAccount: { ...state, error: undefined, pendingAction: "update-key", status: "saving", token } },
          };
        },
        ProviderAccountKeyUpdated: ({ token }: Extract<Message, { readonly _tag: "ProviderAccountKeyUpdated" }>): UpdateReturn<Model, Message> => {
          const state = model.providerAccount ?? initialProviderAccountState();
          if (token !== state.token) return { model };
          return { model: { ...model, providerAccount: { ...state, error: undefined, pendingAction: undefined, status: "saved" } } };
        },
        ProviderAccountModelDeleteRequested: ({ modelId }: Extract<Message, { readonly _tag: "ProviderAccountModelDeleteRequested" }>): UpdateReturn<Model, Message> => {
          const state = model.providerAccount ?? initialProviderAccountState();
          if (providerAccountBusy(state)) return { model };
          const token = state.token + 1;
          return {
            commands: [providerAccountCommands.deleteModel({ modelId, providerAccountId: state.draft.providerAccountId.trim(), token })],
            model: { ...model, providerAccount: { ...state, error: undefined, pendingAction: "delete-model", status: "saving", token } },
          };
        },
        ProviderAccountModelDeleted: ({ modelId, token }: Extract<Message, { readonly _tag: "ProviderAccountModelDeleted" }>): UpdateReturn<Model, Message> => {
          const state = model.providerAccount ?? initialProviderAccountState();
          if (token !== state.token) return { model };
          return {
            model: {
              ...model,
              providerAccount: {
                ...state,
                draft: { ...state.draft, selectedModelIds: state.draft.selectedModelIds.filter((id) => id !== modelId) },
                error: undefined,
                pendingAction: undefined,
                status: "saved",
              },
            },
          };
        },
        ProviderAccountFailed: ({ message, token }: Extract<Message, { readonly _tag: "ProviderAccountFailed" }>): UpdateReturn<Model, Message> => {
          const state = model.providerAccount ?? initialProviderAccountState();
          if (token !== state.token) return { model };
          return { model: { ...model, providerAccount: { ...state, error: message, pendingAction: undefined, status: "error" } } };
        },
        LocalPolicyTtlChanged: ({ value }: Extract<Message, { readonly _tag: "LocalPolicyTtlChanged" }>): UpdateReturn<Model, Message> => updateLocalPolicyDraft(model, { ttl: Math.max(0, Math.trunc(value)) }),
        LocalPolicyMaxConcurrencyChanged: ({ value }: Extract<Message, { readonly _tag: "LocalPolicyMaxConcurrencyChanged" }>): UpdateReturn<Model, Message> => updateLocalPolicyDraft(model, { maxConcurrency: Math.max(1, Math.trunc(value)) }),
        LocalPolicyAutoUnloadToggled: (): UpdateReturn<Model, Message> => {
          const draft = localPolicyDraftFromReadback(model.readbacks.localPolicy);
          return draft === undefined ? { model } : updateLocalPolicyDraft(model, { autoUnload: draft.autoUnload !== true });
        },
        LocalPolicyResetRequested: (): UpdateReturn<Model, Message> => {
          const state = model.readbacks.localPolicy;
          const saved = localPolicyFromReadback(state);
          return saved === undefined || state.status !== "ok" ? { model } : {
            model: { ...model, readbacks: { ...model.readbacks, localPolicy: withLocalPolicyDraft({ ...state, message: undefined }, saved) } },
          };
        },
        LocalPolicySaveRequested: (): UpdateReturn<Model, Message> => {
          const state = model.readbacks.localPolicy;
          const draft = localPolicyDraftFromReadback(state);
          if (draft === undefined || state.status !== "ok") return { model };
          const token = state.token + 1;
          return {
            commands: [localPolicyCommands.save({ payload: JSON.stringify(draft), token })],
            model: { ...model, readbacks: { ...model.readbacks, localPolicy: { ...state, message: undefined, status: "loading", token } } },
          };
        },
        LocalPolicySaved: ({ policy, token }: Extract<Message, { readonly _tag: "LocalPolicySaved" }>): UpdateReturn<Model, Message> => {
          const state = model.readbacks.localPolicy;
          if (token !== state.token || state.status !== "loading") return { model };
          // SAFETY: the command serialized the PUT response body; the parser validates the record shape.
          const merged = JSON.parse(policy) as LocalPolicyObject;
          return {
            model: {
              ...model,
              readbacks: { ...model.readbacks, localPolicy: localPolicyReadback(merged, token) },
            },
          };
        },
        LocalPolicySaveFailed: ({ message, token }: Extract<Message, { readonly _tag: "LocalPolicySaveFailed" }>): UpdateReturn<Model, Message> => {
          const state = model.readbacks.localPolicy;
          if (token !== state.token) return { model };
          return { model: { ...model, readbacks: { ...model.readbacks, localPolicy: { ...state, message, status: state.rows.length > 0 ? "ok" : "error" } } } };
        },
        ChartPointShown: ({ label, seriesId, token }: Extract<Message, { readonly _tag: "ChartPointShown" }>): UpdateReturn<Model, Message> => {
          const state = chartInteractionForRoute(model.chartInteraction, model.route._tag);
          return { model: { ...model, chartInteraction: showChartPoint(state, token, seriesId, label) } };
        },
        ChartTooltipDismissed: ({ token }: Extract<Message, { readonly _tag: "ChartTooltipDismissed" }>): UpdateReturn<Model, Message> => {
          const state = chartInteractionForRoute(model.chartInteraction, model.route._tag);
          return { model: { ...model, chartInteraction: hideChartTooltip(state, token) } };
        },
        ChartSeriesToggled: ({ seriesId, token }: Extract<Message, { readonly _tag: "ChartSeriesToggled" }>): UpdateReturn<Model, Message> => {
          const state = chartInteractionForRoute(model.chartInteraction, model.route._tag);
          return { model: { ...model, chartInteraction: toggleChartSeries(state, token, seriesId) } };
        },
      };
      const deviceAuthHandlers = {
        DeviceAuthFieldChanged: ({ field, value }: Extract<Message, { readonly _tag: "DeviceAuthFieldChanged" }>): UpdateReturn<Model, Message> => {
          const state = model.deviceAuth ?? initialDeviceAuthState();
          return {
            model: {
              ...model,
              deviceAuth: { ...state, draft: { ...state.draft, [field]: value }, error: undefined },
            },
          };
        },
        DeviceAuthModelAdded: (): UpdateReturn<Model, Message> => {
          const state = model.deviceAuth ?? initialDeviceAuthState();
          const modelId = state.draft.modelInput.trim();
          if (modelId.length === 0) return { model };
          return {
            model: {
              ...model,
              deviceAuth: {
                ...state,
                draft: {
                  ...state.draft,
                  modelInput: "",
                  selectedModelIds: [...new Set([...state.draft.selectedModelIds, modelId])],
                },
              },
            },
          };
        },
        DeviceAuthModelRemoved: ({ modelId }: Extract<Message, { readonly _tag: "DeviceAuthModelRemoved" }>): UpdateReturn<Model, Message> => {
          const state = model.deviceAuth ?? initialDeviceAuthState();
          return {
            model: {
              ...model,
              deviceAuth: {
                ...state,
                draft: {
                  ...state.draft,
                  selectedModelIds: state.draft.selectedModelIds.filter((id) => id !== modelId),
                },
              },
            },
          };
        },
        DeviceAuthStartRequested: (): UpdateReturn<Model, Message> => {
          const state = model.deviceAuth ?? initialDeviceAuthState();
          // S399: a click while a poll is pending or a start is in flight must not issue
          // another start/read; the token fence alone would only hide the second response.
          if (state.inflight === true || state.status === "starting" || state.status === "pending") return { model };
          const token = state.token + 1;
          return {
            commands: [deviceAuthCommands.read({ token })],
            model: { ...model, deviceAuth: { ...state, error: undefined, session: undefined, status: "starting", token } },
          };
        },
        DeviceAuthSessionsLoaded: ({ sessions, token }: Extract<Message, { readonly _tag: "DeviceAuthSessionsLoaded" }>): UpdateReturn<Model, Message> => {
          const state = model.deviceAuth ?? initialDeviceAuthState();
          if (token !== state.token) return { model };
          const plan = deviceAuthStartPlan(state, sessions);
          if (plan.kind === "invalid") {
            return { model: { ...model, deviceAuth: { ...state, error: plan.errors.join(" "), sessions, status: "error" } } };
          }
          const nextToken = state.token + 1;
          if (plan.kind === "restore") {
            const delayMs = deviceAuthPollDelayMs(plan.session);
            return {
              commands: [deviceAuthCommands.poll({ authRequestId: plan.session.authRequestId, delayMs, intervalMs: delayMs, token: nextToken })],
              model: withDeviceAuthDialog(
                { ...model, deviceAuth: { ...state, error: undefined, inflight: true, session: plan.session, sessions, status: "pending", token: nextToken } },
                plan.session,
              ),
            };
          }
          return {
            commands: [deviceAuthCommands.start({ payload: JSON.stringify(plan.payload), token: nextToken })],
            model: { ...model, deviceAuth: { ...state, error: undefined, sessions, status: "starting", token: nextToken } },
          };
        },
        DeviceAuthStarted: ({ session, token }: Extract<Message, { readonly _tag: "DeviceAuthStarted" }>): UpdateReturn<Model, Message> => {
          const state = model.deviceAuth ?? initialDeviceAuthState();
          if (token !== state.token) return { model };
          const nextToken = state.token + 1;
          const delayMs = deviceAuthPollDelayMs(session);
          return {
            commands: [deviceAuthCommands.poll({ authRequestId: session.authRequestId, delayMs, intervalMs: delayMs, token: nextToken })],
            model: withDeviceAuthDialog(
              { ...model, deviceAuth: { ...state, error: undefined, inflight: true, session, status: "pending", token: nextToken } },
              session,
            ),
          };
        },
        DeviceAuthPolled: ({ session, token }: Extract<Message, { readonly _tag: "DeviceAuthPolled" }>): UpdateReturn<Model, Message> => {
          const state = model.deviceAuth ?? initialDeviceAuthState();
          if (token !== state.token) return { model };
          // S432: the real pending poll body has no userCode/verification URL; keep the restored
          // challenge for the same authorization so the code/link survive the first poll.
          const nextSession = mergeDeviceAuthPoll(state.session, session);
          if (nextSession.status === "connected") {
            const nextToken = state.token + 1;
            const activations = activationPlanForConnectedSession({ draft: state.draft, session: nextSession });
            return {
              commands: activations.map((payload) => deviceAuthCommands.activate({ payload: JSON.stringify(payload), token: nextToken })),
              model: { ...model, deviceAuth: { ...state, error: undefined, inflight: false, session: nextSession, status: "connected", token: nextToken } },
            };
          }
          if (nextSession.status === "pending") {
            const nextToken = state.token + 1;
            const delayMs = deviceAuthPollDelayMs(nextSession);
            return {
              commands: [deviceAuthCommands.poll({ authRequestId: nextSession.authRequestId, delayMs, intervalMs: delayMs, token: nextToken })],
              model: withDeviceAuthDialog(
                { ...model, deviceAuth: { ...state, error: undefined, inflight: true, session: nextSession, status: "pending", token: nextToken } },
                nextSession,
              ),
            };
          }
          // S425: "expired"/"failed" are terminal host statuses. Surface the host reason instead of a
          // generic message; returning no poll command stops the loop, and inflight is cleared.
          const reason =
            nextSession.lastError ??
            (nextSession.status === "expired"
              ? "Device authorization expired."
              : "Device authorization failed.");
          return { model: { ...model, deviceAuth: { ...state, error: reason, inflight: false, session: nextSession, status: "error", token } } };
        },
        DeviceAuthFailed: ({ message, token }: Extract<Message, { readonly _tag: "DeviceAuthFailed" }>): UpdateReturn<Model, Message> => {
          const state = model.deviceAuth ?? initialDeviceAuthState();
          if (token !== state.token) return { model };
          return { model: { ...model, deviceAuth: deviceAuthFailedState(state, message) } };
        },
        DeviceAuthRetryRequested: (): UpdateReturn<Model, Message> => {
          const state = model.deviceAuth ?? initialDeviceAuthState();
          if (state.inflight === true) return { model };
          const nextToken = state.token + 1;
          if (state.session === undefined) {
            return {
              commands: [deviceAuthCommands.read({ token: nextToken })],
              model: { ...model, deviceAuth: { ...state, error: undefined, inflight: false, status: "starting", token: nextToken } },
            };
          }
          return {
            commands: [
              deviceAuthCommands.poll({
                authRequestId: state.session.authRequestId,
                delayMs: 0,
                intervalMs: deviceAuthPollDelayMs(state.session),
                token: nextToken,
              }),
            ],
            model: { ...model, deviceAuth: { ...state, error: undefined, inflight: true, status: "pending", token: nextToken } },
          };
        },
        GotDeviceAuthDialogMessage: ({ message }: Extract<Message, { readonly _tag: "GotDeviceAuthDialogMessage" }>): UpdateReturn<Model, Message> => {
          const result = updateDeviceAuthDialog(
            model.deviceAuthDialog,
            // SAFETY: this tag is only produced by the dialog submodel view/commands.
            message as DialogMessage,
          );
          return {
            commands: Command.mapMessages(result.commands, (childMessage) =>
              Message.GotDeviceAuthDialogMessage({ message: childMessage }),
            ),
            model: { ...model, deviceAuthDialog: result.model },
          };
        },
        DeviceAuthCancelled: (): UpdateReturn<Model, Message> => {
          const state = model.deviceAuth ?? initialDeviceAuthState();
          // S425: clear the in-flight marker or DeviceAuthStartRequested refuses every later start.
          // S459: interrupt the scheduled poll so cancel ends the sleep/request lifetime; the advanced
          // token stays the fence for any result already in flight when the interrupt landed.
          const authRequestId = state.session?.authRequestId;
          return {
            commands:
              authRequestId === undefined
                ? undefined
                : [
                    deviceAuthCommands.poll.Interrupt(
                      { authRequestId },
                      () => Message.DeviceAuthPollCancelCompleted({}),
                    ),
                  ],
            model: { ...model, deviceAuth: deviceAuthCancelledState(state) },
          };
        },
        DeviceAuthPollCancelCompleted: (): UpdateReturn<Model, Message> => ({ model }),
        DeviceAuthActivated: ({ token }: Extract<Message, { readonly _tag: "DeviceAuthActivated" }>): UpdateReturn<Model, Message> => {
          const state = model.deviceAuth ?? initialDeviceAuthState();
          if (token !== state.token) return { model };
          return { model: { ...model, deviceAuth: { ...state, error: undefined } } };
        },
      };
      const requestsRankingHandlers = {
        GotRequestsRankingMetricListboxMessage: ({ message }: Extract<Message, { readonly _tag: "GotRequestsRankingMetricListboxMessage" }>): UpdateReturn<Model, Message> =>
          // SAFETY: this tag is only produced by the Listbox submodel view/commands, so the carried value is its Message.
          updateRequestsMetricListbox(model, message as Parameters<typeof requestsMetricListbox.update>[1]),
        GotRequestsRankingTargetListboxMessage: ({ message }: Extract<Message, { readonly _tag: "GotRequestsRankingTargetListboxMessage" }>): UpdateReturn<Model, Message> =>
          // SAFETY: this tag is only produced by the Listbox submodel view/commands, so the carried value is its Message.
          updateRequestsTargetListbox(model, message as Parameters<typeof requestsMetricListbox.update>[1]),
        RequestsRankingFieldChanged: ({ field, value }: Extract<Message, { readonly _tag: "RequestsRankingFieldChanged" }>): UpdateReturn<Model, Message> =>
          updateRequestsRankingField(model, field, value),
        RequestsRankingSubmitRequested: (): UpdateReturn<Model, Message> => {
          const state = model.requestsRanking ?? initialRequestsRankingState();
          if (state.status === "loading") return { model };
          const metric = requestsRankingMetricOf(state.metric);
          const rankingTarget = requestsRankingTargetOf(state.rankingTarget);
          if (metric === undefined || rankingTarget === undefined) {
            const token = state.token + 1;
            return { model: { ...model, requestsRanking: { ...state, message: "Select a supported metric and ranking target.", status: "error", token } } };
          }
          const token = state.token + 1;
          const payload = buildRequestsRankingQuery({ metric, rankingTarget });
          return {
            commands: [requestsRankingCommands.query({ payload: JSON.stringify(payload), token })],
            model: { ...model, requestsRanking: { ...state, message: undefined, status: "loading", token } },
          };
        },
        RequestsRankingLoaded: ({ rows, token }: Extract<Message, { readonly _tag: "RequestsRankingLoaded" }>): UpdateReturn<Model, Message> => {
          const state = model.requestsRanking ?? initialRequestsRankingState();
          const next = mergeRequestsRankingLoaded(state, rows, token);
          return next === undefined ? { model } : { model: { ...model, requestsRanking: next } };
        },
        RequestsRankingFailed: ({ message, token }: Extract<Message, { readonly _tag: "RequestsRankingFailed" }>): UpdateReturn<Model, Message> => {
          const state = model.requestsRanking ?? initialRequestsRankingState();
          const next = mergeRequestsRankingFailed(state, message, token);
          return next === undefined ? { model } : { model: { ...model, requestsRanking: next } };
        },
      };
      const learningRankingHandlers = {
        LearningLadderToggleRequested: ({ rolledBack, roleId, taskTypeId }: Extract<Message, { readonly _tag: "LearningLadderToggleRequested" }>): UpdateReturn<Model, Message> => {
          const state = model.learningRanking ?? initialLearningRankingState();
          const packs = model.readbacks.learningPacks;
          const scopeId = packs.status === "ok" || packs.status === "empty" ? packs.scopeId?.trim() : undefined;
          const plan = planLearningLadderToggle(state, { roleId, rolledBack, scopeId, taskTypeId });
          if (plan.kind === "noop") return { model };
          if (plan.kind !== "rollback") return { model: { ...model, learningRanking: plan.state } };
          return {
            commands: [learningRankingCommands.rollbackLadder({
              payload: JSON.stringify(plan.payload),
              roleId,
              scopeId: plan.state.scopeId ?? "",
              taskTypeId,
              token: plan.token,
            })],
            model: { ...model, learningRanking: plan.state },
          };
        },
        LearningLadderUpdated: ({ rolledBack, roleId, scopeId, taskTypeId, token }: Extract<Message, { readonly _tag: "LearningLadderUpdated" }>): UpdateReturn<Model, Message> => {
          void rolledBack;
          const state = model.learningRanking ?? initialLearningRankingState();
          const packs = model.readbacks.learningPacks;
          const freshScope = packs.status === "ok" || packs.status === "empty" ? packs.scopeId : undefined;
          const next = mergeLearningLadderUpdated(state, { freshScope, roleId, scopeId, taskTypeId, token });
          if (next === undefined) return { model };
          const readbackToken = model.readbacks.learning.token + 1;
          return {
            commands: [readReadback({ key: "learning", token: readbackToken })],
            model: {
              ...model,
              learningRanking: next,
              readbacks: { ...model.readbacks, learning: loadingReadback(readbackToken) },
            },
          };
        },
        LearningLadderFailed: ({ message, roleId, scopeId, taskTypeId, token }: Extract<Message, { readonly _tag: "LearningLadderFailed" }>): UpdateReturn<Model, Message> => {
          const state = model.learningRanking ?? initialLearningRankingState();
          const packs = model.readbacks.learningPacks;
          const freshScope = packs.status === "ok" || packs.status === "empty" ? packs.scopeId : undefined;
          const next = mergeLearningLadderFailed(state, { freshScope, message, roleId, scopeId, taskTypeId, token });
          return next === undefined ? { model } : { model: { ...model, learningRanking: next } };
        },
      };
      const endpointActivationHandlers = {
        EndpointAdmissionFieldChanged: ({ field, value }: Extract<Message, { readonly _tag: "EndpointAdmissionFieldChanged" }>): UpdateReturn<Model, Message> => {
          const state = model.endpointAdmission ?? initialEndpointAdmissionState();
          const next = endpointAdmissionFieldChangedState(state, field, value);
          return next === undefined ? { model } : { model: { ...model, endpointAdmission: next } };
        },
        EndpointAdmissionModelAdded: (): UpdateReturn<Model, Message> => {
          const state = model.endpointAdmission ?? initialEndpointAdmissionState();
          const next = endpointAdmissionModelAddedState(state);
          return next === undefined ? { model } : { model: { ...model, endpointAdmission: next } };
        },
        EndpointAdmissionModelRemoved: ({ modelId }: Extract<Message, { readonly _tag: "EndpointAdmissionModelRemoved" }>): UpdateReturn<Model, Message> => {
          const state = model.endpointAdmission ?? initialEndpointAdmissionState();
          const next = endpointAdmissionModelRemovedState(state, modelId);
          return next === undefined ? { model } : { model: { ...model, endpointAdmission: next } };
        },
        EndpointAdmissionSubmitRequested: (): UpdateReturn<Model, Message> => {
          const state = model.endpointAdmission ?? initialEndpointAdmissionState();
          if (endpointAdmissionBusy(state)) return { model };
          const errors = validateEndpointAdmissionDraft(state);
          if (errors.length > 0) return { model: { ...model, endpointAdmission: { ...state, error: errors.join(" "), status: "error" } } };
          if (endpointActivationNeedsReset(state.run)) return { model };
          const batch = state.draft.batchMode === "true";
          const planned = batch
            ? [{ activationId: "batch:" + state.draft.activationBatchId.trim(), payload: endpointBatchPayload(state.draft) }]
            : endpointActivationPayloads(state.draft).map((payload) => ({ activationId: "model:" + encodeURIComponent(payload.modelId), payload }));
          const started = beginEndpointActivationRun(state.run, {
            activationIds: planned.map((entry) => entry.activationId),
            mode: batch ? "batch" : "single",
          });
          if (started.kind === "busy") return { model };
          if (started.kind === "invalid") {
            return { model: { ...model, endpointAdmission: { ...state, error: "Select at least one model.", status: "error" } } };
          }
          const commands = planned.map((entry) =>
            batch
              ? endpointAdmissionCommands.activateBatch({ activationId: entry.activationId, generation: started.generation, payload: JSON.stringify(entry.payload) })
              : endpointAdmissionCommands.activate({ activationId: entry.activationId, generation: started.generation, payload: JSON.stringify(entry.payload) }),
          );
          return {
            commands,
            model: {
              ...model,
              endpointAdmission: { ...state, error: undefined, pendingAction: batch ? "batch" : "activate", run: started.run, status: "saving" },
            },
          };
        },
        EndpointAdmissionResetRequested: (): UpdateReturn<Model, Message> => {
          const state = model.endpointAdmission ?? initialEndpointAdmissionState();
          const next = endpointAdmissionResetState(state);
          return next === undefined ? { model } : { model: { ...model, endpointAdmission: next } };
        },
        EndpointAdmissionSucceeded: ({ activationId, generation }: Extract<Message, { readonly _tag: "EndpointAdmissionSucceeded" }>): UpdateReturn<Model, Message> => {
          const state = model.endpointAdmission ?? initialEndpointAdmissionState();
          const result = settleEndpointActivation(state.run, { activationId, generation, outcome: "succeeded" });
          if (result.kind !== "updated") return { model };
          return endpointAdmissionCompletion(model, state, result.run);
        },
        EndpointAdmissionFailed: ({ activationId, generation, message }: Extract<Message, { readonly _tag: "EndpointAdmissionFailed" }>): UpdateReturn<Model, Message> => {
          const state = model.endpointAdmission ?? initialEndpointAdmissionState();
          const result = settleEndpointActivation(state.run, { activationId, generation, outcome: "failed", message });
          if (result.kind !== "updated") return { model };
          return endpointAdmissionCompletion(model, state, result.run);
        },
      };
      const handlers = {
        ...shellHandlers,
        ...remainingHandlers,
        ...deviceAuthHandlers,
        ...requestsRankingHandlers,
        ...learningRankingHandlers,
        ...endpointActivationHandlers,
      };
      return Message.match<UpdateReturn<Model, Message>>(message, handlers);
    };
  };