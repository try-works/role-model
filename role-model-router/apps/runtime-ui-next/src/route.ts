import { Route } from "@role-model-router/foldkit";
import type { RouteUnion } from "@role-model-router/foldkit/route";
import type { Url } from "@role-model-router/foldkit/url";
import { Schema, pipe } from "effect";

import { legacyRedirectForUrl } from "./legacy-redirects";

/**
 * Run 115 S14b (R11/R21): the route union for the Foldkit shell.
 *
 * Defined the way this Foldkit version declares route unions:
 *   - Route.defineRouteUnion builds the tagged union (vendor/foldkit/packages/foldkit/src/schema/index.ts:629-635);
 *   - Route.root / Route.literal / Route.slash / Route.string build bidirectional segment parsers
 *     (src/route/parser.ts:105-134, :143-171, :181-189, :323, :586-614);
 *   - Route.mapTo attaches the constructor and Route.oneOf tries the routers in order
 *     (src/route/parser.ts:514-532, :546-572);
 *   - Route.parseUrlWithFallback turns a Url into a route and falls back to NotFound with { path }
 *     (src/route/parser.ts:723-736).
 */

const routeCases = {
  Index: {},
  Diagnostics: { id: Schema.String },
  Observability: {},
  StoreReceipts: {},
  Queues: {},
  LocalLogs: {},
  RouterCandidates: {},
  Requests: {},
  RequestDetail: { requestId: Schema.String },
  RouterDecisions: {},
  RouterDecisionDetail: { requestId: Schema.String },
  LocalPeers: {},
  SystemPeers: {},
  LocalPeerModels: {},
  QueuesConfiguration: {},
  IntegrationsDownstream: {},
  IntegrationsUpstream: {},
  LocalChoose: {},
  Studio: {},
  Learning: {},
  Models: {},
  ModelsRoles: {},
  Benchmark: {},
  StorageRetention: {},
  Runtime: {},
  SessionReadiness: {},
  Dashboard: {},
  LocalSwap: {},
  RouterStrategy: {},
  RouterWorkloads: {},
  RouterConfig: {},
  RouterAgentStrategy: {},
  ObserveActivity: {},
  ObserveLogs: {},
  ObserveRouting: {},
  Router: {},
  Providers: {},
  Endpoints: {},
  ControlController: {},
  NotFound: { path: Schema.String },
};

export const AppRoute: RouteUnion<typeof routeCases> = Route.defineRouteUnion(routeCases);
export type AppRoute = typeof AppRoute.Type;

const indexRouter = Route.mapTo(AppRoute.Index)(Route.root);
const diagnosticsRouter = Route.mapTo(AppRoute.Diagnostics)(
  pipe(Route.literal("diagnostics"), Route.slash(Route.string("id"))),
);
const observabilityRouter = Route.mapTo(AppRoute.Observability)(
  pipe(Route.literal("observe"), Route.slash(Route.literal("observability-snapshot"))),
);
const storeReceiptsRouter = Route.mapTo(AppRoute.StoreReceipts)(
  pipe(Route.literal("observe"), Route.slash(Route.literal("store-degradation-receipts"))),
);
const queuesRouter = Route.mapTo(AppRoute.Queues)(
  pipe(Route.literal("observe"), Route.slash(Route.literal("queues"))),
);
const localLogsRouter = Route.mapTo(AppRoute.LocalLogs)(
  pipe(Route.literal("local"), Route.slash(Route.literal("logs"))),
);
const routerCandidatesRouter = Route.mapTo(AppRoute.RouterCandidates)(
  pipe(Route.literal("router"), Route.slash(Route.literal("candidates"))),
);
const requestDetailRouter = Route.mapTo(AppRoute.RequestDetail)(pipe(Route.literal("requests"), Route.slash(Route.string("requestId"))));
const requestsRouter = Route.mapTo(AppRoute.Requests)(Route.literal("requests"));
const routerDecisionDetailRouter = Route.mapTo(AppRoute.RouterDecisionDetail)(pipe(Route.literal("router"), Route.slash(Route.literal("decisions")), Route.slash(Route.string("requestId"))));
const routerDecisionsRouter = Route.mapTo(AppRoute.RouterDecisions)(
  pipe(Route.literal("router"), Route.slash(Route.literal("decisions"))),
);
const localPeersRouter = Route.mapTo(AppRoute.LocalPeers)(
  pipe(Route.literal("local"), Route.slash(Route.literal("peers"))),
);
const localPeerModelsRouter = Route.mapTo(AppRoute.LocalPeerModels)(pipe(Route.literal("local"), Route.slash(Route.literal("peer-models"))));
const queuesConfigurationRouter = Route.mapTo(AppRoute.QueuesConfiguration)(pipe(Route.literal("control"), Route.slash(Route.literal("queues-config"))));
const integrationsDownstreamRouter = Route.mapTo(AppRoute.IntegrationsDownstream)(pipe(Route.literal("integrations"), Route.slash(Route.literal("downstream"))));
const integrationsUpstreamRouter = Route.mapTo(AppRoute.IntegrationsUpstream)(pipe(Route.literal("integrations"), Route.slash(Route.literal("upstream"))));
const benchmarkRouter = Route.mapTo(AppRoute.Benchmark)(pipe(Route.literal("system"), Route.slash(Route.literal("benchmark"))));
const storageRetentionRouter = Route.mapTo(AppRoute.StorageRetention)(pipe(Route.literal("system"), Route.slash(Route.literal("storage-retention"))));
const modelsRouter = Route.mapTo(AppRoute.Models)(Route.literal("models"));
const modelsRolesRouter = Route.mapTo(AppRoute.ModelsRoles)(
  pipe(Route.literal("models"), Route.slash(Route.literal("roles"))),
);
const learningRouter = Route.mapTo(AppRoute.Learning)(Route.literal("learning"));
const studioRouter = Route.mapTo(AppRoute.Studio)(Route.literal("studio"));
const localChooseRouter = Route.mapTo(AppRoute.LocalChoose)(pipe(Route.literal("local"), Route.slash(Route.literal("choose"))));
const localModelsRedirectRouter = Route.mapTo(AppRoute.LocalChoose)(pipe(Route.literal("local"), Route.slash(Route.literal("models"))));
const systemPeersRouter = Route.mapTo(AppRoute.SystemPeers)(
  pipe(Route.literal("system"), Route.slash(Route.literal("peers"))),
);
const runtimeRouter = Route.mapTo(AppRoute.Runtime)(Route.literal("runtime"));
const sessionReadinessRouter = Route.mapTo(AppRoute.SessionReadiness)(
  Route.literal("session-readiness"),
);
const dashboardRouter = Route.mapTo(AppRoute.Dashboard)(Route.literal("dashboard"));
const localSwapRouter = Route.mapTo(AppRoute.LocalSwap)(
  pipe(Route.literal("local"), Route.slash(Route.literal("swap"))),
);
const observeActivityRouter = Route.mapTo(AppRoute.ObserveActivity)(
  pipe(Route.literal("observe"), Route.slash(Route.literal("activity"))),
);
const observeLogsRouter = Route.mapTo(AppRoute.ObserveLogs)(
  pipe(Route.literal("observe"), Route.slash(Route.literal("logs"))),
);
const observeRoutingRouter = Route.mapTo(AppRoute.ObserveRouting)(
  pipe(Route.literal("observe"), Route.slash(Route.literal("routing"))),
);
const routerStrategyRouter = Route.mapTo(AppRoute.RouterStrategy)(pipe(Route.literal("router"), Route.slash(Route.literal("strategy"))));
const routerWorkloadsRouter = Route.mapTo(AppRoute.RouterWorkloads)(pipe(Route.literal("router"), Route.slash(Route.literal("workloads"))));
const routerConfigRouter = Route.mapTo(AppRoute.RouterConfig)(pipe(Route.literal("router"), Route.slash(Route.literal("config"))));
const routerAgentStrategyRouter = Route.mapTo(AppRoute.RouterAgentStrategy)(pipe(Route.literal("router"), Route.slash(Route.literal("agent-strategy"))));
const routerRouter = Route.mapTo(AppRoute.Router)(Route.literal("router"));
const providersRouter = Route.mapTo(AppRoute.Providers)(
  pipe(Route.literal("control"), Route.slash(Route.literal("providers"))),
);
const endpointsRouter = Route.mapTo(AppRoute.Endpoints)(
  pipe(Route.literal("control"), Route.slash(Route.literal("endpoints"))),
);
const controlControllerRouter = Route.mapTo(AppRoute.ControlController)(
  pipe(Route.literal("control"), Route.slash(Route.literal("controller"))),
);

export const appRouter = Route.oneOf(
  diagnosticsRouter,
  observabilityRouter,
  storeReceiptsRouter,
  queuesRouter,
  localLogsRouter,
  routerCandidatesRouter,
  requestDetailRouter,
  requestsRouter,
  routerDecisionDetailRouter,
  routerDecisionsRouter,
  localPeersRouter,
  systemPeersRouter,
  localPeerModelsRouter,
  queuesConfigurationRouter,
  integrationsDownstreamRouter,
  integrationsUpstreamRouter,
  localChooseRouter,
  studioRouter,
  learningRouter,
  modelsRouter,
  modelsRolesRouter,
  benchmarkRouter,
  storageRetentionRouter,
  localModelsRedirectRouter,
  runtimeRouter,
  sessionReadinessRouter,
  dashboardRouter,
  localSwapRouter,
  observeActivityRouter,
  observeLogsRouter,
  observeRoutingRouter,
  routerRouter,
  routerStrategyRouter,
  routerWorkloadsRouter,
  routerConfigRouter,
  routerAgentStrategyRouter,
  providersRouter,
  endpointsRouter,
  controlControllerRouter,
  indexRouter,
);

export const urlToRoute = Route.parseUrlWithFallback(appRouter, AppRoute.NotFound);

export interface ResolvedAppUrl {
  /** The URL the typed route was parsed from (the canonical target for a legacy URL). */
  readonly canonicalUrl: Url;
  /** Present only when this URL is an original `/app/*` path that needs a replace Command. */
  readonly redirectHref?: string;
  readonly route: AppRoute;
}

/**
 * S269 (R11): one resolution entry point for initial load, in-app URL changes and tests.
 *
 * A supported original `/app/*` path parses against its canonical target, so callers get the same
 * real typed route as the bare URL and one `redirectHref` to replace the address bar. Unrelated
 * and missing paths still fall through to NotFound.
 */
export const resolveAppUrl = (url: Url): ResolvedAppUrl => {
  const redirect = legacyRedirectForUrl(url);
  if (redirect === undefined) return { canonicalUrl: url, route: urlToRoute(url) };
  return {
    canonicalUrl: redirect.url,
    redirectHref: redirect.href,
    route: urlToRoute(redirect.url),
  };
};

/** The initial route comes from the URL the runtime passes to the routing init. */
export const routeFromUrl = (url: Url): AppRoute => resolveAppUrl(url).route;

/**
 * True when two routes address the same route instance. update uses this to ignore the
 * `foldkit:urlchange` echo of its own redirect replace instead of issuing a second route read.
 */
export const sameRoute = (left: AppRoute, right: AppRoute): boolean => {
  if (left._tag !== right._tag) return false;
  if (left._tag === "Diagnostics" && right._tag === "Diagnostics") return left.id === right.id;
  if (left._tag === "RequestDetail" && right._tag === "RequestDetail") {
    return left.requestId === right.requestId;
  }
  if (left._tag === "RouterDecisionDetail" && right._tag === "RouterDecisionDetail") {
    return left.requestId === right.requestId;
  }
  if (left._tag === "NotFound" && right._tag === "NotFound") return left.path === right.path;
  return true;
};